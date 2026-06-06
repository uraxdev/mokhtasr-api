import z from 'zod';

export const requiredString = z.string('This field cannot be empty').nonempty('This field cannot be empty');

export const requiredNumber = z.number('This field cannot be empty').min(0);

export const PasswordSchema = z
	.string()
	.min(8, 'Password must be at least 8 characters')
	.regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
	.regex(/[a-z]/, 'Password must contain at least one lowercase letter')
	.regex(/\d/, 'Password must contain at least one number')
	.regex(/[!@#$%^&*()\-_=+{};:,<.>]/, 'Password must contain at least one special character');

export const SlugSchema = z
	.string()
	.trim()
	.regex(/^[a-z0-9-]+$/, { error: 'Slug must contain only lowercase letters, numbers, and dashes' });

export const PhoneSchema = z.string().regex(/^\+20(10|11|12|15)\d{8}$/, 'Invalid phone number');

export const NameSchema = z
	.string({ error: 'Invalid name' })
	.min(2, 'Invalid name')
	.max(100, 'Name is too long')
	.regex(/^[a-zA-Z\u0600-\u06FF\s]+$/, 'Name must contain only letters and spaces');

export const DecimalSchema = z.string().regex(/^-?\d+(\.\d+)?$/, 'Invalid decimal format');

export const ErrorResponseSchema = z.object({
	message: z.string(),
	details: z.string().nullable().optional()
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

export function Refined<T extends z.ZodRawShape>(schema: T) {
	return z.object(schema).refine((payload) => Object.values(payload).some((v) => v !== undefined), {
		message: 'At least one field must be provided'
	});
}
