import { client } from '@/database/lib/client';
import { ProposalService } from '@/services/proposals';
import type { Router } from 'express';

export default (router: Router) => {
	router.post('/proposals', async (req, res, next) => {
		const payload = req.body;
		const customerId = res.locals.entities.customer;

		try {
			if (!customerId) throw new Error('Forbidden: customer only');
			return res.status(201).json(await new ProposalService(client).create(customerId, payload));
		} catch (error) {
			return next(error);
		}
	});

	router.get('/proposals', async (_req, res, next) => {
		const customerId = res.locals.entities.customer;

		try {
			return res.status(200).json(await new ProposalService(client).list(customerId));
		} catch (error) {
			return next(error);
		}
	});

	router.get('/proposals/:id', async (req, res, next) => {
		const id = req.params['id'];
		const customerId = res.locals.entities.customer;

		try {
			if (!customerId) throw new Error('Forbidden: customer only');
			return res.status(200).json(await new ProposalService(client).find(id, customerId));
		} catch (error) {
			return next(error);
		}
	});

	router.patch('/proposals/:id/cancel', async (req, res, next) => {
		const id = req.params['id'];
		const customerId = res.locals.entities.customer;

		try {
			if (!customerId) throw new Error('Forbidden: customer only');
			return res.status(200).json(await new ProposalService(client).cancel(id, customerId));
		} catch (error) {
			return next(error);
		}
	});

	router.post('/proposals/:id/accept-offer', async (req, res, next) => {
		const id = req.params['id'];
		const payload = req.body;
		const customerId = res.locals.entities.customer;

		try {
			if (!customerId) throw new Error('Forbidden: customer only');
			return res.status(200).json(await new ProposalService(client).acceptOffer(id, customerId, payload));
		} catch (error) {
			return next(error);
		}
	});
};
