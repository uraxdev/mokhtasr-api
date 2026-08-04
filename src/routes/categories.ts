import { client } from '@/database/lib/client';
import { CategoryService } from '@/services/categories';
import type { Router } from 'express';

export default (router: Router) => {
	router.get('/categories', async (_req, res, next) => {
		try {
			return res.status(200).json(await new CategoryService(client).list());
		} catch (error) {
			return next(error);
		}
	});

	router.get('/categories/:id', async (req, res, next) => {
		const id = req.params['id'];

		try {
			return res.status(200).json(await new CategoryService(client).find(id));
		} catch (error) {
			return next(error);
		}
	});
};
