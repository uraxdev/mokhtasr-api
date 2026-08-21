import type { Router } from 'express';

interface UpgradeRequiredError extends Error {
	status?: number;
}

export default (router: Router) => {
	// A genuine WebSocket handshake is consumed by the `ws` server on the HTTP
	// `upgrade` event and never reaches Express. Anything landing here is a plain
	// HTTP request to /ws, so answer with a hint instead of a confusing 401.
	router.get('/ws', (_req, _res, next) => {
		const error: UpgradeRequiredError = new Error('Upgrade Required', {
			cause: 'The /ws endpoint only accepts WebSocket connections. Connect with a WebSocket client, e.g. new WebSocket("ws://<host>/ws?token=<accessToken>").'
		});

		error.status = 426;

		next(error);
	});
};
