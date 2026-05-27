import 'hono';

declare module 'hono' {
  interface ContextVariableMap {
    requestId: string;
    user: any;
    [key: string]: any;
  }
}
