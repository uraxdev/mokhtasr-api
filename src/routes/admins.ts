import { client } from '@/database/lib/client';
import type { Router } from 'express';

export default (router: Router) => {
	router.post('/admins/clear', async (_req, res, next) => {
		const promises = [client.application.deleteMany(), client.chatMessage.deleteMany(), client.handyman.deleteMany(), client.proposal.deleteMany(), client.review.deleteMany(), client.visit.deleteMany()];

		try {
			if (process.env['NODE_ENV'] === 'production') throw new Error('Forbidden');
			await Promise.all(promises);
			return res.status(200).send('applications, chat messages, handymen, proposals, reviews, and visits are now cleared.');
		} catch (error) {
			return next(error);
		}
	});
};
