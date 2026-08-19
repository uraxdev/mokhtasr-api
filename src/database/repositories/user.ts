import { PhoneSchema } from '@/lib/schemas';
import z from 'zod';
import { AdminRepository } from './admin';
import { CustomerRepository } from './customer';
import { HandymanRepository } from './handyman';

export class UserRepository {
	static role = z.enum(['ADMIN', 'HANDYMAN', 'CUSTOMER']);
	static locale = z.enum(['AR', 'EN']);

	static get() {
		return z.object({
			id: z.uuid(),
			name: z.string(),
			phone: PhoneSchema,
			role: UserRepository.role,
			avatar: z.url().nullable(),
			locale: UserRepository.locale,
			createdAt: z.iso.datetime(),
			updatedAt: z.iso.datetime(),
			admin: AdminRepository.get().nullable(),
			handyman: HandymanRepository.get().nullable(),
			customer: CustomerRepository.get().nullable()
		});
	}

	static create() {
		return z.object({
			name: z.string(),
			phone: PhoneSchema,
			role: UserRepository.role
		});
	}

	static update() {
		return z.object({
			name: z.string().optional(),
			avatar: z.any(),
			locale: UserRepository.locale.optional()
		});
	}
}

export type User = z.infer<ReturnType<typeof UserRepository.get>>;
export type UserCreatePayload = z.infer<ReturnType<typeof UserRepository.create>>;
export type UserUpdatePayload = z.infer<ReturnType<typeof UserRepository.update>>;
