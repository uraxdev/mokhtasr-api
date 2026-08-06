import { env, getClientIp } from '@/lib/utils';
import { NextFunction, Request, Response } from 'express';

interface ExpressError extends Error {
	status?: number;
	code?: string;
	cause?: unknown;
}

function isProduction() {
	return env('NODE_ENV') === 'production';
}

function resolveStatus(error: ExpressError): number {
	const message = error.message ?? '';

	if (typeof error.status === 'number') return error.status;

	switch (error.code) {
		case 'P2002':
			return 409;
		case 'P2025':
			return 404;
		default:
			break;
	}

	if (/unauthorized/i.test(message)) return 401;
	if (/forbidden/i.test(message) || /not allowed by cors/i.test(message)) return 403;
	if (/not found/i.test(message)) return 404;
	if (/already exists/i.test(message) || /conflict/i.test(message)) return 409;
	if (/validation/i.test(message) || /invalid/i.test(message) || /must be/i.test(message) || /bad request/i.test(message)) return 400;

	return 500;
}

function extractDetails(error: ExpressError): unknown {
	if (!error.cause) {
		return undefined;
	}

	if (typeof error.cause === 'string') {
		return error.cause;
	}

	if (error.cause instanceof Error) {
		return error.cause.message;
	}

	if (typeof error.cause === 'object') {
		try {
			return JSON.parse(JSON.stringify(error.cause));
		} catch {
			return undefined;
		}
	}

	return undefined;
}

export function withErrorBoundary(error: ExpressError, req: Request, res: Response, _next: NextFunction) {
	const status = resolveStatus(error);
	const message = error.message || 'Internal server error';
	const details = extractDetails(error);

	const payload: Record<string, unknown> = { message };

	if (details !== undefined) {
		payload['details'] = details;
	}

	if (!isProduction()) {
		const isAuthenticated = req.headers['authorization'] ? 'yes' : 'no';

		console.error(
			`\x1b[31m❌ Errored Request\x1b[0m\nMethod\t\t\t\x1b[33m${req.method}\x1b[0m\nURL\t\t\t\x1b[33m${req.originalUrl}\x1b[0m\nIP\t\t\t\x1b[33m${getClientIp(req)}\x1b[0m\nHostname\t\t\x1b[33m${req.hostname}\x1b[0m\nStatus\t\t\t\x1b[33m${status}\x1b[0m\nMessage\t\t\t\x1b[33m${error.message}\x1b[0m\nAuthenticated\t\t\x1b[33m${isAuthenticated}\x1b[0m\n`
		);
	}

	res.status(status).json({ error: payload });
}
