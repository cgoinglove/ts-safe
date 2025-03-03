# 🔗 Safe 🔗

`Safe` is a functional utility library for JavaScript/TypeScript that simplifies error handling and asynchronous operations. It provides a fluent chainable API that makes your code more readable and maintainable while ensuring strong type safety.

> "Provides core functionality without the complexity of large libraries like `fp-ts` or `effect.ts`. Recognizing that most developers only use a fraction of what big libraries offer, Safe focuses on just the essentials with an intuitive API. All you need are the fundamental tools for type safety, error handling, and async operations."

## Features

- **Stable Type Safety**: Provides consistent type safety regardless of whether operations are synchronous or asynchronous
- **Chainable API**: Enables intuitive method chaining for cleaner code structure
- **Separation of Pure Functions and Side Effects**: Clearly distinguishes between methods with side effects and those without
- **Safe Chaining**: Allows the chain to continue execution even when errors occur
- **Flexible Error Handling**: Control when errors surface through `unwrap()` or provide fallbacks with `orElse()`
- **Function Composition**: Create reusable function pipelines with the Pipe module

## Installation

```bash
npm install ts-safe
```

```bash
pnpm add ts-safe
```

```bash
yarn add ts-safe
```

## Basic Usage

```typescript
import { safe } from 'ts-safe';

const result = safe(10)
  .map((x) => x * 2) // Transform the value (10 -> 20)
  .effect(logValue) // Side effect with error propagation
  .catch(handleErrors) // Error recovery if needed
  .watch(observeState); // Side effect without error propagation

console.log(result.isOk); // Check if chain contains a success value
console.log(result.unwrap()); // Extract the final value (throws if there was an error)
```

### Starting a Chain

```typescript
import { safe } from 'ts-safe';

// Start with a value
const s1 = safe(100);

const s2 = safe(() => {
  return 100;
});

const s3 = safe();

s1.unwrap() === s2.unwrap()
s3.unwarp() === undefined
```

### map: Transforming Values

```typescript
// Example of transforming values in a chain
const result = safe(5)
  .map((x) => x * 2) // 5 -> 10
  .map((x) => x + 3) // 10 -> 13
  .map((x) => `The value is ${x}`); // 13 -> "The value is 13"

console.log(result.isOk); // true
console.log(result.unwrap()); // "The value is 13"

// If there's an error, subsequent map operations are not executed
const errorResult = safe(1)
  .map((x) => {
    throw new Error('Error occurred');
  })
  .map((x) => x * 2); // This transformation is skipped due to the error

console.log(errorResult.isOk); // false

try {
  errorResult.unwrap(); // Throws the error
} catch (e) {
  console.error(e.message); // "Error occurred"
}

const promiseResult =  safe(id)
            .map(async (id)=>fetchData(id));

console.log(promiseResult.isOk); //Promise<boolean>
promiseResult.unwrap() // Promise<Data>
```

### effect: Applying Side Effects

```typescript
// Synchronous effect example - note that the return value doesn't change chain value
const syncResult = safe(42)
  .effect((value) => {
    console.log(`Processing value: ${value}`);
    return Boolean(value); // This return value doesn't affect the chain's value
  })
  .unwrap(); // Still returns 42

// Asynchronous effect example - returning a Promise makes chain async
const asyncResult = safe('data')
  .effect(async (data) => {
  // The chain becomes asynchronous when a Promise is returned
  await saveToDatabase(data);
  console.log('Data saved successfully');
});

await asyncResult.isOk; // Promise<true>
const result = await asyncResult.unwrap(); // "data"

// Effect with error propagation example
const errorResult = safe('data')
.effect((data) => {
  throw new Error('Save Error'); // This error propagates through the chain
});
console.log(errorResult.isOk); // false
// errorResult.unwrap();          // Would throw 'Save Error'
```

### watch: Observing Values

```typescript
// watch observes values and errors without affecting the chain
const result = safe(42)
  .watch((result) => {

    const {isOk,error,value} = result as SafeResult;

    if (result.isOk) {
      console.log(`Current value: ${result.value}`); // "Current value: 42"
    } else {
      console.error(`Error occurred: ${result.error.message}`);
    }
    // Errors thrown here don't affect the chain
    throw new Error('This error is ignored!');
  })
  .map((x) => x * 2); // 42 -> 84

console.log(result.isOk); // true
console.log(result.unwrap()); // 84

// Returning a Promise in watch doesn't affect the chain's synchronicity
const syncChain = safe(10)
  .watch(async (result) => {
    if (result.isOk) {
      await someAsyncOperation();
      console.log('Async operation completed');
    }
  })
  .map((x) => x + 5); // Chain remains synchronous

console.log(syncChain.unwrap()); // 15 (synchronous return)
```

### catch: Recovering from Errors

```typescript
// Error recovery example
const result = safe(() => {
  throw new Error('Initial error');
})
  .map((x) => x + 10) // Not executed due to the error
  .catch((error) => {
    console.log(`Error recovery: ${error.message}`);
    return 42; // Provide a fallback value
  })
  .map((x) => x * 2); // Applied to the recovered value (42)

console.log(result.unwrap()); // 84

// fallback
const fallBackResult = safe(() => {
  throw new Error('Async recovery needed');
});

console.log(fallBackResult.isOk); // false
console.log(fallBackResult.orElse(100)); // 100 no error
```

## API Reference

### Core Functions

#### `safe<T>(value: T): Safe<T>`

#### `safe<T>(fn: () => T): Safe<T>`

#### `safe(): Safe<undefined>`

Wraps a value or function in a Safe. If a function is provided, it executes the function and stores the result in the Safe.

### Main Methods

#### `map<U>(transform: (value: T ) => U): Safe<T extends Promise<any> ? Promise<U> : U>`

Transforms the value in the chain. Changes the value type from T to U.

#### `watch(consumer: (result: SafeResult<T) => any): Safe<T>`

Observes the current state of the chain without affecting it. Receives a result object containing either a value or an error.

#### `effect<U>(effectFn: (value: T ) => U): Safe<U extends Promise<any> ? Promise<T> : T>`

Applies a side effect to the value. If it returns a Promise, the chain becomes asynchronous. If an error occurs, it propagates to the chain.

#### `catch<U>(handler: (error: Error) => U): Safe<T|U>`

Provides a fallback value when the chain contains an error. If it returns a Promise, the chain becomes asynchronous.

#### `isOk: Promise<boolean> | boolean`

Property that indicates whether the chain contains a success value. Returns a Promise for asynchronous chains.

#### `unwrap(): T`

Extracts the final value from the chain. Throws an exception if the chain contains an error.

#### `orElse<U>(fallbackValue: U): T | U`

Extracts the value from the chain or returns the provided fallback value if there's an error. Unlike unwrap(), this method never throws an exception.

## Synchronous/Asynchronous Processing and Error Propagation

Safe intelligently handles synchronous and asynchronous operations according to these rules:

1. **Methods without side effects** (`watch`)

   - Returning a Promise does not affect the chain's synchronicity
   - Errors that occur inside do not propagate to the chain
   - Access to both values and errors through the Result object

2. **Methods with side effects** (`effect`, `catch`)

   - Returning a Promise makes the chain asynchronous
   - Errors that occur inside propagate to the chain

3. **Value transformation methods** (`map`)
   - Returning a Promise makes the chain asynchronous
   - Errors that occur inside propagate to the chain

## Additional Modules

Safe comes with several powerful modules that extend its functionality:


### 🛠️ util: Helpful Utilities

[Full Documentation](./docs/util.md)

Common validation and observer and retry patterns:

```typescript
import { safe,errorIfNull, errorIfEmpty, watchOk, watchError,retry } from 'ts-safe';

safe(userData)
  .effect(errorIfNull('User data is required')) // valid
  .map((user) => user.email)
  .effect(errorIfEmpty('Email cannot be empty'))
  .effect(retry(sendMail)) // retry 
  .watch(watchOk(value => console.log(value))) // obserbe
  .watch(watchError(error => console.error(error)));
```

### 📦 pipe: Function Composition Made Easy

[Full Documentation](./docs/pipe.md)

Create reusable function pipelines that process data sequentially:

```typescript
import { safe } from 'ts-safe';

const processNumber = safe.pipe(
  (num: number) => num * 2,
  (num: number) => num + 10,
  (num: number) => `Result: ${num}`
);

console.log(processNumber(5).unwrap()); // "Result: 20"
```
## License

MIT