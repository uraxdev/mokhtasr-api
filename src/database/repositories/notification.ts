import z from 'zod';

import { NotificationType } from '../generated/enums';

export class NotificationRepository {
	static type = ['VISIT_RECEIVED', 'VISIT_ACCEPTED', 'PROPOSAL_STATUS_CHANGED', 'CHAT_MESSAGE'] satisfies NotificationType[];

	static get() {
		return z.object({
			id: z.uuid(),
			userId: z.uuid(),
			type: z.enum(this.type),
			title: z.object({ ar: z.string(), en: z.string() }),
			body: z.object({ ar: z.string(), en: z.string() }),
			data: z.record(z.string(), z.string()).nullable(),
			readAt: z.iso.datetime().nullable(),
			createdAt: z.iso.datetime(),
			updatedAt: z.iso.datetime()
		});
	}
}

export type Notification = z.infer<ReturnType<typeof NotificationRepository.get>>;
