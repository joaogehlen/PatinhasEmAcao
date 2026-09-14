import type { SQLiteDatabase } from 'expo-sqlite';

import { AnimalService } from '@/application/services/AnimalService';
import { AuthService } from '@/application/services/AuthService';
import { UserService } from '@/application/services/UserService';

import { ExpoPasswordHasher, SecureSessionStore, systemClock, uuidGenerator } from './adapters';
import { seedDatabase } from './database/seed';
import { SqliteAnimalRepository } from './repositories/SqliteAnimalRepository';
import { SqliteUserRepository } from './repositories/SqliteUserRepository';

export interface Services {
  auth: AuthService;
  users: UserService;
  animals: AnimalService;
}

/**
 * Composition root: único lugar que conhece as implementações concretas.
 * Para migrar para Firebase, troque os repositórios aqui.
 */
export function createServices(db: SQLiteDatabase): Services {
  const userRepository = new SqliteUserRepository(db);
  const animalRepository = new SqliteAnimalRepository(db);
  const hasher = new ExpoPasswordHasher();

  return {
    auth: new AuthService(userRepository, hasher, new SecureSessionStore(), uuidGenerator, systemClock),
    users: new UserService(userRepository, hasher, uuidGenerator, systemClock),
    animals: new AnimalService(animalRepository, uuidGenerator, systemClock),
  };
}

export async function seedIfEmpty(db: SQLiteDatabase): Promise<void> {
  await seedDatabase(new SqliteUserRepository(db), new SqliteAnimalRepository(db), new ExpoPasswordHasher());
}
