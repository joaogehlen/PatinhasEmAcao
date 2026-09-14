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
