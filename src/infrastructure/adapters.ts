import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import type { Clock, IdGenerator, PasswordHasher, SessionStore } from '@/application/ports';

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * SHA-256 com salt aleatório por usuário. Suficiente para um protótipo
 * com dados locais; com backend real a autenticação vai para o servidor
 * (ex.: Firebase Auth) e nenhuma senha fica no dispositivo.
 */
export class ExpoPasswordHasher implements PasswordHasher {
  async generateSalt(): Promise<string> {
    return toHex(await Crypto.getRandomBytesAsync(16));
  }

  hash(password: string, salt: string): Promise<string> {
    return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${password}`);
  }
}

const SESSION_KEY = 'patinhas.session.userId';

export class SecureSessionStore implements SessionStore {
  getUserId(): Promise<string | null> {
    return SecureStore.getItemAsync(SESSION_KEY);
  }

  setUserId(userId: string): Promise<void> {
    return SecureStore.setItemAsync(SESSION_KEY, userId);
  }

  clear(): Promise<void> {
    return SecureStore.deleteItemAsync(SESSION_KEY);
  }
}

export const uuidGenerator: IdGenerator = { next: () => Crypto.randomUUID() };

export const systemClock: Clock = { nowIso: () => new Date().toISOString() };
