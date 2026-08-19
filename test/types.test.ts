import { describe, expect, expectTypeOf, it } from 'vitest';
import { safe } from '../src';

const wrap = <T>(v: T): { ok: true; data: T } => ({ ok: true, data: v });

describe('type-level: async detection', () => {
  // ─── `any` chains stay synchronous ─────────────────────────────

  describe('any chain is treated as synchronous', () => {
    it('map: callback return type is preserved without Promise wrapping', () => {
      expectTypeOf(
        safe(1 as any)
          .map(() => 's')
          .unwrap()
      ).toEqualTypeOf<string>();

      expectTypeOf(
        safe(1 as any)
          .map(wrap)
          .unwrap()
      ).toEqualTypeOf<{ ok: true; data: any }>();
    });

    it('isOk: stays boolean, not Promise<boolean>', () => {
      expectTypeOf(safe(1 as any).map(() => 's').isOk).toEqualTypeOf<boolean>();
    });

    it('ifOk / ifFail: chain value stays synchronous', () => {
      expectTypeOf(
        safe(1 as any)
          .map(() => 's')
          .ifOk((v) => v.length)
          .unwrap()
      ).toEqualTypeOf<string>();

      expectTypeOf(
        safe(1 as any)
          .map(() => 's')
          .ifFail(() => 0)
          .unwrap()
      ).toEqualTypeOf<string>();
    });

    it('recover / orElse / match: synchronous result types', () => {
      expectTypeOf(safe(1 as any).recover(() => 2)).not.toBeNever();
      expectTypeOf(safe(1 as any).recover(() => 2).isOk).toEqualTypeOf<boolean>();

      expectTypeOf(
        safe(1 as any)
          .map(() => 's')
          .orElse('fallback')
      ).toEqualTypeOf<string>();

      expectTypeOf(
        safe(1 as any)
          .map(() => 's')
          .match({ ok: (v) => v.length, err: () => 'e' })
      ).toEqualTypeOf<number | string>();
    });

    it('async callback on an any chain still turns the chain async', () => {
      expectTypeOf(
        safe(1 as any)
          .map(() => Promise.resolve('s'))
          .unwrap()
      ).toEqualTypeOf<Promise<string>>();
    });
  });

  // ─── No regression for real async chains ───────────────────────

  describe('real Promise chains stay asynchronous', () => {
    it('map on a Promise value', () => {
      expectTypeOf(
        safe(Promise.resolve(1))
          .map((x) => x + 1)
          .unwrap()
      ).toEqualTypeOf<Promise<number>>();

      expectTypeOf(safe(Promise.resolve(1)).map((x) => x + 1).isOk).toEqualTypeOf<Promise<boolean>>();
    });

    it('sync chain stays synchronous', () => {
      expectTypeOf(
        safe(1)
          .map((x) => x + 1)
          .unwrap()
      ).toEqualTypeOf<number>();
    });
  });

  // ─── unknown and unions ────────────────────────────────────────

  describe('unknown and union values', () => {
    it('unknown chain is synchronous', () => {
      expectTypeOf(
        safe(1 as unknown)
          .map(() => 2)
          .unwrap()
      ).toEqualTypeOf<number>();
    });

    it('union with Promise keeps its existing non-distributive semantics on Safe', () => {
      expectTypeOf(
        safe(1 as number | Promise<number>)
          .map((x) => x)
          .unwrap()
      ).toEqualTypeOf<number | Promise<number>>();
    });

    it('safePipe: union with Promise in an intermediate step is treated as async (HasPromise semantics)', () => {
      expectTypeOf(
        safe
          .pipe(
            (x: number) => x as number | Promise<number>,
            (x) => x
          )(1)
          .unwrap()
      ).toEqualTypeOf<Promise<number>>();
    });
  });

  // ─── safe.pipe ─────────────────────────────────────────────────

  describe('safe.pipe with any', () => {
    it('an any input/parameter does not make the pipe async', () => {
      expectTypeOf(
        safe
          .pipe((x: any) => String(x))(1)
          .unwrap()
      ).toEqualTypeOf<string>();
    });

    it('real async step still makes the pipe async', () => {
      expectTypeOf(
        safe
          .pipe(
            (x: number) => Promise.resolve(x),
            (x) => x + 1
          )(1)
          .unwrap()
      ).toEqualTypeOf<Promise<number>>();
    });
  });
});

describe('runtime: any chain behaves like a normal sync chain', () => {
  it('map / unwrap returns the plain value synchronously (no Promise wrapping)', () => {
    const r = safe(1 as any)
      .map(wrap)
      .unwrap();
    expectTypeOf(r).toEqualTypeOf<{ ok: true; data: any }>();
    expect(r).toEqual({ ok: true, data: 1 });
  });
});
