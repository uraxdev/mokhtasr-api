import { Client } from '@/database/lib/types';

export class CategoryService {
	constructor(private readonly client: Client) {}

	async list() {
		return await this.client.category.findMany({ orderBy: { createdAt: 'asc' } });
	}

	async find(id: string) {
		return await this.client.category.findUnique({ where: { id }, include: { services: true } });
	}
}
