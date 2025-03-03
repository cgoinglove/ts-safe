import { safeValue, Safe } from '../src/core';

type NonDistributive<T> = [T] extends [any] ? T : never;

type HasPromise<T> =
  NonDistributive<T> extends Promise<any>
    ? true
    : (T extends any ? (T extends Promise<any> ? true : false) : never) extends false
      ? false
      : true;

type SafeCheckPromise<T, U> = HasPromise<U> extends true ? Safe<Promise<Awaited<T>>> : Safe<T>;

type SafeMap<A, B> = (input: A extends PromiseLike<any> ? Awaited<A> : A) => B;

export function safePipe<Input, A>(ab: SafeMap<Input, A>): (input: Input) => SafeCheckPromise<A, Input>;

export function safePipe<Input, A, B>(
  a: SafeMap<Input, A>,
  b: SafeMap<A, B>
): (input: Input) => SafeCheckPromise<B, A | Input>;

export function safePipe<Input, A, B, C>(
  a: SafeMap<Input, A>,
  b: SafeMap<A, B>,
  c: SafeMap<B, C>
): (input: Input) => SafeCheckPromise<C, A | B | Input>;

export function safePipe<Input, A, B, C, D>(
  a: SafeMap<Input, A>,
  b: SafeMap<A, B>,
  c: SafeMap<B, C>,
  d: SafeMap<C, D>
): (input: Input) => SafeCheckPromise<D, A | B | C | Input>;

export function safePipe<Input, A, B, C, D, E>(
  a: SafeMap<Input, A>,
  b: SafeMap<A, B>,
  c: SafeMap<B, C>,
  d: SafeMap<C, D>,
  e: SafeMap<D, E>
): (input: Input) => SafeCheckPromise<E, A | B | C | D | Input>;

export function safePipe<Input, A, B, C, D, E, F>(
  a: SafeMap<Input, A>,
  b: SafeMap<A, B>,
  c: SafeMap<B, C>,
  d: SafeMap<C, D>,
  e: SafeMap<D, E>,
  f: SafeMap<E, F>
): (input: Input) => SafeCheckPromise<F, A | B | C | D | E | Input>;

export function safePipe<Input, A, B, C, D, E, F, G>(
  a: SafeMap<Input, A>,
  b: SafeMap<A, B>,
  c: SafeMap<B, C>,
  d: SafeMap<C, D>,
  e: SafeMap<D, E>,
  f: SafeMap<E, F>,
  g: SafeMap<F, G>
): (input: Input) => SafeCheckPromise<G, A | B | C | D | E | F | Input>;

export function safePipe(...transformers: Array<(input: any) => Safe<any>>): (input: any) => Safe<any> {
  return (input: any) => {
    const initialChain = safeValue(input);
    return transformers.reduce((chain, transformer) => chain.map(transformer), initialChain);
  };
}
