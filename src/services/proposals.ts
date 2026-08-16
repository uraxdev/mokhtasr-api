import { Prisma, PrismaClient } from '@/database/generated/client';
import { Client } from '@/database/lib/types';
import { AcceptVisitPayload, ProposalCreatePayload, ProposalRepository } from '@/database/repositories/proposal';
import { validateSchema } from '@/lib/utils';

export class ProposalService {
	constructor(private readonly client: Client) {}

	private include = {
		service: { select: { id: true, name: true } },
		visits: { include: { handyman: { include: { user: true } }, review: true } }
	} satisfies Prisma.ProposalInclude;

	async list(customerId?: string) {
		return await this.client.proposal.findMany({
			...(customerId && { where: { customerId } }),
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

	async acceptVisit(proposalId: string, customerId: string, payload: AcceptVisitPayload) {
		validateSchema(ProposalRepository.acceptVisit(), payload);

		return await (this.client as PrismaClient).$transaction(async (tx) => {
			const proposal = await tx.proposal.findUnique({
				where: { id: proposalId },
				include: { visits: true }
			});

			if (!proposal) throw new Error('Proposal not found');
			if (proposal.customerId !== customerId) throw new Error('Forbidden');
			if (proposal.status !== 'WAITING_OFFERS' && proposal.status !== 'OFFERS_RECEIVED') {
				throw new Error(`Cannot accept a visit on a proposal with status ${proposal.status}`);
			}

			const visit = proposal.visits.find((v) => v.id === payload.visitId);
			if (!visit) throw new Error('Visit not found on this proposal');
			if (visit.status !== 'PENDING') throw new Error('Visit is no longer pending');

			// Accept chosen visit, decline all others
			await tx.visit.updateMany({
				where: { proposalId, id: { not: payload.visitId } },
				data: { status: 'DECLINED' }
			});

			await tx.visit.update({
				where: { id: payload.visitId },
				data: { status: 'ACCEPTED', stage: 'INITIATED' }
			});

			return await tx.proposal.update({
				where: { id: proposalId },
				data: { status: 'ACCEPTED' }
			});
		});
	}

	async reopen(id: string, customerId: string) {
		const proposal = await this.client.proposal.findUnique({ where: { id } });

		if (!proposal) throw new Error('Proposal not found');
		if (proposal.customerId !== customerId) throw new Error('Forbidden');
		if (proposal.status !== 'INSPECTION_COMPLETED') {
			throw new Error(`Cannot reopen a proposal with status ${proposal.status}`);
		}

		return await this.client.proposal.update({ where: { id }, data: { status: 'WAITING_OFFERS' } });
	}
}
