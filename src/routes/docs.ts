import { apiReference } from '@scalar/express-api-reference';
import type { Router } from 'express';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const specPath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'docs', 'api', 'openapi.bundled.json');

export default (router: Router) => {
	router.get('/openapi.json', (_req, res) => {
		res.sendFile(specPath);
	});

	router.get('/', apiReference({ url: '/openapi.json', pageTitle: 'Mokhtasr API Reference' }));
};
