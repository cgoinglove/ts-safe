import { describe, it, expect, vi } from 'vitest';
import { retry, watchError, watchOk, safe, errorIfNull, errorIfFalsy, errorIfEmpty, errorIf } from '../src';

describe('util', () => {
  describe('retry', () => {
    // 테스트용 함수: n번 실패 후 성공
    const createFailingFn = (failCount) => {
      let calls = 0;
      return vi.fn(async (value) => {
        calls++;
        if (calls <= failCount) throw new Error(`Fail ${calls}`);
        return value + ' success';
      });
    };

    describe('basic functionality', () => {
      it('should retry until success with map', async () => {
        const fn = createFailingFn(2); // 2번 실패 후 성공

        const result = await safe('test')
          .map(retry(fn, { maxTries: 3, delay: 10 }))
          .unwrap();

        expect(result).toBe('test success');
        expect(fn).toHaveBeenCalledTimes(3);
      });

      it('should preserve original value with effect', async () => {
        const fn = createFailingFn(1); // 1번 실패 후 성공

        const result = await safe('test')
          .effect(retry(fn, { maxTries: 3, delay: 10 }))
          .unwrap();

        expect(result).toBe('test'); // effect는 원래 값 유지
        expect(fn).toHaveBeenCalledTimes(2);
      });

      it('should fail when max tries exceeded', async () => {
        const fn = createFailingFn(5); // 5번 모두 실패

        const chain = safe('test').map(retry(fn, { maxTries: 3, delay: 10 }));
        safe(() => '')
          .effect(retry((v) => Number(v)))
          .effect(retry((v) => Number(v)));

        expect(await chain.isOk).toBe(false);
        expect(fn).toHaveBeenCalledTimes(3);

        await expect(chain.unwrap()).rejects.toThrow('Fail 3');
      });
    });
  });
  describe('watch', () => {
    it('watchOk', () => {
      safe(() => {
        return 'hello';
      }).watch(watchOk((v) => expect(v, 'hello')));
    });
    it('watchFail', () => {
      safe(() => {
        throw new Error('fail');
        return 'hello';
      }).watch(watchError((e) => expect(e.name, 'fail')));
    });
  });
  describe('valid', () => {
    it('errorIfNull should handle null values correctly', () => {
      // Simple test
      expect(errorIfNull()('test')).toBe('test');
      expect(() => errorIfNull()(null)).toThrow('Value is null or undefined');

      // With Safe
      expect(safe('test').map(errorIfNull()).unwrap()).toBe('test');
      expect(() => safe(null).map(errorIfNull()).unwrap()).toThrow();
    });

    it('errorIfFalsy should handle falsy values correctly', () => {
      // Simple test
      expect(errorIfFalsy()(42)).toBe(42);
      expect(() => errorIfFalsy()(0)).toThrow('Value is falsy');

      // With Safe
      expect(safe(true).map(errorIfFalsy()).unwrap()).toBe(true);
      expect(() => safe('').map(errorIfFalsy()).unwrap()).toThrow();
    });

    it('errorIfEmpty should handle empty arrays/strings correctly', () => {
      // Simple test
      expect(errorIfEmpty()(['item'])).toEqual(['item']);
      expect(() => errorIfEmpty()('')).toThrow('Value is empty');

      // With Safe
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

      // Simple test
      expect(validationFn({ name: 'test' })).toEqual({ name: 'test' });
      expect(() => validationFn({})).toThrow('Name required');

      // With Safe
      expect(safe({ name: 'test' }).map(validationFn).unwrap()).toEqual({ name: 'test' });
      expect(() => safe(null).map(validationFn).unwrap()).toThrow();
    });
  });
});
