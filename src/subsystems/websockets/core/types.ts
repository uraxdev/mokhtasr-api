import z from 'zod';

// ============================================================================
// Connection Context
// ============================================================================

/**
 * Minimum shape every WebSocket connection context must have.
 * Consumers extend this with whatever fields their app needs (e.g. a role).
 */
export interface BaseConnectionContext {
	connectionId: string;
	userId: string;
	connectedAt: Date;
	subscriptions: Set<string>;
}

// ============================================================================
// Message Envelope
// ============================================================================

export const BaseMessageSchema = z.object({
	type: z.string().min(1),
	correlationId: z.uuid().optional(),
	timestamp: z.number().optional()
});
export type BaseMessage = z.infer<typeof BaseMessageSchema>;

export const InboundMessageSchema = BaseMessageSchema.extend({
	payload: z.record(z.string(), z.unknown()).optional()
});
export type InboundMessage = z.infer<typeof InboundMessageSchema>;

export const OutboundMessageSchema = BaseMessageSchema.extend({
	payload: z.record(z.string(), z.unknown()).optional(),
	error: z.boolean().optional(),
	errorMessage: z.string().optional()
});
export type OutboundMessage = z.infer<typeof OutboundMessageSchema>;

// ============================================================================
// Subscription Messages
// ============================================================================

export const SubscribeChannelPayloadSchema = z.object({
	channel: z.string().min(1).max(100)
});
export type SubscribeChannelPayload = z.infer<typeof SubscribeChannelPayloadSchema>;

export const SubscribeMessageSchema = z.object({
	type: z.literal('subscribe'),
	payload: SubscribeChannelPayloadSchema
});
export type SubscribeMessage = z.infer<typeof SubscribeMessageSchema>;

export const UnsubscribeMessageSchema = z.object({
	type: z.literal('unsubscribe'),
	payload: SubscribeChannelPayloadSchema
});
export type UnsubscribeMessage = z.infer<typeof UnsubscribeMessageSchema>;

// ============================================================================
// Broadcasting
// ============================================================================

/**
 * A broadcastable event. If `channel` is set, delivery targets channel
 * subscribers; otherwise it targets every connection (optionally filtered
 * by `targetUserIds`/`excludeUserIds`).
 */
export interface BroadcastEvent<T = unknown> {
	type: string;
	payload: T;
	channel?: string;
	targetUserIds?: string[];
	excludeUserIds?: string[];
	timestamp: number;
}

// ============================================================================
// Message Handlers
// ============================================================================

export interface HandlerResult<T = unknown> {
	success: boolean;
	response?: T;
	error?: string;
}

export type MessageHandler<TContext extends BaseConnectionContext, TPayload = unknown, TResponse = unknown> = (payload: TPayload, context: TContext) => Promise<HandlerResult<TResponse>> | HandlerResult<TResponse>;

export interface HandlerRegistration<TContext extends BaseConnectionContext, TPayload = unknown, TResponse = unknown> {
	/** Zod schema for validating the payload */
	schema?: z.ZodSchema<TPayload>;
	/** The handler function */
	handler: MessageHandler<TContext, TPayload, TResponse>;
	/** Whether authentication is required (default: true) */
	requiresAuth?: boolean;
	/** Predicate deciding whether this context may invoke the handler (default: always allowed) */
	authorize?: (context: TContext) => boolean;
}
