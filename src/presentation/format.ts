import { DomainError, ValidationError } from '@/domain/errors';

export function formatAge(ageMonths: number | null): string {
  if (ageMonths === null) return 'Idade desconhecida';
  if (ageMonths < 12) return `${ageMonths} ${ageMonths === 1 ? 'mês' : 'meses'}`;
  const years = Math.floor(ageMonths / 12);
  return `${years} ${years === 1 ? 'ano' : 'anos'}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

/** Centavos para reais. Valores monetários circulam como inteiro no domínio. */
export function formatMoney(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Texto digitado para centavos.
 *
 * Aceita "1.234,56", "1234,56" e "1234". Devolve null quando não dá para ler
 * um número — o schema transforma isso em erro de campo.
 */
export function parseMoney(text: string): number | null {
  const digits = text.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  if (digits.trim() === '') return null;
  const value = Number(digits);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

export function firstName(fullName: string): string {
  return fullName.trim().split(' ')[0] ?? fullName;
}

export function greeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

/** Separa erros de campo (exibidos no input) do erro geral (exibido no topo do formulário). */
export function describeError(error: unknown): { message: string; fieldErrors: Record<string, string> } {
  if (error instanceof ValidationError) return { message: error.message, fieldErrors: error.fieldErrors };
  if (error instanceof DomainError) return { message: error.message, fieldErrors: {} };
  console.error(error);
  return { message: 'Ocorreu um erro inesperado. Tente novamente.', fieldErrors: {} };
}
