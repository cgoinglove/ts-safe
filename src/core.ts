import { ExtractSafeValue, SafeResult, safeResult } from './result';
import { isPromiseLike } from './shared';

/**
 * A safe container for values that handles errors gracefully
 * and supports both synchronous and asynchronous operations.
 *
 * Methods are categorized by their impact on the chain:
 *
 * **Transform** — change the value:
 * - `map` — transforms the success value
 * - `flatMap` — transforms with a function returning another Safe
 *
 * **Side Effect** — runs logic, can affect chain state:
 * - `effect` — side effect on success (errors propagate, value preserved)
 * - `recover` — provides a recovery value on error
 *
 * **Observe** — pure observation, never affects the chain:
 * - `observe` — observes the full SafeResult
 * - `observeOk` — observes the success value only
 * - `observeError` — observes the error only
 *
 * **Terminal** — extracts the final result:
 * - `unwrap` — extracts value or throws
 * - `orElse` — extracts value or returns fallback
 * - `match` — pattern matches on success/error
 * - `isOk` — checks success state
 */
export interface Safe<T> {
  /**
   * Transforms the value inside the Safe container.
   * If the container has an error, the transform is skipped.
   *
   * @param transform - Function to transform the value
   * @returns A new Safe containing the transformed value
   *
   * @example
   * safe(2).map(x => x * 3).unwrap() // 6
   */
  map<U>(
    transform: (value: [T] extends [PromiseLike<any>] ? Awaited<T> : T) => U
  ): [U] extends [PromiseLike<any>] ? Safe<U> : [T] extends [PromiseLike<any>] ? Safe<Promise<U>> : Safe<U>;

  /**
   * Transforms the value with a function that returns another Safe.
   * Flattens the nested Safe — useful for composing Safe operations.
   *
   * @param transform - Function that returns another Safe
   * @returns A flattened Safe container
   *
   * @example
   * safe(1).flatMap(x => safe(x + 1)).unwrap() // 2
   */
  flatMap<U>(
    transform: (value: [T] extends [PromiseLike<any>] ? Awaited<T> : T) => Safe<U>
  ): [U] extends [PromiseLike<any>] ? Safe<U> : [T] extends [PromiseLike<any>] ? Safe<Promise<U>> : Safe<U>;

  /**
   * Executes a side effect on success. **Affects the chain.**
   *
   * - Only runs when `isOk` is `true` (skipped on error)
   * - If the function **throws**, the error **propagates** through the chain
   * - If the function returns a **Promise**, the chain becomes asynchronous
   * - The original value is **preserved** (return value is ignored)
   *
   * Use `effect` for operations like saving to DB, logging to external services,
   * or any side effect where failures should stop the chain.
   *
   * @param fn - Side effect function to execute on success
   * @returns The same Safe with the original value preserved
   *
   * @example
   * safe(user)
   *   .effect(u => saveToDb(u))     // if saveToDb throws, chain enters error state
   *   .map(u => u.name)             // skipped if effect threw
   *   .unwrap()
   */
  effect<U>(
    fn: (value: [T] extends [PromiseLike<any>] ? Awaited<T> : T) => U
  ): [T] extends [PromiseLike<any>] ? Safe<T> : [U] extends [PromiseLike<any>] ? Safe<Promise<T>> : Safe<T>;

  /**
   * Alias for {@link effect}. Runs a side effect on success.
   *
   * @example
   * safe(user)
   *   .ifOk(u => saveToDb(u))
   *   .map(u => u.name)
   *   .unwrap()
   */
  ifOk<U>(
    fn: (value: [T] extends [PromiseLike<any>] ? Awaited<T> : T) => U
  ): [T] extends [PromiseLike<any>] ? Safe<T> : [U] extends [PromiseLike<any>] ? Safe<Promise<T>> : Safe<T>;

  /**
   * Recovers from an error by providing a replacement value. **Affects the chain.**
   *
   * - Only runs when `isOk` is `false` (skipped on success)
   * - The return value becomes the **new chain value**
   * - After recovery, the chain continues in success state
   *
   * @param fn - Recovery function that receives the error and returns a fallback value
   * @returns A Safe with either the original value or the recovery value
   *
   * @example
   * safe(() => { throw new Error('fail') })
   *   .recover(err => 'default')  // chain is now ok with 'default'
   *   .unwrap()                   // 'default'
   */
  recover<U>(
    fn: (error: Error) => U
  ): Safe<
    [T] extends [PromiseLike<any>] ? Promise<Awaited<T> | ([U] extends [PromiseLike<any>] ? Awaited<U> : U)> : T | U
  >;

  /**
   * Observes the full state without affecting the chain. **No chain impact.**
   *
   * - Receives the full `SafeResult` (both value and error information)
   * - Any errors thrown inside this function are **silently ignored**
   * - Any Promises returned are **silently ignored** (chain stays synchronous)
   * - The chain continues completely unchanged
   *
   * @param fn - Observer function that receives the current SafeResult
   * @returns The same Safe, completely unchanged
   *
   * @example
   * safe(42)
   *   .observe(result => console.log(result))  // { isOk: true, value: 42 }
   *   .unwrap()                                 // 42
   */
  observe(fn: (result: [T] extends [PromiseLike<any>] ? SafeResult<Awaited<T>> : SafeResult<T>) => any): Safe<T>;

  /**
   * Observes the success value without affecting the chain. **No chain impact.**
   *
   * - Only runs when `isOk` is `true` (skipped on error)
   * - Any errors thrown inside this function are **silently ignored**
   * - Any Promises returned are **silently ignored**
   * - The chain continues completely unchanged
   *
   * @param fn - Observer function that receives the success value
   * @returns The same Safe, completely unchanged
   *
   * @example
   * safe(42)
   *   .observeOk(value => console.log('Got:', value))  // logs 'Got: 42'
   *   .unwrap()                                         // 42
   */
  observeOk(fn: (value: [T] extends [PromiseLike<any>] ? Awaited<T> : T) => any): Safe<T>;

  /**
   * Observes the error without affecting the chain. **No chain impact.**
   *
   * - Only runs when `isOk` is `false` (skipped on success)
   * - Any errors thrown inside this function are **silently ignored**
   * - Any Promises returned are **silently ignored**
   * - The chain continues completely unchanged
   *
   * @param fn - Observer function that receives the error
   * @returns The same Safe, completely unchanged
   *
   * @example
   * safe(() => { throw new Error('fail') })
   *   .observeError(err => console.error(err))  // logs the error
   *   .recover(() => 'fallback')
   */
  observeError(fn: (error: Error) => any): Safe<T>;

  /**
   * Extracts the final value by pattern matching on success/error state.
   *
   * @param handlers - Object with `ok` and `err` handler functions
   * @returns The result of the matched handler
   *
   * @example
   * safe(42).match({
   *   ok: value => `success: ${value}`,
   *   err: error => `error: ${error.message}`
   * }) // 'success: 42'
   */
  match<U, F>(handlers: {
    ok: (value: [T] extends [PromiseLike<any>] ? Awaited<T> : T) => U;
    err: (error: Error) => F;
  }): [T] extends [PromiseLike<any>] ? Promise<U | F> : U | F;

  /**
   * Whether the Safe contains a success value.
   * Returns `Promise<boolean>` for asynchronous chains.
   */
  isOk: [T] extends [PromiseLike<any>] ? Promise<boolean> : boolean;

  /**
   * Extracts the value from the Safe.
   * Throws the error if the Safe is in an error state.
   *
   * @returns The value, or `Promise<value>` for async chains
   * @throws The contained error if in error state
   */
  unwrap(): T;

  /**
   * Extracts the value, or returns the fallback if in error state.
   * Never throws an exception.
   *
   * @param fallback - The value to return if there's an error
   * @returns The success value or the fallback value
   *
   * @example
   * safe(() => { throw new Error() }).orElse('default') // 'default'
   */
  orElse<U>(fallback: U): [T] extends [PromiseLike<any>] ? Promise<Awaited<T> | U> : T | U;
}

const createChain = <Result extends SafeResult | Promise<SafeResult>, T = ExtractSafeValue<Result>>(
  result: Result
): Safe<T> => {
  const next = <U>(cb: (r: [T] extends [PromiseLike<any>] ? SafeResult<Awaited<T>> : SafeResult<T>) => U) => {
    return createChain(safeResult.update(result, cb as any)) as [U] extends [PromiseLike<any>]
      ? Safe<U>
      : [T] extends [PromiseLike<any>]
        ? Safe<Promise<U>>
        : Safe<U>;
  };

  const effectFn = <U>(fn: (value: [T] extends [PromiseLike<any>] ? Awaited<T> : T) => U): any => {
    return next((prev) => {
      if (!prev.isOk) throw prev.error;
      const v = fn(prev.value as [T] extends [PromiseLike<any>] ? Awaited<T> : T);
      if (isPromiseLike(v)) return v.then(() => prev.value);
      return prev.value;
    });
  };

  return {
    map<U>(
      transform: (value: [T] extends [PromiseLike<any>] ? Awaited<T> : T) => U
    ): [U] extends [PromiseLike<any>] ? Safe<U> : [T] extends [PromiseLike<any>] ? Safe<Promise<U>> : Safe<U> {
      return next((prev) => {
        if (prev.isOk) return transform(prev.value as [T] extends [PromiseLike<any>] ? Awaited<T> : T);
        throw prev.error;
      });
    },

    flatMap<U>(
      transform: (value: [T] extends [PromiseLike<any>] ? Awaited<T> : T) => Safe<U>
    ): [U] extends [PromiseLike<any>] ? Safe<U> : [T] extends [PromiseLike<any>] ? Safe<Promise<U>> : Safe<U> {
      return next((prev) => {
        if (prev.isOk) return transform(prev.value as [T] extends [PromiseLike<any>] ? Awaited<T> : T).unwrap();
        throw prev.error;
      });
    },

    effect: effectFn,
    ifOk: effectFn,

    recover<U>(
      fn: (error: Error) => U
    ): Safe<
      [T] extends [PromiseLike<any>] ? Promise<Awaited<T> | ([U] extends [PromiseLike<any>] ? Awaited<U> : U)> : T | U
    > {
      return next((result) => {
        if (!result.isOk) return fn(result.error);
        return result.value;
      }) as Safe<
        [T] extends [PromiseLike<any>] ? Promise<Awaited<T> | ([U] extends [PromiseLike<any>] ? Awaited<U> : U)> : T | U
      >;
    },

    observe(fn: (result: [T] extends [PromiseLike<any>] ? SafeResult<Awaited<T>> : SafeResult<T>) => any): Safe<T> {
      return next((prev) => {
        try {
          const r = fn({ ...prev } as [T] extends [PromiseLike<any>] ? SafeResult<Awaited<T>> : SafeResult<T>);
          if (isPromiseLike(r)) r.then(null, () => {});
        } catch {
          // Errors are intentionally ignored in observe
        }
        if (prev.isOk) return prev.value;
        throw prev.error;
      }) as Safe<T>;
    },

    observeOk(fn: (value: [T] extends [PromiseLike<any>] ? Awaited<T> : T) => any): Safe<T> {
      return next((prev) => {
        if (prev.isOk) {
          try {
            const r = fn(prev.value as [T] extends [PromiseLike<any>] ? Awaited<T> : T);
            if (isPromiseLike(r)) r.then(null, () => {});
          } catch {
            // Errors are intentionally ignored in observeOk
          }
        }
        if (prev.isOk) return prev.value;
        throw prev.error;
      }) as Safe<T>;
    },

    observeError(fn: (error: Error) => any): Safe<T> {
      return next((prev) => {
        if (!prev.isOk) {
          try {
            const r = fn(prev.error);
            if (isPromiseLike(r)) r.then(null, () => {});
          } catch {
            // Errors are intentionally ignored in observeError
          }
        }
        if (prev.isOk) return prev.value;
        throw prev.error;
      }) as Safe<T>;
    },

    match<U, F>(handlers: {
      ok: (value: [T] extends [PromiseLike<any>] ? Awaited<T> : T) => U;
      err: (error: Error) => F;
    }): [T] extends [PromiseLike<any>] ? Promise<U | F> : U | F {
      if (isPromiseLike(result))
        return result.then((v) => {
          if (v.isOk) return handlers.ok(v.value as [T] extends [PromiseLike<any>] ? Awaited<T> : T);
          return handlers.err(v.error);
        }) as [T] extends [PromiseLike<any>] ? Promise<U | F> : U | F;

      if (result.isOk)
        return handlers.ok(result.value as [T] extends [PromiseLike<any>] ? Awaited<T> : T) as [T] extends [
          PromiseLike<any>,
        ]
          ? Promise<U | F>
          : U | F;
      return handlers.err(result.error) as [T] extends [PromiseLike<any>] ? Promise<U | F> : U | F;
    },

    unwrap(): T {
      if (isPromiseLike(result))
        return result.then((v) => {
          if (v.isOk) return v.value;
          throw v.error;
        }) as T;

      if (result.isOk) return result.value as T;
      throw result.error;
    },

    isOk: (isPromiseLike(result) ? result.then((v) => Promise.resolve(v.isOk)) : result.isOk) as [T] extends [
      PromiseLike<any>,
    ]
      ? Promise<boolean>
      : boolean,

    orElse<U>(fallback: U): [T] extends [PromiseLike<any>] ? Promise<Awaited<T> | U> : T | U {
      return next((result) => {
        if (!result.isOk) return fallback;
        return result.value;
      }).unwrap() as [T] extends [PromiseLike<any>] ? Promise<Awaited<T> | U> : T | U;
    },
  };
};

/**
 * Creates a Safe container from an existing value.
 *
 * @param value - The value to wrap
 * @returns A Safe containing the value
 */
export function safeValue<T>(value: T): Safe<T> {
  return createChain(safeResult.ok(undefined)).map(() => value) as Safe<T>;
}

/**
 * Executes a function and wraps its result in a Safe.
 * If the function throws, the error is captured in the Safe.
 *
 * @param fn - Function to execute
 * @returns A Safe containing the function result or error
 */
export function safeExec<T>(fn: () => T): Safe<T> {
  return createChain(safeResult.ok(undefined)).map(() => fn()) as Safe<T>;
}

/**
 * Creates an empty Safe with undefined value.
 *
 * @returns A Safe containing undefined
 */
export function safeEmpty(): Safe<undefined> {
  return createChain(safeResult.ok(undefined));
}

/**
 * Type for observe callback function.
 */
type ObserveFunction<T = unknown> = Parameters<Safe<T>['observe']>[0];

export type { SafeResult, ObserveFunction };
