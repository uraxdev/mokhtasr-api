import { Router } from 'express';

import applications from '../routes/applications';
import auth from '../routes/auth';
import categories from '../routes/categories';
import chat from '../routes/chat';
import financials from '../routes/financials';
import handymen from '../routes/handymen';
import jobs from '../routes/jobs';
import offers from '../routes/offers';
import proposals from '../routes/proposals';
import regions from '../routes/regions';
import register from '../routes/register';
import services from '../routes/services';
import users from '../routes/users';

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
