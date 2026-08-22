import type { IncomingMessage, Server } from 'http';
import { WebSocket, WebSocketServer } from 'ws';

import { UserRole } from '@/database/generated/enums';
import { client } from '@/database/lib/client';
import { AccessTokenPayload } from '@/database/repositories/auth';
import { verifyToken } from '@/lib/utils';
import { UserService } from '@/services/users';

import type { BaseConnectionContext, BroadcastOptions, InboundMessage, OutboundMessage } from './core';
import { Broadcaster, ClientRegistry, HandlerRegistry, InboundMessageSchema, createSystemHandlers } from './core';

// ============================================================================
// Types
// ============================================================================

export interface AppConnectionContext extends BaseConnectionContext {
	role: UserRole;
}

interface AuthenticatedWebSocket extends WebSocket {
	context?: AppConnectionContext;
	isAlive: boolean;
}

interface WebSocketServerInstance {
	wss: WebSocketServer;
	registry: ClientRegistry<WebSocket, AppConnectionContext>;
	broadcaster: Broadcaster<WebSocket, AppConnectionContext>;
	handlers: HandlerRegistry<AppConnectionContext>;
}

// ============================================================================
// Connection ID Generator
// ============================================================================

let connectionCounter = 0;

function generateConnectionId(): string {
	connectionCounter++;
	return `conn_${Date.now()}_${connectionCounter}`;
}

// ============================================================================
// Singleton Broadcaster (so services can reach it without a constructor arg)
// ============================================================================

let activeBroadcaster: Broadcaster<WebSocket, AppConnectionContext> | null = null;

function useBroadcaster(): Broadcaster<WebSocket, AppConnectionContext> {
	if (!activeBroadcaster) {
		throw new Error('WebSocket service not initialized. Call createWebSocketServer first.');
	}
	return activeBroadcaster;
}

/** Broadcast a message to every live connection for a user */
export function broadcastToUser(userId: string, message: OutboundMessage): number {
	return useBroadcaster().toUser(userId, message);
}

/** Broadcast a message to every connection subscribed to a channel */
export function broadcastToChannel(channel: string, message: OutboundMessage, options?: BroadcastOptions<AppConnectionContext>): number {
	return useBroadcaster().toChannel(channel, message, options);
}

// ============================================================================
// WebSocket Server Setup
// ============================================================================

export function createWebSocketServer(server: Server): WebSocketServerInstance {
	const wss = new WebSocketServer({ server, path: '/ws' });

	const registry = new ClientRegistry<WebSocket, AppConnectionContext>();
	const broadcaster = new Broadcaster<WebSocket, AppConnectionContext>(registry, (ws, data) => {
		if (ws.readyState === WebSocket.OPEN) {
			ws.send(data);
		}
	});
	activeBroadcaster = broadcaster;

	const handlers = new HandlerRegistry<AppConnectionContext>();
	handlers.registerAll(createSystemHandlers(registry));

	const heartbeatInterval = setInterval(() => {
		wss.clients.forEach((ws) => {
			const socket = ws as AuthenticatedWebSocket;

			if (!socket.isAlive) {
				if (socket.context) registry.remove(socket.context.connectionId);
				return socket.terminate();
			}

			socket.isAlive = false;
			socket.ping();
		});
	}, 30000);

	wss.on('close', () => {
		clearInterval(heartbeatInterval);
	});

	wss.on('connection', async (ws: AuthenticatedWebSocket, req: IncomingMessage) => {
		ws.isAlive = true;

		ws.on('pong', () => {
			ws.isAlive = true;
		});

		try {
			const context = await authenticateConnection(ws, req);
			if (!context) return;

			ws.context = context;
			registry.add(ws, context);

			ws.send(
				JSON.stringify({
					type: 'connection:established',
					payload: { connectionId: context.connectionId, userId: context.userId, role: context.role, serverTime: Date.now() }
				})
			);

			ws.on('message', async (data) => {
				await handleMessage({ ws, rawData: data.toString(), context, handlers });
			});

			ws.on('close', () => {
				if (ws.context) registry.remove(ws.context.connectionId);
			});

			ws.on('error', (error) => {
				console.error(`WebSocket error for connection ${context.connectionId}:`, error.message);
				if (ws.context) registry.remove(ws.context.connectionId);
			});
		} catch (error) {
			console.error('WebSocket connection error:', error);
			sendError(ws, 'connection:error', 'Connection setup failed');
			ws.close(4000, 'Connection error');
		}
	});

	console.info('\x1b[32m✅ WebSocket server is ready\x1b[0m');

	return { wss, registry, broadcaster, handlers };
}

// ============================================================================
// Authentication
// ============================================================================

async function authenticateConnection(ws: AuthenticatedWebSocket, req: IncomingMessage): Promise<AppConnectionContext | null> {
	const connectionId = generateConnectionId();
	const url = new URL(req.url ?? '', 'http://localhost');
	const token = url.searchParams.get('token');

	if (!token) {
		sendError(ws, 'connection:error', 'Authentication required', { code: 'AUTH_REQUIRED' });
		ws.close(4001, 'Authentication required');
		return null;
	}

	try {
		const decoded = verifyToken<AccessTokenPayload>(token);
		if (!decoded) {
			sendError(ws, 'connection:error', 'Invalid token', { code: 'INVALID_TOKEN' });
			ws.close(4001, 'Invalid token');
			return null;
		}

		const user = await new UserService(client).find({ id: decoded.data.id });
		if (!user) {
			sendError(ws, 'connection:error', 'Invalid user', { code: 'INVALID_USER' });
			ws.close(4001, 'Invalid user');
			return null;
		}

		return {
			connectionId,
			userId: user.id,
			role: user.role,
			connectedAt: new Date(),
			subscriptions: new Set()
		} satisfies AppConnectionContext;
	} catch (error) {
		sendError(ws, 'connection:error', (error as Error).message, { code: 'AUTH_FAILED' });
		ws.close(4001, (error as Error).message);
		return null;
	}
}

// ============================================================================
// Message Handling
// ============================================================================

async function handleMessage(args: { ws: AuthenticatedWebSocket; rawData: string; context: AppConnectionContext; handlers: HandlerRegistry<AppConnectionContext> }) {
	const { ws, rawData, context, handlers } = args;

	let message: InboundMessage;

	try {
		const parsed = JSON.parse(rawData);
		const validation = InboundMessageSchema.safeParse(parsed);

		if (!validation.success) {
			sendError(ws, 'message:error', 'Invalid message format');
			return;
		}

		message = validation.data;
	} catch {
		sendError(ws, 'message:error', 'Invalid JSON');
		return;
	}

	const result = await handlers.handle(message, context);

	if (result.success && result.response) {
		ws.send(JSON.stringify({ ...result.response, correlationId: message.correlationId, timestamp: Date.now() }));
	} else if (!result.success) {
		sendError(ws, `${message.type}:error`, result.error ?? 'Handler failed', { correlationId: message.correlationId });
	}
}

// ============================================================================
// Helpers
// ============================================================================

function sendError(ws: WebSocket, type: string, errorMessage: string, options?: { code?: string; correlationId?: string }) {
	if (ws.readyState !== WebSocket.OPEN) return;

	ws.send(
		JSON.stringify({
			type,
			error: true,
			errorMessage,
			correlationId: options?.correlationId,
			payload: options?.code ? { code: options.code } : undefined,
			timestamp: Date.now()
		})
	);
}

// ============================================================================
// Shutdown
// ============================================================================

export function shutdownWebSocket(wsServer: WebSocketServerInstance) {
	const { wss, registry } = wsServer;

	wss.clients.forEach((ws) => {
		ws.send(JSON.stringify({ type: 'connection:closing', payload: { reason: 'Server shutdown' }, timestamp: Date.now() }));
		ws.close(1001, 'Server shutdown');
	});

	registry.clear();
	wss.close();
	activeBroadcaster = null;

	console.info('🛑 WebSocket server closed.');
}
