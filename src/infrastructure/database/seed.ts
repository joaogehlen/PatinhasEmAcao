import type { PasswordHasher } from '@/application/ports';
import type { AnimalStatus } from '@/domain/entities/Animal';
import type { AnimalInput, AnimalRepository } from '@/domain/repositories/AnimalRepository';
import type { UserRepository } from '@/domain/repositories/UserRepository';

import { systemClock, uuidGenerator } from '../adapters';

/** Contas de demonstração exibidas na tela de login. */
export const DEMO_ACCOUNTS = [
  { name: 'Administrador ONG', email: 'admin@patinhas.org', password: 'admin123', role: 'admin' },
  { name: 'Voluntária Ana', email: 'voluntario@patinhas.org', password: 'voluntario123', role: 'voluntario' },
  { name: 'Morador Carlos', email: 'morador@patinhas.org', password: 'morador123', role: 'morador' },
] as const;

/** Fotos de demonstração (Unsplash). Exigem internet para carregar. */
const photo = (id: string) => `https://images.unsplash.com/photo-${id}?w=900&q=80&auto=format&fit=crop`;

const DEMO_ANIMALS: (AnimalInput & { status: AnimalStatus })[] = [
  {
    name: 'Paçoca',
    species: 'cachorro',
    size: 'medio',
    sex: 'femea',
    ageMonths: 24,
    temperament: 'docil',
    description: 'Muito carinhosa e companheira, foi encontrada perto da praça central. Adora passeios e se dá bem com crianças.',
    healthNotes: 'Vacinada, vermifugada e castrada.',
    status: 'disponivel',
    photoUri: photo('1587300003388-59208cc962cb'),
    latitude: -28.8738,
    longitude: -52.1753,
  },
  {
    name: 'Frajola',
    species: 'gato',
    size: 'pequeno',
    sex: 'macho',
    ageMonths: 8,
    temperament: 'brincalhao',
    description: 'Filhote curioso resgatado de um terreno baldio. Brinca o dia todo e ronrona no colo.',
    healthNotes: 'Em tratamento de verminose, com previsão de alta em duas semanas.',
    status: 'em_tratamento',
    photoUri: photo('1514888286974-6c03e2ca1dba'),
    latitude: -28.8761,
    longitude: -52.1712,
  },
  {
    name: 'Sem nome',
    species: 'cachorro',
    size: 'grande',
    sex: 'desconhecido',
    ageMonths: null,
    temperament: 'timido',
    description: 'Cão grande e magro visto na beira da estrada, parece estar com a pata ferida.',
    healthNotes: null,
    status: 'denunciado',
    photoUri: photo('1561037404-61cd46aa615b'),
    latitude: -28.8702,
    longitude: -52.1801,
  },
  {
    name: 'Mel',
    species: 'cachorro',
    size: 'pequeno',
    sex: 'femea',
    ageMonths: 36,
    temperament: 'docil',
    description: 'Pequena e tranquila, ideal para apartamento. Gosta de dormir perto das pessoas.',
    healthNotes: 'Vacinada e castrada.',
    status: 'disponivel',
    photoUri: photo('1517849845537-4d257902454a'),
    latitude: -28.8745,
    longitude: -52.1769,
  },
  {
    name: 'Luna',
    species: 'gato',
    size: 'pequeno',
    sex: 'femea',
    ageMonths: 14,
    temperament: 'timido',
    description: 'Um pouco reservada no início, mas muito afetuosa depois que ganha confiança.',
    healthNotes: 'Castrada. Testada negativo para FIV/FeLV.',
    status: 'disponivel',
    photoUri: photo('1573865526739-10659fec78a5'),
    latitude: -28.8729,
    longitude: -52.1741,
  },
  {
    name: 'Thor',
    species: 'cachorro',
    size: 'grande',
    sex: 'macho',
    ageMonths: 48,
    temperament: 'protetor',
    description: 'Leal e protetor, precisa de uma casa com pátio. Resgatado após denúncia de maus-tratos.',
    healthNotes: 'Em recuperação nutricional.',
    status: 'resgatado',
    photoUri: photo('1543466835-00a7907e9de1'),
    latitude: -28.8778,
    longitude: -52.1725,
  },
  {
    name: 'Nina',
    species: 'gato',
    size: 'pequeno',
    sex: 'femea',
    ageMonths: 30,
    temperament: 'docil',
    description: 'Adotada por uma família do bairro Centro. Hoje vive feliz com dois irmãos humanos.',
    healthNotes: null,
    status: 'adotado',
    photoUri: photo('1592194996308-7b43878e84a6'),
    latitude: -28.8712,
    longitude: -52.1788,
  },
];

/**
 * Popula o banco na primeira execução. Idempotente: só cria dados se não
 * houver nenhum administrador. Em bancos antigos, completa as fotos de demo.
 */
export async function seedDatabase(
  users: UserRepository,
  animals: AnimalRepository,
  hasher: PasswordHasher,
): Promise<void> {
  if ((await users.countByRole('admin')) > 0) {
    await backfillDemoPhotos(animals);
    return;
  }

  const now = systemClock.nowIso();
  const userIds: Record<string, string> = {};

  for (const account of DEMO_ACCOUNTS) {
    const salt = await hasher.generateSalt();
    const id = uuidGenerator.next();
    userIds[account.role] = id;
    await users.create({
      id,
      name: account.name,
      email: account.email,
      phone: null,
      role: account.role,
      passwordHash: await hasher.hash(account.password, salt),
      passwordSalt: salt,
      createdAt: now,
      updatedAt: now,
    });
  }

  for (const { status, ...input } of DEMO_ANIMALS) {
    const id = uuidGenerator.next();
    const createdBy = status === 'denunciado' ? userIds.morador! : userIds.voluntario!;
    await animals.create(
      { ...input, id, status, createdBy, createdAt: now, updatedAt: now },
      {
        id: uuidGenerator.next(),
        animalId: id,
        fromStatus: null,
        toStatus: status,
        note: 'Cadastro inicial',
        changedBy: createdBy,
        changedAt: now,
      },
    );
  }
}

/** Bancos criados antes das fotos de demo continuam sem imagem; completa só esses casos. */
async function backfillDemoPhotos(animals: AnimalRepository): Promise<void> {
  const photosByName = new Map(DEMO_ANIMALS.map((animal) => [animal.name, animal.photoUri]));
  for (const animal of await animals.list()) {
    const demoPhoto = photosByName.get(animal.name);
    if (!animal.photoUri && demoPhoto) {
      await animals.update({ ...animal, photoUri: demoPhoto });
    }
  }
}
