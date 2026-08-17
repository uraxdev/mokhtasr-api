import { Router } from 'express';

import admin from './admin';
import applications from './applications';
import auth from './auth';
import categories from './categories';
import chat from './chat';
import docs from './docs';
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
	admin(router);
	docs(router);
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
