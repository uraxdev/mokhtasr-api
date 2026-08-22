import { client } from '@/database/lib/client';
import { ProposalService } from '@/services/proposals';

const SWEEP_INTERVAL = 15 * 60 * 1000;

let isSweeping = false;

async function sweepOverdueProposals() {
	// Skip this tick rather than letting a slow sweep overlap itself.
	if (isSweeping) return;

	isSweeping = true;

	try {
		const { expired } = await new ProposalService(client).expireOverdue();
		if (expired > 0) console.log(`🧹 Expired ${expired} overdue proposal(s)`);
	} catch (error) {
		console.error('Failed to sweep overdue proposals:', error);
	} finally {
		isSweeping = false;
	}
}

export function createScheduler() {
	// Run once at boot to clear any backlog accumulated while the process was down.
	void sweepOverdueProposals();

	return setInterval(() => void sweepOverdueProposals(), SWEEP_INTERVAL);
}
