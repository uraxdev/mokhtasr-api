import { Prisma, PrismaClient } from '@/database/generated/client';
import { Client } from '@/database/lib/types';
import { AdvanceStagePayload, OfferCreatePayload, OfferRepository, VerifyCodePayload } from '@/database/repositories/offer';
import { validateSchema } from '@/lib/utils';

export class OfferService {
	constructor(private readonly client: Client) {}

	private include = {
		proposal: { include: { service: { select: { id: true, name: true } } } },
		handyman: { include: { user: true } },
		review: true
	} satisfies Prisma.OfferInclude;

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

	private maskCode<T extends { stage: string | null; completionCode: string }>(offer: T): Omit<T, 'completionCode'> & { completionCode?: string } {
		const { completionCode, ...rest } = offer;
		const visible = offer.stage === 'AT_LOCATION' || offer.stage === 'AWAITING_CODE';
		return visible ? { ...rest, completionCode } : rest;
	}

	async list(handymanId: string) {
		const offers = await this.client.offer.findMany({ where: { handymanId }, orderBy: { createdAt: 'desc' }, include: this.include });
		return offers.map(this.maskCode);
	}

	async find(id: string, userId: string) {
		const offer = await this.client.offer.findUnique({ where: { id }, include: this.include });

		if (!offer) throw new Error('Offer not found');

		const isHandyman = offer.handyman.userId === userId;
		const isCustomer = offer.proposal.customerId === userId;
		if (!isHandyman && !isCustomer) throw new Error('Forbidden');

		return this.maskCode(offer);
	}

	async create(handymanId: string, payload: OfferCreatePayload) {
		validateSchema(OfferRepository.create(), payload);

		const proposal = await this.client.proposal.findUnique({ where: { id: payload.proposalId } });
		if (!proposal) throw new Error('Proposal not found');
		if (proposal.status === 'CANCELLED' || proposal.status === 'COMPLETED') {
			throw new Error(`Cannot submit offer on a proposal with status ${proposal.status}`);
		}

		const data = {
			price: payload.price,
			currency: payload.currency,
			completionCode: this.generateCompletionCode(),
			message: payload.message ?? null,
			estimatedDuration: payload.estimatedDuration ?? null,
			proposal: { connect: { id: payload.proposalId } },
			handyman: { connect: { id: handymanId } }
		} satisfies Prisma.OfferCreateInput;

		return await (this.client as PrismaClient).$transaction(async (tx) => {
			const offer = await tx.offer.create({ data, include: { proposal: this.include.proposal, handyman: this.include.handyman } });

			if (proposal.status === 'WAITING_OFFERS') {
				await tx.proposal.update({ where: { id: payload.proposalId }, data: { status: 'OFFERS_RECEIVED' } });
			}

			return this.maskCode(offer);
		});
	}

	async advanceStage(offerId: string, handymanId: string, payload: AdvanceStagePayload) {
		validateSchema(OfferRepository.advanceStage(), payload);

		const offer = await this.client.offer.findUnique({ where: { id: offerId }, include: { proposal: true } });

		if (!offer) throw new Error('Offer not found');
		if (offer.handymanId !== handymanId) throw new Error('Forbidden');
		if (offer.status !== 'ACCEPTED') throw new Error('Offer is not in accepted state');

		if (payload.stage === 'AT_LOCATION') {
			if (offer.stage !== 'INITIATED') throw new Error('Invalid stage transition');

			const { latitude: pLat, longitude: pLon } = payload;
			const { latitude: rLat, longitude: rLon } = offer.proposal;

			if (pLat == null || pLon == null) throw new Error('latitude and longitude are required for AT_LOCATION');
			if (rLat == null || rLon == null) throw new Error('Proposal has no location coordinates');

			const dist = this.calculateDistanceMeters(pLat, pLon, rLat, rLon);
			if (dist > 200) throw new Error(`You are ${Math.round(dist)}m away — must be within 200m`);
		} else if (payload.stage === 'AWAITING_CODE') {
			if (offer.stage !== 'AT_LOCATION') throw new Error('Invalid stage transition');
		}

		return await (this.client as PrismaClient).$transaction(async (tx) => {
			const updated = await tx.offer.update({
				where: { id: offerId },
				data: { stage: payload.stage },
				include: {
					proposal: { include: { service: { select: { id: true, name: true } } } },
					handyman: { include: { user: true } }
				}
			});

			const proposalStatus = payload.stage === 'AT_LOCATION' ? 'IN_PROGRESS' : 'AWAITING_COMPLETION';
			await tx.proposal.update({ where: { id: offer.proposalId }, data: { status: proposalStatus } });

			return this.maskCode(updated);
		});
	}

	async verifyCode(offerId: string, customerId: string, payload: VerifyCodePayload) {
		validateSchema(OfferRepository.verifyCode(), payload);

		const offer = await this.client.offer.findUnique({ where: { id: offerId }, include: { proposal: true } });

		if (!offer) throw new Error('Offer not found');
		if (offer.proposal.customerId !== customerId) throw new Error('Forbidden');
		if (offer.stage !== 'AWAITING_CODE') throw new Error('Offer is not awaiting code verification');
		if (offer.completionCode !== payload.code) throw new Error('Invalid completion code');

		return await (this.client as PrismaClient).$transaction(async (tx) => {
			const completed = await tx.offer.update({
				where: { id: offerId },
				data: { status: 'COMPLETED' },
				include: {
					proposal: { include: { service: { select: { id: true, name: true } } } },
					handyman: { include: { user: true } }
				}
			});

			await tx.proposal.update({ where: { id: offer.proposalId }, data: { status: 'COMPLETED' } });

			await tx.transaction.create({
				data: { offerId, amount: offer.price, currency: offer.currency, status: 'RECEIVED' }
			});

			return this.maskCode(completed);
		});
	}
}
