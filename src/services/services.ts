import { Prisma } from '@/database/generated/client';
import { Client } from '@/database/lib/types';

export class ServiceService {
	constructor(private readonly client: Client) {}

	async list(where: Prisma.ServiceWhereInput = {}) {
		return await this.client.service.findMany({ where, orderBy: { createdAt: 'asc' } });
	}

	async find(id: string) {
		return await this.client.service.findUnique({ where: { id } });
	}
}
