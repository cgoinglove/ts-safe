# ts-safe

[![npm](https://img.shields.io/npm/v/ts-safe)](https://www.npmjs.com/package/ts-safe)
[![bundle size](https://img.shields.io/bundlephobia/minzip/ts-safe)](https://bundlephobia.com/package/ts-safe)
[![zero dependencies](https://img.shields.io/badge/dependencies-0-green)](https://www.npmjs.com/package/ts-safe)

TypeScript를 위한 타입 안전 에러 핸들링 — Promise 자동 추론 지원.

```ts
const name = await safe(() => fetch('/api/user'))
  .map(res => res.json())           // 변환 — 값이 바뀜
  .effect(user => saveToDb(user))      // 사이드 이펙트 — 체인에 영향, 값 보존
  .observeOk(user => console.log(user))// 관찰 — 체인에 영향 없음, 보기만 함
  .recover(() => defaultUser)       // 복구 — 에러를 대체값으로 교체
  .map(user => user.name)           // 변환 — 타입이 자동으로 흐름
  .unwrap();                        // 추출 — Promise<string>
```

## 왜 ts-safe인가?

TypeScript용 Result/Either 라이브러리는 이미 많습니다 — [neverthrow](https://github.com/supermacro/neverthrow), [fp-ts](https://github.com/gcanti/fp-ts), [Effect](https://github.com/Effect-TS/effect). 하지만 새로운 패러다임을 배워야 하거나, sync → async 경계를 깔끔하게 처리하지 못합니다.

**ts-safe는 다릅니다:**

### 1. Promise가 그냥 동작함

대부분의 Result 라이브러리는 sync/async 전용 API를 분리하거나 Task/Effect 모나드로 감싸야 합니다. ts-safe는 Promise 전환을 **타입 레벨에서 자동 처리**합니다:

```ts
safe(1)                          // Safe<number>
  .map(x => x + 1)              // Safe<number>          — 여전히 sync
  .map(async x => fetchData(x)) // Safe<Promise<Data>>   — 이제 async
  .map(data => data.name)        // Safe<Promise<string>> — async 유지
  .unwrap()                      // Promise<string>       — await 가능
```

`TaskEither`도, `ResultAsync`도, 별도 API도 필요 없습니다. 타입 시스템이 알아서 추적합니다.

### 2. 최소 API, 최대 명확성

모든 메서드 이름이 두 가지를 알려줍니다: **무엇을 하는지**와 **체인에 영향이 있는지**.

```
체인에 영향 있음:    map · flatMap · effect · recover
체인에 영향 없음:    observe · observeOk · observeError
결과 추출:          unwrap · orElse · match · isOk
```

이게 전부입니다. `chain`, `andThen`, `mapLeft`, `bimap`, `fold`, `tryCatch`, `fromEither`, `taskify` 같은 건 없습니다.

### 3. 초경량

| 라이브러리 | 번들 (min + gzip) | 의존성 |
|---------|---:|:---:|
| **ts-safe** | **~1 KB** | **0** |
| neverthrow | ~2 KB | 0 |
| fp-ts | ~30 KB | 0 |
| Effect | ~50 KB+ | 다수 |

## 설치

```bash
npm install ts-safe
```

## 빠른 시작

```ts
import { safe } from 'ts-safe';

// 값 래핑
safe(42)                        // Safe<number>

// 함수 래핑 — 에러가 throw되지 않고 캡처됨
safe(() => JSON.parse(input))   // Safe<any>

// 체인 연결
safe(() => riskyOperation())
  .map(value => transform(value))       // 값 변환
  .effect(value => sideEffect(value))      // 사이드 이펙트 — 에러가 체인을 끊음
  .observeOk(value => console.log(value))  // 관찰 — 에러가 무시됨
  .recover(err => fallbackValue)        // 에러 복구
  .unwrap()                             // 결과 추출
```

## API

메서드는 **체인에 미치는 영향**에 따라 분류됩니다:

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  변환             map(fn)       값 → 새 값                    │
│  (값이 바뀜)      flatMap(fn)   값 → Safe → 평탄화             │
│                                                              │
│  사이드 이펙트    effect(fn)    성공 시 실행, 값 보존            │
│  (체인에 영향)    recover(fn)   에러 시 실행, 대체값 제공         │
│                                                              │
│  관찰             observe(fn)      SafeResult 관찰, 체인 무영향    │
│  (체인에 무영향)  observeOk(fn)    성공 값만 관찰, 체인 무영향       │
│                   observeError(fn) 에러만 관찰, 체인 무영향         │
│                                                              │
│  추출             unwrap()      값 추출 또는 throw              │
│                   orElse(v)     값 추출 또는 기본값              │
│                   match({ok,err}) 패턴 매칭                    │
│                   isOk          boolean (또는 Promise<boolean>)│
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### `map(fn)` — 변환

값을 변환합니다. 에러 상태에서는 스킵됩니다.

```ts
safe(2).map(x => x * 3).unwrap() // 6
```

### `flatMap(fn)` — Safe를 반환하는 변환

`Safe`를 반환하는 함수로 변환합니다. 결과를 평탄화합니다.

```ts
const parse = (s: string) => safe(() => JSON.parse(s));
safe('{"a":1}').flatMap(parse).unwrap() // { a: 1 }
```

### `effect(fn)` — 성공 시 사이드 이펙트

성공 시 함수를 실행합니다. **원래 값은 보존**되고 (반환값 무시), 함수가 **throw하면 에러가 전파**됩니다. Promise를 반환하면 체인이 async로 전환됩니다.

```ts
safe(user)
  .effect(u => saveToDb(u))     // throw하면 → 에러 상태
  .effect(u => sendEmail(u))    // 위에서 throw했으면 스킵
  .map(u => u.name)
  .unwrap()
```

### `recover(fn)` — 에러 복구

에러 상태에서 대체 값을 제공합니다. 복구 후 체인은 성공 상태로 계속됩니다.

```ts
safe(() => { throw new Error('실패') })
  .recover(err => '기본값')   // 이제 성공 상태
  .map(v => v.toUpperCase())
  .unwrap()                    // '기본값'
```

### `observe(fn)` / `observeOk(fn)` / `observeError(fn)` — 관찰

순수 관찰. **내부에서 무슨 일이 일어나도 체인에 영향 없음** — throw된 에러는 무시, Promise도 무시, 반환값도 무시. 체인이 그대로 통과합니다.

로깅, 메트릭, 디버깅 등 실패해도 흐름을 멈추면 안 되는 작업에 사용합니다.

```ts
safe(result)
  .observeOk(v => console.log('성공:', v))    // 성공 시에만
  .observeError(e => console.error('에러:', e))// 에러 시에만
  .observe(r => metrics.record(r.isOk))        // 항상 실행
  .unwrap()
```

`effect`와의 차이: 로깅 서비스가 throw하면 `effect`는 체인을 끊고, `observe`는 에러를 삼키고 계속합니다.

```ts
// effect — 에러 전파 (중요한 사이드 이펙트용)
safe(data).effect(d => saveToDb(d))      // DB 실패 → 체인 끊김 ✓

// observeOk — 에러 무시 (선택적 사이드 이펙트용)
safe(data).observeOk(d => analytics(d))  // 분석 실패 → 체인 계속 ✓
```

### `match({ ok, err })` — 패턴 매칭

성공/에러 두 경우를 모두 명시적으로 처리합니다. 핸들러의 결과를 반환합니다.

```ts
const message = safe(() => fetchUser())
  .map(user => user.name)
  .match({
    ok:  name  => `안녕하세요, ${name}!`,
    err: error => `실패: ${error.message}`
  });
```

### `unwrap()` / `orElse(fallback)` — 추출

```ts
safe(42).unwrap()                                     // 42
safe(() => { throw new Error() }).unwrap()            // throws!

safe(42).orElse('기본값')                              // 42
safe(() => { throw new Error() }).orElse('기본값')     // '기본값' (throw 안 함)
```

### `isOk` — 상태 확인

```ts
safe(42).isOk                              // true
safe(() => { throw new Error() }).isOk     // false
await safe(1).map(async x => x).isOk       // Promise<true>
```

## Promise 추론

ts-safe의 핵심 차별점. 별도 문법 없이 sync/async 상태를 **타입 레벨에서 추적**합니다.

### 동작 방식

| 코드 | 체인 타입 | 이유 |
|---|---|---|
| `safe(42)` | `Safe<number>` | sync 값 |
| `.map(x => x + 1)` | `Safe<number>` | sync 콜백 → sync 유지 |
| `.map(async x => fetch(x))` | `Safe<Promise<Response>>` | async 콜백 → async 전환 |
| `.map(res => res.json())` | `Safe<Promise<any>>` | 콜백은 await된 값을 받음 |
| `.effect(async x => log(x))` | `Safe<Promise<T>>` | async 사이드 이펙트 → async 전환 |
| `.observe(async x => log(x))` | `Safe<T>` | observe는 **절대** async 전환 안 함 |

### 핵심 규칙

> 체인이 async면, 콜백은 **await된 값**을 받습니다 — Promise가 아닌.

```ts
safe(1)
  .map(async x => x + 1)     // 콜백은 Promise<number> 반환
  .map(x => x * 10)           // x는 number (Promise<number>가 아님)
  .unwrap()                    // Promise<number>
```

sync처럼 보이는 변환을 작성하세요. ts-safe가 await를 처리합니다.

### 다른 라이브러리와 비교

```ts
// neverthrow — 별도의 ResultAsync + 불편한 래핑 필요
const result = ResultAsync.fromPromise(fetch('/api'), handleErr)
  .andThen(res => ResultAsync.fromPromise(res.json(), handleErr))
  .map(data => data.name);

// ts-safe — 그냥 쓰면 됨
const result = safe(() => fetch('/api'))
  .map(res => res.json())
  .map(data => data.name);
```

## 유틸리티

### 검증 함수

`map`과 함께 쓰는 검증 함수. 유효하면 값을 반환, 아니면 throw.

```ts
import { safe, errorIfNull, errorIfEmpty, errorIf } from 'ts-safe';

safe(userInput)
  .map(errorIfNull('입력이 필요합니다'))
  .map(errorIfEmpty('비어있으면 안 됩니다'))
  .map(errorIf(v => v.length < 3 ? '너무 짧습니다' : false))
  .unwrap()
```

| 함수 | throw 조건 |
|---|---|
| `errorIfNull(msg?)` | `null` 또는 `undefined` |
| `errorIfFalsy(msg?)` | falsy 값 |
| `errorIfEmpty(msg?)` | `.length === 0` |
| `errorIf(predicate)` | predicate가 문자열 반환 시 |

### 재시도

지수 백오프를 지원하는 자동 재시도:

```ts
import { safe, retry } from 'ts-safe';

await safe(url)
  .map(retry(fetchData, {
    maxTries: 3,    // 기본값: 3
    delay: 1000,    // 기본값: 1000ms
    backoff: true   // 지수: 1초, 2초, 4초
  }))
  .unwrap();
```

### Pipe

에러 핸들링이 내장된 함수 조합:

```ts
const getUsername = safe.pipe(
  (id: number) => fetchUser(id),  // number → User
  user => user.name,               // User → string
  name => name.toUpperCase()       // string → string
);

getUsername(1).unwrap()    // 'ALICE'
getUsername(999).orElse('ANONYMOUS')
```

## 라이센스

MIT
