import { describe, it, expect, vi } from 'vitest';
import { safeValue, safeEmpty } from '../src/core';
import { safe } from '../src';

const FOURCE: boolean = true;

describe('Safe', () => {
  describe('Constructor functions', () => {
    it('safeValue should create a Safe with the given value', () => {
      const result = safeValue(42).unwrap();

      expect(result).toBe(42);
    });
    it('safeEmpty should create a Safe with undefined value', () => {
      const result = safeEmpty().unwrap();
      expect(result).toBeUndefined();
    });

    it('safe should handle different parameter types', () => {
      expect(safe(42).unwrap()).toBe(42);
      expect(safe(() => 42).unwrap()).toBe(42);
      expect(safe().unwrap()).toBeUndefined();
    });
  });

  describe('map', () => {
    it('should transform a success value', () => {
      const result = safe(2)
        .map((x) => x * 2)
        .catch(async () => '')
        .unwrap();
      expect(result).toBe(4);
    });

    it('should propagate errors', () => {
      const chain = safe(() => {
        if (FOURCE) throw new Error('Initial error');
      }).map((x) => x);
      expect(!chain.isOk).toBe(true);
    });

    it('should capture errors thrown in the transform function', () => {
      const chain = safe(2).map(() => {
        throw new Error('Transform error');
        return '';
      });
      expect(!chain.isOk).toBe(true);
      expect(() => chain.unwrap()).toThrow('Transform error');
    });

    it('should handle promises correctly', async () => {
      const result = await safe(2)
        .map((x) => Promise.resolve(x * 2))
        .unwrap();

      expect(result).toBe(4);
    });

    it('should handle async functions correctly', async () => {
      const result = await safe(2)
        .map(async (x) => x * 2)
        .unwrap();
      expect(result).toBe(4);
    });

    it('should handle promise rejections', async () => {
      const chain = safe(2).map(() => Promise.reject(new Error('Promise error')));
      await expect(chain.unwrap()).rejects.toThrow('Promise error');
    });
  });

  describe('flatMap', () => {
    it('should flatten nested Safes', () => {
      const result = safe(2)
        .flatMap((x) => safe(x * 2))
        .unwrap();
      expect(result).toBe(4);
    });

    it('should propagate errors from the outer chain', () => {
      const chain = safe<number>(() => {
        throw new Error('Outer error');
      }).flatMap((x) => safe(x * 2));
      expect(!chain.isOk).toBe(true);
    });

    it('should propagate errors from the inner chain', () => {
      const chain = safe(2).flatMap(() =>
        safe(() => {
          throw new Error('Inner error');
          return '';
        })
      );
      expect(!chain.isOk).toBe(true);
    });

    it('should handle async operations properly', async () => {
      const result = await safe(2)
        .flatMap((x) => safe(Promise.resolve(x * 2)))
        .unwrap();
      expect(result).toBe(4);
    });
  });

  describe('watch', () => {
    it('should ignore errors thrown in the consumer function', () => {
      const result = safe(42)
        .watch(() => {
          throw new Error('Should be ignored');
        })
        .unwrap();

      expect(result).toBe(42);
    });

    it('should completely ignore promises from the consumer function', async () => {
      // This should complete immediately without waiting for the promise
      let promiseResolved = false;

      const chain = safe(42).watch(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            promiseResolved = true;
            resolve(true);
          }, 50);
        });
      });

      // The chain should complete immediately without waiting
      const result = chain.unwrap();
      expect(result).toBe(42);
      expect(promiseResolved).toBe(false);

      // Wait to ensure the promise does resolve eventually
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(promiseResolved).toBe(true);
    });

    it('should maintain chain value when watch returns a different value', () => {
      const result = safe(42)
        .watch(() => 'different value')
        .unwrap();

      expect(result).toBe(42);
    });
  });

  describe('effect', () => {
    it('should call the effect function with the value', () => {
      const mockFn = vi.fn();
      const result = safe(42).effect(mockFn).unwrap();

      expect(mockFn).toHaveBeenCalledWith(42);
      expect(result).toBe(42);
    });

    it('should propagate errors thrown in the effect function', () => {
      const chain = safe(42).effect(() => {
        if (FOURCE) throw new Error('Effect error');
      });

      expect(!chain.isOk).toBe(true);
      expect(() => chain.unwrap()).toThrow('Effect error');
    });

    it('should propagate rejected promises from the effect function', async () => {
      const chain = safe(42).effect(() => Promise.reject(new Error('Effect error')));

      await expect(chain.unwrap()).rejects.toThrow('Effect error');
    });

    it('should not call the effect function if the chain has an error', () => {
      const mockFn = vi.fn();
      const chain = safe<number>(() => {
        throw new Error('Chain error');
      }).effect(mockFn);

      expect(mockFn).not.toHaveBeenCalled();
      expect(!chain.isOk).toBe(true);
    });

    it('should handle async effects properly', async () => {
      // Using a setTimeout promise to ensure we're testing real async behavior
      let effectExecuted = false;

      const chain = safe(42).effect(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            effectExecuted = true;
            resolve('different value');
          }, 10);
        });
      });

      // Should wait for the promise to resolve
      const result = await chain.unwrap();
      expect(result).toBe(42);
      expect(effectExecuted).toBe(true);
    });

    it('should maintain original chain value when effect returns a different value', () => {
      const result = safe(42)
        .effect(() => 'different value')
        .unwrap();

      expect(result).toBe(42);
    });
  });

  describe('ifOk', () => {
    it('should call the ifOk function with the value', () => {
      const mockFn = vi.fn();
      const result = safe(42).ifOk(mockFn).unwrap();

      expect(mockFn).toHaveBeenCalledWith(42);
      expect(result).toBe(42);
    });

    it('should propagate errors thrown in the ifOk function', () => {
      const chain = safe(42).ifOk(() => {
        if (FOURCE) throw new Error('IfOk error');
      });

      expect(!chain.isOk).toBe(true);
      expect(() => chain.unwrap()).toThrow('IfOk error');
    });

    it('should propagate rejected promises from the ifOk function', async () => {
      const chain = safe(42).ifOk(() => Promise.reject(new Error('IfOk error')));

      await expect(chain.unwrap()).rejects.toThrow('IfOk error');
    });

    it('should not call the ifOk function if the chain has an error', () => {
      const mockFn = vi.fn();
      const chain = safe<number>(() => {
        throw new Error('Chain error');
      }).ifOk(mockFn);

      expect(mockFn).not.toHaveBeenCalled();
      expect(!chain.isOk).toBe(true);
    });

    it('should handle async ifOk properly', async () => {
      // Using a setTimeout promise to ensure we're testing real async behavior
      let ifOkExecuted = false;

      const chain = safe(42).ifOk(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            ifOkExecuted = true;
            resolve('different value');
          }, 10);
        });
      });

      // Should wait for the promise to resolve
      const result = await chain.unwrap();
      expect(result).toBe(42);
      expect(ifOkExecuted).toBe(true);
    });

    it('should maintain original chain value when ifOk returns a different value', () => {
      const result = safe(42)
        .ifOk(() => 'different value')
        .unwrap();

      expect(result).toBe(42);
    });
  });

  describe('catch', () => {
    it('should replace an error with a recovery value', () => {
      const result = safe<number>(() => {
        throw new Error('Test error');
      })
        .catch(() => 42)
        .unwrap();

      expect(result).toBe(42);
    });

    it('should not affect chains with success values', () => {
      const result = safe(24)
        .catch(() => 42)
        .unwrap();
      expect(result).toBe(24);
    });

    it('should capture errors thrown in the recovery function', () => {
      const chain = safe(() => {
        throw new Error('Original error');
        return '';
      }).catch(() => {
        throw new Error('Recovery error');
        return '';
      });

      expect(() => chain.unwrap()).toThrow('Recovery error');
    });

    it('should handle async recovery values', async () => {
      const result = await safe<number>(() => {
        throw new Error('Test error');
      })
        .catch(() => Promise.resolve(42))
        .unwrap();

      expect(result).toBe(42);
    });

    it('should handle rejected promises in recovery function', async () => {
      const chain = safe<number>(() => {
        throw new Error('Original error');
      }).catch(() => Promise.reject(new Error('Recovery error')));

      await expect(chain.unwrap()).rejects.toThrow('Recovery error');
    });
  });

  describe('ifFail', () => {
    it('should replace an error with a recovery value', () => {
      const result = safe<number>(() => {
        throw new Error('Test error');
      })
        .ifFail(() => 42)
        .unwrap();

      expect(result).toBe(42);
    });

    it('should not affect chains with success values', () => {
      const result = safe(24)
        .ifFail(() => 42)
        .unwrap();
      expect(result).toBe(24);
    });

    it('should capture errors thrown in the recovery function', () => {
      const chain = safe(() => {
        throw new Error('Original error');
        return '';
      }).ifFail(() => {
        throw new Error('Recovery error');
        return '';
      });

      expect(() => chain.unwrap()).toThrow('Recovery error');
    });

    it('should handle async recovery values', async () => {
      const result = await safe<number>(() => {
        throw new Error('Test error');
      })
        .ifFail(() => Promise.resolve(42))
        .unwrap();

      expect(result).toBe(42);
    });

    it('should handle rejected promises in recovery function', async () => {
      const chain = safe<number>(() => {
        throw new Error('Original error');
      }).ifFail(() => Promise.reject(new Error('Recovery error')));

      await expect(chain.unwrap()).rejects.toThrow('Recovery error');
    });
  });

  describe('isOk', () => {
    it('isOk should return true for success values', () => {
      expect(safe(42).isOk).toBe(true);
    });

    it('isOk should return false for errors', () => {
      expect(
        safe(() => {
          throw new Error('Test');
        }).isOk
      ).toBe(false);
    });

    it('isOk should handle async operations', async () => {
      const asyncChain = safe(Promise.resolve(42));
      expect(await asyncChain.isOk).toBe(true);

      const errorChain = safe(Promise.reject(new Error('Async error')));
      expect(await errorChain.isOk).toBe(false);
    });
  });

  describe('unwrap', () => {
    it('should return the success value', () => {
      expect(safe(42).unwrap()).toBe(42);
    });

    it('should throw the error', () => {
      expect(() =>
        safe(() => {
          throw new Error('Test');
        }).unwrap()
      ).toThrow('Test');
    });

    it('should handle promises correctly', async () => {
      const result = await safe(Promise.resolve(42)).unwrap();
      expect(result).toBe(42);
    });

    it('should handle nested promises correctly', async () => {
      const result = await safe(Promise.resolve(Promise.resolve(42))).unwrap();
      expect(result).toBe(42);
    });
  });

  describe('Promise type inference and nested promises', () => {
    it('should handle promise chains correctly', async () => {
      const result = await safe(2)
        .map((x) => Promise.resolve(x * 2))
        .map(async (x) => (await x) + 1)
        .unwrap();

      expect(result).toBe(5);
    });

    it('should handle deeply nested promises', async () => {
      const result = await safe(2)
        .map((x) => Promise.resolve(Promise.resolve(x * 2)))
        .map(async (x) => {
          const resolved = await x;
          return resolved + 1;
        })
        .unwrap();

      expect(result).toBe(5);
    });

    it('should preserve Promise type through the chain', async () => {
      type User = { id: number; name: string };
      const fetchUser = (id: number): Promise<User> => Promise.resolve({ id, name: 'Test User' });

      const updateUser = (user: User): Promise<User> => Promise.resolve({ ...user, name: 'Updated User' });

      const result = await safe(1)
        .map(fetchUser) // Promise<User>
        .map(updateUser) // Promise<User> (no double Promise)
        .map(async (user) => {
          const updated = await user;
          return { ...updated, verified: true };
        })
        .unwrap();

      expect(result).toEqual({ id: 1, name: 'Updated User', verified: true });
    });
  });

  describe('Error normalization', () => {
    it('should convert string errors to Error objects', () => {
      const chain = safe(() => {
        throw 'String error' as any;
      });

      expect(() => chain.unwrap()).toThrow();
      expect(!chain.isOk).toBe(true);
    });

    it('should convert unknown errors to Error objects', () => {
      const chain = safe(() => {
        throw { custom: 'error' } as any;
      });

      expect(chain.isOk).toBe(false);
      expect(() => chain.unwrap()).toThrow();
    });
  });
  describe('orElse method', () => {
    it('should return the value when chain is successful', () => {
      const result = safe(42).orElse(100);

      expect(result).toBe(42);
    });

    it('should return fallback value when chain has an error', () => {
      const result = safe(() => {
        throw new Error('Test error');
      }).orElse(100);

      expect(result).toBe(100);
    });

    it('should work with different fallback value types', () => {
      const result = safe<number>(() => {
        throw new Error('Test error');
      }).orElse('fallback' as any);

      expect(result).toBe('fallback');
    });

    it('should handle async chains correctly', async () => {
      const successResult = await safe(Promise.resolve(42)).orElse(100);
      expect(successResult).toBe(42);

      const errorResult = await safe(Promise.reject(new Error('Async error'))).orElse(100);
      expect(errorResult).toBe(100);
    });
  });
});
