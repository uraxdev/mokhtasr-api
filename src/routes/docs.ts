import { apiReference, ApiReferenceConfiguration } from '@scalar/express-api-reference';
import type { Router } from 'express';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const docsDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'docs', 'api');
const specPath = join(docsDir, 'openapi.bundled.json');
const faviconPath = join(docsDir, 'favicon.png');

const config = {
	url: '/openapi.json',
	favicon: '/favicon.ico',
	title: 'Mokhtasr',
	pageTitle: 'Mokhtasr API Reference',
	theme: 'alternate',
	defaultOpenFirstTag: false,
	documentDownloadType: 'none'
} as ApiReferenceConfiguration;

export default (router: Router) => {
	router.get('/openapi.json', (_req, res) => {
		res.sendFile(specPath);
	});

	router.get('/favicon.ico', (_req, res) => {
		res.sendFile(faviconPath);
	});

	router.get('/', apiReference(config));
};
