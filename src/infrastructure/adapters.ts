import * as Crypto from 'expo-crypto';

import type { Clock, IdGenerator } from '@/application/ports';

/**
 * O hash de senha (ExpoPasswordHasher) e a sessão em SecureStore saíram daqui
 * na migração para o Supabase: as duas coisas passaram a ser responsabilidade
 * do servidor. Ver infrastructure/auth/SupabaseAuthProvider.ts.
 *
 * Id e relógio continuam no cliente para que os serviços montem a entidade
 * completa antes de gravar — o Postgres tem defaults equivalentes
 * (gen_random_uuid, now) e aceita os dois caminhos.
 */

export const uuidGenerator: IdGenerator = { next: () => Crypto.randomUUID() };

export const systemClock: Clock = { nowIso: () => new Date().toISOString() };
