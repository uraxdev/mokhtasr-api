import { Prisma } from '@/database/generated/client';
import { Client } from '@/database/lib/types';

export class FinancialService {
	constructor(private readonly client: Client) {}

	private include = {
		offer: {
			include: {
				proposal: {
					include: { service: true, customer: { include: { user: { select: { name: true } } } } }
				}
			}
		}
	} satisfies Prisma.TransactionInclude;

	async summary(handymanId: string) {
		const [transactions, completedJobs] = await Promise.all([
			this.client.transaction.findMany({
				where: { offer: { handymanId } },
				include: this.include,
				orderBy: { createdAt: 'desc' }
			}),
			this.client.offer.count({
				where: { handymanId, status: 'COMPLETED' }
			})
		]);

		const now = new Date();
		const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
		const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
		const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

		const totalEarned = transactions.filter((t) => t.status === 'RECEIVED').reduce((sum, t) => sum + t.amount, 0);

		const thisMonth = transactions.filter((t) => t.status === 'RECEIVED' && t.createdAt >= thisMonthStart).reduce((sum, t) => sum + t.amount, 0);

		const lastMonth = transactions.filter((t) => t.status === 'RECEIVED' && t.createdAt >= lastMonthStart && t.createdAt <= lastMonthEnd).reduce((sum, t) => sum + t.amount, 0);

		const pending = transactions.filter((t) => t.status === 'PENDING').reduce((sum, t) => sum + t.amount, 0);

		const growthPercent = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : null;

		// Last 6 months grouped
		// Key by "YYYY-M" to avoid cross-year label collisions; store label separately
		const monthlyMap = new Map<string, { label: string; amount: number }>();
		for (let i = 5; i >= 0; i--) {
			const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
			const key = `${d.getFullYear()}-${d.getMonth()}`;
			const label = d.toLocaleString('en', { month: 'short' });
			monthlyMap.set(key, { label, amount: 0 });
		}
		for (const t of transactions) {
			if (t.status !== 'RECEIVED') continue;
			const key = `${t.createdAt.getFullYear()}-${t.createdAt.getMonth()}`;
			const entry = monthlyMap.get(key);
			if (entry) entry.amount += t.amount;
		}
		const monthlyData = Array.from(monthlyMap.values()).map(({ label, amount }, i) => ({
			id: String(i),
			monthLabel: label,
			amount
		}));

		const recentTransactions = transactions.slice(0, 5).map((t) => ({
			id: t.id,
			serviceName: t.offer.proposal.service.name,
			clientName: t.offer.proposal.customer.user.name,
			amount: t.amount,
			currency: t.currency,
			status: t.status,
			date: t.createdAt.toISOString()
		}));

		return { totalEarned, thisMonth, pending, completedJobs, growthPercent, monthlyData, recentTransactions };
	}

	async transactions(handymanId: string, page = 1, limit = 20) {
		const take = Math.min(limit, 100);
		const skip = (page - 1) * take;

		const [items, total] = await Promise.all([
			this.client.transaction.findMany({
				where: { offer: { handymanId } },
				orderBy: { createdAt: 'desc' },
				skip,
				take,
				include: this.include
			}),
			this.client.transaction.count({ where: { offer: { handymanId } } })
		]);

		return {
			total,
			page,
			limit: take,
			items: items.map((t) => ({
				id: t.id,
				serviceName: t.offer.proposal.service.name,
				clientName: t.offer.proposal.customer.user.name,
				amount: t.amount,
				currency: t.currency,
				status: t.status,
				date: t.createdAt.toISOString()
			}))
		};
	}
}
