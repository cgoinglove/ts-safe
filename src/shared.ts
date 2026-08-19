export const isFunction = (value: any): value is (...args: any[]) => any => typeof value === 'function';

export const isPromiseLike = (x: unknown): x is PromiseLike<unknown> => isFunction((x as any)?.then);

/**
 * Detects whether `T` is exactly `any`.
 */
export type IsAny<T> = 0 extends 1 & T ? true : false;

/**
 * Type-level check for PromiseLike values that does not treat `any` (or `never`)
 * as a Promise, so an `any` chain stays synchronous instead of leaking into the
 * async branches.
 *
 * `T` only ever appears in check positions (never in an `extends` clause) so that
 * TypeScript can still measure `Safe<T>` as covariant-compatible across
 * instantiations (e.g. `Safe<never>` remains assignable to `Safe<number>`).
 * The distributive `T extends PromiseLike<any>` yields `boolean` for `any`,
 * which fails the `extends true` test — that is what filters `any` out.
 */
export type IsPromiseLike<T> = [T] extends [never]
  ? false
  : (T extends PromiseLike<any> ? true : false) extends true
    ? true
    : false;
