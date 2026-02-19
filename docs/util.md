# Safe Utilities

Utility functions that complement the Safe core functionality.

## Validation

Validator functions designed for use with `map`. They return the value if valid, or throw an error if invalid.

### `errorIfNull(message?)`

Throws if value is `null` or `undefined`.

```ts
safe(value).map(errorIfNull()).unwrap()
safe(value).map(errorIfNull('User not found')).unwrap()
```

### `errorIfFalsy(message?)`

Throws if value is falsy (`null`, `undefined`, `0`, `''`, `false`, `NaN`).

```ts
safe(input).map(errorIfFalsy('Input required')).unwrap()
```

### `errorIfEmpty(message?)`

Throws if value has `length === 0`. Works with arrays and strings.

```ts
safe(items).map(errorIfEmpty('List must not be empty')).unwrap()
```

### `errorIf(predicate)`

Throws if predicate returns a string (used as error message). Returns `false` or `undefined` for valid values.

```ts
const validateAge = errorIf((age: number) => {
  if (age < 0) return 'Age cannot be negative';
  if (age > 150) return 'Invalid age';
  return false;
});

safe(25).map(validateAge).unwrap() // 25
safe(-1).map(validateAge).unwrap() // throws Error('Age cannot be negative')
```

## Retry

### `retry(fn, options?)`

Wraps a function with automatic retry logic.

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `maxTries` | `3` | Maximum number of attempts |
| `delay` | `1000` | Delay between retries (ms) |
| `backoff` | `false` | Use exponential backoff |

```ts
// Basic retry
const result = await safe(url)
  .map(retry(fetchData, { maxTries: 3, delay: 500 }))
  .unwrap();

// With exponential backoff (500ms, 1000ms, 2000ms)
const result = await safe(url)
  .map(retry(fetchData, { maxTries: 3, delay: 500, backoff: true }))
  .unwrap();

// With tap (preserves original value)
await safe(data)
  .tap(retry(saveToDB, { maxTries: 2, delay: 1000 }))
  .unwrap(); // returns original data, not saveToDB result
```

## Example: API Request Pipeline

```ts
import { safe, errorIfNull, retry } from 'ts-safe';

const fetchUser = async (id: number) => {
  const result = await safe(() => fetch(`/api/users/${id}`))
    .map(retry(res => res.json(), { maxTries: 2, delay: 500 }))
    .map(errorIfNull('User not found'))
    .peekOk(user => console.log('Fetched:', user.name))
    .peekError(err => console.error(err))
    .recover(() => ({ id: 0, name: 'Guest' }))
    .unwrap();

  return result;
};
```
