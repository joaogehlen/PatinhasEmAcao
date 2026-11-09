import { AdocaoService } from '@/application/services/AdocaoService';
import { AvisoService } from '@/application/services/AvisoService';
import { NoticiaService } from '@/application/services/NoticiaService';
import { UserService } from '@/application/services/UserService';
import { ConflictError, DomainError, ForbiddenError, NotFoundError, ValidationError } from '@/domain/errors';
import { allowedNextAdocaoStatuses, canTransitionAdocao } from '@/domain/rules/adocaoStatus';
import { hasPermission } from '@/domain/rules/permissions';

import {
  FakeAuthProvider,
  InMemoryAdocaoRepository,
  InMemoryAnimalRepository,
  InMemoryAvisoRepository,
  InMemoryNoticiaRepository,
  InMemoryUserRepository,
  fixedClock,
  insertUser,
  makeAnimal,
  makeGuest,
  makeUser,
  sequentialIds,
  validAdocaoInput,
  validNoticiaInput,
} from './fakes';

describe('foto de perfil (D3)', () => {
  function setup() {
    const repo = new InMemoryUserRepository();
    const provider = new FakeAuthProvider(repo);
    const morador = makeUser('morador');
    insertUser(repo, provider, morador);
    return { service: new UserService(repo, provider), morador };
  }

  it('grava, mantém quando o campo não vem e remove com null', async () => {
    const { service, morador } = setup();
    const base = { name: morador.name, phone: null, role: 'morador' };

    const withPhoto = await service.update(morador, morador.id, { ...base, avatarUrl: 'https://exemplo.org/eu.jpg' });
    expect(withPhoto.avatarUrl).toBe('https://exemplo.org/eu.jpg');

    const kept = await service.update(withPhoto, morador.id, { ...base, name: 'Carlos Souza' });
    expect(kept.avatarUrl).toBe('https://exemplo.org/eu.jpg');

    const removed = await service.update(kept, morador.id, { ...base, avatarUrl: null });
    expect(removed.avatarUrl).toBeNull();
  });

  it('recusa endereço que não é URL', async () => {
    const { service, morador } = setup();
    const error = await service
      .update(morador, morador.id, { name: morador.name, phone: null, role: 'morador', avatarUrl: 'file.jpg' })
      .catch((e) => e);
    expect(error).toBeInstanceOf(ValidationError);
  });
});

describe('mural de notícias (D1)', () => {
  function setup() {
    const repo = new InMemoryNoticiaRepository();
    return { repo, service: new NoticiaService(repo, sequentialIds(), fixedClock), admin: makeUser('admin'), morador: makeUser('morador') };
  }

  it('só admin publica; morador lê; convidado não vê', async () => {
    const { service, admin, morador } = setup();
    await expect(service.create(morador, validNoticiaInput)).rejects.toBeInstanceOf(ForbiddenError);
    await service.create(admin, validNoticiaInput);
    expect(await service.list(morador)).toHaveLength(1);
    await expect(service.list(makeGuest())).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('não vincula animal e vaquinha ao mesmo tempo', async () => {
    const { service, admin } = setup();
    const error = await service
      .create(admin, {
        ...validNoticiaInput,
        animalId: '11111111-1111-4111-8111-111111111111',
        vaquinhaId: '22222222-2222-4222-8222-222222222222',
      })
      .catch((e) => e);
    expect((error as ValidationError).fieldErrors).toHaveProperty('vaquinhaId');
  });

  it('fixar uma notícia desafixa a anterior e a coloca no topo', async () => {
    const { service, admin } = setup();
    const first = await service.create(admin, { ...validNoticiaInput, pinned: true });
    const second = await service.create(admin, validNoticiaInput);
    await service.setPinned(admin, second.id, true);

    const list = await service.list(admin);
    expect(list[0]!.id).toBe(second.id);
    expect(list.find((n) => n.id === first.id)!.pinned).toBe(false);
  });
});

describe('máquina de estados da adoção', () => {
  it('segue enviada → em análise → aprovada ou recusada', () => {
    expect(allowedNextAdocaoStatuses('enviada')).toEqual(['em_analise']);
    expect(canTransitionAdocao('em_analise', 'aprovada')).toBe(true);
    expect(canTransitionAdocao('em_analise', 'recusada')).toBe(true);
    expect(canTransitionAdocao('enviada', 'aprovada')).toBe(false);
    expect(allowedNextAdocaoStatuses('recusada')).toEqual([]);
  });
});

describe('pedidos de adoção (D2)', () => {
  function setup() {
    const animals = new InMemoryAnimalRepository();
    animals.rows.set('animal-1', makeAnimal());
    animals.rows.set('animal-2', makeAnimal({ id: 'animal-2', status: 'em_tratamento' }));
    const repo = new InMemoryAdocaoRepository();
    const service = new AdocaoService(repo, animals, sequentialIds(), fixedClock);
    return { repo, service, admin: makeUser('admin'), morador: makeUser('morador'), outro: makeUser('morador', { id: 'morador-2' }) };
  }

  it('morador pede adoção de animal disponível', async () => {
    const { service, morador } = setup();
    const adocao = await service.request(morador, 'animal-1', validAdocaoInput);
    expect(adocao).toEqual(expect.objectContaining({ status: 'enviada', requesterId: morador.id, otherAnimals: null }));
  });

  it('recusa animal que não está disponível e convidado', async () => {
    const { service, morador } = setup();
    await expect(service.request(morador, 'animal-2', validAdocaoInput)).rejects.toBeInstanceOf(DomainError);
    await expect(service.request(makeGuest(), 'animal-1', validAdocaoInput)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('um pedido aberto por pessoa e animal; recusado libera um novo', async () => {
    const { service, morador, admin } = setup();
    const first = await service.request(morador, 'animal-1', validAdocaoInput);
    await expect(service.request(morador, 'animal-1', validAdocaoInput)).rejects.toBeInstanceOf(ConflictError);

    await service.changeStatus(admin, first.id, 'em_analise');
    await service.changeStatus(admin, first.id, 'recusada', 'Precisamos de pátio cercado.');
    await expect(service.request(morador, 'animal-1', validAdocaoInput)).resolves.toBeDefined();
  });

  it('só admin avalia, só por transição válida, e pedido alheio não aparece', async () => {
    const { service, morador, outro, admin } = setup();
    const adocao = await service.request(morador, 'animal-1', validAdocaoInput);

    await expect(service.changeStatus(morador, adocao.id, 'em_analise')).rejects.toBeInstanceOf(ForbiddenError);
    await expect(service.changeStatus(admin, adocao.id, 'aprovada')).rejects.toBeInstanceOf(DomainError);
    await expect(service.getById(outro, adocao.id)).rejects.toBeInstanceOf(NotFoundError);

    expect(await service.queue(admin)).toHaveLength(1);
    await expect(service.queue(morador)).rejects.toBeInstanceOf(ForbiddenError);
    expect(await service.mine(outro)).toHaveLength(0);
  });
});

describe('central de avisos (D4)', () => {
  function setup() {
    const repo = new InMemoryAvisoRepository();
    const morador = makeUser('morador');
    repo.rows.push(
      { id: 'a1', userId: morador.id, kind: 'status_animal', title: 'Novidade', body: 'Agora: Resgatado.', animalId: 'x', adocaoId: null, readAt: null, createdAt: fixedClock.nowIso() },
      { id: 'a2', userId: 'outra-pessoa', kind: 'denuncia_nova', title: 'Nova denúncia', body: '...', animalId: 'y', adocaoId: null, readAt: null, createdAt: fixedClock.nowIso() },
    );
    return { repo, service: new AvisoService(repo, fixedClock), morador };
  }

  it('conta e marca como lidos só os de quem está logado', async () => {
    const { service, morador, repo } = setup();
    expect(await service.countUnread(morador)).toBe(1);
    await service.markAllRead(morador);
    expect(await service.countUnread(morador)).toBe(0);
    expect(repo.rows.find((a) => a.id === 'a2')!.readAt).toBeNull();
  });

  it('visitante sem sessão recebe lista vazia sem ir ao servidor; convidado com sessão vê os seus', async () => {
    const { service, repo } = setup();
    expect(await service.list(makeGuest({ id: '' }))).toEqual([]);
    expect(repo.calls).toBe(0);
    expect(hasPermission(makeGuest(), 'aviso:view')).toBe(true);
  });
});
