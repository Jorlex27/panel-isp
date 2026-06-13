import 'hono';

declare module 'hono' {
    interface ContextVariableMap {
        /** Username admin dari JWT, diisi oleh authMiddleware. */
        actor: string;
    }
}
