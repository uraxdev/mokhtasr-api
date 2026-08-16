import { Client } from '@/database/lib/types';
import { ReviewCreatePayload, ReviewRepository } from '@/database/repositories/review';
import { validateSchema } from '@/lib/utils';

export class ReviewService {
	constructor(private readonly client: Client) {}

	async create(offerId: string, customerId: string, payload: ReviewCreatePayload) {
		validateSchema(ReviewRepository.create(), payload);

		const offer = await this.client.offer.findUnique({ where: { id: offerId }, include: { proposal: true, review: true } });
		if (!offer) throw new Error('Offer not found');
		if (offer.proposal.customerId !== customerId) throw new Error('Forbidden');
		if (offer.status !== 'COMPLETED') throw new Error('Offer must be completed before it can be reviewed');
		if (offer.review) throw new Error('Review already exists for this offer');

		const customer = await this.client.customer.findUnique({ where: { id: customerId }, include: { user: true } });
		if (!customer) throw new Error('Customer not found');

		return await this.client.review.create({
			data: {
				offer: { connect: { id: offerId } },
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
			this.client.review.findMany({ where: { offer: { handymanId } }, orderBy: { createdAt: 'desc' } }),
			this.client.review.aggregate({ where: { offer: { handymanId } }, _avg: { rating: true }, _count: true })
		]);

		return { average: aggregate._avg.rating ?? 0, count: aggregate._count, reviews };
	}
}
