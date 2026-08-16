import z from 'zod';
import { ChatMessageType, RescheduleStatus } from '../generated/enums';

export class ChatRepository {
	static type = ['TEXT', 'IMAGE'] satisfies ChatMessageType[];

	static rescheduleStatus = ['PENDING', 'ACCEPTED', 'DECLINED'] satisfies RescheduleStatus[];

	static get() {
		return z.object({
			id: z.uuid(),
			visitId: z.string(),
			senderId: z.string(),
			type: z.enum(ChatRepository.type),
			text: z.string().nullable(),
			imageUrl: z.url().nullable(),
			proposedDate: z.iso.datetime().nullable(),
			rescheduleStatus: z.enum(ChatRepository.rescheduleStatus).nullable(),
			createdAt: z.iso.datetime(),
			updatedAt: z.iso.datetime()
		});
	}

	static send() {
		return z
			.object({
				type: z.enum(ChatRepository.type),
				text: z.string().nullable(),
				imageUrl: z.url().nullable()
			})
			.refine((d) => (d.type === 'TEXT' ? !!d.text : !!d.imageUrl), {
				message: 'text is required for TEXT messages; imageUrl is required for IMAGE messages'
			});
	}

	static reschedule() {
		return z.object({
			proposedDate: z.iso.datetime()
		});
	}
}

export type Chat = z.infer<ReturnType<typeof ChatRepository.get>>;
export type SendMessagePayload = z.infer<ReturnType<typeof ChatRepository.send>>;
export type ReschedulePayload = z.infer<ReturnType<typeof ChatRepository.reschedule>>;
