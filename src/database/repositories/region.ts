import z from 'zod';

export class RegionRepository {
	static get() {
		return z.object({
			id: z.uuid(),
			name: z.string(),
			parentRegionId: z.uuid().nullable(),
			createdAt: z.iso.datetime(),
			updatedAt: z.iso.datetime(),
			get subRegions() {
				return z.array(RegionRepository.get()).optional();
			}
		});
	}
}

export type Region = z.infer<ReturnType<typeof RegionRepository.get>>;
