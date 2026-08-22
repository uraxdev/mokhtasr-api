import z from 'zod';
import { ApplicationRepository } from './application';
import { UserRepository } from './user';

export class RegisterRepository {
	static handyman() {
		return ApplicationRepository.create().omit({ handymanId: true });
	}

	static customer() {
		return UserRepository.update();
	}
}

export type RegisterHandyman = z.infer<ReturnType<typeof RegisterRepository.handyman>>;
export type RegisterCustomer = z.infer<ReturnType<typeof RegisterRepository.customer>>;
