import { client } from '@/database/lib/client';
import { ChatService } from '@/services/chat';
import type { Router } from 'express';

export default (router: Router) => {
	router.get('/visits/:visitId/chat', async (req, res, next) => {
		const id = req.params['visitId'];
		const userId = res.locals.entities.user;

		try {
			return res.status(200).json(await new ChatService(client).readMessages(id, userId));
		} catch (error) {
			return next(error);
		}
	});

	router.post('/visits/:visitId/chat', async (req, res, next) => {
		const id = req.params['visitId'];
		const payload = req.body;
		const userId = res.locals.entities.user;

		try {
			return res.status(201).json(await new ChatService(client).sendMessage(id, userId, payload));
		} catch (error) {
			return next(error);
		}
	});

	router.patch('/visits/:visitId/reschedule', async (req, res, next) => {
		const id = req.params['visitId'];
		const payload = req.body;
		const userId = res.locals.entities.user;

		try {
			return res.status(200).json(await new ChatService(client).reschedule(id, userId, payload));
		} catch (error) {
			return next(error);
		}
	});
};
