import multer, { memoryStorage, type Multer } from 'multer';

export const upload: Multer = multer({
	storage: memoryStorage()
});
