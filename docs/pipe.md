# Safe Pipe

Function composition made simple with automatic error handling and Promise support.

## What is SafePipe?

`safePipe` creates reusable function pipelines where:
- Each function receives the output of the previous function
- Promises are handled automatically
- Errors are caught and wrapped in Safe
- Type safety is preserved throughout the pipeline

## Usage

```typescript
import { safePipe } from 'ts-safe';

// Basic pipeline with synchronous functions
const numberProcessor = safePipe(
  (num: number) => num * 2,           // 5 -> 10
  (num: number) => num + 5,           // 10 -> 15
  (num: number) => `The result is ${num}` // 15 -> "The result is 15"
);

console.log(numberProcessor(5).unwrap()); // "The result is 15"

// Pipeline with async functions
const fetchData = safePipe(
  (id: string) => `https://api.example.com/users/${id}`,
  (url: string) => fetch(url).then(r => r.json()),
  (user: any) => user.name
);

// Automatically handles promises
const userName = await fetchData("123").unwrap(); // Returns the user's name

// Error handling
const validateAndProcess = safePipe(
  (input: any) => {
    if (!input) throw new Error("Input required");
    return input;
  },
  (data: any) => processData(data)
);

// Errors are safely caught
const result = validateAndProcess(null);
console.log(result.isOk); // false
// result.unwrap() would throw "Input required" error
```

## Why SafePipe?

Unlike regular function composition:
- **Automatic Promise handling**: No need to manually handle async/await
- **Built-in error handling**: All errors are safely caught and propagated
- **Safe integration**: Results are wrapped in Safe for further processing
- **Type Safety**: Full TypeScript support with proper type inference

## Real-World Example

```typescript
// API data processing pipeline
const processApiData = safePipe(
  // 1. Fetch data from API
  (params: QueryParams) => fetchFromApi(params),
  
  // 2. Transform the response
  (apiResponse: ApiResponse) => transformData(apiResponse),
  
  // 3. Validate the transformed data
  (data: TransformedData) => {
    if (!data.isValid) throw new Error("Invalid data structure");
    return data;
  },
  
  // 4. Format for the UI
  (validData: TransformedData) => ({
    items: validData.results,
    total: validData.count,
    hasMore: validData.page < validData.totalPages
  })
);

// Usage in a component
function loadData() {
  return processApiData({ page: 1, limit: 10 })
    .catch(error => {
      // Fallback if anything fails
      console.error("Data processing failed:", error);
      return { items: [], total: 0, hasMore: false };
    })
    .unwrap();
}
```

With `safePipe`, your data processing flows become cleaner, more modular, and safer.