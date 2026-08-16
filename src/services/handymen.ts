import { Prisma, PrismaClient } from '@/database/generated/client';
import { Client } from '@/database/lib/types';
import { HandymanCreatePayload, HandymanRepository } from '@/database/repositories/handyman';
import { validateSchema } from '@/lib/utils';
import { UserService } from './users';

export class HandymanService {
	constructor(private readonly client: Client) {}

	private include = { user: true } satisfies Prisma.HandymanInclude;

	async list(where: Prisma.HandymanWhereInput) {
		return await this.client.handyman.findMany({ where, include: this.include });
	}

	async find(where: Prisma.HandymanWhereUniqueInput) {
		return await this.client.handyman.findUnique({ where, include: this.include });
	}

	async create(payload: HandymanCreatePayload) {
		validateSchema(HandymanRepository.create(), payload);

		const user = await new UserService(this.client).find({ id: payload.userId });
		if (!user) throw new Error('User not found');

		const handyman = await this.client.handyman.findUnique({ where: { userId: user.id } });
		if (handyman) throw new Error('User is already a handyman');

		return await this.client.handyman.create({ data: { user: { connect: { id: user.id } } } });
	}

	async update(where: Prisma.HandymanWhereUniqueInput, payload: unknown) {
		validateSchema(HandymanRepository.update(), payload);

		return await (this.client as PrismaClient).$transaction(async (tx) => {
			const existing = await tx.handyman.findUnique({ where, include: this.include });

			if (!existing) throw new Error('Handyman not found');

			const data: Prisma.HandymanUpdateInput = {};

			if (payload.regions) {
				const regions = await this.client.region.findMany({ where: { id: { in: payload.regions } } });
				if (regions.length !== payload.regions.length) throw new Error('Some regions are not found');
				data.regions = { connect: regions.map((region) => ({ id: region.id })) };
			}

			if (payload.workDays) {
				const DEFAULT_WORK_DAYS = [...HandymanRepository.weekdays];
				data.workDays = payload.workDays.length > 0 ? [...payload.workDays] : [...DEFAULT_WORK_DAYS];
			}

			if (Object.keys(data).length > 0) {
				await tx.handyman.update({ where, data });
			}

			return existing;
		});
	}

	async delete(where: Prisma.HandymanWhereUniqueInput) {
		return await (this.client as PrismaClient).$transaction(async (tx) => {
			const existing = await tx.handyman.findUnique({ where, include: this.include });

			if (!existing) throw new Error('Handyman not found');

			await new UserService(tx).delete({ id: existing.userId });

			return existing;
		});
	}

	async block(id: string) {
		return await (this.client as PrismaClient).$transaction(async (tx) => {
			const handyman = await tx.handyman.findUnique({ where: { id }, include: { application: true, visits: true } });
			if (!handyman) throw new Error('Handyman not found');

			if (handyman.application && handyman.application.status !== 'REJECTED') {
				await tx.application.update({
					where: { handymanId: id },
					data: { status: 'REJECTED' }
				});
			}

			if (handyman.visits.length) {
				await tx.visit.updateMany({
					where: { handymanId: id },
					data: { status: 'DECLINED' }
				});
			}

			const updated = await tx.handyman.update({
				where: { id },
				data: { status: 'BLOCKED' }
			});

			return updated;
		});
	}
}
