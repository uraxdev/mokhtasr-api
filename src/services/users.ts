import { Prisma } from '@/database/generated/client';
import { Client } from '@/database/lib/types';
import { UserCreatePayload, UserRepository, UserUpdatePayload } from '@/database/repositories/user';
import { validateSchema } from '@/lib/utils';
import { uploadToBucket } from '@/subsystems/aws';

export class UserService {
	constructor(private readonly client: Client) {}

	private include = { admin: true, customer: true, handyman: true } satisfies Prisma.UserInclude;

	async list(where: Prisma.UserWhereInput) {
		return await this.client.user.findMany({ where, include: this.include });
	}

	async find(where: Prisma.UserWhereInput) {
		return await this.client.user.findFirst({ where, include: this.include });
	}

	async create(payload: UserCreatePayload) {
		validateSchema(UserRepository.create(), payload);

		const exists = await this.client.user.findUnique({
			where: { phone: payload.phone }
		});

		if (exists) {
			throw new Error('A user with this phone already exists');
		}

		return await this.client.user.create({ data: payload, include: this.include });
	}

	async update(where: Prisma.UserWhereUniqueInput, payload: UserUpdatePayload) {
		validateSchema(UserRepository.update(), payload);

		const user = await this.client.user.findUnique({ where });

		if (!user) {
			throw new Error('User not found');
		}

		const updateData = {} as Prisma.UserUpdateInput;

		if (payload.name) {
			updateData.name = payload.name;
		}

		if (payload.locale) {
			updateData.locale = payload.locale;
		}

		if (payload.avatar) {
			const avatarUrl = await uploadToBucket(payload.avatar);
			updateData.avatar = avatarUrl;
		}

		if (Object.keys(updateData).length > 0) {
			return await this.client.user.update({ where, data: updateData });
		}

		return user;
	}

	async delete(where: Prisma.UserWhereUniqueInput) {
		const user = await this.client.user.findUnique({ where });
		if (!user) throw new Error('User not found');
		await this.client.user.delete({ where });
		return { id: user.id };
	}
}
