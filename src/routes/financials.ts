import { client } from '@/database/lib/client';
import { FinancialService } from '@/services/financials';
import type { Router } from 'express';

export default (router: Router) => {
	router.get('/financials/summary', async (_req, res, next) => {
		const handymanId = res.locals.entities.handyman;

		if (!handymanId) return next(new Error('Forbidden: handymen only'));

		try {
			return res.status(200).json(await new FinancialService(client).summary(handymanId));
		} catch (error) {
			return next(error);
		}
	});

	router.get('/financials/transactions', async (req, res, next) => {
		const handymanId = res.locals.entities.handyman;

		if (!handymanId) return next(new Error('Forbidden: handymen only'));

		const { page, limit } = req.query as Record<string, string | undefined>;

		try {
			return res.status(200).json(await new FinancialService(client).transactions(handymanId, Math.max(1, parseInt(page ?? '1', 10) || 1), Math.max(1, parseInt(limit ?? '20', 10) || 20)));
		} catch (error) {
			return next(error);
		}
	});
};
