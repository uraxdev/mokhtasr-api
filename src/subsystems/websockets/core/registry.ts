import type { BaseConnectionContext } from './types';

// ============================================================================
// Client Registry
// ============================================================================

/**
 * Registry for managing WebSocket connections. Library-agnostic — wrap your
 * actual WebSocket connections with this to enable lookups and broadcasting.
 *
 * @example
 * ```typescript
 * const registry = new ClientRegistry<WebSocket, MyConnectionContext>();
 *
 * registry.add(ws, connectionContext);
 * registry.remove(connectionContext.connectionId);
 * ```
 */
export class ClientRegistry<TConnection, TContext extends BaseConnectionContext> {
	/** Map of connectionId -> connection object */
	private connections = new Map<string, TConnection>();

	/** Map of connectionId -> connection context */
	private contexts = new Map<string, TContext>();

	/** Map of userId -> Set of connectionIds */
	private userConnections = new Map<string, Set<string>>();

	/** Map of channel -> Set of connectionIds */
	private channelSubscriptions = new Map<string, Set<string>>();

	// ========================================================================
	// Connection Management
	// ========================================================================

	add(connection: TConnection, context: TContext): void {
		const { connectionId, userId } = context;

		this.connections.set(connectionId, connection);
		this.contexts.set(connectionId, context);

		if (!this.userConnections.has(userId)) {
			this.userConnections.set(userId, new Set());
		}
		this.userConnections.get(userId)!.add(connectionId);
	}

	remove(connectionId: string): TContext | undefined {
		const context = this.contexts.get(connectionId);
		if (!context) return undefined;

		this.connections.delete(connectionId);
		this.contexts.delete(connectionId);

		const userConns = this.userConnections.get(context.userId);
		if (userConns) {
			userConns.delete(connectionId);
			if (userConns.size === 0) this.userConnections.delete(context.userId);
		}

		for (const channel of context.subscriptions) {
			this.unsubscribeFromChannel(connectionId, channel);
		}

		return context;
	}

	get(connectionId: string): TConnection | undefined {
		return this.connections.get(connectionId);
	}

	getContext(connectionId: string): TContext | undefined {
		return this.contexts.get(connectionId);
	}

	has(connectionId: string): boolean {
		return this.connections.has(connectionId);
	}

	// ========================================================================
	// Subscription Management
	// ========================================================================

	subscribeToChannel(connectionId: string, channel: string): boolean {
		const context = this.contexts.get(connectionId);
		if (!context) return false;

		if (!this.channelSubscriptions.has(channel)) {
			this.channelSubscriptions.set(channel, new Set());
		}
		this.channelSubscriptions.get(channel)!.add(connectionId);
		context.subscriptions.add(channel);

		return true;
	}

	unsubscribeFromChannel(connectionId: string, channel: string): boolean {
		const context = this.contexts.get(connectionId);
		if (!context) return false;

		const channelConns = this.channelSubscriptions.get(channel);
		if (channelConns) {
			channelConns.delete(connectionId);
			if (channelConns.size === 0) this.channelSubscriptions.delete(channel);
		}

		context.subscriptions.delete(channel);
		return true;
	}

	getSubscriptions(connectionId: string): string[] {
		const context = this.contexts.get(connectionId);
		return context ? Array.from(context.subscriptions) : [];
	}

	// ========================================================================
	// Query Methods
	// ========================================================================

	getConnectionsForUser(userId: string): Array<{ connection: TConnection; context: TContext }> {
		const connectionIds = this.userConnections.get(userId);
		if (!connectionIds) return [];

		return Array.from(connectionIds)
			.map((id) => ({ connection: this.connections.get(id)!, context: this.contexts.get(id)! }))
			.filter((entry) => entry.connection && entry.context);
	}

	getConnectionsForChannel(channel: string): Array<{ connection: TConnection; context: TContext }> {
		const connectionIds = this.channelSubscriptions.get(channel);
		if (!connectionIds) return [];

		return Array.from(connectionIds)
			.map((id) => ({ connection: this.connections.get(id)!, context: this.contexts.get(id)! }))
			.filter((entry) => entry.connection && entry.context);
	}

	getAllConnections(): Array<{ connection: TConnection; context: TContext }> {
		return Array.from(this.connections.entries()).map(([id, connection]) => ({ connection, context: this.contexts.get(id)! }));
	}

	// ========================================================================
	// Statistics & Cleanup
	// ========================================================================

	get size(): number {
		return this.connections.size;
	}

	clear(): void {
		this.connections.clear();
		this.contexts.clear();
		this.userConnections.clear();
		this.channelSubscriptions.clear();
	}

	forEach(callback: (connection: TConnection, context: TContext) => void): void {
		for (const [connectionId, connection] of this.connections) {
			const context = this.contexts.get(connectionId);
			if (context) callback(connection, context);
		}
	}
}
