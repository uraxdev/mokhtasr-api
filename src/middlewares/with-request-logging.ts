import { getClientIp } from '@/lib/utils';
import { RequestHandler } from 'express';

export const withRequestLogging: RequestHandler = (req, res, next) => {
	if (process.env['NODE_ENV'] === 'production' || process.env['LOG_REQUESTS'] === 'false') return next();

	const isAuthenticated = req.headers['authorization'] ? 'yes' : 'no';

	console.info(
		`\x1b[34m🚀 Incoming Request\x1b[0m\nMethod\t\t\t\x1b[33m${req.method}\x1b[0m\nURL\t\t\t\x1b[33m${req.url}\x1b[0m\nIP\t\t\t\x1b[33m${getClientIp(req)}\x1b[0m\nHostname\t\t\x1b[33m${req.hostname}\x1b[0m\nStatus\t\t\t\x1b[33m${res.statusCode}\x1b[0m\nAuthenticated\t\t\x1b[33m${isAuthenticated}\x1b[0m\n`
	);

	next();
};
