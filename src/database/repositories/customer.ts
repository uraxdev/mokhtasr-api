import z from 'zod';

export class CustomerRepository {
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

export type Customer = z.infer<ReturnType<typeof CustomerRepository.get>>;
export type CustomerCreatePayload = z.infer<ReturnType<typeof CustomerRepository.create>>;
