import { Prisma, PrismaClient } from '@/database/generated/client';
import { Client } from '@/database/lib/types';
import { AdvanceStagePayload, ConvertToWorkPayload, VerifyCodePayload, VisitCreatePayload, VisitRepository } from '@/database/repositories/visit';
import { validateSchema } from '@/lib/utils';
import { NotificationService } from '@/services/notifications';

export class VisitService {
	constructor(private readonly client: Client) {}

	private include = {
		proposal: { include: { service: { select: { id: true, name: true } } } },
		handyman: { include: { user: true } },
		review: true
	} satisfies Prisma.VisitInclude;

	private calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
		const R = 6_371_000;
		const toRad = (d: number) => (d * Math.PI) / 180;
		const dLat = toRad(lat2 - lat1);
		const dLon = toRad(lon2 - lon1);
		const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
		return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	}

	private generateCompletionCode(): string {
		return Math.floor(100000 + Math.random() * 900000).toString();
	}

	private maskCode<T extends { stage: string | null; completionCode: string }>(visit: T): Omit<T, 'completionCode'> & { completionCode?: string } {
		const { completionCode, ...rest } = visit;
		const visible = visit.stage === 'AT_LOCATION' || visit.stage === 'AWAITING_CODE';
		return visible ? { ...rest, completionCode } : rest;
	}

	async list(handymanId: string) {
		const visits = await this.client.visit.findMany({ where: { handymanId }, orderBy: { createdAt: 'desc' }, include: this.include });
		return visits.map(this.maskCode);
	}

	async find(id: string, userId: string) {
		const visit = await this.client.visit.findUnique({ where: { id }, include: this.include });

		if (!visit) throw new Error('Visit not found');

		const customer = await this.client.customer.findUnique({ where: { id: visit.proposal.customerId }, select: { userId: true } });

		const isHandyman = visit.handyman.userId === userId;
		const isCustomer = customer?.userId === userId;
		if (!isHandyman && !isCustomer) throw new Error('Forbidden');

		return this.maskCode(visit);
	}

	async create(handymanId: string, payload: VisitCreatePayload) {
		validateSchema(VisitRepository.create(), payload);

		const proposal = await this.client.proposal.findUnique({
			where: { id: payload.proposalId },
			include: { customer: { select: { userId: true } } }
		});
		if (!proposal) throw new Error('Proposal not found');
		if (proposal.status !== 'WAITING_OFFERS' && proposal.status !== 'OFFERS_RECEIVED') {
			throw new Error(`Conflict: cannot submit a visit on a proposal with status ${proposal.status}`);
		}

		const handyman = await this.client.handyman.findUnique({ where: { id: handymanId }, select: { userId: true } });
		if (!handyman) throw new Error('Handyman not found');
		if (handyman.userId === proposal.customer.userId) throw new Error('Forbidden: cannot submit a visit on your own proposal');

		const existingVisit = await this.client.visit.findFirst({ where: { proposalId: payload.proposalId, handymanId } });
		if (existingVisit) throw new Error('A visit already exists for this proposal from this handyman');

		const data = {
			type: payload.type,
			price: payload.price,
			currency: payload.currency,
			completionCode: this.generateCompletionCode(),
			message: payload.message ?? null,
			estimatedDuration: payload.estimatedDuration ?? null,
			scheduledFor: payload.scheduledFor ? new Date(payload.scheduledFor) : null,
			proposal: { connect: { id: payload.proposalId } },
			handyman: { connect: { id: handymanId } }
		} satisfies Prisma.VisitCreateInput;

		return await (this.client as PrismaClient).$transaction(async (tx) => {
			const visit = await tx.visit.create({ data, include: { proposal: this.include.proposal, handyman: this.include.handyman } });

			if (proposal.status === 'WAITING_OFFERS') {
				await tx.proposal.update({ where: { id: payload.proposalId }, data: { status: 'OFFERS_RECEIVED' } });
			}

			await new NotificationService(tx).create({
				userId: proposal.customer.userId,
				type: 'VISIT_RECEIVED',
				title: { ar: 'عرض جديد', en: 'New offer received' },
				body: {
					ar: `تلقيت عرضًا جديدًا على مقترحك: ${proposal.title}`,
					en: `You received a new offer on your proposal: ${proposal.title}`
				},
				data: { proposalId: payload.proposalId, visitId: visit.id }
			});

			return this.maskCode(visit);
		});
	}

	async advanceStage(visitId: string, handymanId: string, payload: AdvanceStagePayload) {
		validateSchema(VisitRepository.advanceStage(), payload);

		const visit = await this.client.visit.findUnique({
			where: { id: visitId },
			include: { proposal: { include: { customer: { select: { userId: true } } } } }
		});

		if (!visit) throw new Error('Visit not found');
		if (visit.handymanId !== handymanId) throw new Error('Forbidden');
		if (visit.status !== 'ACCEPTED') throw new Error('Conflict: visit is not in accepted state');

		if (payload.stage === 'AT_LOCATION') {
			if (visit.stage !== 'INITIATED') throw new Error('Invalid stage transition');

			const { latitude: pLat, longitude: pLon } = payload;
			const { latitude: rLat, longitude: rLon } = visit.proposal;

			if (pLat == null || pLon == null) throw new Error('Invalid payload: latitude and longitude are required for AT_LOCATION');
			if (rLat == null || rLon == null) throw new Error('Conflict: proposal has no location coordinates');

			const dist = this.calculateDistanceMeters(pLat, pLon, rLat, rLon);
			if (dist > 200) throw new Error(`You are ${Math.round(dist)}m away — must be within 200m`);
		} else if (payload.stage === 'AWAITING_CODE') {
			if (visit.stage !== 'AT_LOCATION') throw new Error('Invalid stage transition');
		}

		return await (this.client as PrismaClient).$transaction(async (tx) => {
			const updated = await tx.visit.update({
				where: { id: visitId },
				data: { stage: payload.stage },
				include: {
					proposal: { include: { service: { select: { id: true, name: true } } } },
					handyman: { include: { user: true } }
				}
			});

			const proposalStatus = payload.stage === 'AT_LOCATION' ? 'IN_PROGRESS' : 'AWAITING_COMPLETION';
			await tx.proposal.update({ where: { id: visit.proposalId }, data: { status: proposalStatus } });

			await new NotificationService(tx).create({
				userId: visit.proposal.customer.userId,
				type: 'PROPOSAL_STATUS_CHANGED',
				title: { ar: 'تحديث حالة المقترح', en: 'Proposal status updated' },
				body: {
					ar: `تغيرت حالة مقترحك "${visit.proposal.title}" إلى ${proposalStatus}`,
					en: `Your proposal "${visit.proposal.title}" status changed to ${proposalStatus}`
				},
				data: { proposalId: visit.proposalId, visitId }
			});

			return this.maskCode(updated);
		});
	}

	async verifyCode(visitId: string, customerId: string, payload: VerifyCodePayload) {
		validateSchema(VisitRepository.verifyCode(), payload);

		const visit = await this.client.visit.findUnique({ where: { id: visitId }, include: { proposal: true } });

		if (!visit) throw new Error('Visit not found');
		if (visit.proposal.customerId !== customerId) throw new Error('Forbidden');
		if (visit.stage !== 'AWAITING_CODE') throw new Error('Conflict: visit is not awaiting code verification');
		if (visit.completionCode !== payload.code) throw new Error('Invalid completion code');

		return await (this.client as PrismaClient).$transaction(async (tx) => {
			const completed = await tx.visit.update({
				where: { id: visitId },
				data: { status: 'COMPLETED' },
				include: {
					proposal: { include: { service: { select: { id: true, name: true } } } },
					handyman: { include: { user: true } }
				}
			});

			const proposalStatus = visit.type === 'WORK' ? 'COMPLETED' : 'INSPECTION_COMPLETED';
			await tx.proposal.update({ where: { id: visit.proposalId }, data: { status: proposalStatus } });

			if (visit.type === 'WORK' || visit.price != null) {
				await tx.transaction.create({
					data: { visitId, amount: visit.price as number, currency: visit.currency, status: 'RECEIVED' }
				});
			}

			await new NotificationService(tx).create({
				userId: completed.handyman.userId,
				type: 'PROPOSAL_STATUS_CHANGED',
				title: { ar: 'تم تأكيد إتمام الزيارة', en: 'Visit completion confirmed' },
				body: {
					ar: `أكد العميل رمز الإتمام لمقترح "${visit.proposal.title}"`,
					en: `The customer confirmed the completion code for "${visit.proposal.title}"`
				},
				data: { proposalId: visit.proposalId, visitId }
			});

			return this.maskCode(completed);
		});
	}

	async convertToWork(visitId: string, handymanId: string, payload: ConvertToWorkPayload) {
		validateSchema(VisitRepository.convertToWork(), payload);

		const visit = await this.client.visit.findUnique({
			where: { id: visitId },
			include: { proposal: { include: { customer: { select: { userId: true } } } }, convertedTo: true }
		});

		if (!visit) throw new Error('Visit not found');
		if (visit.handymanId !== handymanId) throw new Error('Forbidden');
		if (visit.type !== 'INSPECTION') throw new Error('Conflict: only INSPECTION visits can be converted to work');
		if (visit.status !== 'COMPLETED') throw new Error(`Conflict: cannot convert a visit with status ${visit.status}`);
		if (visit.convertedTo) throw new Error('Conflict: this visit has already been converted to a work visit');
		if (visit.proposal.status !== 'INSPECTION_COMPLETED') {
			throw new Error(`Conflict: cannot convert visit: proposal has status ${visit.proposal.status}`);
		}

		return await (this.client as PrismaClient).$transaction(async (tx) => {
			const workVisit = await tx.visit.create({
				data: {
					type: 'WORK',
					status: 'ACCEPTED',
					stage: 'INITIATED',
					price: payload.price,
					currency: visit.currency,
					completionCode: this.generateCompletionCode(),
					scheduledFor: payload.scheduledFor ? new Date(payload.scheduledFor) : null,
					proposal: { connect: { id: visit.proposalId } },
					handyman: { connect: { id: handymanId } },
					convertedFrom: { connect: { id: visit.id } }
				},
				include: {
					proposal: { include: { service: { select: { id: true, name: true } } } },
					handyman: { include: { user: true } }
				}
			});

			await tx.proposal.update({ where: { id: visit.proposalId }, data: { status: 'ACCEPTED' } });

			await new NotificationService(tx).create({
				userId: visit.proposal.customer.userId,
				type: 'PROPOSAL_STATUS_CHANGED',
				title: { ar: 'تم تحويل الفحص إلى عمل', en: 'Inspection converted to work' },
				body: {
					ar: `قام الفني بتحويل الفحص إلى زيارة عمل لمقترح "${visit.proposal.title}"`,
					en: `The handyman converted the inspection into a work visit for "${visit.proposal.title}"`
				},
				data: { proposalId: visit.proposalId, visitId: workVisit.id }
			});

			return this.maskCode(workVisit);
		});
	}
}
