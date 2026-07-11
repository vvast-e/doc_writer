import type { ZodType } from 'zod';

export type ParseResult<T> = { success: true; data: T } | { success: false; message: string };

export async function parseJsonBody<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<ParseResult<T>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { success: false, message: 'Invalid JSON body' };
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    return { success: false, message: result.error.issues.map((i) => i.message).join(', ') };
  }

  return { success: true, data: result.data };
}
