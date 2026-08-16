import { client } from '@/database/lib/client';
import { AccessTokenPayload } from '@/database/repositories/auth';
import { env, verifyToken } from '@/lib/utils';
import { UserService } from '@/services/users';
import { NextFunction, Request, Response } from 'express';

const publicRequests: { method: string; path: RegExp }[] = [
	{ method: 'POST', path: /^\/auth\/initiate$/ },
	{ method: 'POST', path: /^\/auth\/verify$/ },
	{ method: 'POST', path: /^\/auth\/refresh$/ },
	{ method: 'GET', path: /^\/$/ },
	{ method: 'GET', path: /^\/openapi\.json$/ }
];

function isPublicRequest(method: string, path: string) {
	return publicRequests.some((request) => {
		return request.method === method && request.path.test(path);
	});
}

export async function withAuthentication(req: Request, res: Response, next: NextFunction) {
	const authHeader = req.headers.authorization;
	const canPass = env('NODE_ENV') !== 'production' && authHeader === 'Bearer PA$$';

	if (isPublicRequest(req.method, req.path) || canPass) {
		return next();
	}

	try {
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			throw new Error('Unauthorized', { cause: 'Missing authorization header' });
		}

		const access = authHeader.split(' ')[1] as string;

		const decoded = verifyToken<AccessTokenPayload>(access);
		if (!decoded) {
			throw new Error('Unauthorized', { cause: 'Invalid token' });
		}

		const user = await new UserService(client).find({ id: decoded.data.id });
		if (!user) {
			throw new Error('Unauthorized', { cause: 'Invalid user' });
		}

		res.locals['entities'] = {
			user: user.id,
			role: user.role,
			...(user.admin && { admin: user.admin.id }),
			...(user.customer && { customer: user.customer.id }),
			...(user.handyman && { handyman: user.handyman.id })
		};

		return next();
	} catch (error) {
		next(error);
	}
}
