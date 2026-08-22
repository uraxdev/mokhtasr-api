import { Prisma, PrismaClient } from '@/database/generated/client';
import { Client } from '@/database/lib/types';
import { AcceptVisitPayload, ProposalCreatePayload, ProposalExtendPayload, ProposalRepository } from '@/database/repositories/proposal';
import { validateSchema } from '@/lib/utils';
import { NotificationService } from '@/services/notifications';

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
			throw new Error(`Conflict: cannot cancel a proposal with status ${proposal.status}`);
		}

		const data = {
			status: 'CANCELLED'
		} satisfies Prisma.ProposalUpdateInput;

		return await (this.client as PrismaClient).$transaction(async (tx) => {
			const cancelled = await tx.proposal.update({ where: { id }, data });

			const activeVisit = await tx.visit.findFirst({
				where: { proposalId: id, status: 'ACCEPTED' },
				select: { handyman: { select: { userId: true } } }
			});

			if (activeVisit) {
				await new NotificationService(tx).create({
					userId: activeVisit.handyman.userId,
					type: 'PROPOSAL_STATUS_CHANGED',
					title: { ar: 'تم إلغاء المقترح', en: 'Proposal cancelled' },
					body: {
						ar: `قام العميل بإلغاء المقترح: ${proposal.title}`,
						en: `The customer cancelled the proposal: ${proposal.title}`
					},
					data: { proposalId: id }
				});
			}

			return cancelled;
		});
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
				throw new Error(`Conflict: cannot accept a visit on a proposal with status ${proposal.status}`);
			}

			const visit = proposal.visits.find((v) => v.id === payload.visitId);
			if (!visit) throw new Error('Visit not found on this proposal');
			if (visit.status !== 'PENDING') throw new Error('Conflict: visit is no longer pending');

			// Accept chosen visit, decline all others
			await tx.visit.updateMany({
				where: { proposalId, id: { not: payload.visitId } },
				data: { status: 'DECLINED' }
			});

			const acceptedVisit = await tx.visit.update({
				where: { id: payload.visitId },
				data: { status: 'ACCEPTED', stage: 'INITIATED' },
				include: { handyman: { select: { userId: true } } }
			});

			const updatedProposal = await tx.proposal.update({
				where: { id: proposalId },
				data: { status: 'ACCEPTED' }
			});

			await new NotificationService(tx).create({
				userId: acceptedVisit.handyman.userId,
				type: 'VISIT_ACCEPTED',
				title: { ar: 'تم قبول عرضك', en: 'Your offer was accepted' },
				body: {
					ar: `وافق العميل على عرضك لمقترح: ${proposal.title}`,
					en: `The customer accepted your offer on: ${proposal.title}`
				},
				data: { proposalId, visitId: payload.visitId }
			});

			return updatedProposal;
		});
	}

	async reopen(id: string, customerId: string) {
		const proposal = await this.client.proposal.findUnique({ where: { id } });

		if (!proposal) throw new Error('Proposal not found');
		if (proposal.customerId !== customerId) throw new Error('Forbidden');
		if (proposal.status !== 'INSPECTION_COMPLETED') {
			throw new Error(`Conflict: cannot reopen a proposal with status ${proposal.status}`);
		}

		return await (this.client as PrismaClient).$transaction(async (tx) => {
			const reopened = await tx.proposal.update({ where: { id }, data: { status: 'WAITING_OFFERS' } });

			const inspectionVisit = await tx.visit.findFirst({
				where: { proposalId: id, type: 'INSPECTION', status: 'COMPLETED' },
				select: { handyman: { select: { userId: true } } }
			});

			if (inspectionVisit) {
				await new NotificationService(tx).create({
					userId: inspectionVisit.handyman.userId,
					type: 'PROPOSAL_STATUS_CHANGED',
					title: { ar: 'تم إعادة فتح المقترح', en: 'Proposal reopened' },
					body: {
						ar: `قام العميل بإعادة فتح المقترح لتلقي عروض عمل: ${proposal.title}`,
						en: `The customer reopened the proposal for work offers: ${proposal.title}`
					},
					data: { proposalId: id }
				});
			}

			return reopened;
		});
	}

	async extend(id: string, customerId: string, payload: ProposalExtendPayload) {
		validateSchema(ProposalRepository.extend(), payload);

		const proposal = await this.client.proposal.findUnique({ where: { id } });

		if (!proposal) throw new Error('Proposal not found');
		if (proposal.customerId !== customerId) throw new Error('Forbidden');
		if (proposal.status !== 'EXPIRED') throw new Error(`Conflict: cannot extend a proposal with status ${proposal.status}`);

		const data = {
			status: 'WAITING_OFFERS',
			dueDate: new Date(payload.dueDate)
		} satisfies Prisma.ProposalUpdateInput;

		return await this.client.proposal.update({ where: { id }, data, include: { service: this.include.service } });
	}

	async expireOverdue(now: Date = new Date()) {
		const overdue = await this.client.proposal.findMany({
			where: { status: { in: ['WAITING_OFFERS', 'OFFERS_RECEIVED'] }, dueDate: { lt: now } },
			select: {
				id: true,
				title: true,
				customer: { select: { userId: true } },
				visits: { where: { status: 'PENDING' }, select: { handyman: { select: { userId: true } } } }
			}
		});

		let expired = 0;

		// One transaction per proposal so a single bad row cannot roll back the whole sweep.
		for (const proposal of overdue) {
			try {
				await (this.client as PrismaClient).$transaction(async (tx) => {
					await tx.proposal.update({ where: { id: proposal.id }, data: { status: 'EXPIRED' } });
					await tx.visit.updateMany({ where: { proposalId: proposal.id, status: 'PENDING' }, data: { status: 'DECLINED' } });

					const notifications = new NotificationService(tx);

					await notifications.create({
						userId: proposal.customer.userId,
						type: 'PROPOSAL_STATUS_CHANGED',
						title: { ar: 'انتهت صلاحية المقترح', en: 'Proposal expired' },
						body: {
							ar: `انقضى الموعد النهائي للمقترح: ${proposal.title}. حدد موعدًا جديدًا لاستئناف تلقي العروض.`,
							en: `The due date passed on your proposal: ${proposal.title}. Set a new due date to start receiving offers again.`
						},
						data: { proposalId: proposal.id }
					});

					for (const visit of proposal.visits) {
						await notifications.create({
							userId: visit.handyman.userId,
							type: 'PROPOSAL_STATUS_CHANGED',
							title: { ar: 'انتهت صلاحية المقترح', en: 'Proposal expired' },
							body: {
								ar: `انتهت صلاحية المقترح الذي قدمت عليه عرضًا: ${proposal.title}`,
								en: `The proposal you submitted an offer on has expired: ${proposal.title}`
							},
							data: { proposalId: proposal.id }
						});
					}
				});

				expired += 1;
			} catch (error) {
				console.error(`Failed to expire proposal ${proposal.id}:`, error);
			}
		}

		return { expired };
	}
}
