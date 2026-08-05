import { Prisma } from '@/database/generated/client';
import { Client } from '@/database/lib/types';

export class RegionService {
	constructor(private readonly client: Client) {}

	async list(where: Prisma.RegionWhereInput = {}) {
		return await this.client.region.findMany({ where, orderBy: { name: 'asc' } });
	}

	async find(id: string) {
		return await this.client.region.findUnique({ where: { id }, include: { subRegions: true, parentRegion: true } });
	}
}
