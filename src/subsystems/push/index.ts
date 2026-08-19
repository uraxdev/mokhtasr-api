import { App, cert, initializeApp } from 'firebase-admin/app';
import { getMessaging as getFirebaseMessaging, Messaging } from 'firebase-admin/messaging';

export type PushResult = { token: string; success: boolean; invalid: boolean };

const globalForPush = global as unknown as { pushApp?: App };

let warnedNotConfigured = false;

function getMessaging(): Messaging | null {
	const projectId = process.env['FIREBASE_PROJECT_ID'];
	const clientEmail = process.env['FIREBASE_CLIENT_EMAIL'];
	const privateKey = process.env['FIREBASE_PRIVATE_KEY'];

	if (!projectId || !clientEmail || !privateKey) {
		if (!warnedNotConfigured) {
			console.warn('Push notifications are not configured — set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY to enable delivery.');
			warnedNotConfigured = true;
		}
		return null;
	}

	if (!globalForPush.pushApp) {
		globalForPush.pushApp = initializeApp({
			credential: cert({ projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, '\n') })
		});
	}

	return getFirebaseMessaging(globalForPush.pushApp);
}

export async function sendPush(tokens: string[], title: string, body: string, data?: Record<string, string>): Promise<PushResult[]> {
	if (tokens.length === 0) return [];

	const messaging = getMessaging();

	if (!messaging) {
		return tokens.map((token) => ({ token, success: false, invalid: false }));
	}

	try {
		const response = await messaging.sendEachForMulticast({ tokens, notification: { title, body }, data });

		return response.responses.map((result, index) => {
			const token = tokens[index] as string;

			if (result.success) return { token, success: true, invalid: false };

			const code = result.error?.code;
			const invalid = code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-argument';
			return { token, success: false, invalid };
		});
	} catch (error) {
		console.error('Failed to send push notifications:', error);
		return tokens.map((token) => ({ token, success: false, invalid: false }));
	}
}
