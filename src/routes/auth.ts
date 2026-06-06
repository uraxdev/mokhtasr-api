import { client } from '@/database/lib/client';
import { AuthService } from '@/services/auth';
import type { Router } from 'express';

export default (router: Router) => {
	router.post('/auth/initiate', async (req, res, next) => {
		const payload = req.body;

		try {
			return res.status(200).json(await new AuthService(client).initiate(payload));
		} catch (error) {
			return next(error);
		}
	});

	router.post('/auth/verify', async (req, res, next) => {
		const payload = req.body;

		try {
			return res.status(200).json(await new AuthService(client).verify(payload));
		} catch (error) {
			return next(error);
		}
	});

	router.post('/auth/refresh', async (req, res, next) => {
		const payload = req.body;

		try {
			return res.status(200).json(await new AuthService(client).refresh(payload));
		} catch (error) {
			return next(error);
		}
	});
};
