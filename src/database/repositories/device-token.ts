import z from 'zod';

import { DevicePlatform } from '../generated/enums';

export class DeviceTokenRepository {
	static platform = ['IOS', 'ANDROID'] satisfies DevicePlatform[];

	static get() {
		return z.object({
			id: z.uuid(),
			userId: z.uuid(),
			token: z.string(),
			platform: z.enum(this.platform),
			createdAt: z.iso.datetime(),
			updatedAt: z.iso.datetime()
		});
	}

	static register() {
		return z.object({
			token: z.string().min(1),
			platform: z.enum(this.platform)
		});
	}
}

export type DeviceToken = z.infer<ReturnType<typeof DeviceTokenRepository.get>>;
export type DeviceTokenRegisterPayload = z.infer<ReturnType<typeof DeviceTokenRepository.register>>;
