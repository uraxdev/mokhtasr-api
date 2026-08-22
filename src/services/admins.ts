import { Prisma } from '@/database/generated/client';
import { Client } from '@/database/lib/types';
import { UserService } from './users';

export class AdminService {
	constructor(private readonly client: Client) {}

	private include = { user: true } satisfies Prisma.AdminInclude;

	async list(where: Prisma.AdminWhereInput) {
		return await this.client.admin.findMany({ where, include: this.include });
	}

	async find(where: Prisma.AdminWhereUniqueInput) {
		return await this.client.admin.findUnique({ where, include: this.include });
	}

	async create(userId: string) {
		const user = await new UserService(this.client).find({ id: userId });
		if (!user) throw new Error('User not found');

		const admin = await this.client.admin.findUnique({ where: { userId } });
		if (admin) throw new Error('Conflict: user is already an admin');

		return await this.client.admin.create({ data: { user: { connect: { id: user.id } } } });
	}
}
