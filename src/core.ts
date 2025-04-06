import { ExtractSafeValue, SafeResult, safeResult } from './result';
import { isPromiseLike } from './shared';

/**
 * Represents a safe container for values that handles errors gracefully
 * and supports both synchronous and asynchronous operations.
 */
export interface Safe<T> {
  /**
   * Transforms the value inside the safe container.
   * If the container has an error, the transform is not applied.
   *
   * @param transform Function to transform the value
   * @returns A new Safe containing the transformed value
   */
  map<U>(
    transform: (value: T extends PromiseLike<any> ? Awaited<T> : T) => U
  ): U extends PromiseLike<any> ? Safe<U> : T extends PromiseLike<any> ? Safe<Promise<U>> : Safe<U>;

  /**
   * Transforms the value with a function that returns another Safe.
   * Used for flattening nested Safe containers.
   *
   * @param transform Function that returns another Safe
   * @returns A flattened Safe container
   */
  flatMap<U>(
    transform: (value: T extends PromiseLike<any> ? Awaited<T> : T) => Safe<U>
  ): U extends PromiseLike<any> ? Safe<U> : T extends PromiseLike<any> ? Safe<Promise<U>> : Safe<U>;

  /**
   * Observes the current state without affecting it.
   * Provides access to both value and error information.
   * Any errors thrown inside this function are ignored.
   *
   * @param consumer Function to observe the current state
   * @returns The same Safe, preserving the original value
   */
  watch(consumer: (result: T extends PromiseLike<any> ? SafeResult<Awaited<T>> : SafeResult<T>) => any): Safe<T>;

  /**
   * Applies a side effect to the value ONLY when the Safe contains a success value (isOk = true).
   * If the Safe is in an error state, this function is completely skipped.
   * Errors thrown inside this function will propagate through the chain.
   * If the function returns a Promise, the chain becomes asynchronous.
   *
   * @param effectFn Function to apply only on success state
   * @returns The same Safe with possibly different promise state
   */
  ifOk<U>(
    effectFn: (value: T extends PromiseLike<any> ? Awaited<T> : T) => U
  ): T extends PromiseLike<any> ? Safe<T> : U extends PromiseLike<any> ? Safe<Promise<T>> : Safe<T>;

  /**
   * @deprecated Use ifOk instead
   * Applies a side effect to the value.
   * Errors thrown inside this function will propagate through the chain.
   * If the function returns a Promise, the chain becomes asynchronous.
   *
   * @param effectFn Function to apply a side effect
   * @returns The same Safe with possibly different promise state
   */
  effect<U>(
    effectFn: (value: T extends PromiseLike<any> ? Awaited<T> : T) => U
  ): T extends PromiseLike<any> ? Safe<T> : U extends PromiseLike<any> ? Safe<Promise<T>> : Safe<T>;

  /**
   * Recovers from an error by providing a fallback value ONLY when the Safe contains an error (isOk = false).
   * If there's no error (success state), this function is completely skipped and the original value is kept.
   * This is intended specifically for error handling and recovery scenarios.
   *
   * @param handler Function that returns a fallback value, only called on error state
   * @returns A Safe with either the original value or recovery value
   */
  ifFail<U>(
    handler: (error: Error) => U
  ): Safe<T extends PromiseLike<any> ? Promise<Awaited<T> | (U extends PromiseLike<any> ? Awaited<U> : U)> : T | U>;

  /**
   * @deprecated Use ifFail instead
   * Recovers from an error by providing a fallback value.
   * If there's no error, the original value is kept.
   *
   * @param handler Function that returns a fallback value
   * @returns A Safe with either the original value or recovery value
   */
  catch<U>(
    handler: (error: Error) => U
  ): Safe<T extends PromiseLike<any> ? Promise<Awaited<T> | (U extends PromiseLike<any> ? Awaited<U> : U)> : T | U>;

  /**
   * Indicates if the Safe contains a success value.
   * Returns a Promise for asynchronous operations.
   */
  isOk: T extends PromiseLike<any> ? Promise<boolean> : boolean;

  /**
   * Extracts the value from the Safe.
   * Throws if there's an error.
   *
   * @returns The value (or Promise<value> for async operations)
   * @throws The error if present
   */
  unwrap(): T;

  /**
   * Extracts the value or returns a fallback if there's an error.
   * Never throws an exception.
   *
   * @param fallback The value to return if there's an error
   * @returns The success value or the fallback value
   */
  orElse<U>(fallback: U): T extends PromiseLike<any> ? Promise<Awaited<T> | U> : T | U;
}

const createChain = <Result extends SafeResult | Promise<SafeResult>, T = ExtractSafeValue<Result>>(
  result: Result
): Safe<T> => {
  const next = <U>(cb: (r: T extends PromiseLike<any> ? SafeResult<Awaited<T>> : SafeResult<T>) => U) => {
    return createChain(safeResult.update(result, cb as any)) as U extends PromiseLike<any>
      ? Safe<U>
      : T extends PromiseLike<any>
        ? Safe<Promise<U>>
        : Safe<U>;
  };
  return {
    map<U>(
      transform: (value: T extends PromiseLike<any> ? Awaited<T> : T) => U
    ): U extends PromiseLike<any> ? Safe<U> : T extends PromiseLike<any> ? Safe<Promise<U>> : Safe<U> {
      return next((prev) => {
        if (prev.isOk) return transform(prev.value as T extends PromiseLike<any> ? Awaited<T> : T);
        throw prev.error;
      });
    },
    flatMap<U>(
      transform: (value: T extends PromiseLike<any> ? Awaited<T> : T) => Safe<U>
    ): U extends PromiseLike<any> ? Safe<U> : T extends PromiseLike<any> ? Safe<Promise<U>> : Safe<U> {
      return next((prev) => {
        if (prev.isOk) return transform(prev.value as T extends PromiseLike<any> ? Awaited<T> : T).unwrap();
        throw prev.error;
      });
    },
    effect<U>(
      effectFn: (value: T extends PromiseLike<any> ? Awaited<T> : T) => U
    ): T extends PromiseLike<any> ? Safe<T> : U extends PromiseLike<any> ? Safe<Promise<T>> : Safe<T> {
      return next((prev) => {
        if (!prev.isOk) throw prev.error;
        const v = effectFn(prev.value as T extends PromiseLike<any> ? Awaited<T> : T);
        if (isPromiseLike(v)) {
          // Wait for the promise to resolve, reject will be handled by next()
          return v.then(() => prev.value);
        }
        return prev.value;
      }) as T extends PromiseLike<any> ? Safe<T> : U extends PromiseLike<any> ? Safe<Promise<T>> : Safe<T>;
    },
    ifOk<U>(
      effectFn: (value: T extends PromiseLike<any> ? Awaited<T> : T) => U
    ): T extends PromiseLike<any> ? Safe<T> : U extends PromiseLike<any> ? Safe<Promise<T>> : Safe<T> {
      return next((prev) => {
        if (!prev.isOk) throw prev.error;
        const v = effectFn(prev.value as T extends PromiseLike<any> ? Awaited<T> : T);
        if (isPromiseLike(v)) {
          // Wait for the promise to resolve, reject will be handled by next()
          return v.then(() => prev.value);
        }
        return prev.value;
      }) as T extends PromiseLike<any> ? Safe<T> : U extends PromiseLike<any> ? Safe<Promise<T>> : Safe<T>;
    },
    watch(consumer: (result: T extends PromiseLike<any> ? SafeResult<Awaited<T>> : SafeResult<T>) => any): Safe<T> {
      return next((prev) => {
        try {
          consumer({ ...prev });
        } catch {
          // ignore error
        }
        if (prev.isOk) return prev.value;
        throw prev.error;
      }) as Safe<T>;
    },
    catch<U>(
      handler: (error: Error) => U
    ): Safe<T extends PromiseLike<any> ? Promise<Awaited<T> | (U extends PromiseLike<any> ? Awaited<U> : U)> : T | U> {
      return next((result) => {
        if (!result.isOk) {
          return handler(result.error);
        }
        return result.value;
      }) as Safe<
        T extends PromiseLike<any> ? Promise<Awaited<T> | (U extends PromiseLike<any> ? Awaited<U> : U)> : T | U
      >;
    },
    ifFail<U>(
      handler: (error: Error) => U
    ): Safe<T extends PromiseLike<any> ? Promise<Awaited<T> | (U extends PromiseLike<any> ? Awaited<U> : U)> : T | U> {
      return next((result) => {
        if (!result.isOk) {
          return handler(result.error);
        }
        return result.value;
      }) as Safe<
        T extends PromiseLike<any> ? Promise<Awaited<T> | (U extends PromiseLike<any> ? Awaited<U> : U)> : T | U
      >;
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
    isOk: (isPromiseLike(result)
      ? result.then((v) => Promise.resolve(v.isOk))
      : result.isOk) as T extends PromiseLike<any> ? Promise<boolean> : boolean,

    orElse<U>(fallback: U): T extends PromiseLike<any> ? Promise<Awaited<T> | U> : T | U {
      return next((result) => {
        if (!result.isOk) {
          return fallback;
        }
        return result.value;
      }).unwrap() as T extends PromiseLike<any> ? Promise<Awaited<T> | U> : T | U;
    },
  };
};

/**
 * Creates a Safe container from an existing value.
 *
 * @param value The value to wrap
 * @returns A Safe containing the value
 */
export function safeValue<T>(value: T): Safe<T> {
  const chain = createChain(safeResult.ok(undefined));
  try {
    return chain.map(() => value) as Safe<T>;
  } catch (e) {
    return chain.map(() => {
      throw e;
    }) as Safe<T>;
  }
}

/**
 * Executes a function and wraps its result in a Safe.
 * If the function throws, the error is captured in the Safe.
 *
 * @param fn Function to execute
 * @returns A Safe containing the function result or error
 */
export function safeExec<T>(fn: () => T): Safe<T> {
  const chain = createChain(safeResult.ok(undefined));
  try {
    return chain.map(() => fn()) as Safe<T>;
  } catch (e) {
    return chain.map(() => {
      throw e;
    }) as Safe<T>;
  }
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
 * Type for watch function parameters.
 */
type WatchFuncion<T = unknown> = Parameters<Safe<T>['watch']>[0];

export type { SafeResult, WatchFuncion };
