import { client } from '@/database/lib/client';
import { AuthSystem } from '@/subsystems/auth';
import type { Router } from 'express';

export default (router: Router) => {
	router.post('/auth/initiate', async (req, res, next) => {
		const payload = req.body;

		try {
			return res.status(200).json(await new AuthSystem(client).initiate(payload));
		} catch (error) {
			return next(error);
		}
	});

	router.post('/auth/verify', async (req, res, next) => {
		const payload = req.body;

		try {
			return res.status(200).json(await new AuthSystem(client).verify(payload));
		} catch (error) {
			return next(error);
		}
	});

	router.post('/auth/refresh', async (req, res, next) => {
		const payload = req.body;

		try {
			return res.status(200).json(await new AuthSystem(client).refresh(payload));
		} catch (error) {
			return next(error);
		}
	});
};
