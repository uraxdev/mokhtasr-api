import { Client } from '@/database/lib/types';

export class RegionService {
	constructor(private readonly client: Client) {}

	async list() {
		return await this.client.region.findMany({ orderBy: { name: 'asc' } });
	}

	async find(id: string) {
		return await this.client.region.findUnique({ where: { id }, include: { subRegions: true, parentRegion: true } });
	}
}
