import { client } from '@/database/lib/client';
import { AccessTokenPayload } from '@/database/repositories/auth';
import { env, verifyToken } from '@/lib/utils';
import { UserService } from '@/services/users';
import type { NextFunction, Request, Response } from 'express';

const COOKIE_NAME = 'portal_session';
const COOKIE_PATH = '/admins/portal';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function issuePortalSession(res: Response, accessToken: string) {
	res.cookie(COOKIE_NAME, accessToken, {
		httpOnly: true,
		sameSite: 'lax',
		secure: env('NODE_ENV') === 'production',
		path: COOKIE_PATH,
		maxAge: ONE_DAY_MS
	});
}

export function clearPortalSession(res: Response) {
	res.clearCookie(COOKIE_NAME, { path: COOKIE_PATH });
}

export async function withPortalSession(req: Request, res: Response, next: NextFunction) {
	const token = req.cookies?.[COOKIE_NAME];

	if (!token) {
		return res.redirect('/admins/portal/login');
	}

	const decoded = verifyToken<AccessTokenPayload>(token);
	if (!decoded) {
		return res.redirect('/admins/portal/login');
	}

	const user = await new UserService(client).find({ id: decoded.data.id });
	if (!user || !user.admin) {
		return res.redirect('/admins/portal/login');
	}

	res.locals['portal'] = { userId: user.id, adminId: user.admin.id };
	return next();
}
