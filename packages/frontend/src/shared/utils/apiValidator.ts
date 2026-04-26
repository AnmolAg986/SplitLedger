import { type ZodSchema, type ZodError } from 'zod';

const isDev = import.meta.env.DEV;

/**
 * Validates an API response against a Zod schema.
 * - In development: throws an error to surface contract violations immediately.
 * - In production: logs a warning and returns the data as-is so the UI doesn't crash.
 */
export function validateApiResponse<T>(data: unknown, schema: ZodSchema<T>, endpoint: string): T {
  const result = schema.safeParse(data);

  if (result.success) {
    return result.data;
  }

  const issues = formatZodError(result.error);

  if (isDev) {
    console.error(
      `[Contract Violation] API response from "${endpoint}" does not match the expected schema.\n` +
      `Issues:\n${issues}`
    );
    throw new Error(`API contract violation at "${endpoint}". See console for details.`);
  } else {
    console.warn(
      `[Contract Warning] API response from "${endpoint}" has schema mismatch:\n${issues}`
    );
    // Graceful fallback in production: return unvalidated data
    return data as T;
  }
}

function formatZodError(error: ZodError): string {
  return error.issues
    .map(issue => `  - [${issue.path.join('.')}]: ${issue.message}`)
    .join('\n');
}
