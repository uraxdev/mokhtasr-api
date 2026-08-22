import type { Router } from 'express';

interface UpgradeRequiredError extends Error {
	status?: number;
}

export default (router: Router) => {
	router.get('/ws', (_req, _res, next) => {
		const error: UpgradeRequiredError = new Error('Upgrade Required', {
			cause: 'The /ws endpoint only accepts WebSocket connections. Connect with a WebSocket client, e.g. new WebSocket("ws://<host>/ws?token=<accessToken>").'
		});

		error.status = 426;

		next(error);
	});
};
