import type { ClientRegistry } from './registry';
import type { BaseConnectionContext, BroadcastEvent, OutboundMessage } from './types';

// ============================================================================
// Types
// ============================================================================

/** Function that sends data to a connection. Implement with your WS library. */
export type SendFunction<TConnection> = (connection: TConnection, data: string) => void;

export interface BroadcastOptions<TContext> {
	/** Exclude these connection IDs from the broadcast */
	excludeConnectionIds?: string[];
	/** Only send to these user IDs */
	targetUserIds?: string[];
	/** Exclude these user IDs */
	excludeUserIds?: string[];
	/** Only send to connections whose context passes this predicate */
	filter?: (context: TContext) => boolean;
}

// ============================================================================
// Broadcaster
// ============================================================================

/**
 * Handles broadcasting messages to WebSocket connections. Library-agnostic —
 * you provide the send function for your WebSocket library.
 *
 * @example
 * ```typescript
 * const broadcaster = new Broadcaster(registry, (ws, data) => {
 *   if (ws.readyState === WebSocket.OPEN) ws.send(data);
 * });
 *
 * broadcaster.toUser(userId, { type: 'notification:created', payload: notification });
 * broadcaster.toChannel('chat:visit-123', { type: 'chat:message', payload: message });
 * ```
 */
export class Broadcaster<TConnection, TContext extends BaseConnectionContext> {
	constructor(
		private readonly registry: ClientRegistry<TConnection, TContext>,
		private readonly sendFn: SendFunction<TConnection>
	) {}

	// ========================================================================
	// Core Broadcast Methods
	// ========================================================================

	/** Broadcast a message to every connection */
	toAll(message: OutboundMessage, options: BroadcastOptions<TContext> = {}): number {
		return this.broadcastToConnections(this.registry.getAllConnections(), message, options);
	}

	/** Send a message to a specific user (all their connections) */
	toUser(userId: string, message: OutboundMessage): number {
		return this.broadcastToConnections(this.registry.getConnectionsForUser(userId), message);
	}

	/** Send a message to multiple specific users */
	toUsers(userIds: string[], message: OutboundMessage): number {
		let count = 0;
		for (const userId of userIds) {
			count += this.toUser(userId, message);
		}
		return count;
	}

	/** Broadcast to all connections subscribed to a channel */
	toChannel(channel: string, message: OutboundMessage, options: BroadcastOptions<TContext> = {}): number {
		return this.broadcastToConnections(this.registry.getConnectionsForChannel(channel), message, options);
	}

	/** Send to a specific connection by ID */
	toConnection(connectionId: string, message: OutboundMessage): boolean {
		const connection = this.registry.get(connectionId);
		if (!connection) return false;

		this.sendFn(connection, this.serializeMessage(message));
		return true;
	}

	/** Broadcast based on a BroadcastEvent */
	event(event: BroadcastEvent): number {
		const message: OutboundMessage = {
			type: event.type,
			payload: event.payload as Record<string, unknown>,
			timestamp: event.timestamp
		};

		const options: BroadcastOptions<TContext> = {
			targetUserIds: event.targetUserIds,
			excludeUserIds: event.excludeUserIds
		};

		if (event.channel) {
			return this.toChannel(event.channel, message, options);
		}

		return this.toAll(message, options);
	}

	// ========================================================================
	// Helpers
	// ========================================================================

	private broadcastToConnections(connections: Array<{ connection: TConnection; context: TContext }>, message: OutboundMessage, options: BroadcastOptions<TContext> = {}): number {
		const { excludeConnectionIds, targetUserIds, excludeUserIds, filter } = options;

		const data = this.serializeMessage(message);
		let sentCount = 0;

		for (const { connection, context } of connections) {
			if (excludeConnectionIds?.includes(context.connectionId)) continue;
			if (targetUserIds && !targetUserIds.includes(context.userId)) continue;
			if (excludeUserIds?.includes(context.userId)) continue;
			if (filter && !filter(context)) continue;

			this.sendFn(connection, data);
			sentCount++;
		}

		return sentCount;
	}

	private serializeMessage(message: OutboundMessage): string {
		return JSON.stringify({ ...message, timestamp: message.timestamp ?? Date.now() });
	}
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createBroadcaster<TConnection, TContext extends BaseConnectionContext>(registry: ClientRegistry<TConnection, TContext>, sendFn: SendFunction<TConnection>): Broadcaster<TConnection, TContext> {
	return new Broadcaster(registry, sendFn);
}

/** Helper to create a BroadcastEvent */
export function createBroadcastEvent<T>(type: string, payload: T, options: Partial<Pick<BroadcastEvent, 'channel' | 'targetUserIds' | 'excludeUserIds'>> = {}): BroadcastEvent<T> {
	return { type, payload, timestamp: Date.now(), ...options };
}
