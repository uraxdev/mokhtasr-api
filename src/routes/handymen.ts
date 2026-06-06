import { client } from '@/database/lib/client';
import { HandymanService } from '@/services/handymen';
import type { Router } from 'express';

export default (router: Router) => {
	router.patch('/handymen', async (req, res, next) => {
		const handymanId = res.locals.entities.handyman;
		const payload = req.body;

		if (!handymanId) {
			return next(new Error('Forbidden: only handymen can update a handyman profile'));
		}

		try {
			return res.status(200).json(await new HandymanService(client).update({ id: handymanId }, payload));
		} catch (error) {
			return next(error);
		}
	});
};
