import { PrismaClient } from '@/database/generated/client';
import { Client } from '@/database/lib/types';
import { RegisterHandyman, RegisterRepository } from '@/database/repositories/register';
import { validateSchema } from '@/lib/utils';
import { AdminService } from './admins';
import { ApplicationService } from './applications';
import { CustomerService } from './customers';
import { HandymanService } from './handymen';

export class RegisterService {
	constructor(private readonly client: Client) {}

	async handyman(payload: RegisterHandyman, userId: string) {
		validateSchema(RegisterRepository.handyman(), payload);

		return await (this.client as PrismaClient).$transaction(async (tx) => {
			const handyman = await new HandymanService(tx).create({ userId });
			const application = await new ApplicationService(tx).create({ ...payload, handymanId: handyman.id });

			return { handyman, application };
		});
	}

	async customer(userId: string) {
		return await new CustomerService(this.client).create(userId);
	}

	async admin(userId: string) {
		return await new AdminService(this.client).create(userId);
	}
}
