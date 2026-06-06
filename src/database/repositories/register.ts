import z from 'zod';
import { ApplicationRepository } from './application';

export class RegisterRepository {
	static handyman() {
		return ApplicationRepository.create().omit({ handymanId: true });
	}
}

export type RegisterHandyman = z.infer<ReturnType<typeof RegisterRepository.handyman>>;
