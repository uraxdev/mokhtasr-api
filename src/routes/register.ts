import { client } from '@/database/lib/client';
import type { RegisterCustomer, RegisterHandyman } from '@/database/repositories/register';
import { RegisterService } from '@/services/register';
import type { Router } from 'express';

export default (router: Router) => {
	router.post('/register/handyman/:userId', async (req, res, next) => {
		const userId = req.params['userId'];
		const payload = req.body satisfies RegisterHandyman;
		const files = req.files as Express.Multer.File[];

		const images = {
			nationalIdFront: files?.find((file) => file.fieldname === 'nationalIdFront'),
			nationalIdBack: files?.find((file) => file.fieldname === 'nationalIdBack'),
			selfie: files?.find((file) => file.fieldname === 'selfie')
		};

		try {
			return res.status(200).json(await new RegisterService(client).handyman(userId, { ...payload, ...images }));
		} catch (error) {
			return next(error);
		}
	});

	router.post('/register/customer/:userId', async (req, res, next) => {
		const userId = req.params['userId'];
		const payload = req.body satisfies RegisterCustomer;
		const avatar = (req.files as Express.Multer.File[])?.find((file) => file.fieldname === 'avatar');

		try {
			return res.status(200).json(await new RegisterService(client).customer(userId, { ...payload, avatar }));
		} catch (error) {
			return next(error);
		}
	});

	router.post('/register/admin/:userId', async (req, res, next) => {
		const userId = req.params['userId'];

		try {
			return res.status(200).json(await new RegisterService(client).admin(userId));
		} catch (error) {
			return next(error);
		}
	});
};
