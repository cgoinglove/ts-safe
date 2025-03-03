/**
 * Creates a function that will automatically retry a failed operation
 * @param fn The function to retry
 * @param options Configuration options for retry behavior
 * @returns A wrapped function that implements retry logic
 */
export const retry = <T, U>(
  fn: (arg: T) => Promise<U> | U,
  options?: {
    maxTries?: number; // Maximum number of attempts (default: 3)
    delay?: number; // Delay between retries in ms (default: 1000)
    backoff?: boolean; // Whether to use exponential backoff (default: false)
  }
) => {
  const maxTries = options?.maxTries ?? 3;
  const delay = options?.delay ?? 1000;
  const useBackoff = options?.backoff ?? false;

  return async (arg: T): Promise<U> => {
    let lastError: Error | undefined;

    for (let i = 0; i < maxTries; i++) {
      try {
        // Attempt to execute the function
        return await fn(arg);
      } catch (error) {
        lastError = error as Error;

        // If not the last attempt, wait before retrying
        if (i < maxTries - 1) {
          // Calculate delay time - if using backoff, increase delay exponentially
          const waitTime = useBackoff ? delay * Math.pow(2, i) : delay;
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }

    // If all attempts failed, throw the last error
    throw lastError;
  };
};
