import { Prisma } from '@/database/generated/client';
import { Client } from '@/database/lib/types';
import { ApplicationCreatePayload, ApplicationRejectPayload, ApplicationRepository } from '@/database/repositories/application';
import { validateSchema } from '@/lib/utils';

export class ApplicationService {
	constructor(private readonly client: Client) {}

	private include = {
		regions: { select: { id: true, name: true } },
		services: { select: { id: true, name: true } }
	} satisfies Prisma.ApplicationInclude;

	async list() {
		return await this.client.application.findMany({ orderBy: { createdAt: 'desc' }, include: this.include });
	}

	async find(id: string) {
		return await this.client.application.findUnique({ where: { id }, include: this.include });
	}

	async create(payload: ApplicationCreatePayload) {
		validateSchema(ApplicationRepository.create(), payload);

		const handyman = await this.client.handyman.findUnique({ where: { id: payload.handymanId } });
		if (!handyman) {
			throw new Error('Handyman not found');
		}

		const data = {
			firstName: payload.firstName,
			lastName: payload.lastName,
			nationalIdFront: 'https://www.elaosboa.com/wp-content/uploads/2022/07/elaosboa64891.jpg',
			nationalIdBack: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR4mZjlaphukkj1qgNbWuo9U6aFNlQ7vXkc4g&s',
			selfie: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTnp6Pxvj7XysiWnhSIsAKBRlVbE5GwyWidoQ&s',
			birthdate: payload.birthdate,
			handyman: { connect: { id: payload.handymanId } },
			regions: { connect: payload.regions.map((region) => ({ id: region })) },
			services: { connect: payload.services.map((service) => ({ id: service })) },
			expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
		} satisfies Prisma.ApplicationCreateInput;

		return await this.client.application.create({ data, include: this.include });
	}

	async accept(id: string) {
		const application = await this.find(id);

		if (!application) throw new Error('Application not found');
		if (application.status !== 'PENDING') throw new Error('Application already modified');
		if (new Date(Date.now()) > application.expiresAt) throw new Error('Application expired');

		await this.client.application.update({ where: { id }, data: { status: 'ACCEPTED' } });
		await this.client.handyman.update({ where: { id: application.handymanId }, data: { status: 'ACCEPTED' } });

		return { id };
	}

	async reject(id: string, payload: ApplicationRejectPayload) {
		validateSchema(ApplicationRepository.reject(), payload);

		const application = await this.find(id);

		if (!application) throw new Error('Application not found');
		if (application.status !== 'PENDING') throw new Error('Application already modified');

		await this.client.application.update({ where: { id }, data: { status: 'REJECTED', notes: payload.notes } });
		await this.client.handyman.update({ where: { id: application.handymanId }, data: { status: 'REJECTED' } });

		return { id };
	}

	async status(id: string) {
		const application = await this.find(id);

		if (!application) throw new Error('Application not found');
		if (application.status !== 'PENDING') throw new Error('Application already modified');
		if (new Date(Date.now()) > application.expiresAt && application.status === 'PENDING') {
			await this.client.application.update({ where: { id }, data: { status: 'EXPIRED' } });
		}

		return { status: application.status };
	}
}
