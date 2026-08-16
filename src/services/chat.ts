import { Prisma } from '@/database/generated/client';
import { Client } from '@/database/lib/types';
import { ChatRepository } from '@/database/repositories/chat';
import { validateSchema } from '@/lib/utils';

export class ChatService {
	constructor(private readonly client: Client) {}

	private include = { sender: { select: { id: true, name: true, role: true } } } satisfies Prisma.ChatMessageInclude;

	private async assertParticipant(visitId: string, userId: string) {
		const visit = await this.client.visit.findUnique({ where: { id: visitId }, include: { proposal: true, handyman: true } });
		if (!visit) throw new Error('Visit not found');

		const isHandyman = visit.handyman.userId === userId;
		const isCustomer = visit.proposal.customerId === userId;
		if (!isHandyman && !isCustomer) throw new Error('Forbidden');

		return visit;
	}

	async readMessages(visitId: string, userId: string) {
		await this.assertParticipant(visitId, userId);
		return await this.client.chatMessage.findMany({ where: { visitId }, orderBy: { createdAt: 'asc' }, include: this.include });
	}

	async sendMessage(visitId: string, userId: string, payload: unknown) {
		validateSchema(ChatRepository.send(), payload);
		await this.assertParticipant(visitId, userId);

		const data = {
			visit: { connect: { id: visitId } },
			sender: { connect: { id: userId } },
			type: payload.type,
			text: payload.text ?? null,
			imageUrl: payload.imageUrl ?? null
		} satisfies Prisma.ChatMessageCreateInput;

		return await this.client.chatMessage.create({ data, include: this.include });
	}

	async reschedule(visitId: string, userId: string, payload: unknown) {
		validateSchema(ChatRepository.reschedule(), payload);
		await this.assertParticipant(visitId, userId);

		const data = {
			visit: { connect: { id: visitId } },
			sender: { connect: { id: userId } },
			type: 'RESCHEDULE',
			proposedDate: new Date(payload.proposedDate),
			rescheduleStatus: 'PENDING'
		} satisfies Prisma.ChatMessageCreateInput;

		return await this.client.chatMessage.create({ data, include: this.include });
	}
}
