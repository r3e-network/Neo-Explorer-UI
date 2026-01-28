/**
 * String utility functions
 */

/**
 * Generate a random alphabetic string
 * @param {number} length - Length of the string (default: 7)
 * @returns {string} Random string
 */
export function randomString(length = 7) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
