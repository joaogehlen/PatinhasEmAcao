import { AnimalService } from '@/application/services/AnimalService';
import { AuthService } from '@/application/services/AuthService';
import { UserService } from '@/application/services/UserService';
import { VaquinhaService } from '@/application/services/VaquinhaService';

import { systemClock, uuidGenerator } from './adapters';
import { SupabaseAuthProvider } from './auth/SupabaseAuthProvider';
import { SupabaseAnimalRepository } from './repositories/SupabaseAnimalRepository';
import { SupabaseUserRepository } from './repositories/SupabaseUserRepository';
import { SupabaseVaquinhaRepository } from './repositories/SupabaseVaquinhaRepository';

export interface Services {
  auth: AuthService;
  users: UserService;
  animals: AnimalService;
  vaquinhas: VaquinhaService;
}

/**
 * Composition root: único lugar que conhece as implementações concretas.
 *
 * Esta troca — SQLite por Supabase — mexeu só neste arquivo dentro de tudo o
 * que é composição. AnimalService e as telas não souberam da mudança; o que
 * precisou mudar de fato foi a autenticação, porque senha e sessão deixaram de
 * ser persistência e viraram responsabilidade de um provedor externo.
 */
export function createServices(): Services {
  const authProvider = new SupabaseAuthProvider();
  const userRepository = new SupabaseUserRepository();
  const animalRepository = new SupabaseAnimalRepository();

  return {
    auth: new AuthService(authProvider),
    users: new UserService(userRepository, authProvider),
    animals: new AnimalService(animalRepository, uuidGenerator, systemClock),
    vaquinhas: new VaquinhaService(new SupabaseVaquinhaRepository(), uuidGenerator, systemClock),
  };
}
