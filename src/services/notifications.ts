import { Prisma } from '@/database/generated/client';
import { NotificationType } from '@/database/generated/enums';
import { client as sharedClient } from '@/database/lib/client';
import { Client } from '@/database/lib/types';
import { DeviceTokenRegisterPayload, DeviceTokenRepository } from '@/database/repositories/device-token';
import { validateSchema } from '@/lib/utils';
import { sendPush } from '@/subsystems/push';
import { broadcastToUser } from '@/subsystems/websockets';

type LocalizedText = { ar: string; en: string };

export type NotificationCreateInput = {
	userId: string;
	type: NotificationType;
	title: LocalizedText;
	body: LocalizedText;
	data?: Record<string, string>;
};

export class NotificationService {
	constructor(private readonly client: Client) {}

	async create(input: NotificationCreateInput) {
		const notification = await this.client.notification.create({
			data: {
				type: input.type,
				title: input.title,
				body: input.body,
				data: input.data ?? Prisma.JsonNull,
				user: { connect: { id: input.userId } }
			}
		});

		broadcastToUser(input.userId, { type: 'notification:created', payload: notification });

		this.deliver(input.userId, input.title, input.body, input.data).catch((error) => {
			console.error('Failed to deliver push notification:', error);
		});

		return notification;
	}

	private async deliver(userId: string, title: LocalizedText, body: LocalizedText, data?: Record<string, string>) {
		const user = await sharedClient.user.findUnique({ where: { id: userId }, select: { locale: true } });
		if (!user) return;

		const deviceTokens = await sharedClient.deviceToken.findMany({ where: { userId }, select: { token: true } });
		if (deviceTokens.length === 0) return;

		const localizedTitle = user.locale === 'AR' ? title.ar : title.en;
		const localizedBody = user.locale === 'AR' ? body.ar : body.en;

		const results = await sendPush(
			deviceTokens.map((deviceToken) => deviceToken.token),
			localizedTitle,
			localizedBody,
			data
		);

		const invalidTokens = results.filter((result) => result.invalid).map((result) => result.token);
		if (invalidTokens.length > 0) {
			await sharedClient.deviceToken.deleteMany({ where: { token: { in: invalidTokens } } });
		}
	}

	async list(userId: string, cursor?: string, limit: number = 20) {
		return await this.client.notification.findMany({
			where: { userId },
			orderBy: { createdAt: 'desc' },
			take: limit,
			...(cursor && { cursor: { id: cursor }, skip: 1 })
		});
	}

	async markRead(id: string, userId: string) {
		const notification = await this.client.notification.findUnique({ where: { id } });

		if (!notification) throw new Error('Notification not found');
		if (notification.userId !== userId) throw new Error('Forbidden');

		return await this.client.notification.update({ where: { id }, data: { readAt: new Date() } });
	}

	async markAllRead(userId: string) {
		await this.client.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
		return { success: true };
	}

	async registerDevice(userId: string, payload: DeviceTokenRegisterPayload) {
		validateSchema(DeviceTokenRepository.register(), payload);

		return await this.client.deviceToken.upsert({
			where: { token: payload.token },
			create: { token: payload.token, platform: payload.platform, user: { connect: { id: userId } } },
			update: { platform: payload.platform, user: { connect: { id: userId } } }
		});
	}

	async unregisterDevice(token: string) {
		await this.client.deviceToken.deleteMany({ where: { token } });
		return { success: true };
	}
}
