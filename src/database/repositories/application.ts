import z from 'zod';

export class ApplicationRepository {
	static get() {
		return z.object({
			id: z.uuid(),
			firstName: z.string(),
			lastName: z.string(),
			nationalIdFront: z.url(),
			nationalIdBack: z.url(),
			selfie: z.url(),
			birthdate: z.iso.datetime(),
			handymanId: z.uuid(),
			createdAt: z.iso.datetime(),
			updatedAt: z.iso.datetime()
		});
	}

	static create() {
		return z.object({
			handymanId: z.uuid(),
			firstName: z.string(),
			lastName: z.string(),
			nationalIdFront: z.any(),
			nationalIdBack: z.any(),
			selfie: z.any(),
			birthdate: z.iso.datetime(),
			regions: z.array(z.uuid()),
			services: z.array(z.uuid())
		});
	}

	static reject() {
		return z.object({
			notes: z.string()
		});
	}
}

export type Application = z.infer<ReturnType<typeof ApplicationRepository.get>>;
export type ApplicationCreatePayload = z.infer<ReturnType<typeof ApplicationRepository.create>>;
export type ApplicationRejectPayload = z.infer<ReturnType<typeof ApplicationRepository.reject>>;
