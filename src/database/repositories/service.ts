import z from 'zod';

export class ServiceRepository {
	static get() {
		return z.object({
			id: z.uuid(),
			name: z.string(),
			createdAt: z.iso.datetime(),
			updatedAt: z.iso.datetime()
		});
	}
}

export type Service = z.infer<ReturnType<typeof ServiceRepository.get>>;
