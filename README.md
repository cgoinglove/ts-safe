# ts-safe

[![npm](https://img.shields.io/npm/v/ts-safe)](https://www.npmjs.com/package/ts-safe)
[![bundle size](https://img.shields.io/bundlephobia/minzip/ts-safe)](https://bundlephobia.com/package/ts-safe)
[![zero dependencies](https://img.shields.io/badge/dependencies-0-green)](https://www.npmjs.com/package/ts-safe)

Type-safe error handling for TypeScript — with automatic Promise inference.

```ts
const name = await safe(() => fetch('/api/user'))
  .map(res => res.json())           // transform — value changes
  .tap(user => saveToDb(user))      // side effect — can break chain, value preserved
  .peekOk(user => console.log(user))// observe — can't break chain, just watch
  .recover(() => defaultUser)       // recover — replace error with fallback
  .map(user => user.name)           // transform — type flows automatically
  .unwrap();                        // extract — Promise<string>
```

## Why ts-safe?

There are great Result/Either libraries for TypeScript — [neverthrow](https://github.com/supermacro/neverthrow), [fp-ts](https://github.com/gcanti/fp-ts), [Effect](https://github.com/Effect-TS/effect). But they either require you to learn a new paradigm, or don't handle the sync → async boundary well.

**ts-safe is different:**

### 1. Promises just work

Most Result libraries force you to choose between sync and async variants, or wrap everything in a Task/Effect monad. ts-safe handles Promise transitions **automatically at the type level**:

```ts
safe(1)                          // Safe<number>
  .map(x => x + 1)              // Safe<number>          — still sync
  .map(async x => fetchData(x)) // Safe<Promise<Data>>   — now async
  .map(data => data.name)        // Safe<Promise<string>> — stays async
  .unwrap()                      // Promise<string>       — awaitable
```

No `TaskEither`, no `ResultAsync`, no separate API. The type system tracks it for you.

### 2. Minimal API, maximum clarity

Every method name tells you two things: **what it does** and **whether it affects the chain**.

```
Chain affected:     map · flatMap · tap · recover
Chain unaffected:   peek · peekOk · peekError
Extract result:     unwrap · orElse · match · isOk
```

That's it. No `chain`, `andThen`, `mapLeft`, `bimap`, `fold`, `tryCatch`, `fromEither`, `taskify`...

### 3. Tiny

| Library | Bundle (minified + gzip) | Dependencies |
|---------|------------------------:|:------------:|
| **ts-safe** | **~1 KB** | **0** |
| neverthrow | ~2 KB | 0 |
| fp-ts | ~30 KB | 0 |
| Effect | ~50 KB+ | multiple |

## Install

```bash
npm install ts-safe
```

## Quick Start

```ts
import { safe } from 'ts-safe';

// Wrap a value
safe(42)                        // Safe<number>

// Wrap a function — errors are captured, not thrown
safe(() => JSON.parse(input))   // Safe<any>

// Chain operations
safe(() => riskyOperation())
  .map(value => transform(value))       // transform the value
  .tap(value => sideEffect(value))      // side effect — errors break the chain
  .peekOk(value => console.log(value))  // observe — errors are ignored
  .recover(err => fallbackValue)        // recover from error
  .unwrap()                             // extract the result
```

## API

Methods are organized by **impact on the chain**:

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  Transform        map(fn)       value → new value            │
│  (changes value)  flatMap(fn)   value → Safe → flatten       │
│                                                              │
│  Side Effect      tap(fn)       run on success, keep value   │
│  (can break)      recover(fn)   run on error, provide value  │
│                                                              │
│  Observe          peek(fn)      see SafeResult, can't break  │
│  (can't break)    peekOk(fn)    see value only, can't break  │
│                   peekError(fn) see error only, can't break  │
│                                                              │
│  Extract          unwrap()      get value or throw           │
│                   orElse(v)     get value or default          │
│                   match({ok,err}) pattern match              │
│                   isOk          boolean (or Promise<boolean>) │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### `map(fn)` — Transform

Changes the value. Skipped on error.

```ts
safe(2).map(x => x * 3).unwrap() // 6
```

### `flatMap(fn)` — Transform with Safe

Like `map`, but for functions that return another `Safe`. Flattens the result.

```ts
const parse = (s: string) => safe(() => JSON.parse(s));
safe('{"a":1}').flatMap(parse).unwrap() // { a: 1 }
```

### `tap(fn)` — Side Effect on Success

Runs a function on success. The **original value is preserved** (return value ignored). If the function **throws, the error propagates**. If it returns a Promise, the chain becomes async.

```ts
safe(user)
  .tap(u => saveToDb(u))     // if throws → error state
  .tap(u => sendEmail(u))    // skipped if above threw
  .map(u => u.name)
  .unwrap()
```

### `recover(fn)` — Error Recovery

Provides a replacement value on error. After recovery, the chain continues as success.

```ts
safe(() => { throw new Error('fail') })
  .recover(err => 'default')   // chain is now ok
  .map(v => v.toUpperCase())
  .unwrap()                     // 'DEFAULT'
```

### `peek(fn)` / `peekOk(fn)` / `peekError(fn)` — Observe

Pure observation. **Nothing you do inside can affect the chain** — thrown errors are silently ignored, Promises are silently ignored, return values are ignored. The chain passes through completely unchanged.

Use for logging, metrics, debugging — anything where failure shouldn't stop the flow.

```ts
safe(result)
  .peekOk(v => console.log('success:', v))    // only on success
  .peekError(e => console.error('error:', e))  // only on error
  .peek(r => metrics.record(r.isOk))           // always runs
  .unwrap()
```

The difference from `tap`: if your logging service throws, `tap` would break the chain. `peek` swallows the error and continues.

```ts
// tap — error propagates (for important side effects)
safe(data).tap(d => saveToDb(d))      // DB failure → chain breaks ✓

// peekOk — error ignored (for optional side effects)
safe(data).peekOk(d => analytics(d))  // analytics failure → chain continues ✓
```

### `match({ ok, err })` — Pattern Match

Handles both success and error explicitly. Returns the handler's result.

```ts
const message = safe(() => fetchUser())
  .map(user => user.name)
  .match({
    ok:  name  => `Hello, ${name}!`,
    err: error => `Failed: ${error.message}`
  });
```

### `unwrap()` / `orElse(fallback)` — Extract

```ts
safe(42).unwrap()                                     // 42
safe(() => { throw new Error() }).unwrap()            // throws!

safe(42).orElse('default')                            // 42
safe(() => { throw new Error() }).orElse('default')   // 'default' (never throws)
```

### `isOk` — Check State

```ts
safe(42).isOk                              // true
safe(() => { throw new Error() }).isOk     // false
await safe(1).map(async x => x).isOk       // Promise<true>
```

## Promise Inference

This is the core differentiator. ts-safe tracks sync/async state **at the type level** without any extra syntax.

### How it works

| What you do | Chain type | Why |
|---|---|---|
| `safe(42)` | `Safe<number>` | Sync value |
| `.map(x => x + 1)` | `Safe<number>` | Sync callback → stays sync |
| `.map(async x => fetch(x))` | `Safe<Promise<Response>>` | Async callback → becomes async |
| `.map(res => res.json())` | `Safe<Promise<any>>` | Callback receives awaited value |
| `.tap(async x => log(x))` | `Safe<Promise<T>>` | Async side effect → becomes async |
| `.peek(async x => log(x))` | `Safe<T>` | peek **never** goes async |

### The key rule

> When the chain is async, callbacks receive the **awaited** value — not the Promise.

```ts
safe(1)
  .map(async x => x + 1)     // callback returns Promise<number>
  .map(x => x * 10)           // x is number (not Promise<number>)
  .unwrap()                    // Promise<number>
```

You write synchronous-looking transforms. ts-safe handles the awaiting.

### Comparison with alternatives

```ts
// neverthrow — need separate ResultAsync + awkward wrapping
const result = ResultAsync.fromPromise(fetch('/api'), handleErr)
  .andThen(res => ResultAsync.fromPromise(res.json(), handleErr))
  .map(data => data.name);

// ts-safe — just write it
const result = safe(() => fetch('/api'))
  .map(res => res.json())
  .map(data => data.name);
```

## Utilities

### Validation

Validator functions for use with `map`. They return the value if valid, or throw if not.

```ts
import { safe, errorIfNull, errorIfEmpty, errorIf } from 'ts-safe';

safe(userInput)
  .map(errorIfNull('Input required'))
  .map(errorIfEmpty('Must not be empty'))
  .map(errorIf(v => v.length < 3 ? 'Too short' : false))
  .unwrap()
```

| Function | Throws when |
|---|---|
| `errorIfNull(msg?)` | `null` or `undefined` |
| `errorIfFalsy(msg?)` | any falsy value |
| `errorIfEmpty(msg?)` | `.length === 0` |
| `errorIf(predicate)` | predicate returns a string |

### Retry

Automatic retry with optional exponential backoff:

```ts
import { safe, retry } from 'ts-safe';

await safe(url)
  .map(retry(fetchData, {
    maxTries: 3,    // default: 3
    delay: 1000,    // default: 1000ms
    backoff: true   // exponential: 1s, 2s, 4s
  }))
  .unwrap();
```

### Pipe

Compose functions into a reusable pipeline with automatic error handling:

```ts
const getUsername = safe.pipe(
  (id: number) => fetchUser(id),  // number → User
  user => user.name,               // User → string
  name => name.toUpperCase()       // string → string
);

getUsername(1).unwrap()    // 'ALICE'
getUsername(999).orElse('ANONYMOUS')
```

## License

MIT
