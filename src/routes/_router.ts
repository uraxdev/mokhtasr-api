import { Router } from 'express';

import applications from './applications';
import auth from './auth';
import categories from './categories';
import chat from './chat';
import financials from './financials';
import handymen from './handymen';
import jobs from './jobs';
import offers from './offers';
import proposals from './proposals';
import regions from './regions';
import register from './register';
import services from './services';
import users from './users';

const router = Router();

export default (): Router => {
	applications(router);
	auth(router);
	categories(router);
	chat(router);
	financials(router);
	jobs(router);
	offers(router);
	proposals(router);
	handymen(router);
	regions(router);
	register(router);
	services(router);
	users(router);

	return router;
};
