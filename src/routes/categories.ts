import { Prisma } from '@/database/generated/client';
import { client } from '@/database/lib/client';
import { CategoryService } from '@/services/categories';
import type { Router } from 'express';

export default (router: Router) => {
	router.get('/categories', async (req, res, next) => {
		const query = req.query as { name?: string };
		const where = {} as Prisma.CategoryWhereInput;

		if (query.name) {
			where.OR = [{ name: { path: ['en'], string_contains: query.name } }, { name: { path: ['ar'], string_contains: query.name } }];
		}

		try {
			return res.status(200).json(await new CategoryService(client).list(where));
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
