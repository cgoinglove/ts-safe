import { safeEmpty, safeExec, safeValue, type PeekFunction, type Safe } from './core';
import { safePipe } from './pipe';
import { isFunction } from './shared';
export type { SafeResult } from './result';
export * from './util';

/**
 * Creates a Safe container for type-safe error handling.
 *
 * @param init - Optional value or function that returns a value
 * @returns A Safe containing the value or function result
 *
 * @example
 * // Wrap a value
 * safe(42)                        // Safe<number>
 *
 * // Wrap a function (errors are captured)
 * safe(() => JSON.parse(input))   // Safe<any>
 *
 * // Create an empty Safe
 * safe()                          // Safe<undefined>
 */
function safe<T>(init: () => T): Safe<T>;
function safe<T>(init: T): Safe<T>;
function safe(): Safe<undefined>;
function safe<T>(init?: T | (() => T)): Safe<T> {
  if (init === undefined) return safeEmpty() as Safe<T>;
  if (isFunction(init)) return safeExec(init);
  return safeValue(init);
}

safe.pipe = safePipe;

export { safePipe, safe, Safe, PeekFunction };
