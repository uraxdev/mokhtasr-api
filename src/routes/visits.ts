import { client } from '@/database/lib/client';
import { VisitService } from '@/services/visits';
import type { Router } from 'express';

export default (router: Router) => {
	router.post('/visits', async (req, res, next) => {
		const payload = req.body;
		const handymanId = res.locals.entities.handyman;

		try {
			if (!handymanId) throw new Error('Forbidden: handymen only');
			return res.status(201).json(await new VisitService(client).create(handymanId, payload));
		} catch (error) {
			return next(error);
		}
	});

	router.get('/visits', async (_req, res, next) => {
		const handymanId = res.locals.entities.handyman;

		try {
			if (!handymanId) throw new Error('Forbidden: handymen only');
			return res.status(200).json(await new VisitService(client).list(handymanId));
		} catch (error) {
			return next(error);
		}
	});

	router.get('/visits/:id', async (req, res, next) => {
		const id = req.params['id'];
		const handymanId = res.locals.entities.handyman;

		try {
			if (!handymanId) throw new Error('Forbidden: handymen only');
			return res.status(200).json(await new VisitService(client).find(id, handymanId));
		} catch (error) {
			return next(error);
		}
	});

	router.patch('/visits/:id/stage', async (req, res, next) => {
		const id = req.params['id'];
		const payload = req.body;
		const handymanId = res.locals.entities.handyman;

		try {
			if (!handymanId) throw new Error('Forbidden: handymen only');
			return res.status(200).json(await new VisitService(client).advanceStage(id, handymanId, payload));
		} catch (error) {
			return next(error);
		}
	});

	router.post('/visits/:id/verify-code', async (req, res, next) => {
		const id = req.params['id'];
		const payload = req.body;
		const customerId = res.locals.entities.customer;

		try {
			if (!customerId) throw new Error('Forbidden: customers only');
			return res.status(200).json(await new VisitService(client).verifyCode(id, customerId, payload));
		} catch (error) {
			return next(error);
		}
	});

	router.post('/visits/:id/convert-to-work', async (req, res, next) => {
		const id = req.params['id'];
		const payload = req.body;
		const handymanId = res.locals.entities.handyman;

		try {
			if (!handymanId) throw new Error('Forbidden: handymen only');
			return res.status(200).json(await new VisitService(client).convertToWork(id, handymanId, payload));
		} catch (error) {
			return next(error);
		}
	});
};
