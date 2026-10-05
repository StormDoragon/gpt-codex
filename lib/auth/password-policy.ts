// Client-safe: no Node imports, so forms can use these without pulling the
// hashing code (and a crypto polyfill) into the browser bundle.
export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 200;
