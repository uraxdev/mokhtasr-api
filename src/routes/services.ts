import { Prisma } from '@/database/generated/client';
import { client } from '@/database/lib/client';
import { ServiceService } from '@/services/services';
import type { Router } from 'express';

export default (router: Router) => {
	router.get('/services', async (req, res, next) => {
		const query = req.query as { name?: string; category?: string };
		const where = {} as Prisma.ServiceWhereInput;

		if (query.name) {
			where.OR = [{ name: { path: ['en'], string_contains: query.name } }, { name: { path: ['ar'], string_contains: query.name } }];
		}

		if (query.category) {
			where.categoryId = query.category;
		}

		try {
			return res.status(200).json(await new ServiceService(client).list(where));
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
