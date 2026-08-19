import { client } from '@/database/lib/client';
import { NotificationService } from '@/services/notifications';
import type { Router } from 'express';

export default (router: Router) => {
	router.get('/notifications', async (req, res, next) => {
		const userId = res.locals.entities.user;
		const cursor = typeof req.query['cursor'] === 'string' ? req.query['cursor'] : undefined;

		try {
			return res.status(200).json(await new NotificationService(client).list(userId, cursor));
		} catch (error) {
			return next(error);
		}
	});

	router.patch('/notifications/read-all', async (_req, res, next) => {
		const userId = res.locals.entities.user;

		try {
			return res.status(200).json(await new NotificationService(client).markAllRead(userId));
		} catch (error) {
			return next(error);
		}
	});

	router.patch('/notifications/:id/read', async (req, res, next) => {
		const id = req.params['id'];
		const userId = res.locals.entities.user;

		try {
			return res.status(200).json(await new NotificationService(client).markRead(id, userId));
		} catch (error) {
			return next(error);
		}
	});

	router.post('/notifications/device-tokens', async (req, res, next) => {
		const userId = res.locals.entities.user;
		const payload = req.body;

		try {
			return res.status(201).json(await new NotificationService(client).registerDevice(userId, payload));
		} catch (error) {
			return next(error);
		}
	});

	router.delete('/notifications/device-tokens/:token', async (req, res, next) => {
		const token = req.params['token'];

		try {
			return res.status(200).json(await new NotificationService(client).unregisterDevice(token));
		} catch (error) {
			return next(error);
		}
	});
};
