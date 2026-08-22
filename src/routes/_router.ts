import { Router } from 'express';

import admins from './admins';
import applications from './applications';
import auth from './auth';
import categories from './categories';
import chat from './chat';
import docs from './docs';
import financials from './financials';
import handymen from './handymen';
import jobs from './jobs';
import notifications from './notifications';
import portal from './portal';
import proposals from './proposals';
import regions from './regions';
import register from './register';
import reviews from './reviews';
import services from './services';
import users from './users';
import visits from './visits';
import websockets from './websockets';

const router = Router();

export default (): Router => {
	admins(router);
	docs(router);
	applications(router);
	auth(router);
	categories(router);
	chat(router);
	financials(router);
	jobs(router);
	notifications(router);
	portal(router);
	visits(router);
	proposals(router);
	handymen(router);
	regions(router);
	register(router);
	reviews(router);
	services(router);
	users(router);
	websockets(router);

	return router;
};
