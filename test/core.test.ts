import { describe, expect, it, vi } from 'vitest';
import { safe } from '../src';
import { safeEmpty, safeExec, safeValue } from '../src/core';

describe('Safe', () => {
  // ─── Constructor ───────────────────────────────────────────────

  describe('Constructor', () => {
    it('safeValue: wraps a value', () => {
      expect(safeValue(42).unwrap()).toBe(42);
    });

    it('safeValue: wraps null', () => {
      expect(safeValue(null).unwrap()).toBe(null);
    });

    it('safeValue: wraps an object', () => {
      const obj = { a: 1, b: 'hello' };
      expect(safeValue(obj).unwrap()).toEqual(obj);
    });

    it('safeExec: wraps function result', () => {
      expect(safeExec(() => 42).unwrap()).toBe(42);
    });

    it('safeExec: captures thrown error', () => {
      const result = safeExec(() => {
        throw new Error('fail');
      });
      expect(() => result.unwrap()).toThrow('fail');
    });

    it('safeEmpty: creates undefined Safe', () => {
      expect(safeEmpty().unwrap()).toBeUndefined();
    });

    it('safe(value): wraps a value', () => {
      expect(safe(42).unwrap()).toBe(42);
    });

    it('safe(fn): wraps function result', () => {
      expect(safe(() => 'hello').unwrap()).toBe('hello');
    });

    it('safe(fn): captures thrown error', () => {
      expect(() =>
        safe(() => {
          throw new Error('fail');
        }).unwrap()
      ).toThrow('fail');
    });

    it('safe(): creates undefined Safe', () => {
      expect(safe().unwrap()).toBeUndefined();
    });
  });

  // ─── map ───────────────────────────────────────────────────────

  describe('map', () => {
    it('transforms the value', () => {
      expect(
        safe(2)
          .map((x) => x * 3)
          .unwrap()
      ).toBe(6);
    });

    it('chains multiple maps', () => {
      expect(
        safe(1)
          .map((x) => x + 1)
          .map((x) => x * 10)
          .unwrap()
      ).toBe(20);
    });

    it('skips transform on error', () => {
      const fn = vi.fn();
      safe(() => {
        throw new Error('fail');
      }).map(fn);
      expect(fn).not.toHaveBeenCalled();
    });

    it('propagates error from transform', () => {
      expect(() =>
        safe(1)
          .map(() => {
            throw new Error('map fail');
          })
          .unwrap()
      ).toThrow('map fail');
    });

    it('handles async transform', async () => {
      const result = await safe(1)
        .map(async (x) => x + 1)
        .unwrap();
      expect(result).toBe(2);
    });

    it('handles rejected promise in transform', async () => {
      await expect(
        safe(1)
          .map(() => Promise.reject(new Error('async fail')))
          .unwrap()
      ).rejects.toThrow('async fail');
    });
  });

  // ─── flatMap ───────────────────────────────────────────────────

  describe('flatMap', () => {
    it('flattens nested Safe', () => {
      expect(
        safe(1)
          .flatMap((x) => safe(x + 1))
          .unwrap()
      ).toBe(2);
    });

    it('propagates error from outer Safe', () => {
      const fn = vi.fn(() => safe(1));
      safe(() => {
        throw new Error('outer');
      }).flatMap(fn);
      expect(fn).not.toHaveBeenCalled();
    });

    it('propagates error from inner Safe', () => {
      expect(() =>
        safe(1)
          .flatMap(() =>
            safe(() => {
              throw new Error('inner');
            })
          )
          .unwrap()
      ).toThrow('inner');
    });
  });

  // ─── effect ────────────────────────────────────────────────────

  describe('effect', () => {
    it('executes side effect with the value', () => {
      const fn = vi.fn();
      safe(42).effect(fn).unwrap();
      expect(fn).toHaveBeenCalledWith(42);
    });

    it('preserves the original value (return value ignored)', () => {
      expect(
        safe(42)
          .effect(() => 999)
          .unwrap()
      ).toBe(42);
    });

    it('skips on error state', () => {
      const fn = vi.fn();
      safe(() => {
        throw new Error('fail');
      }).effect(fn);
      expect(fn).not.toHaveBeenCalled();
    });

    it('propagates thrown error to the chain', () => {
      expect(() =>
        safe(42)
          .effect(() => {
            throw new Error('effect fail');
          })
          .unwrap()
      ).toThrow('effect fail');
    });

    it('handles async side effect', async () => {
      const fn = vi.fn(async () => {});
      const value = await safe(42).effect(fn).unwrap();
      expect(fn).toHaveBeenCalledWith(42);
      expect(value).toBe(42);
    });

    it('propagates rejected promise', async () => {
      await expect(
        safe(42)
          .effect(() => Promise.reject(new Error('async effect fail')))
          .unwrap()
      ).rejects.toThrow('async effect fail');
    });

    it('preserves value even with async side effect', async () => {
      const value = await safe(42)
        .effect(async () => 'ignored')
        .unwrap();
      expect(value).toBe(42);
    });
  });

  // ─── recover ───────────────────────────────────────────────────

  describe('recover', () => {
    it('provides recovery value on error', () => {
      const result = safe(() => {
        throw new Error('fail');
      })
        .recover(() => 'recovered')
        .unwrap();
      expect(result).toBe('recovered');
    });

    it('skips on success state', () => {
      const fn = vi.fn();
      safe(42).recover(fn);
      expect(fn).not.toHaveBeenCalled();
    });

    it('receives the error object', () => {
      const fn = vi.fn(() => 'default');
      safe(() => {
        throw new Error('my error');
      })
        .recover(fn)
        .unwrap();
      expect(fn).toHaveBeenCalledWith(expect.objectContaining({ message: 'my error' }));
    });

    it('chain continues in success state after recovery', () => {
      const result = safe(() => {
        throw new Error('fail');
      })
        .recover(() => 10)
        .map((x) => (x as number) * 2)
        .unwrap();
      expect(result).toBe(20);
    });

    it('handles async recovery', async () => {
      const result = await safe(() => {
        throw new Error('fail');
      })
        .recover(async () => 'async recovered')
        .unwrap();
      expect(result).toBe('async recovered');
    });

    it('propagates error if recovery throws', () => {
      expect(() =>
        safe(() => {
          throw new Error('first');
        })
          .recover(() => {
            throw new Error('recovery failed');
          })
          .unwrap()
      ).toThrow('recovery failed');
    });
  });

  // ─── observe ───────────────────────────────────────────────────

  describe('observe', () => {
    it('observes success state', () => {
      const fn = vi.fn();
      safe(42).observe(fn).unwrap();
      expect(fn).toHaveBeenCalledWith(expect.objectContaining({ isOk: true, value: 42 }));
    });

    it('observes error state', () => {
      const fn = vi.fn();
      safe(() => {
        throw new Error('fail');
      }).observe(fn);
      expect(fn).toHaveBeenCalledWith(expect.objectContaining({ isOk: false }));
      expect(fn.mock.calls[0][0].error).toBeInstanceOf(Error);
    });

    it('ignores errors thrown in callback', () => {
      expect(
        safe(42)
          .observe(() => {
            throw new Error('observe fail');
          })
          .unwrap()
      ).toBe(42);
    });

    it('ignores promise rejections in callback', () => {
      const result = safe(42)
        .observe(() => Promise.reject(new Error('async observe fail')))
        .unwrap();
      expect(result).toBe(42);
    });

    it('does not convert chain to async even with promise return', () => {
      const result = safe(42)
        .observe(() => Promise.resolve('ignored'))
        .unwrap();
      expect(result).toBe(42);
    });

    it('preserves error state', () => {
      expect(() =>
        safe(() => {
          throw new Error('fail');
        })
          .observe(() => {})
          .unwrap()
      ).toThrow('fail');
    });
  });

  // ─── observeOk ────────────────────────────────────────────────

  describe('observeOk', () => {
    it('observes success value', () => {
      const fn = vi.fn();
      safe(42).observeOk(fn).unwrap();
      expect(fn).toHaveBeenCalledWith(42);
    });

    it('skips on error state', () => {
      const fn = vi.fn();
      safe(() => {
        throw new Error('fail');
      }).observeOk(fn);
      expect(fn).not.toHaveBeenCalled();
    });

    it('ignores errors thrown in callback', () => {
      expect(
        safe(42)
          .observeOk(() => {
            throw new Error('fail');
          })
          .unwrap()
      ).toBe(42);
    });

    it('ignores promise rejections in callback', () => {
      const result = safe(42)
        .observeOk(() => Promise.reject(new Error('fail')))
        .unwrap();
      expect(result).toBe(42);
    });

    it('preserves the chain value', () => {
      expect(
        safe(42)
          .observeOk(() => 999)
          .unwrap()
      ).toBe(42);
    });
  });

  // ─── observeError ─────────────────────────────────────────────

  describe('observeError', () => {
    it('observes error', () => {
      const fn = vi.fn();
      safe(() => {
        throw new Error('fail');
      }).observeError(fn);
      expect(fn).toHaveBeenCalledWith(expect.objectContaining({ message: 'fail' }));
    });

    it('skips on success state', () => {
      const fn = vi.fn();
      safe(42).observeError(fn);
      expect(fn).not.toHaveBeenCalled();
    });

    it('ignores errors thrown in callback', () => {
      expect(() =>
        safe(() => {
          throw new Error('original');
        })
          .observeError(() => {
            throw new Error('observe fail');
          })
          .unwrap()
      ).toThrow('original');
    });

    it('preserves the error state', () => {
      expect(() =>
        safe(() => {
          throw new Error('fail');
        })
          .observeError(() => {})
          .unwrap()
      ).toThrow('fail');
    });
  });

  // ─── match ─────────────────────────────────────────────────────

  describe('match', () => {
    it('calls ok handler on success', () => {
      const result = safe(42).match({
        ok: (v) => `value: ${v}`,
        err: (e) => `error: ${e.message}`,
      });
      expect(result).toBe('value: 42');
    });

    it('calls err handler on error', () => {
      const result = safe(() => {
        throw new Error('fail');
      }).match({
        ok: (v) => `value: ${v}`,
        err: (e) => `error: ${e.message}`,
      });
      expect(result).toBe('error: fail');
    });

    it('handles async chain', async () => {
      const result = await safe(1)
        .map(async (x) => x + 1)
        .match({
          ok: (v) => v * 10,
          err: () => 0,
        });
      expect(result).toBe(20);
    });

    it('handles async chain with error', async () => {
      const result = await safe(1)
        .map(async () => {
          throw new Error('async fail');
        })
        .match({
          ok: () => 'ok',
          err: (e) => `error: ${e.message}`,
        });
      expect(result).toBe('error: async fail');
    });

    it('works after recover', () => {
      const result = safe(() => {
        throw new Error('fail');
      })
        .recover(() => 'recovered')
        .match({
          ok: (v) => `ok: ${v}`,
          err: (e) => `err: ${e.message}`,
        });
      expect(result).toBe('ok: recovered');
    });
  });

  // ─── isOk ──────────────────────────────────────────────────────

  describe('isOk', () => {
    it('returns true for success', () => {
      expect(safe(42).isOk).toBe(true);
    });

    it('returns false for error', () => {
      expect(
        safe(() => {
          throw new Error();
        }).isOk
      ).toBe(false);
    });

    it('returns Promise<boolean> for async chain', async () => {
      expect(await safe(1).map(async (x) => x).isOk).toBe(true);
    });

    it('returns Promise<false> for async error', async () => {
      expect(
        await safe(1).map(async () => {
          throw new Error();
        }).isOk
      ).toBe(false);
    });
  });

  // ─── unwrap ────────────────────────────────────────────────────

  describe('unwrap', () => {
    it('returns value on success', () => {
      expect(safe(42).unwrap()).toBe(42);
    });

    it('throws on error', () => {
      expect(() =>
        safe(() => {
          throw new Error('fail');
        }).unwrap()
      ).toThrow('fail');
    });

    it('returns Promise for async chain', async () => {
      expect(
        await safe(1)
          .map(async (x) => x + 1)
          .unwrap()
      ).toBe(2);
    });

    it('rejects Promise for async error', async () => {
      await expect(
        safe(1)
          .map(async () => {
            throw new Error('fail');
          })
          .unwrap()
      ).rejects.toThrow('fail');
    });
  });

  // ─── orElse ────────────────────────────────────────────────────

  describe('orElse', () => {
    it('returns value on success', () => {
      expect(safe(42).orElse('default')).toBe(42);
    });

    it('returns fallback on error', () => {
      expect(
        safe(() => {
          throw new Error();
        }).orElse('default')
      ).toBe('default');
    });

    it('handles async chain', async () => {
      expect(
        await safe(1)
          .map(async (x) => x + 1)
          .orElse(0)
      ).toBe(2);
    });

    it('handles async error with fallback', async () => {
      expect(
        await safe(1)
          .map(async () => {
            throw new Error();
          })
          .orElse(0)
      ).toBe(0);
    });
  });

  // ─── Async Chains ──────────────────────────────────────────────

  describe('Async Chains', () => {
    it('promise value is awaited in map', async () => {
      const result = await safe(Promise.resolve(42))
        .map((v) => v * 2)
        .unwrap();
      expect(result).toBe(84);
    });

    it('chain becomes async when effect returns promise', async () => {
      const result = await safe(42)
        .effect(async () => {})
        .unwrap();
      expect(result).toBe(42);
    });

    it('chain becomes async when recover returns promise', async () => {
      const result = await safe(() => {
        throw new Error('fail');
      })
        .recover(async () => 'async default')
        .unwrap();
      expect(result).toBe('async default');
    });

    it('complex async chain', async () => {
      const log = vi.fn();
      const result = await safe(1)
        .map(async (x) => x + 1)
        .map((x) => x * 10)
        .effect((x) => log(x))
        .observeOk((x) => log(`observe: ${x}`))
        .unwrap();
      expect(result).toBe(20);
      expect(log).toHaveBeenCalledWith(20);
    });
  });

  // ─── Error Normalization ───────────────────────────────────────

  describe('Error Normalization', () => {
    it('normalizes string errors', () => {
      const result = safe(() => {
        throw 'string error';
      });
      expect(() => result.unwrap()).toThrow('string error');
    });

    it('normalizes unknown errors', () => {
      const result = safe(() => {
        throw { code: 404 };
      });
      expect(() => result.unwrap()).toThrow();
    });

    it('preserves Error instances', () => {
      const error = new TypeError('type error');
      const result = safe(() => {
        throw error;
      });
      expect(() => result.unwrap()).toThrow(error);
    });
  });

  // ─── Integration ───────────────────────────────────────────────

  describe('Integration', () => {
    it('full chain: map → effect → observe → unwrap', () => {
      const log = vi.fn();
      const observeFn = vi.fn();
      const result = safe(5)
        .map((x) => x * 2)
        .effect((x) => log(x))
        .observeOk((x) => observeFn(x))
        .unwrap();
      expect(result).toBe(10);
      expect(log).toHaveBeenCalledWith(10);
      expect(observeFn).toHaveBeenCalledWith(10);
    });

    it('error chain: map → effect(skipped) → observeError → recover → unwrap', () => {
      const effectFn = vi.fn();
      const observeFn = vi.fn();
      const result = safe(() => {
        throw new Error('fail');
      })
        .map((x) => x)
        .effect(effectFn)
        .observeError(observeFn)
        .recover(() => 'fallback')
        .unwrap();
      expect(effectFn).not.toHaveBeenCalled();
      expect(observeFn).toHaveBeenCalled();
      expect(result).toBe('fallback');
    });

    it('match replaces unwrap/orElse pattern', () => {
      const format = (s: ReturnType<typeof safe<number>>) =>
        s.match({
          ok: (v) => ({ status: 'success' as const, data: v }),
          err: (e) => ({ status: 'error' as const, message: e.message }),
        });

      expect(format(safe(42))).toEqual({ status: 'success', data: 42 });
      expect(
        format(
          safe(() => {
            throw new Error('fail');
          })
        )
      ).toEqual({ status: 'error', message: 'fail' });
    });

    it('async integration: fetch → transform → recover', async () => {
      const fetchUser = async (id: number) => ({ id, name: 'Alice' });

      const result = await safe(() => fetchUser(1))
        .map((user) => user.name)
        .effect(async () => {
          await Promise.resolve();
        })
        .recover(() => 'Anonymous')
        .unwrap();

      expect(result).toBe('Alice');
    });
  });
});
