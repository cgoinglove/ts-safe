# Safe Pipe

Function composition with automatic error handling and Promise support.

## What is SafePipe?

`safe.pipe` creates a pipeline of functions where each function's output becomes the next function's input. If any function throws, the chain enters an error state and subsequent functions are skipped.

## Basic Usage

```ts
import { safe } from 'ts-safe';

const addOne = (x: number) => x + 1;
const double = (x: number) => x * 2;
const toString = (x: number) => `Result: ${x}`;

const process = safe.pipe(addOne, double, toString);

process(5).unwrap(); // 'Result: 12'
```

## Error Handling

Errors are captured automatically. Use `recover` to handle them:

```ts
const riskyPipe = safe.pipe(
  (x: number) => x + 1,
  (x: number) => { throw new Error('fail'); },
  (x: number) => x * 2  // never reached
);

riskyPipe(5).isOk;                       // false
riskyPipe(5).recover(() => 0).unwrap();  // 0
```

## Async Pipelines

If any function returns a Promise, the pipeline becomes async:

```ts
const fetchAndFormat = safe.pipe(
  (url: string) => fetch(url),
  async (res) => await res.json(),
  (data) => data.name
);

const result = await fetchAndFormat('/api/user').unwrap();
```

## Composing with Safe

The result of a pipe is a `Safe`, so you can chain further operations:

```ts
const getUser = safe.pipe(
  (id: number) => fetchUser(id),
  (user) => user.name
);

const result = getUser(1)
  .map(name => name.toUpperCase())
  .tap(name => console.log(name))
  .recover(() => 'Anonymous')
  .unwrap();
```

## Type Safety

Pipes support up to 7 functions with full type inference:

```ts
// Types flow through automatically
const pipe = safe.pipe(
  (id: number) => getUser(id),       // number → User
  (user) => user.permissions,         // User → string[]
  (perms) => perms.includes('admin')  // string[] → boolean
);
// pipe: (input: number) => Safe<boolean>
```
