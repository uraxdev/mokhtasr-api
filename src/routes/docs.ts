import { apiReference, ApiReferenceConfiguration } from '@scalar/express-api-reference';
import type { Router } from 'express';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const specPath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'docs', 'api', 'openapi.bundled.json');

const config = {
	url: '/openapi.json',
	title: 'Mokhtasr',
	pageTitle: 'Mokhtasr API Reference',
	theme: 'alternate',
	defaultOpenFirstTag: false
} as ApiReferenceConfiguration;

export default (router: Router) => {
	router.get('/openapi.json', (_req, res) => {
		res.sendFile(specPath);
	});

	router.get('/', apiReference(config));
};
