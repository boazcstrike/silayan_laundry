/**
 * Credential redaction for logs. Kept dependency-free (no `mongodb` import) so
 * it can be used from modules that must stay out of the driver's runtime graph
 * (e.g. jest-tested code paths).
 */

/**
 * Error message with any embedded connection-string credentials stripped, safe
 * to log. Mongo driver errors can echo the URI (which carries user:password).
 */
export function redactMongoError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/(mongodb(?:\+srv)?:\/\/)[^@\s]*@/gi, '$1<redacted>@');
}
