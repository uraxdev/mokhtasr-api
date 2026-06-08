import { client } from '@/database/lib/client';
import { ApplicationService } from '@/services/applications';
import type { Router } from 'express';

export default (router: Router) => {
	router.get('/applications', async (_req, res, next) => {
		const adminId = res.locals.entities.admin;

		try {
			if (!adminId) return next(new Error('Forbidden: admins only'));
			return res.status(200).json(await new ApplicationService(client).list());
		} catch (error) {
			return next(error);
		}
	});

	router.get('/applications/:id', async (req, res, next) => {
		const id = req.params['id'];

		try {
			return res.status(200).json(await new ApplicationService(client).find(id));
		} catch (error) {
			return next(error);
		}
	});

	router.get('/applications/:id/status', async (req, res, next) => {
		const id = req.params['id'];
		const handymanId = res.locals.entities.handyman;

		try {
			if (!handymanId) return next(new Error('Forbidden: handymen only'));
			return res.status(200).json(await new ApplicationService(client).status(id));
		} catch (error) {
			return next(error);
		}
	});

	router.patch('/applications/:id/accept', async (req, res, next) => {
		const id = req.params['id'];
		const adminId = res.locals.entities.admin;

		try {
			if (!adminId) return next(new Error('Forbidden: admins only'));
			return res.status(200).json(await new ApplicationService(client).accept(id));
		} catch (error) {
			return next(error);
		}
	});

	router.patch('/applications/:id/reject', async (req, res, next) => {
		const id = req.params['id'];
		const payload = req.body;
		const adminId = res.locals.entities.admin;

		try {
			if (!adminId) return next(new Error('Forbidden: admins only'));
			return res.status(200).json(await new ApplicationService(client).reject(id, payload));
		} catch (error) {
			return next(error);
		}
	});
};
