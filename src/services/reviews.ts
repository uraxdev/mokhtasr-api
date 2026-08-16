import { Client } from '@/database/lib/types';
import { ReviewCreatePayload, ReviewRepository } from '@/database/repositories/review';
import { validateSchema } from '@/lib/utils';

export class ReviewService {
	constructor(private readonly client: Client) {}

	async create(visitId: string, customerId: string, payload: ReviewCreatePayload) {
		validateSchema(ReviewRepository.create(), payload);

		const visit = await this.client.visit.findUnique({ where: { id: visitId }, include: { proposal: true, review: true } });
		if (!visit) throw new Error('Visit not found');
		if (visit.proposal.customerId !== customerId) throw new Error('Forbidden');
		if (visit.status !== 'COMPLETED') throw new Error('Visit must be completed before it can be reviewed');
		if (visit.review) throw new Error('Review already exists for this visit');

		const customer = await this.client.customer.findUnique({ where: { id: customerId }, include: { user: true } });
		if (!customer) throw new Error('Customer not found');

		return await this.client.review.create({
			data: {
				visit: { connect: { id: visitId } },
				reviewerName: customer.user.name,
				rating: payload.rating,
				comment: payload.comment ?? null,
				tags: payload.tags ?? []
			}
		});
	}

	async listForHandyman(handymanId: string) {
		const handyman = await this.client.handyman.findUnique({ where: { id: handymanId } });
		if (!handyman) throw new Error('Handyman not found');

		const [reviews, aggregate] = await Promise.all([
			this.client.review.findMany({ where: { visit: { handymanId } }, orderBy: { createdAt: 'desc' } }),
			this.client.review.aggregate({ where: { visit: { handymanId } }, _avg: { rating: true }, _count: true })
		]);

		return { average: aggregate._avg.rating ?? 0, count: aggregate._count, reviews };
	}
}
