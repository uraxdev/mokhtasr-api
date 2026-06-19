import type { Request } from 'express';
import jwt from 'jsonwebtoken';
import { createHash } from 'node:crypto';
import ip from 'request-ip';
import z from 'zod';

import { PHONE_NUMBER_REGEX } from './constants';

export const getClientIp = ip.getClientIp;

export function ArrayOf<T extends z.ZodType>(schema: T): z.ZodArray<T> {
	return z.array(schema);
}

export function ResponseObject<T extends z.ZodType>(schema: T) {
	return z.object({ data: z.array(schema), count: z.number() });
}

export function validateSchema<T extends z.ZodType>(schema: T, payload: unknown): asserts payload is z.infer<T> {
	const result = schema.safeParse(payload);

	if (!result.success) {
		const paths = result.error.issues.map((issue) => issue.path.join('.'));
		throw new Error(`Validation failed: ${paths.join(', ')}`);
	}
}

export function parseSchema<T extends z.ZodType>(schema: T, payload: unknown) {
	try {
		return schema.parse(payload);
	} catch (error) {
		if (error instanceof z.ZodError) {
			throw new Error(`Validation failed: ${error.message}`);
		} else {
			throw new Error(`Unknown validation error`);
		}
	}
}

export const clipText = (text: string, limit: number = 100, showEllipses: boolean = true) => {
	if (text.length <= limit) {
		return text;
	} else {
		const clippedText = text.substring(0, limit);
		return showEllipses ? `${clippedText}…` : clippedText;
	}
};

export function capitalize(text: string | null | undefined) {
	if (!text) return '';

	if (text.includes('-')) {
		const updated = text.replace('-', ' ');
		const words = updated.split(' ').map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());

		return words.join(' ');
	} else {
		const words = text.split(' ').map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());

		return words.join(' ');
	}
}

export function toSingular(name: string | undefined) {
	if (name === undefined) return '';

	if (name.endsWith('ies')) {
		return name.slice(0, -3) + 'y';
	} else if (name.endsWith('s')) {
		return name.slice(0, -1);
	}

	return name;
}

export function slugify(text: string | undefined) {
	if (!text) return '';

	const words = text
		.trim()
		.split(' ')
		.filter((word) => word.trim() !== '')
		.map((word) => word.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF\u0660-\u0669]+/g, '-'));
	return words.join('-');
}

export function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function splitPhone(phone: string): string[] {
	const isValid = phone.match(PHONE_NUMBER_REGEX);

	if (!isValid) {
		throw new Error('Invalid phone number');
	}

	const parts = phone.split(' ');
	return parts.length === 2 ? parts : [phone];
}

export function createGuestHash(req: Request) {
	const ip = getClientIp(req);
	const agent = req.headers['user-agent'] || 'unknown';
	return createHash('sha256').update(`${ip}-${agent}`).digest('hex').slice(0, 16);
}

export function isSafeQueryParam(param: string | null | undefined) {
	return !!param && param !== 'undefined' && param !== 'null' && param !== '';
}

export function getTimePassed(date: Date | string): string {
	const now = new Date();
	const updated = new Date(date);
	const diff = now.getTime() - updated.getTime();
	const seconds = Math.floor(diff / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (days > 0) return `${days}d`;
	if (hours > 0) return `${hours}h`;
	if (minutes > 0) return `${minutes}m`;
	return `${seconds}s`;
}

export function generateToken(data: string | object, options?: jwt.SignOptions): string {
	const secret = process.env['JWT_SECRET'];

	if (!secret) {
		throw new Error('JWT_SECRET is not defined');
	}

	return jwt.sign({ data }, secret, options);
}

export function verifyToken<T extends jwt.JwtPayload>(token: string): T | null {
	const secret = process.env['JWT_SECRET'];

	if (!secret) {
		throw new Error('JWT_SECRET is not defined');
	}

	try {
		const result = jwt.verify(token, secret);
		return result as T;
	} catch {
		return null;
	}
}

export function generateOTP() {
	if (process.env['USE_RANDOM_OTP'] !== 'YES') return '123456';
	return Math.floor(100000 + Math.random() * 900000).toString();
}

export function parseDateRange(range?: string): { gte: Date; lte: Date } | undefined {
	if (!range) return undefined;

	const now = new Date();
	const start = new Date(now);
	start.setHours(0, 0, 0, 0);
	const end = new Date(start);

	if (range === 'TODAY') {
		end.setHours(23, 59, 59, 999);
	} else if (range === 'TOMORROW') {
		start.setDate(start.getDate() + 1);
		end.setDate(end.getDate() + 1);
		end.setHours(23, 59, 59, 999);
	} else if (range === 'THIS_WEEK') {
		end.setDate(end.getDate() + 7);
		end.setHours(23, 59, 59, 999);
	} else {
		return undefined;
	}

	return { gte: start, lte: end };
}
