import { Prisma, PrismaClient } from '@/database/generated/client';
import { Client } from '@/database/lib/types';
import { AcceptOfferPayload, ProposalCreatePayload, ProposalRepository } from '@/database/repositories/proposal';
import { validateSchema } from '@/lib/utils';

export class ProposalService {
	constructor(private readonly client: Client) {}

	private include = {
		service: { select: { id: true, name: true } },
		offers: { include: { handyman: { include: { user: true } }, review: true } }
	} satisfies Prisma.ProposalInclude;

	async list(customerId: string) {
		return await this.client.proposal.findMany({
			where: { customerId },
			orderBy: { createdAt: 'desc' },
			include: this.include
		});
	}

	async find(id: string, customerId: string) {
		const proposal = await this.client.proposal.findUnique({
			where: { id },
			include: this.include
		});

		if (!proposal) throw new Error('Proposal not found');
		if (proposal.customerId !== customerId) throw new Error('Forbidden');

		return proposal;
	}

	async create(customerId: string, payload: ProposalCreatePayload) {
		validateSchema(ProposalRepository.create(), payload);

		const data = {
			title: payload.title,
			description: payload.description,
			address: payload.address,
			dueDate: new Date(payload.dueDate),
			latitude: payload.latitude ?? null,
			longitude: payload.longitude ?? null,
			service: { connect: { id: payload.serviceId } },
			customer: { connect: { id: customerId } }
		} satisfies Prisma.ProposalCreateInput;

		return await this.client.proposal.create({ data, include: { service: this.include.service } });
	}

	async cancel(id: string, customerId: string) {
		const proposal = await this.client.proposal.findUnique({ where: { id } });

		if (!proposal) throw new Error('Proposal not found');
		if (proposal.customerId !== customerId) throw new Error('Forbidden');
		if (proposal.status === 'COMPLETED' || proposal.status === 'CANCELLED') {
			throw new Error(`Cannot cancel a proposal with status ${proposal.status}`);
		}

		const data = {
			status: 'CANCELLED'
		} satisfies Prisma.ProposalUpdateInput;

		return await this.client.proposal.update({ where: { id }, data });
	}

	async acceptOffer(proposalId: string, customerId: string, payload: AcceptOfferPayload) {
		validateSchema(ProposalRepository.accept(), payload);

		return await (this.client as PrismaClient).$transaction(async (tx) => {
			const proposal = await tx.proposal.findUnique({
				where: { id: proposalId },
				include: { offers: true }
			});

			if (!proposal) throw new Error('Proposal not found');
			if (proposal.customerId !== customerId) throw new Error('Forbidden');
			if (proposal.status !== 'WAITING_OFFERS' && proposal.status !== 'OFFERS_RECEIVED') {
				throw new Error(`Cannot accept an offer on a proposal with status ${proposal.status}`);
			}

			const offer = proposal.offers.find((o) => o.id === payload.offerId);
			if (!offer) throw new Error('Offer not found on this proposal');
			if (offer.status !== 'PENDING') throw new Error('Offer is no longer pending');

			// Accept chosen offer, decline all others
			await tx.offer.updateMany({
				where: { proposalId, id: { not: payload.offerId } },
				data: { status: 'DECLINED' }
			});

			await tx.offer.update({
				where: { id: payload.offerId },
				data: { status: 'ACCEPTED', stage: 'INITIATED' }
			});

			return await tx.proposal.update({
				where: { id: proposalId },
				data: { status: 'ACCEPTED' }
			});
		});
	}
}
