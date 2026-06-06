import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

import { upload } from '@/lib/multer';
import router from '@/lib/router';
import { withAuthentication } from '@/middlewares/with-authentication';
import { withErrorBoundary } from '@/middlewares/with-error-boundary';
import { withRequestLogging } from '@/middlewares/with-request-logging';

dotenv.config({ quiet: true });

const PORT = process.env['PORT'] || 3000;
const BASE_URL = process.env['BASE_URL'] || 'https://api.mokhtasr.app';

const app = express();

app.use(cors({ origin: BASE_URL, credentials: true }));
app.use(express.json());

app.use(withRequestLogging);
app.use(withAuthentication);
app.use('/', upload.any(), router());
app.use(withErrorBoundary);

app.listen(PORT, () => console.log(`🚀 Server is ready on ${BASE_URL}:${PORT}`));
