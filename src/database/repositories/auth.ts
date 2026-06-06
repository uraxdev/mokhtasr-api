import { PhoneSchema } from '@/lib/schemas';
import z from 'zod';
import { UserRole } from '../generated/enums';
import { UserRepository } from './user';

export class AuthRepository {
	static role = ['ADMIN', 'HANDYMAN', 'CUSTOMER'] satisfies UserRole[];

	static initiate() {
		return z.object({
			phone: PhoneSchema
		});
	}

	static verify() {
		return z.object({
			verificationId: z.uuid(),
			phone: PhoneSchema,
			otp: z.string().length(6),
			role: z.enum(AuthRepository.role).optional()
		});
	}

	static verificationToken() {
		return z.object({
			data: z.object({ phone: PhoneSchema, otp: z.string().length(6) }),
			iat: z.number(),
			exp: z.number()
		});
	}

	static session() {
		return z.object({
			access: z.string(),
			refresh: z.string(),
			user: UserRepository.get()
		});
	}

	static refresh() {
		return z.object({
			refresh: z.string()
		});
	}

	static accessToken() {
		return z.object({
			data: UserRepository.get().pick({ id: true, role: true }),
			iat: z.number(),
			exp: z.number()
		});
	}
}

export type InitiatePayload = z.infer<ReturnType<typeof AuthRepository.initiate>>;
export type InitiateResponse = { verificationId: string };
export type VerifyPayload = z.infer<ReturnType<typeof AuthRepository.verify>>;
export type VerificationTokenPayload = z.infer<ReturnType<typeof AuthRepository.verificationToken>>;
export type Session = z.infer<ReturnType<typeof AuthRepository.session>>;
export type RefreshPayload = z.infer<ReturnType<typeof AuthRepository.refresh>>;
export type AccessTokenPayload = z.infer<ReturnType<typeof AuthRepository.accessToken>>;
