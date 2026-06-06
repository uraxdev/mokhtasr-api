import { Prisma } from '@/database/generated/client';
import { Client } from '@/database/lib/types';
import { UserService } from './users';

export class CustomerService {
	constructor(private readonly client: Client) {}

	private include = { user: true } satisfies Prisma.CustomerInclude;

	async list(where: Prisma.CustomerWhereInput) {
		return await this.client.customer.findMany({ where, include: this.include });
	}

	async find(where: Prisma.CustomerWhereUniqueInput) {
		return await this.client.customer.findUnique({ where, include: this.include });
	}

	async create(userId: string) {
		const user = await new UserService(this.client).find({ id: userId });
		if (!user) throw new Error('User not found');

		const customer = await this.client.customer.findUnique({ where: { userId } });
		if (customer) throw new Error('User is already a customer');

		return await this.client.customer.create({ data: { user: { connect: { id: user.id } } } });
	}
}
