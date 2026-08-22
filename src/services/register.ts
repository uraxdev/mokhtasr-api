import { PrismaClient } from '@/database/generated/client';
import { Client } from '@/database/lib/types';
import { RegisterCustomer, RegisterHandyman, RegisterRepository } from '@/database/repositories/register';
import { validateSchema } from '@/lib/utils';
import { AdminService } from './admins';
import { ApplicationService } from './applications';
import { CustomerService } from './customers';
import { HandymanService } from './handymen';
import { UserService } from './users';

export class RegisterService {
	constructor(private readonly client: Client) {}

	async handyman(userId: string, payload: RegisterHandyman) {
		validateSchema(RegisterRepository.handyman(), payload);

		return await (this.client as PrismaClient).$transaction(async (tx) => {
			const handyman = await new HandymanService(tx).create({ userId });
			const application = await new ApplicationService(tx).create({ ...payload, handymanId: handyman.id });
			await new UserService(tx).update({ id: userId }, { avatar: application.selfie, name: `${application.firstName} ${application.lastName}` });

			return { handyman, application };
		});
	}

	async customer(userId: string, payload: RegisterCustomer) {
		return await (this.client as PrismaClient).$transaction(async (tx) => {
			const customer = await new CustomerService(this.client).create(userId);
			await new UserService(tx).update({ id: userId }, payload);

			return customer;
		});
	}

	async admin(userId: string) {
		return await new AdminService(this.client).create(userId);
	}
}
