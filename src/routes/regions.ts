import { Prisma } from '@/database/generated/client';
import { client } from '@/database/lib/client';
import { RegionService } from '@/services/regions';
import type { Router } from 'express';

export default (router: Router) => {
	router.get('/regions', async (req, res, next) => {
		const query = req.query as { name?: string };
		const where = {} as Prisma.RegionWhereInput;

		if (query.name) {
			where.name = query.name;
		}

		try {
			return res.status(200).json(await new RegionService(client).list(where));
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
