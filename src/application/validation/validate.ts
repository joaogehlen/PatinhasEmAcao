import type { ZodType } from 'zod';

import { ValidationError } from '@/domain/errors';

/** Valida com zod e converte falhas em ValidationError com mensagens por campo. */
export function validate<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (result.success) {
    return result.data;
  }

  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = String(issue.path[0] ?? 'form');
    // Mantém a primeira mensagem de cada campo, que costuma ser a mais relevante.
    fieldErrors[field] ??= issue.message;
  }
  throw new ValidationError(fieldErrors);
}
