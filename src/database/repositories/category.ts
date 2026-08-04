import z from 'zod';
import { ServiceRepository } from './service';

export class CategoryRepository {
	static get() {
		return z.object({
			id: z.uuid(),
			name: z.object({ ar: z.string(), en: z.string() }),
			createdAt: z.iso.datetime(),
			updatedAt: z.iso.datetime(),
			get services() {
				return z.array(ServiceRepository.get()).optional();
			}
		});
	}
}

export type Category = z.infer<ReturnType<typeof CategoryRepository.get>>;
