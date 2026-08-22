import { Prisma } from '@/database/generated/client';
import { Client } from '@/database/lib/types';
import { ApplicationCreatePayload, ApplicationRejectPayload, ApplicationRepository } from '@/database/repositories/application';
import { validateSchema } from '@/lib/utils';
import { uploadToBucket } from '@/subsystems/aws';

export class ApplicationService {
	constructor(private readonly client: Client) {}

	private include = {
		regions: { select: { id: true, name: true } },
		services: { select: { id: true, name: true } }
	} satisfies Prisma.ApplicationInclude;

	async list(where?: Prisma.ApplicationWhereInput) {
		return await this.client.application.findMany({ where, orderBy: { createdAt: 'desc' }, include: this.include });
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

		const regions = await this.client.region.findMany({ where: { id: { in: payload.regions } } });
		if (regions.length !== payload.regions.length) {
			throw new Error('Some regions are not found');
		}

		const services = await this.client.service.findMany({ where: { id: { in: payload.services } } });
		if (services.length !== payload.services.length) {
			throw new Error('Some services are not found');
		}

		const uploads = [uploadToBucket(payload.nationalIdFront), uploadToBucket(payload.nationalIdBack), uploadToBucket(payload.selfie)];

		const images = await Promise.all(uploads);

		const data = {
			firstName: payload.firstName,
			lastName: payload.lastName,
			nationalIdFront: images[0] || '#',
			nationalIdBack: images[1] || '#',
			selfie: images[2] || '#',
			birthdate: payload.birthdate,
			handyman: { connect: { id: payload.handymanId } },
			regions: { connect: regions.map((region) => ({ id: region.id })) },
			services: { connect: services.map((service) => ({ id: service.id })) },
			expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
		} satisfies Prisma.ApplicationCreateInput;

		return await this.client.application.create({ data, include: this.include });
	}

	async accept(id: string) {
		const application = await this.find(id);

		if (!application) throw new Error('Application not found');
		if (application.status !== 'PENDING') throw new Error('Conflict: application already modified');
		if (new Date(Date.now()) > application.expiresAt) throw new Error('Conflict: application expired');

		await this.client.application.update({ where: { id }, data: { status: 'ACCEPTED' } });
		await this.client.handyman.update({
			where: { id: application.handymanId },
			data: {
				status: 'ACCEPTED',
				birthdate: application.birthdate,
				services: { connect: application.services.map((service) => ({ id: service.id })) },
				regions: { connect: application.regions.map((region) => ({ id: region.id })) }
			}
		});

		return { id };
	}

	async reject(id: string, payload: ApplicationRejectPayload) {
		validateSchema(ApplicationRepository.reject(), payload);

		const application = await this.find(id);

		if (!application) throw new Error('Application not found');
		if (application.status !== 'PENDING') throw new Error('Conflict: application already modified');

		await this.client.application.update({ where: { id }, data: { status: 'REJECTED', notes: payload.notes } });
		await this.client.handyman.update({ where: { id: application.handymanId }, data: { status: 'REJECTED' } });

		return { id };
	}

	async status(id: string) {
		const application = await this.find(id);

		if (!application) throw new Error('Application not found');
		if (application.status !== 'PENDING') throw new Error('Conflict: application already modified');
		if (new Date(Date.now()) > application.expiresAt && application.status === 'PENDING') {
			await this.client.application.update({ where: { id }, data: { status: 'EXPIRED' } });
		}

		return { status: application.status };
	}
}
