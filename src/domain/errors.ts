/**
 * Erros de domínio: representam violações de regra de negócio.
 * A camada de apresentação os converte em mensagens amigáveis.
 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends DomainError {
  /** Mensagens indexadas pelo nome do campo, para exibir no formulário. */
  constructor(public readonly fieldErrors: Record<string, string>) {
    super('Dados inválidos. Verifique os campos destacados.');
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, id: string) {
    super(`${entity} com id "${id}" não encontrado.`);
  }
}

export class ConflictError extends DomainError {}

export class AuthenticationError extends DomainError {
  constructor(message = 'E-mail ou senha incorretos.') {
    super(message);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = 'Você não tem permissão para realizar esta ação.') {
    super(message);
  }
}
