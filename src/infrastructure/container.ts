import { AdocaoService } from '@/application/services/AdocaoService';
import { AnimalService } from '@/application/services/AnimalService';
import { AuthService } from '@/application/services/AuthService';
import { AvisoService } from '@/application/services/AvisoService';
import { NoticiaService } from '@/application/services/NoticiaService';
import { UserService } from '@/application/services/UserService';
import { VaquinhaService } from '@/application/services/VaquinhaService';

import { systemClock, uuidGenerator } from './adapters';
import { SupabaseAuthProvider } from './auth/SupabaseAuthProvider';
import { OfflineFirstAnimalRepository } from './pendingReports';
import { SupabaseAdocaoRepository } from './repositories/SupabaseAdocaoRepository';
import { SupabaseAvisoRepository } from './repositories/SupabaseAvisoRepository';
import { SupabaseNoticiaRepository } from './repositories/SupabaseNoticiaRepository';
import { SupabaseUserRepository } from './repositories/SupabaseUserRepository';
import { SupabaseVaquinhaRepository } from './repositories/SupabaseVaquinhaRepository';

export interface Services {
  auth: AuthService;
  users: UserService;
  animals: AnimalService;
  vaquinhas: VaquinhaService;
  noticias: NoticiaService;
  adocoes: AdocaoService;
  avisos: AvisoService;
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
  const animalRepository = new OfflineFirstAnimalRepository();

  return {
    auth: new AuthService(authProvider),
    users: new UserService(userRepository, authProvider),
    animals: new AnimalService(animalRepository, uuidGenerator, systemClock),
    vaquinhas: new VaquinhaService(new SupabaseVaquinhaRepository(), uuidGenerator, systemClock),
    noticias: new NoticiaService(new SupabaseNoticiaRepository(), uuidGenerator, systemClock),
    adocoes: new AdocaoService(new SupabaseAdocaoRepository(), animalRepository, uuidGenerator, systemClock),
    avisos: new AvisoService(new SupabaseAvisoRepository(), systemClock),
  };
}
