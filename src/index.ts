import { safeEmpty, safeExec, safeValue, type WatchFuncion, type Safe } from './core';
import { safePipe } from './pipe';
import { isFunction } from './shared';
export type { SafeResult } from './result';
export * from './util';

/**
 *
 * @param init Optional value or function that returns a value
 * @returns A Safe containing the value or function result
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

const s = safe;
export { s, safePipe, safe, Safe, WatchFuncion };
