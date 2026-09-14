/**
 * Portas: dependências externas que os serviços usam via interface.
 * Isso mantém a regra de negócio testável sem Expo/React Native.
 */
export interface PasswordHasher {
  generateSalt(): Promise<string>;
  hash(password: string, salt: string): Promise<string>;
}

export interface SessionStore {
  getUserId(): Promise<string | null>;
  setUserId(userId: string): Promise<void>;
  clear(): Promise<void>;
}

export interface IdGenerator {
  next(): string;
}

export interface Clock {
  nowIso(): string;
}
