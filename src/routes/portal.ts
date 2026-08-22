import { ApplicationStatus } from '@/database/generated/enums';
import { client } from '@/database/lib/client';
import { PhoneSchema } from '@/lib/schemas';
import { ApplicationService } from '@/services/applications';
import { UserService } from '@/services/users';
import { AuthSystem } from '@/subsystems/auth';
import { clearPortalSession, issuePortalSession, withPortalSession } from '@/subsystems/portal/session';
import { Router } from 'express';

export default (router: Router) => {
	const portal = Router();

	portal.get('/login', (_req, res) => {
		res.render('portal/login', { error: null });
	});

	portal.post('/login', async (req, res, next) => {
		const phone = req.body['phone'];

		try {
			const parsedPhone = PhoneSchema.safeParse(phone);
			if (!parsedPhone.success) {
				return res.render('portal/login', { error: 'Invalid phone number.' });
			}

			const user = await new UserService(client).find({ phone: parsedPhone.data });
			if (!user || user.role !== 'ADMIN') {
				return res.render('portal/login', { error: 'No admin account found for this number.' });
			}

			const { verificationId } = await new AuthSystem(client).initiate({ phone: parsedPhone.data });
			return res.render('portal/verify', { verificationId, phone: parsedPhone.data, error: null });
		} catch (error) {
			return next(error);
		}
	});

	portal.get('/verify', (_req, res) => {
		res.redirect('/admins/portal/login');
	});

	portal.post('/verify', async (req, res) => {
		const verificationId = req.body['verificationId'];
		const phone = req.body['phone'];
		const otp = req.body['otp'];

		try {
			const session = await new AuthSystem(client).verify({ verificationId, phone, otp });

			if (session.user.role !== 'ADMIN') {
				return res.render('portal/login', { error: 'No admin account found for this number.' });
			}

			issuePortalSession(res, session.access);
			return res.redirect('/admins/portal/applications');
		} catch {
			return res.render('portal/verify', { verificationId, phone, error: 'Invalid or expired code.' });
		}
	});

	portal.post('/logout', (_req, res) => {
		clearPortalSession(res);
		res.redirect('/admins/portal/login');
	});

	portal.use(withPortalSession);

	portal.get('/applications', async (req, res, next) => {
		const statusParam = req.query['status'];
		const statusValues: string[] = Object.values(ApplicationStatus);
		const activeStatus = typeof statusParam === 'string' && statusValues.includes(statusParam) ? statusParam : 'ALL';
		const where = activeStatus === 'ALL' ? undefined : { status: activeStatus as (typeof ApplicationStatus)[keyof typeof ApplicationStatus] };

		try {
			const applications = await new ApplicationService(client).list(where);
			return res.render('portal/applications/list', { applications, activeStatus });
		} catch (error) {
			return next(error);
		}
	});

	portal.get('/applications/:id', async (req, res, next) => {
		const id = req.params['id'];

		try {
			const application = await new ApplicationService(client).find(id);
			if (!application) return res.redirect('/admins/portal/applications');
			return res.render('portal/applications/detail', { application, error: null });
		} catch (error) {
			return next(error);
		}
	});

	portal.post('/applications/:id/accept', async (req, res, next) => {
		const id = req.params['id'];

		try {
			await new ApplicationService(client).accept(id);
			return res.redirect(`/admins/portal/applications/${id}`);
		} catch (error) {
			const application = await new ApplicationService(client).find(id);
			if (!application) return next(error);
			return res.render('portal/applications/detail', { application, error: (error as Error).message });
		}
	});

	portal.post('/applications/:id/reject', async (req, res, next) => {
		const id = req.params['id'];
		const notes = req.body['notes'];

		try {
			await new ApplicationService(client).reject(id, { notes });
			return res.redirect(`/admins/portal/applications/${id}`);
		} catch (error) {
			const application = await new ApplicationService(client).find(id);
			if (!application) return next(error);
			return res.render('portal/applications/detail', { application, error: (error as Error).message });
		}
	});

	router.use('/admins/portal', portal);
};
