import { env } from '@/lib/utils';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';

const endpoint = env('S3_ENDPOINT').replace(/\/+$/, '');

export const s3 = new S3Client({
	endpoint,
	region: env('S3_REGION'),
	forcePathStyle: true,
	credentials: {
		accessKeyId: env('S3_ACCESS_KEY_ID'),
		secretAccessKey: env('S3_SECRET_ACCESS_KEY')
	}
});

export async function uploadToBucket(file: Express.Multer.File) {
	const bucketName = env('S3_BUCKET');
	const key = `uploads/${randomUUID()}${extname(file.originalname).toLowerCase()}`;
	const command = new PutObjectCommand({ Bucket: bucketName, Key: key, Body: file.buffer, ContentType: file.mimetype });

	try {
		await s3.send(command);
		return `${endpoint}/${bucketName}/${key}`;
	} catch (error) {
		console.error('Error uploading file to S3:', error);
		throw new Error('Failed to upload file to S3');
	}
}
