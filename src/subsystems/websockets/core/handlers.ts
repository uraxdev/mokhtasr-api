import type z from 'zod';

import type { ClientRegistry } from './registry';
import { SubscribeChannelPayloadSchema } from './types';
import type { BaseConnectionContext, HandlerRegistration, HandlerResult, InboundMessage, SubscribeChannelPayload } from './types';

// ============================================================================
// Handler Registry
// ============================================================================

/**
 * Registry for WebSocket message handlers. Validates, authorizes, and routes
 * incoming messages.
 *
 * @example
 * ```typescript
 * const handlers = new HandlerRegistry<MyConnectionContext>();
 *
 * handlers.register('order:get', {
 *   schema: z.object({ orderId: z.string().uuid() }),
 *   handler: async (payload, context) => ({ success: true, response: await getOrder(payload.orderId) }),
 *   authorize: (context) => context.role === 'ADMIN'
 * });
 *
 * const result = await handlers.handle(message, connectionContext);
 * ```
 */
export class HandlerRegistry<TContext extends BaseConnectionContext> {
	private handlers = new Map<string, HandlerRegistration<TContext>>();

	// ========================================================================
	// Registration
	// ========================================================================

	register<TPayload = unknown, TResponse = unknown>(messageType: string, registration: HandlerRegistration<TContext, TPayload, TResponse>): void {
		this.handlers.set(messageType, registration as HandlerRegistration<TContext>);
	}

	registerAll(handlers: Record<string, HandlerRegistration<TContext>>): void {
		for (const [type, registration] of Object.entries(handlers)) {
			this.register(type, registration);
		}
	}

	unregister(messageType: string): boolean {
		return this.handlers.delete(messageType);
	}

	has(messageType: string): boolean {
		return this.handlers.has(messageType);
	}

	getRegisteredTypes(): string[] {
		return Array.from(this.handlers.keys());
	}

	// ========================================================================
	// Message Handling
	// ========================================================================

	async handle(message: InboundMessage, context: TContext): Promise<HandlerResult> {
		const { type, payload } = message;

		const registration = this.handlers.get(type);
		if (!registration) {
			return { success: false, error: `Unknown message type: ${type}` };
		}

		if (registration.requiresAuth !== false && !context.userId) {
			return { success: false, error: 'Authentication required' };
		}

		if (registration.authorize && !registration.authorize(context)) {
			return { success: false, error: 'Unauthorized: insufficient permissions' };
		}

		if (registration.schema) {
			const validation = registration.schema.safeParse(payload);
			if (!validation.success) {
				const errorMessages = validation.error.issues.map((issue) => issue.message).join(', ');
				return { success: false, error: `Validation error: ${errorMessages}` };
			}
		}

		try {
			return await registration.handler(payload, context);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Handler execution failed';
			return { success: false, error: errorMessage };
		}
	}
}

// ============================================================================
// Handler Builder (Fluent API)
// ============================================================================

/**
 * Fluent builder for creating handler registrations with type safety.
 *
 * @example
 * ```typescript
 * const handler = createHandler<MyConnectionContext>()
 *   .withSchema(z.object({ orderId: z.string().uuid() }))
 *   .authorize((context) => context.role === 'ADMIN')
 *   .handle(async (payload, context) => ({ success: true, response: {} }));
 *
 * registry.register('order:get', handler);
 * ```
 */
export class HandlerBuilder<TContext extends BaseConnectionContext, TPayload = unknown, TResponse = unknown> {
	private schema?: z.ZodSchema<TPayload>;
	private requiresAuth = true;
	private authorizeFn?: (context: TContext) => boolean;

	/** Set validation schema for the payload */
	withSchema<T>(schema: z.ZodSchema<T>): HandlerBuilder<TContext, T, TResponse> {
		const builder = new HandlerBuilder<TContext, T, TResponse>();
		builder.schema = schema;
		builder.requiresAuth = this.requiresAuth;
		builder.authorizeFn = this.authorizeFn;
		return builder;
	}

	/** Allow unauthenticated access */
	public(): this {
		this.requiresAuth = false;
		return this;
	}

	/** Require authentication (default) */
	authenticated(): this {
		this.requiresAuth = true;
		return this;
	}

	/** Restrict to contexts that pass this predicate */
	authorize(fn: (context: TContext) => boolean): this {
		this.authorizeFn = fn;
		return this;
	}

	/** Define the handler function and build the registration */
	handle(handler: (payload: TPayload, context: TContext) => Promise<HandlerResult<TResponse>> | HandlerResult<TResponse>): HandlerRegistration<TContext, TPayload, TResponse> {
		return {
			schema: this.schema,
			handler,
			requiresAuth: this.requiresAuth,
			authorize: this.authorizeFn
		};
	}
}

export function createHandler<TContext extends BaseConnectionContext, TPayload = unknown, TResponse = unknown>(): HandlerBuilder<TContext, TPayload, TResponse> {
	return new HandlerBuilder<TContext, TPayload, TResponse>();
}

// ============================================================================
// System Handlers (ping/pong, subscribe/unsubscribe)
// ============================================================================

/**
 * Create system handlers for ping/pong and channel subscriptions.
 * Register these once per `HandlerRegistry`.
 *
 * @example
 * ```typescript
 * handlers.registerAll(createSystemHandlers(registry));
 * ```
 */
export function createSystemHandlers<TConnection, TContext extends BaseConnectionContext>(clientRegistry: ClientRegistry<TConnection, TContext>): Record<string, HandlerRegistration<TContext>> {
	return {
		ping: {
			handler: (payload: unknown) => {
				const p = payload as { timestamp?: number } | undefined;
				return {
					success: true,
					response: { type: 'pong', payload: { timestamp: p?.timestamp ?? Date.now(), serverTime: Date.now() } }
				};
			}
		},

		subscribe: {
			schema: SubscribeChannelPayloadSchema,
			handler: (payload: unknown, context: TContext) => {
				const { channel } = payload as SubscribeChannelPayload;
				const added = clientRegistry.subscribeToChannel(context.connectionId, channel);

				if (added) {
					return { success: true, response: { type: 'subscription:success', payload: { channel } } };
				}

				return { success: false, error: `Failed to subscribe to channel: ${channel}` };
			}
		},

		unsubscribe: {
			schema: SubscribeChannelPayloadSchema,
			handler: (payload: unknown, context: TContext) => {
				const { channel } = payload as SubscribeChannelPayload;
				clientRegistry.unsubscribeFromChannel(context.connectionId, channel);
				return { success: true, response: { type: 'unsubscription:success', payload: { channel } } };
			}
		}
	};
}
