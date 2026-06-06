import z from 'zod';
import { CustomerRepository } from './customer';
import { OfferRepository } from './offer';
import { ServiceRepository } from './service';

export class ProposalRepository {
	static status = z.enum(['WAITING_OFFERS', 'ACCEPTED', 'REJECTED']);

	static get() {
		return z.object({
			id: z.uuid(),
			title: z.string(),
			description: z.string(),
			address: z.string(),
			status: ProposalRepository.status,
			dueDate: z.iso.datetime(),
			latitude: z.number().nullable(),
			longitude: z.number().nullable(),
			serviceId: z.uuid(),
			customerId: z.uuid(),
			createdAt: z.iso.datetime(),
			updatedAt: z.iso.datetime(),
			service: ServiceRepository.get(),
			customer: CustomerRepository.get(),
			offers: z.array(OfferRepository.get())
		});
	}

	static create() {
		return this.get().pick({ title: true, description: true, address: true, dueDate: true, latitude: true, longitude: true, serviceId: true });
	}

	static accept() {
		return z.object({
			offerId: z.uuid()
		});
	}
}

export type Proposal = z.infer<ReturnType<typeof ProposalRepository.get>>;
export type ProposalCreatePayload = z.infer<ReturnType<typeof ProposalRepository.create>>;
export type AcceptOfferPayload = z.infer<ReturnType<typeof ProposalRepository.accept>>;
