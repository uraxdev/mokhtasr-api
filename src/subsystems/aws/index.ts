import { env } from '@/lib/utils';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

export const s3 = new S3Client({
	endpoint: env('S3_ENDPOINT'),
	region: 'auto',
	forcePathStyle: true,
	credentials: {
		accessKeyId: env('S3_ACCESS_KEY_ID'),
		secretAccessKey: env('S3_SECRET_ACCESS_KEY')
	}
});

export async function uploadToBucket(file: Express.Multer.File) {
	const command = new PutObjectCommand({ Bucket: env('S3_BUCKET'), Key: file.originalname, Body: file.buffer, ContentType: file.mimetype });
	const bucketName = env('S3_BUCKET');

	try {
		await s3.send(command);
		return `https://t3.storage.dev/${bucketName}/${file.originalname}`;
	} catch (error) {
		console.error('Error uploading file to S3:', error);
		throw new Error('Failed to upload file to S3');
	}
}
