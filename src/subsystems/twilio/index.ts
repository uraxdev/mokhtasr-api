import twilio from 'twilio';

export async function sendOtpViaWhatsApp(to: string, otp: string) {
	const ACCOUNT_SID = process.env['TWILIO_ACCOUNT_SID'];
	const ACCOUNT_CONTENT_SID = process.env['TWILIO_CONTENT_SID'];
	const AUTH_TOKEN = process.env['TWILIO_AUTH_TOKEN'];

	try {
		if (!ACCOUNT_SID || !AUTH_TOKEN || !ACCOUNT_CONTENT_SID) {
			throw new Error('Missing Twilio credentials');
		}

		const client = twilio(ACCOUNT_SID, AUTH_TOKEN);
		const result = await client.messages.create({
			from: 'whatsapp:+14155238886',
			to: `whatsapp:${to}`,
			contentSid: ACCOUNT_CONTENT_SID,
			contentVariables: `{"1":"${otp}"}`
		});

		return result;
	} catch {
		// Silence errors for now
		// throw new Error('Failed to send OTP via WhatsApp');
	}
}
