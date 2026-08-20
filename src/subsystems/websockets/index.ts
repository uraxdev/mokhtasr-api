// Single entry point — routes/services import only from '@/subsystems/websockets'.

export { broadcastToChannel, broadcastToUser, createWebSocketServer, shutdownWebSocket } from './server';
export type { AppConnectionContext } from './server';
