export const isFunction = (value: any): value is (...args: any[]) => any => typeof value === 'function';

export const isPromiseLike = (x: unknown): x is PromiseLike<unknown> => isFunction((x as any)?.then);
