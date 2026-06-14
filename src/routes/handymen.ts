import { client } from '@/database/lib/client';
import { HandymanService } from '@/services/handymen';
import type { Router } from 'express';

export default (router: Router) => {
	router.patch('/handymen', async (req, res, next) => {
		const handymanId = res.locals.entities.handyman;
		const payload = req.body;

		try {
			if (!handymanId) throw new Error('Forbidden: handymen only');
			return res.status(200).json(await new HandymanService(client).update({ id: handymanId }, payload));
		} catch (error) {
			return next(error);
		}
	});

	router.post('/handymen/:id/block', async (req, res, next) => {
		const id = req.params['id'];
		const adminId = res.locals.entities.admin;

		try {
			if (!adminId) throw new Error('Forbidden: admins only');
			return res.status(200).json(await new HandymanService(client).block(id));
		} catch (error) {
			return next(error);
		}
	});
};
