/**
 * Creates a validator function that throws an error if the value is null or undefined.
 *
 * @template T - The type of the value to validate
 * @param {string} [message='Value is null or undefined'] - The error message to throw
 * @returns {function(T): T} A function that validates input and returns it if valid
 * @throws {Error} If the value is null or undefined
 */
export const errorIfNull = <T = unknown>(message = 'Value is null or undefined'): ((value: T) => T) => {
  return (value: T) => {
    if (value === null || value === undefined) throw new Error(message);
    return value;
  };
};

/**
 * Creates a validator function that throws an error if the value is falsy.
 * Falsy values include: null, undefined, empty string, 0, false, NaN.
 *
 * @template T - The type of the value to validate
 * @param {string} [message='Value is falsy'] - The error message to throw
 * @returns {function(T): T} A function that validates input and returns it if valid
 * @throws {Error} If the value is falsy
 */
export const errorIfFalsy = <T = unknown>(message = 'Value is falsy'): ((value: T) => T) => {
  return (value: T) => {
    if (!value) throw new Error(message);
    return value;
  };
};

/**
 * Creates a validator function that throws an error if the array or string is empty.
 *
 * @template T - The type of the value to validate (must have a length property)
 * @param {string} [message='Value is empty'] - The error message to throw
 * @returns {function(T): T} A function that validates input and returns it if valid
 * @throws {Error} If the value has a length of 0
 */
export const errorIfEmpty = <T extends { length: number }>(message = 'Value is empty'): ((value: T) => T) => {
  return (value: T) => {
    if (value.length === 0) throw new Error(message);
    return value;
  };
};

/**
 * Creates a validator function that throws an error based on a custom condition.
 *
 * @template T - The type of the value to validate
 * @param {function(T): (string|false|undefined)} check - Function that should return an error message
 * if validation fails, or false/undefined if validation passes
 * @returns {function(T): T} A function that validates input and returns it if valid
 * @throws {Error} If the check function returns a string (error message)
 */
export const errorIf = <T>(check: (value: T) => string | false | undefined): ((value: T) => T) => {
  return (value: T) => {
    const result = check(value);
    if (result) throw new Error(result);
    return value;
  };
};
