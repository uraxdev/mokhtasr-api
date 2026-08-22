import type { Express } from 'express';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const viewsDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'views');

export function configurePortalViewEngine(app: Express) {
	app.set('view engine', 'ejs');
	app.set('views', viewsDir);
}
