import { describe, it, expect, vi } from 'vitest';
import { retry, safe, errorIfNull, errorIfFalsy, errorIfEmpty, errorIf } from '../src';

describe('util', () => {
  describe('retry', () => {
    const createFailingFn = (failCount: number) => {
      let calls = 0;
      return vi.fn(async (value: string) => {
        calls++;
        if (calls <= failCount) throw new Error(`Fail ${calls}`);
        return value + ' success';
      });
    };

    describe('basic functionality', () => {
      it('should retry until success with map', async () => {
        const fn = createFailingFn(2);

        const result = await safe('test')
          .map(retry(fn, { maxTries: 3, delay: 10 }))
          .unwrap();

        expect(result).toBe('test success');
        expect(fn).toHaveBeenCalledTimes(3);
      });

      it('should preserve original value with effect', async () => {
        const fn = createFailingFn(1);

        const result = await safe('test')
          .effect(retry(fn, { maxTries: 3, delay: 10 }))
          .unwrap();

        expect(result).toBe('test');
        expect(fn).toHaveBeenCalledTimes(2);
      });

      it('should fail when max tries exceeded', async () => {
        const fn = createFailingFn(5);

        const chain = safe('test').map(retry(fn, { maxTries: 3, delay: 10 }));

        expect(await chain.isOk).toBe(false);
        expect(fn).toHaveBeenCalledTimes(3);

        await expect(chain.unwrap()).rejects.toThrow('Fail 3');
      });
    });
  });

  describe('valid', () => {
    it('errorIfNull should handle null values correctly', () => {
      expect(errorIfNull()('test')).toBe('test');
      expect(() => errorIfNull()(null)).toThrow('Value is null or undefined');

      expect(safe('test').map(errorIfNull()).unwrap()).toBe('test');
      expect(() => safe(null).map(errorIfNull()).unwrap()).toThrow();
    });

    it('errorIfFalsy should handle falsy values correctly', () => {
      expect(errorIfFalsy()(42)).toBe(42);
      expect(() => errorIfFalsy()(0)).toThrow('Value is falsy');

      expect(safe(true).map(errorIfFalsy()).unwrap()).toBe(true);
      expect(() => safe('').map(errorIfFalsy()).unwrap()).toThrow();
    });

    it('errorIfEmpty should handle empty arrays/strings correctly', () => {
      expect(errorIfEmpty()(['item'])).toEqual(['item']);
      expect(() => errorIfEmpty()('')).toThrow('Value is empty');

      expect(safe('hello').map(errorIfEmpty()).unwrap()).toBe('hello');
      expect(() => safe([]).map(errorIfEmpty()).unwrap()).toThrow();
    });

    it('errorIf should handle custom conditions correctly', () => {
      const validationFn = errorIf((value: any) => {
        if (!value) return 'Value required';
        if (typeof value !== 'object') return 'Must be an object';
        if (!value.name) return 'Name required';
        return false;
      });

      expect(validationFn({ name: 'test' })).toEqual({ name: 'test' });
      expect(() => validationFn({})).toThrow('Name required');

      expect(safe({ name: 'test' }).map(validationFn).unwrap()).toEqual({ name: 'test' });
      expect(() => safe(null).map(validationFn).unwrap()).toThrow();
    });
  });
});
