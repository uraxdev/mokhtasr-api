import { Client } from '@/database/lib/types';
import { AccessTokenPayload, AuthRepository, InitiatePayload, RefreshPayload, Session, VerifyPayload } from '@/database/repositories/auth';
import { User } from '@/database/repositories/user';
import { env, generateOTP, generateToken, validateSchema, verifyToken } from '@/lib/utils';
import { UserService } from '@/services/users';
import { sendOtpViaWhatsApp } from '@/subsystems/twilio';

export class AuthSystem {
	constructor(private readonly client: Client) {}

	async initiate(payload: InitiatePayload) {
		validateSchema(AuthRepository.initiate(), payload);

		const otp = generateOTP();
		const token = generateToken({ ...payload, otp }, { expiresIn: '5m' });

		if (env('NODE_ENV') === 'production') {
			await sendOtpViaWhatsApp(payload.phone, otp);
		}

		const verification = await this.client.verification.create({
			data: { token, expiresAt: new Date(Date.now() + 300_000) },
			select: { id: true }
		});

		return { verificationId: verification.id };
	}

	async verify(payload: VerifyPayload) {
		validateSchema(AuthRepository.verify(), payload);

		const verification = await this.client.verification.findUnique({ where: { id: payload.verificationId } });
		if (!verification) throw new Error('Verification not found');
		if (verification.expiresAt < new Date()) throw new Error('Unauthorized: verification expired');

		const tokenPayload = verifyToken(verification.token);
		validateSchema(AuthRepository.verificationToken(), tokenPayload);

		if (tokenPayload.data.phone !== payload.phone || tokenPayload.data.otp !== payload.otp) {
			throw new Error('Invalid credentials');
		}

		await this.client.verification.delete({ where: { id: payload.verificationId } });

		const user = await new UserService(this.client).find({ phone: payload.phone });

		if (!user) {
			if (!payload.role) throw new Error('Role must be provided');
			const newUser = await new UserService(this.client).create({ name: 'Mokhtasr User', phone: payload.phone, role: payload.role });
			const session = createSession({ id: newUser.id, role: newUser.role });
			return { ...session, user: newUser };
		} else {
			const session = createSession({ id: user.id, role: user.role });
			return { ...session, user };
		}
	}

	async refresh(payload: RefreshPayload) {
		validateSchema(AuthRepository.refresh(), payload);

		const decoded = verifyToken(payload.refresh) as AccessTokenPayload;

		if (!decoded) {
			throw new Error('Invalid token');
		}

		const user = await new UserService(this.client).find({ id: decoded.data.id, role: decoded.data.role });

		if (!user) {
			throw Error('Invalid credentials');
		}

		return { access: generateToken(user, { expiresIn: '1d' }) };
	}
}

function createSession(user: Pick<User, 'id' | 'role'>) {
	const access = generateToken(user, { expiresIn: '1d' });
	const refresh = generateToken(user, { expiresIn: '30d' });

	return { access, refresh } satisfies Pick<Session, 'access' | 'refresh'>;
}
