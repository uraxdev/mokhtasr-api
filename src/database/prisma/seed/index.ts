import { env } from '@/lib/utils';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/client';
import categories from './categories.json';
import regions from './regions.json';

const adapter = new PrismaPg({ connectionString: env('DATABASE_URL') });
const client = new PrismaClient({ adapter });

const admins = [
	{ name: 'Seif Essam', phone: '+201558237511' },
	{ name: 'Ziad Ahmed', phone: '+201092018843' }
];

async function main() {
	for (const admin of admins) {
		await client.user.create({
			data: {
				name: admin.name,
				phone: admin.phone,
				role: 'ADMIN',
				admin: { create: {} }
			}
		});
	}

	for (const region of regions) {
		await client.region.create({
			data: {
				name: region.name,
				subRegions: {
					createMany: {
						data: region.cities.map((city) => ({ name: city.name }))
					}
				}
			}
		});
	}

	for (const category of categories.categories) {
		await client.category.create({
			data: {
				name: category.name,
				services: {
					createMany: {
						data: category.services.map((service) => ({ name: { ar: service.ar, en: service.en } }))
					}
				}
			}
		});
	}
}

main()
	.then(async () => {
		await client.$disconnect();
	})
	.catch(async (e) => {
		console.error(e);
		await client.$disconnect();
		process.exit(1);
	});
