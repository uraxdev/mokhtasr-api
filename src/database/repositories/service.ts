import z from 'zod';

export class ServiceRepository {
	static get() {
		return z.object({
			id: z.uuid(),
			name: z.object({ ar: z.string(), en: z.string() }),
			categoryId: z.uuid(),
			createdAt: z.iso.datetime(),
			updatedAt: z.iso.datetime()
		});
	}
}

export type Service = z.infer<ReturnType<typeof ServiceRepository.get>>;
