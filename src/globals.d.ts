import type { User } from '@/database/index';

declare global {
	namespace Express {
		interface Locals {
			entities: {
				user: string;
				role: User['role'];
				admin?: string;
				customer?: string;
				handyman?: string;
			};
		}
	}

	namespace NodeJS {
		interface ProcessEnv {
			NODE_ENV?: 'development' | 'production' | 'staging';
			BASE_URL?: string;
			PORT?: number;
			DATABASE_URL?: string;
			JWT_SECRET?: string;
			TWILIO_ACCOUNT_SID?: string;
			TWILIO_CONTENT_SID?: string;
			TWILIO_AUTH_TOKEN?: string;
		}
	}
}
