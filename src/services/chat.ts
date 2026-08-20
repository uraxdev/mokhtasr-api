import { Prisma } from '@/database/generated/client';
import { Client } from '@/database/lib/types';
import { ChatRepository } from '@/database/repositories/chat';
import { validateSchema } from '@/lib/utils';
import { NotificationService } from '@/services/notifications';
import { broadcastToChannel } from '@/subsystems/websockets';

export class ChatService {
	constructor(private readonly client: Client) {}

	private include = { sender: { select: { id: true, name: true, role: true } } } satisfies Prisma.ChatMessageInclude;

	private async assertParticipant(visitId: string, userId: string) {
		const visit = await this.client.visit.findUnique({
			where: { id: visitId },
			include: { proposal: { include: { customer: { select: { userId: true } } } }, handyman: true }
		});
		if (!visit) throw new Error('Visit not found');

		const isHandyman = visit.handyman.userId === userId;
		const isCustomer = visit.proposal.customer.userId === userId;
		if (!isHandyman && !isCustomer) throw new Error('Forbidden');

		return visit;
	}

	private otherParticipantUserId(visit: { handyman: { userId: string }; proposal: { customer: { userId: string } } }, senderId: string): string {
		return visit.handyman.userId === senderId ? visit.proposal.customer.userId : visit.handyman.userId;
	}

	async readMessages(visitId: string, userId: string) {
		await this.assertParticipant(visitId, userId);
		return await this.client.chatMessage.findMany({ where: { visitId }, orderBy: { createdAt: 'asc' }, include: this.include });
	}

	async sendMessage(visitId: string, userId: string, payload: unknown) {
		validateSchema(ChatRepository.send(), payload);
		const visit = await this.assertParticipant(visitId, userId);

		const data = {
			visit: { connect: { id: visitId } },
			sender: { connect: { id: userId } },
			type: payload.type,
			text: payload.text ?? null,
			imageUrl: payload.imageUrl ?? null
		} satisfies Prisma.ChatMessageCreateInput;

		const message = await this.client.chatMessage.create({ data, include: this.include });

		broadcastToChannel(`chat:${visitId}`, { type: 'chat:message', payload: message });

		await new NotificationService(this.client).create({
			userId: this.otherParticipantUserId(visit, userId),
			type: 'CHAT_MESSAGE',
			title: { ar: 'رسالة جديدة', en: 'New message' },
			body: {
				ar: payload.type === 'TEXT' ? (payload.text ?? '') : 'أرسل رسالة جديدة',
				en: payload.type === 'TEXT' ? (payload.text ?? '') : 'sent a new message'
			},
			data: { visitId }
		});

		return message;
	}

	async reschedule(visitId: string, userId: string, payload: unknown) {
		validateSchema(ChatRepository.reschedule(), payload);
		const visit = await this.assertParticipant(visitId, userId);

		const data = {
			visit: { connect: { id: visitId } },
			sender: { connect: { id: userId } },
			type: 'RESCHEDULE',
			proposedDate: new Date(payload.proposedDate),
			rescheduleStatus: 'PENDING'
		} satisfies Prisma.ChatMessageCreateInput;

		const message = await this.client.chatMessage.create({ data, include: this.include });

		broadcastToChannel(`chat:${visitId}`, { type: 'chat:message', payload: message });

		await new NotificationService(this.client).create({
			userId: this.otherParticipantUserId(visit, userId),
			type: 'CHAT_MESSAGE',
			title: { ar: 'طلب إعادة جدولة', en: 'Reschedule request' },
			body: { ar: 'تم اقتراح موعد جديد للزيارة', en: 'A new visit date has been proposed' },
			data: { visitId }
		});

		return message;
	}
}
