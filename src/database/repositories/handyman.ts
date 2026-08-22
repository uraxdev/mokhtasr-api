import z from 'zod';

import { Refined } from '@/lib/schemas';
import { HandymanStatus, WeekDay } from '../generated/enums';

export class HandymanRepository {
	static weekdays = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] satisfies WeekDay[];

	static status = ['PENDING', 'REJECTED', 'BLOCKED', 'ACCEPTED'] satisfies HandymanStatus[];

	static get() {
		return z.object({
			id: z.uuid(),
			workDays: z.array(z.enum(this.weekdays)),
			status: z.enum(this.status),
			birthdate: z.iso.datetime().nullable(),
			userId: z.uuid(),
			createdAt: z.iso.datetime(),
			updatedAt: z.iso.datetime()
		});
	}

	static create() {
		return z.object({
			userId: z.uuid()
		});
	}

	static update() {
		return Refined({
			regions: z.array(z.uuid()).optional(),
			workDays: z.array(z.enum(this.weekdays)).optional()
		});
	}
}

export type Handyman = z.infer<ReturnType<typeof HandymanRepository.get>>;
export type HandymanCreatePayload = z.infer<ReturnType<typeof HandymanRepository.create>>;
export type HandymanUpdatePayload = z.infer<ReturnType<typeof HandymanRepository.update>>;
