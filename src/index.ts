import { createServer } from 'http';

import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

import { withErrorBoundary } from '@/middlewares/with-error-boundary';
import { withRequestLogging } from '@/middlewares/with-request-logging';
import router from '@/routes/_router';
import { withAuthentication } from '@/subsystems/auth/with-authentication';
import { upload } from '@/subsystems/multer';
import { createScheduler } from '@/subsystems/scheduler';
import { createWebSocketServer } from '@/subsystems/websockets';

dotenv.config({ quiet: true });

const PORT = process.env['PORT'] || 3000;

const app = express();

app.use(cors());
app.use(express.json());

app.use(withRequestLogging);
app.use(withAuthentication);
app.use('/', upload.any(), router());
app.use(withErrorBoundary);

const server = createServer(app);
createWebSocketServer(server);
createScheduler();

server.listen(PORT, () => console.log(`🚀 Server is ready on port ${PORT}`));
