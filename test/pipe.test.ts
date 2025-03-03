import { describe, it, expect, vi } from 'vitest';
import { safePipe } from '../src/pipe';

describe('safePipe', () => {
  it('should pipe a single function correctly', async () => {
    const addOne = (x: number) => x + 1;
    const piped = safePipe(addOne);

    const result = piped(5);
    expect(result.unwrap()).toBe(6);
  });

  it('should pipe multiple functions correctly', () => {
    const addOne = (x: number) => x + 1;
    const double = (x: number) => x * 2;
    const toString = (x: number) => `Result: ${x}`;

    const piped = safePipe(addOne, double, toString);

    const result = piped(5);
    expect(result.unwrap()).toBe('Result: 12');
  });

  // 에러 처리 테스트
  it('should handle errors in the pipeline', () => {
    const addOne = (x: number) => x + 1;
    const throwError = () => {
      throw new Error('Pipeline error');
    };
    const toString = (x: number) => `Result: ${x}`;

    const piped = safePipe(addOne, throwError, toString);

    const result = piped(5);
    expect(result.isOk).toBe(false);

    // 에러 복구 테스트
    const recovered = result.catch(() => 'Recovered');
    expect(recovered.unwrap()).toBe('Recovered');
  });

  // Promise 처리 테스트
  it('should handle async functions in the pipeline', async () => {
    const addOne = (x: number) => x + 1;
    const asyncDouble = async (x: number) => {
      return new Promise<number>((resolve) => {
        setTimeout(() => resolve(x * 2), 10);
      });
    };
    const toString = (x: number) => `Result: ${x}`;

    const piped = safePipe(addOne, asyncDouble, toString);

    const result = piped(5);
    expect(await result.unwrap()).toBe('Result: 12');
  });

  // 복잡한 타입 체인 테스트
  it('should maintain proper types through the pipeline', () => {
    interface User {
      id: number;
      name: string;
    }

    const getUser = (id: number): User => ({ id, name: 'John' });
    const getUserPermissions = (user: User): string[] => (user.id === 1 ? ['read', 'write'] : ['read']);
    const formatPermissions = (permissions: string[]): string => `User has permissions: ${permissions.join(', ')}`;

    const getUserPermissionsText = safePipe(getUser, getUserPermissions, formatPermissions);

    const result = getUserPermissionsText(1);
    expect(result.unwrap()).toBe('User has permissions: read, write');
  });

  // 에러 전파 테스트
  it('should not execute subsequent functions after an error', () => {
    const spy1 = vi.fn((x: number) => x + 1);
    const throwError = vi.fn(() => {
      throw new Error('Pipeline error');
    });
    const spy2 = vi.fn((x: number) => x * 2);

    const piped = safePipe(spy1, throwError, spy2);
    expect(piped(5).isOk).toBe(false);
    expect(spy1).toHaveBeenCalledTimes(1);
    expect(throwError).toHaveBeenCalledTimes(1);
    expect(spy2).not.toHaveBeenCalled();
  });

  // 다양한 타입의 입력값 테스트
  it('should handle various input types', () => {
    const stringToNumber = (str: string) => parseInt(str, 10);
    const numberToBoolean = (num: number) => num > 5;
    const booleanToString = (bool: boolean) => (bool ? 'yes' : 'no');

    const convertAll = safePipe(stringToNumber, numberToBoolean, booleanToString);

    expect(convertAll('10').unwrap()).toBe('yes');
    expect(convertAll('3').unwrap()).toBe('no');
  });

  // 체인 합성 테스트
  it('should be able to compose with other Safe operations', () => {
    const addOne = (x: number) => x + 1;
    const double = (x: number) => x * 2;

    const piped = safePipe(addOne, double);

    const result = piped(5)
      .map((result) => `The number is ${result}`)
      .watch((str) => {
        // Side effect
        expect(str).toContain('12');
      });

    expect(result.unwrap()).toBe('The number is 12');
  });
});
