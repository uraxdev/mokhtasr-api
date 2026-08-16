import { client } from '@/database/lib/client';
import { parseDateRange } from '@/lib/utils';
import type { Router } from 'express';

export default (router: Router) => {
	router.get('/jobs', async (req, res, next) => {
		const handymanId = res.locals.entities.handyman;

		if (!handymanId) return next(new Error('Forbidden: handymen only'));

		const { service, dateRange, page, limit } = req.query as Record<string, string | undefined>;
		const take = Math.min(Math.max(1, parseInt(limit ?? '20', 10) || 20), 100);
		const skip = (Math.max(1, parseInt(page ?? '1', 10) || 1) - 1) * take;
		const dueDate = parseDateRange(dateRange);

		try {
			const proposals = await client.proposal.findMany({
				where: {
					status: { in: ['WAITING_OFFERS', 'OFFERS_RECEIVED'] },
					...(service ? { serviceId: service } : {}),
					...(dueDate ? { dueDate } : {})
				},
				skip,
				take,
				orderBy: { createdAt: 'desc' },
				include: {
					service: { select: { id: true, name: true } },
					visits: { select: { id: true, price: true, handyman: { select: { id: true, user: { select: { id: true, name: true, avatar: true } } } }, createdAt: true } }
				}
			});

			const result = proposals.map((p) => ({
				id: p.id,
				service: p.service.name,
				title: p.title,
				description: p.description,
				address: p.address,
				distanceKm: null,
				dueDate: p.dueDate.toISOString(),
				visits: p.visits,
				submittedAt: p.createdAt.toISOString()
			}));

			return res.status(200).json(result);
		} catch (error) {
			return next(error);
		}
	});
};
