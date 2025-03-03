import { isPromiseLike } from './shared';

/**
 * Represents any value that can be treated as an error.
 */
type ErrorLike = Error | string | unknown;

export type SafeResult<T = any> =
  | {
      isOk: false;
      error: Error;
      value?: undefined;
    }
  | {
      isOk: true;
      error?: undefined;
      value: T;
    };

const normalizeError = (error: ErrorLike): Error => {
  try {
    if (error instanceof Error) return error;
    if (typeof error == 'string') return new Error(error);
    return new Error(JSON.stringify(error));
  } catch (error) {
    return error as Error;
  }
};

const ok = <T>(value: T): SafeResult<T> => {
  return {
    isOk: true,
    error: undefined,
    value,
  };
};
const fail = <T>(error: ErrorLike): SafeResult<T> => {
  return {
    isOk: false,
    error: normalizeError(error),
    value: undefined,
  };
};

const update = <T extends PromiseLike<SafeResult> | SafeResult, U>(
  prev: T,
  cb: (prev: T extends PromiseLike<any> ? Awaited<T> : T) => U
): U extends PromiseLike<any>
  ? Promise<SafeResult<Awaited<U>>>
  : T extends PromiseLike<any>
    ? Promise<SafeResult<Awaited<U>>>
    : SafeResult<U> => {
  type R =
    U extends PromiseLike<any>
      ? Promise<SafeResult<Awaited<U>>>
      : T extends PromiseLike<any>
        ? Promise<SafeResult<Awaited<U>>>
        : SafeResult<U>;
  if (isPromiseLike(prev)) return prev.then(cb as any).then(ok, fail) as R;
  try {
    const next = cb(prev as any);
    if (isPromiseLike(next))
      return next.then(
        (v) => Promise.resolve(ok(v)),
        (e) => Promise.resolve(fail(e))
      ) as R;
    return ok(next) as R;
  } catch (error) {
    return fail(error as Error) as R;
  }
};

export type ExtractSafeValue<T> =
  T extends PromiseLike<SafeResult<infer U>> ? Promise<U> : T extends SafeResult<infer U> ? U : never;

export const safeResult = {
  ok,
  fail,
  update,
};
