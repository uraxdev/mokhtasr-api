import { Router } from 'express';

import applications from './applications';
import auth from './auth';
import categories from './categories';
import chat from './chat';
import financials from './financials';
import handymen from './handymen';
import jobs from './jobs';
import proposals from './proposals';
import regions from './regions';
import register from './register';
import reviews from './reviews';
import services from './services';
import users from './users';
import visits from './visits';

const router = Router();

export default (): Router => {
	applications(router);
	auth(router);
	categories(router);
	chat(router);
	financials(router);
	jobs(router);
	visits(router);
	proposals(router);
	handymen(router);
	regions(router);
	register(router);
	reviews(router);
	services(router);
	users(router);

	return router;
};
