import { client } from '@/database/lib/client';
import { OfferService } from '@/services/offers';
import type { Router } from 'express';

export default (router: Router) => {
	router.post('/offers', async (req, res, next) => {
		const payload = req.body;
		const handymanId = res.locals.entities.handyman;

		try {
			if (!handymanId) throw new Error('Forbidden: handymen only');
			return res.status(201).json(await new OfferService(client).create(handymanId, payload));
		} catch (error) {
			return next(error);
		}
	});

	router.get('/offers', async (_req, res, next) => {
		const handymanId = res.locals.entities.handyman;

		try {
			if (!handymanId) throw new Error('Forbidden: handymen only');
			return res.status(200).json(await new OfferService(client).list(handymanId));
		} catch (error) {
			return next(error);
		}
	});

	router.get('/offers/:id', async (req, res, next) => {
		const id = req.params['id'];
		const handymanId = res.locals.entities.handyman;

		try {
			if (!handymanId) throw new Error('Forbidden: handymen only');
			return res.status(200).json(await new OfferService(client).find(id, handymanId));
		} catch (error) {
			return next(error);
		}
	});

	router.patch('/offers/:id/stage', async (req, res, next) => {
		const id = req.params['id'];
		const payload = req.body;
		const handymanId = res.locals.entities.handyman;

		try {
			if (!handymanId) throw new Error('Forbidden: handymen only');
			return res.status(200).json(await new OfferService(client).advanceStage(id, handymanId, payload));
		} catch (error) {
			return next(error);
		}
	});

	router.post('/offers/:id/verify-code', async (req, res, next) => {
		const id = req.params['id'];
		const payload = req.body;
		const customerId = res.locals.entities.customer;

		try {
			if (!customerId) throw new Error('Forbidden: handymen only');
			return res.status(200).json(await new OfferService(client).verifyCode(id, customerId, payload));
		} catch (error) {
			return next(error);
		}
	});
};
