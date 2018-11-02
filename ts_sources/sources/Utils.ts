/**
 * Matches only names that are alphanumeric and between 1 and 32 characters length
 */
export const MiddlewareNamingRegex = /^[a-zA-Z0-9_:]{1,32}$/;

/**
 * Matches only names that are alphanumeric and do not start with a number
 */
export const PathNamingRegex = /^[a-zA-Z0-9_]*$/;
