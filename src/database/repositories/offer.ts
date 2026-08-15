import z from 'zod';

import { ReviewRepository } from './review';

export class OfferRepository {
	static status = z.enum(['PENDING', 'COMPLETED', 'CANCELLED']);
	static stage = z.enum(['AT_LOCATION', 'AWAITING_CODE']);

	static get() {
		return z.object({
			id: z.uuid(),
			price: z.number().positive(),
			currency: z.string(),
			status: OfferRepository.status,
			completionCode: z.string().nullable(),
			message: z.string().nullable(),
			estimatedDuration: z.string().nullable(),
			stage: OfferRepository.stage.nullable(),
			proposalId: z.uuid(),
			handymanId: z.uuid(),
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
		return this.get().pick({ proposalId: true, price: true, currency: true, estimatedDuration: true, message: true });
	}

	static advanceStage() {
		return z.object({
			stage: z.enum(['AT_LOCATION', 'AWAITING_CODE']),
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

export type Offer = z.infer<ReturnType<typeof OfferRepository.get>>;
export type OfferCreatePayload = z.infer<ReturnType<typeof OfferRepository.create>>;
export type AdvanceStagePayload = z.infer<ReturnType<typeof OfferRepository.advanceStage>>;
export type VerifyCodePayload = z.infer<ReturnType<typeof OfferRepository.verifyCode>>;
