import { client } from '@/database/lib/client';
import { UserService } from '@/services/users';
import type { Router } from 'express';

export default (router: Router) => {
	router.get('/users', async (_req, res, next) => {
		const userId = res.locals.entities.user;

		try {
			return res.status(200).json(await new UserService(client).find({ id: userId }));
		} catch (error) {
			return next(error);
		}
	});

	router.patch('/users', async (req, res, next) => {
		const userId = res.locals.entities.user;
		const payload = req.body;
		const files = req.files as Express.Multer.File[];

		const avatar = files?.find((file) => file.fieldname === 'avatar');

		try {
			return res.status(200).json(await new UserService(client).update({ id: userId }, { ...payload, avatar }));
		} catch (error) {
			return next(error);
		}
	});

	router.delete('/users', async (_req, res, next) => {
		const userId = res.locals.entities.user;

		try {
			return res.status(200).json(await new UserService(client).delete({ id: userId }));
		} catch (error) {
			return next(error);
		}
	});
};
