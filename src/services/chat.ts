import { Prisma } from '@/database/generated/client';
import { Client } from '@/database/lib/types';
import { ChatRepository } from '@/database/repositories/chat';
import { validateSchema } from '@/lib/utils';

export class ChatService {
	constructor(private readonly client: Client) {}

	private include = { sender: { select: { id: true, name: true, role: true } } } satisfies Prisma.ChatMessageInclude;

	private async assertParticipant(offerId: string, userId: string) {
		const offer = await this.client.offer.findUnique({ where: { id: offerId }, include: { proposal: true, handyman: true } });
		if (!offer) throw new Error('Offer not found');

		const isHandyman = offer.handyman.userId === userId;
		const isCustomer = offer.proposal.customerId === userId;
		if (!isHandyman && !isCustomer) throw new Error('Forbidden');

		return offer;
	}

	async readMessages(offerId: string, userId: string) {
		await this.assertParticipant(offerId, userId);
		return await this.client.chatMessage.findMany({ where: { offerId }, orderBy: { createdAt: 'asc' }, include: this.include });
	}

	async sendMessage(offerId: string, userId: string, payload: unknown) {
		validateSchema(ChatRepository.send(), payload);
		await this.assertParticipant(offerId, userId);

		const data = {
			offer: { connect: { id: offerId } },
			sender: { connect: { id: userId } },
			type: payload.type,
			text: payload.text ?? null,
			imageUrl: payload.imageUrl ?? null
		} satisfies Prisma.ChatMessageCreateInput;

		return await this.client.chatMessage.create({ data, include: this.include });
	}

	async reschedule(offerId: string, userId: string, payload: unknown) {
		validateSchema(ChatRepository.reschedule(), payload);
		await this.assertParticipant(offerId, userId);

		const data = {
			offer: { connect: { id: offerId } },
			sender: { connect: { id: userId } },
			type: 'RESCHEDULE',
			proposedDate: new Date(payload.proposedDate),
			rescheduleStatus: 'PENDING'
		} satisfies Prisma.ChatMessageCreateInput;

		return await this.client.chatMessage.create({ data, include: this.include });
	}
}
