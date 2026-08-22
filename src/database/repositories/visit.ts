import z from 'zod';

import { JobStage, VisitStatus, VisitType } from '../generated/enums';
import { ReviewRepository } from './review';

export class VisitRepository {
	static status = ['PENDING', 'ACCEPTED', 'DECLINED', 'COMPLETED'] satisfies VisitStatus[];
	static type = ['INSPECTION', 'WORK'] satisfies VisitType[];
	static stage = ['AT_LOCATION', 'AWAITING_CODE'] satisfies JobStage[];

	static get() {
		return z.object({
			id: z.uuid(),
			type: z.enum(this.type),
			price: z.number().positive().nullable(),
			currency: z.string(),
			status: z.enum(this.status),
			completionCode: z.string().nullable(),
			message: z.string().nullable(),
			estimatedDuration: z.string().nullable(),
			scheduledFor: z.iso.datetime().nullable(),
			stage: z.enum(this.stage).nullable(),
			proposalId: z.uuid(),
			handymanId: z.uuid(),
			convertedFromVisitId: z.uuid().nullable(),
			createdAt: z.iso.datetime(),
			updatedAt: z.iso.datetime(),
			review: ReviewRepository.get().nullable()
			// proposal: ProposalRepository.get(),
			// handyman: HandymanRepository.get(),
			// messages: ChatRepository.get(),
			// transaction: TransactionRepository.get(),
		});
	}

	static create() {
		return this.get()
			.pick({ proposalId: true, type: true, price: true, currency: true, estimatedDuration: true, message: true, scheduledFor: true })
			.superRefine((data, ctx) => {
				if (data.type === 'WORK' && data.price === null) {
					ctx.addIssue({ code: 'custom', path: ['price'], message: 'price is required for WORK visits' });
				}
				if (data.type === 'INSPECTION' && data.scheduledFor !== null) {
					ctx.addIssue({ code: 'custom', path: ['scheduledFor'], message: 'scheduledFor is not allowed for INSPECTION visits' });
				}
			});
	}

	static convertToWork() {
		return z.object({
			price: z.number().positive(),
			scheduledFor: z.iso.datetime().nullable()
		});
	}

	static advanceStage() {
		return z.object({
			stage: z.enum(this.stage),
			latitude: z.number().optional(),
			longitude: z.number().optional()
		});
	}

	static verifyCode() {
		return z.object({
			code: z.string().length(6)
		});
	}
}

export type Visit = z.infer<ReturnType<typeof VisitRepository.get>>;
export type VisitCreatePayload = z.infer<ReturnType<typeof VisitRepository.create>>;
export type ConvertToWorkPayload = z.infer<ReturnType<typeof VisitRepository.convertToWork>>;
export type AdvanceStagePayload = z.infer<ReturnType<typeof VisitRepository.advanceStage>>;
export type VerifyCodePayload = z.infer<ReturnType<typeof VisitRepository.verifyCode>>;
