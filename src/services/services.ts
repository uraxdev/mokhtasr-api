import { Client } from '@/database/lib/types';

export class ServiceService {
	constructor(private readonly client: Client) {}

	async list() {
		return await this.client.service.findMany({ orderBy: { name: 'asc' } });
	}

	async find(id: string) {
		return await this.client.service.findUnique({ where: { id } });
	}
}
