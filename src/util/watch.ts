import { SafeResult } from '../result';

/**
 * Creates a function that observes and processes errors in a SafeResult.
 * This utility only calls the consumer function when the result contains an error.
 *
 * @param {function(Error): any} consumer - Function to process the error
 * @returns {function(SafeResult): void} A function that calls the consumer only if the result has an error
 */
export const watchError = (consumer: (error: Error) => any) => (result: SafeResult) => {
  if (!result.isOk) consumer(result.error);
};

/**
 * Creates a function that observes and processes success values in a SafeResult.
 * This utility only calls the consumer function when the result contains a success value.
 *
 * @template T - The type of the success value
 * @param {function(T): any} consumer - Function to process the success value
 * @returns {function(SafeResult<T>): void} A function that calls the consumer only if the result has a success value
 */
export const watchOk =
  <T>(consumer: (value: T) => any) =>
  (result: SafeResult<T>) => {
    if (result.isOk) consumer(result.value);
  };
