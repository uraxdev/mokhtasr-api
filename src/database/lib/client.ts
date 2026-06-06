import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client';

const globalForClient = global as unknown as { client: PrismaClient };

function createPrismaClient() {
	const connectionString = process.env['DATABASE_URL'];
	const adapter = new PrismaPg({ connectionString });

	return new PrismaClient({ adapter, errorFormat: 'pretty' });
}

export const client = globalForClient.client || createPrismaClient();

if (process.env['NODE_ENV'] !== 'production') {
	globalForClient.client = client;
}
