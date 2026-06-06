import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/client';
import regions from './regions.json';
import services from './services.json';

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL']! });
const client = new PrismaClient({ adapter });

async function main() {
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

	for (const service of services) {
		await client.service.create({
			data: {
				name: service.name
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
