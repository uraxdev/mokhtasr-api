import z from 'zod';

import { ProposalStatus } from '../generated/enums';
import { CustomerRepository } from './customer';
import { ServiceRepository } from './service';
import { VisitRepository } from './visit';

export class ProposalRepository {
	static status = ['WAITING_OFFERS', 'OFFERS_RECEIVED', 'ACCEPTED', 'IN_PROGRESS', 'AWAITING_COMPLETION', 'INSPECTION_COMPLETED', 'COMPLETED', 'CANCELLED'] satisfies ProposalStatus[];

	static get() {
		return z.object({
			id: z.uuid(),
			title: z.string(),
			description: z.string(),
			address: z.string(),
			status: z.enum(this.status),
			dueDate: z.iso.datetime(),
			latitude: z.number().nullable(),
			longitude: z.number().nullable(),
			serviceId: z.uuid(),
			customerId: z.uuid(),
			createdAt: z.iso.datetime(),
			updatedAt: z.iso.datetime(),
			service: ServiceRepository.get(),
			customer: CustomerRepository.get(),
			visits: z.array(VisitRepository.get())
		});
	}

	static create() {
		return this.get().pick({ title: true, description: true, address: true, dueDate: true, latitude: true, longitude: true, serviceId: true });
	}

	static acceptVisit() {
		return z.object({
			visitId: z.uuid()
		});
	}
}

export type Proposal = z.infer<ReturnType<typeof ProposalRepository.get>>;
export type ProposalCreatePayload = z.infer<ReturnType<typeof ProposalRepository.create>>;
export type AcceptVisitPayload = z.infer<ReturnType<typeof ProposalRepository.acceptVisit>>;
