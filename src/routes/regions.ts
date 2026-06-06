import { client } from '@/database/lib/client';
import { RegionService } from '@/services/regions';
import type { Router } from 'express';

export default (router: Router) => {
	router.get('/regions', async (_req, res, next) => {
		try {
			return res.status(200).json(await new RegionService(client).list());
		} catch (error) {
			return next(error);
		}
	});

	router.get('/regions/:id', async (req, res, next) => {
		const id = req.params['id'];

		try {
			return res.status(200).json(await new RegionService(client).find(id));
		} catch (error) {
			return next(error);
		}
	});
};
