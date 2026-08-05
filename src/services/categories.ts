import { Prisma } from '@/database/generated/client';
import { Client } from '@/database/lib/types';

export class CategoryService {
	constructor(private readonly client: Client) {}

	async list(where: Prisma.CategoryWhereInput = {}) {
		return await this.client.category.findMany({ where, orderBy: { createdAt: 'asc' } });
	}

	async find(id: string) {
		return await this.client.category.findUnique({ where: { id }, include: { services: true } });
	}
}
