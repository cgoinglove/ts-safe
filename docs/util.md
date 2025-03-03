# Safe Utils

Utility functions that complement the Safe core functionality, making common validation and observation patterns easier.

## Validation Utilities

Safe provides common validators that throw errors under specific conditions, making validation easier in your chains.

```typescript
import { safe, errorIfNull, errorIfEmpty, errorIfFalsy, errorIf } from 'ts-safe';

// Check for null/undefined values
safe(userData)
  .effect(errorIfNull('User data is required'))
  .map(user => user.email)
  .unwrap();

// Check for empty arrays or strings
safe(emails)
  .effect(errorIfEmpty('Email list cannot be empty'))
  .map(list => sendEmails(list))
  .unwrap();

// Check using a custom condition
safe(user)
  .effect(errorIf((user) => 
    !user.agreeToTerms && 'User must agree to terms'
  ))
  .unwrap();
```

## Observer Utilities

Helper functions to simplify monitoring successful values or errors in your chains.

```typescript
import { safe, watchOk, watchError } from 'ts-safe';

// Process user registration
safe(formData)
  .map(validateForm)
  .map(createUser)
  .watch(watchOk(user => {
    // Only runs if chain has a success value
    analytics.track('User Created', { userId: user.id });
    showSuccessMessage();
  }))
  .watch(watchError(error => {
    // Only runs if chain has an error
    analytics.track('Registration Failed', { error: error.message });
    showErrorMessage(error.message);
  }))
  .unwrap();
```

## Retry Utility

A powerful utility that automatically retries failed operations.

```typescript
import { safe,retry } from 'ts-safe';

// Basic usage
safe(userId)
  .map(retry(fetchUserData))
  // Retries up to 3 times with 1 second between attempts

// With custom options
safe(transactionData)
  .map(retry(processPayment, { 
    maxTries: 5,         // Try up to 5 times
    delay: 2000,         // Wait 2 seconds between tries
    backoff: true        // Use exponential backoff (2s, 4s, 8s, 16s...)
  }))
  .unwrap();

// With effect
safe(userData)
  .effect(retry(saveToDatabase, { maxTries: 3 }))
  .unwrap();
```

## Complete Example

```typescript
import { safe, errorIfNull, errorIfEmpty, watchOk, watchError, retry  } from 'ts-safe';

function processPayment(paymentData) {
  return safe(paymentData)
    // Validate required data
    .effect(errorIfNull('Payment data is required'))
    .map(data => data.amount)
    .effect(errorIf(amount => amount <= 0 && 'Amount must be greater than zero'))
    .map(amount => ({
      amount,
      fee: calculateFee(amount),
      total: amount + calculateFee(amount)
    }))
    // Process the payment with retry on failure
    .map(retry(processTransaction, { maxTries: 3, backoff: true }))
    // Track outcomes without affecting the chain
    .watch(watchOk(result => {
      logSuccess('Payment processed', result.transactionId);
      showSuccessUI(result);
    }))
    .watch(watchError(error => {
      logError('Payment failed', error);
      showErrorUI(error.message);
    }))
    .unwrap();
}
```

## Available Utilities

### Validation

| Function | Description |
|----------|-------------|
| `errorIfNull(message?)` | Throws error if value is null or undefined |
| `errorIfEmpty(message?)` | Throws error if array or string is empty |
| `errorIfFalsy(message?)` | Throws error if value is falsy (empty, 0, null, undefined, etc) |
| `errorIf(predicate)` | Throws error based on a custom condition |

### Observation

| Function | Description |
|----------|-------------|
| `watchOk(consumer)` | Runs the consumer function only if the chain contains a success value |
| `watchError(consumer)` | Runs the consumer function only if the chain contains an error |

### Operation Utilities

| Function | Description |
|----------|-------------|
| `retry(fn, options?)` | Creates a function that automatically retries on failure |

These utilities help reduce boilerplate code and make your chains more readable and maintainable.