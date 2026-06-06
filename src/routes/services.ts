import { client } from '@/database/lib/client';
import { ServiceService } from '@/services/services';
import type { Router } from 'express';

export default (router: Router) => {
	router.get('/services', async (_req, res, next) => {
		try {
			return res.status(200).json(await new ServiceService(client).list());
		} catch (error) {
			return next(error);
		}
	});

	router.get('/services/:id', async (req, res, next) => {
		const id = req.params['id'];

		try {
			return res.status(200).json(await new ServiceService(client).find(id));
		} catch (error) {
			return next(error);
		}
	});
};
