import z from 'zod';

export class AdminRepository {
	static get() {
		return z.object({
			id: z.uuid(),
			userId: z.uuid(),
			createdAt: z.iso.datetime(),
			updatedAt: z.iso.datetime()
		});
	}

	static create() {
		return z.object({
			userId: z.uuid()
		});
	}
}

export type Admin = z.infer<ReturnType<typeof AdminRepository.get>>;
export type AdminCreatePayload = z.infer<ReturnType<typeof AdminRepository.create>>;
