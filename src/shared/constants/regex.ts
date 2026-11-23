/**
 * Strict 6-character hexadecimal color regex with leading '#' (e.g. #2563EB).
 */
export const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

/**
 * Alphanumeric code formats for building, department, and employee identifiers.
 */
export const CODE_REGEX = /^[A-Za-z0-9-_]{1,30}$/;

/**
 * Standard email format check.
 */
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
