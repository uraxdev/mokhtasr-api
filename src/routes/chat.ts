import { client } from '@/database/lib/client';
import { ChatService } from '@/services/chat';
import type { Router } from 'express';

export default (router: Router) => {
	router.get('/offers/:offerId/chat', async (req, res, next) => {
		const id = req.params['offerId'];
		const userId = res.locals.entities.user;

		try {
			return res.status(200).json(await new ChatService(client).readMessages(id, userId));
		} catch (error) {
			return next(error);
		}
	});

	router.post('/offers/:offerId/chat', async (req, res, next) => {
		const id = req.params['offerId'];
		const payload = req.body;
		const userId = res.locals.entities.user;

		try {
			return res.status(201).json(await new ChatService(client).sendMessage(id, userId, payload));
		} catch (error) {
			return next(error);
		}
	});

	router.patch('/offers/:offerId/reschedule', async (req, res, next) => {
		const id = req.params['offerId'];
		const payload = req.body;
		const userId = res.locals.entities.user;

		try {
			return res.status(200).json(await new ChatService(client).reschedule(id, userId, payload));
		} catch (error) {
			return next(error);
		}
	});
};
