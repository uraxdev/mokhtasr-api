import z from 'zod';

export class ReviewRepository {
	static get() {
		return z.object({
			id: z.uuid(),
			offerId: z.uuid(),
			reviewerName: z.string(),
			rating: z.number(),
			comment: z.string().nullable(),
			createdAt: z.iso.datetime(),
			updatedAt: z.iso.datetime()
		});
	}

	static create() {
		return z.object({
			rating: z.number().min(1).max(5),
			comment: z.string().optional()
		});
	}
}

export type Review = z.infer<ReturnType<typeof ReviewRepository.get>>;
export type ReviewCreatePayload = z.infer<ReturnType<typeof ReviewRepository.create>>;
