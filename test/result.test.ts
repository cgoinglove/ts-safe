import { describe, it, expect } from 'vitest';
import { safeResult, SafeResult } from '../src/result';

describe('safeResult', () => {
  describe('ok', () => {
    it('should create a success result with a value', () => {
      const result = safeResult.ok(42);
      expect(result.isOk).toBe(true);
      expect(result.value).toBe(42);
      expect(result.error).toBeUndefined();
    });

    it('should handle complex objects', () => {
      const complexValue = { foo: 'bar', num: 123, nested: { arr: [1, 2, 3] } };
      const result = safeResult.ok(complexValue);
      expect(result.isOk).toBe(true);
      expect(result.value).toEqual(complexValue);
      expect(result.error).toBeUndefined();
    });

    it('should handle null values', () => {
      const result = safeResult.ok(null);
      expect(result.isOk).toBe(true);
      expect(result.value).toBeNull();
      expect(result.error).toBeUndefined();
    });

    it('should handle undefined values', () => {
      const result = safeResult.ok(undefined);
      expect(result.isOk).toBe(true);
      expect(result.value).toBeUndefined();
      expect(result.error).toBeUndefined();
    });
  });

  describe('fail', () => {
    it('should create a failure result with an Error object', () => {
      const error = new Error('Something went wrong');
      const result = safeResult.fail(error);
      expect(result.isOk).toBe(false);
      expect(result.error).toBe(error);
      expect(result.value).toBeUndefined();
    });

    it('should create a failure result from an error string', () => {
      const errorMsg = 'Something went wrong';
      const result = safeResult.fail(errorMsg);
      expect(result.isOk).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe(errorMsg);
      expect(result.value).toBeUndefined();
    });

    it('should handle arbitrary error values', () => {
      const arbitraryError = { code: 'ERR123', reason: 'Unknown' };
      const result = safeResult.fail(arbitraryError);
      expect(result.isOk).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toContain('ERR123');
      expect(result.value).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should transform a success result synchronously', () => {
      const initial: SafeResult<number> = safeResult.ok(42);
      const updated = safeResult.update(initial, (result) => {
        return result.value! * 2;
      });

      expect(updated.isOk).toBe(true);
      expect(updated.value).toBe(84);
    });

    it('should propagate errors synchronously', () => {
      const initial: SafeResult<number> = safeResult.fail('Initial error');
      const updated = safeResult.update(initial, (result) => {
        if (result.isOk) return 'Transformed';
        else throw result.error;
      });

      expect(updated.isOk).toBe(false);
      expect(updated.error).toBeInstanceOf(Error);
      expect(updated.error?.message).toBe('Initial error');
    });

    it('should handle errors thrown in the callback', () => {
      const initial: SafeResult<number> = safeResult.ok(42);
      const updated = safeResult.update(initial, () => {
        throw new Error('Error in callback');
        return '';
      });

      expect(updated.isOk).toBe(false);
      expect(updated.error).toBeInstanceOf(Error);
      expect(updated.error?.message).toBe('Error in callback');
    });

    it('should handle promises that resolve', async () => {
      const initial: Promise<SafeResult<number>> = Promise.resolve(safeResult.ok(42));
      const updated = safeResult.update(initial, (result) => {
        return result.value! * 2;
      });

      // Since initial is a Promise, updated should also be a Promise
      expect(updated).toBeInstanceOf(Promise);

      const resolvedResult = await updated;
      expect(resolvedResult.isOk).toBe(true);
      expect(resolvedResult.value).toBe(84);
    });

    it('should handle callbacks that return promises', async () => {
      const initial: SafeResult<number> = safeResult.ok(42);
      const updated = safeResult.update(initial, (result) => {
        return Promise.resolve(result.value! * 2);
      });

      expect(updated).toBeInstanceOf(Promise);

      const resolvedResult = await updated;
      expect(resolvedResult.isOk).toBe(true);
      expect(resolvedResult.value).toBe(84);
    });

    it('should handle callbacks that return rejected promises', async () => {
      const initial: SafeResult<number> = safeResult.ok(42);
      const updated = safeResult.update(initial, () => {
        return Promise.reject(new Error('Promise rejected in callback'));
      });

      const resolvedResult = await updated;
      expect(resolvedResult.isOk).toBe(false);
      expect(resolvedResult.error).toBeInstanceOf(Error);
      expect(resolvedResult.error?.message).toBe('Promise rejected in callback');
    });

    it('should chain multiple updates', async () => {
      const initial: SafeResult<number> = safeResult.ok(10);

      const result1 = safeResult.update(initial, (r) => r.value! * 2);
      const result2 = safeResult.update(result1, (r) => r.value! + 5);
      const result3 = safeResult.update(result2, (r) => r.value! * r.value!);

      expect(result3.isOk).toBe(true);
      expect(result3.value).toBe(625); // ((10 * 2) + 5)^2 = 25^2 = 625
    });

    it('should handle async chains correctly', async () => {
      const initial: SafeResult<number> = safeResult.ok(10);

      const asyncOperation = (x: number) => Promise.resolve(x * 2);

      const result1 = safeResult.update(initial, (r) => asyncOperation(r.value!));
      const result2 = await safeResult.update(result1, (r) => Promise.resolve(r.value! + 5));

      expect(result2.isOk).toBe(true);
      expect(result2.value).toBe(25); // (10 * 2) + 5 = 25
    });
  });

  // Additional integrated tests
  describe('integration', () => {
    it('should handle realistic usage scenarios', async () => {
      // Simulate API calls
      const fetchUser = (id: string): Promise<{ id: string; name: string }> => {
        if (id === 'valid') {
          return Promise.resolve({ id, name: 'Test User' });
        }
        return Promise.reject(new Error('User not found'));
      };

      // Success path
      let result: any = safeResult.ok('valid');
      result = await safeResult.update(result, (r) => fetchUser(r.value));

      expect(result.isOk).toBe(true);
      expect(result.value).toEqual({ id: 'valid', name: 'Test User' });

      // Error path
      result = safeResult.ok('invalid');
      result = await safeResult.update(result, (r) => fetchUser(r.value));

      expect(result.isOk).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe('User not found');
    });
  });
});
