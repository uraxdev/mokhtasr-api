import z from 'zod';

import { ReviewTag } from '../generated/enums';

export class ReviewRepository {
	static tags = [
		'PROFESSIONAL',
		'PUNCTUAL',
		'GOOD_VALUE',
		'HIGH_QUALITY_WORK',
		'FRIENDLY',
		'CLEAN_WORKSPACE',
		'COMMUNICATIVE',
		'RESPECTFUL',
		'EXPERT_ADVICE',
		'EFFICIENT',
		'LATE',
		'POOR_COMMUNICATION',
		'OVERPRICED',
		'MESSY_WORKSPACE'
	] satisfies ReviewTag[];

	static get() {
		return z.object({
			id: z.uuid(),
			visitId: z.uuid(),
			reviewerName: z.string(),
			rating: z.number(),
			comment: z.string().nullable(),
			tags: z.array(z.enum(ReviewRepository.tags)),
			createdAt: z.iso.datetime(),
			updatedAt: z.iso.datetime()
		});
	}

	static create() {
		return z.object({
			rating: z.number().min(1).max(5),
			comment: z.string().optional(),
			tags: z.array(z.enum(ReviewRepository.tags)).optional()
		});
	}
}

export type Review = z.infer<ReturnType<typeof ReviewRepository.get>>;
export type ReviewCreatePayload = z.infer<ReturnType<typeof ReviewRepository.create>>;
