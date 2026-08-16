import { client } from '@/database/lib/client';
import { ReviewService } from '@/services/reviews';
import type { Router } from 'express';

export default (router: Router) => {
	router.post('/visits/:id/review', async (req, res, next) => {
		const id = req.params['id'];
		const payload = req.body;
		const customerId = res.locals.entities.customer;

		try {
			if (!customerId) throw new Error('Forbidden: customers only');
			return res.status(201).json(await new ReviewService(client).create(id, customerId, payload));
		} catch (error) {
			return next(error);
		}
	});

	router.get('/handymen/:id/reviews', async (req, res, next) => {
		const id = req.params['id'];

		try {
			return res.status(200).json(await new ReviewService(client).listForHandyman(id));
		} catch (error) {
			return next(error);
		}
	});
};
