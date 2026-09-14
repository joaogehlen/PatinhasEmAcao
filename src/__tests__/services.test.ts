import { AnimalService } from '@/application/services/AnimalService';
import { AuthService } from '@/application/services/AuthService';
import { UserService } from '@/application/services/UserService';
import {
  AuthenticationError,
  ConflictError,
  DomainError,
  ForbiddenError,
  ValidationError,
} from '@/domain/errors';

import {
  FakeSessionStore,
  InMemoryAnimalRepository,
  InMemoryUserRepository,
  fakeHasher,
  fixedClock,
  insertUser,
  makeUser,
  sequentialIds,
  validAnimalInput,
} from './fakes';

describe('AuthService', () => {
  function setup() {
    const users = new InMemoryUserRepository();
    const session = new FakeSessionStore();
    const auth = new AuthService(users, fakeHasher, session, sequentialIds(), fixedClock);
    return { users, session, auth };
  }

  it('cadastra novo usuário sempre como morador e abre sessão', async () => {
    const { auth, session } = setup();
    const user = await auth.register({ name: 'Maria Silva', email: 'Maria@Email.com', phone: '(51) 99999-8888', password: 'segredo1' });

    expect(user.role).toBe('morador');
    expect(user.email).toBe('maria@email.com');
    expect(user.phone).toBe('51999998888');
    expect(session.userId).toBe(user.id);
  });

  it('impede cadastro com e-mail repetido', async () => {
    const { auth } = setup();
    const data = { name: 'Maria Silva', email: 'maria@email.com', phone: '', password: 'segredo1' };
    await auth.register(data);
    await expect(auth.register(data)).rejects.toBeInstanceOf(ConflictError);
  });

  it('retorna erros de validação por campo', async () => {
    const { auth } = setup();
    const error = await auth.register({ name: 'A', email: 'invalido', phone: '', password: '1' }).catch((e) => e);

    expect(error).toBeInstanceOf(ValidationError);
    expect(Object.keys((error as ValidationError).fieldErrors).sort()).toEqual(['email', 'name', 'password']);
  });

  it('faz login com a senha correta e recusa a incorreta', async () => {
    const { auth, users } = setup();
    await insertUser(users, makeUser('voluntario'), 'senha123');

    await expect(auth.login({ email: 'voluntario@teste.com', password: 'errada' })).rejects.toBeInstanceOf(AuthenticationError);
    const user = await auth.login({ email: 'voluntario@teste.com', password: 'senha123' });
    expect(user).not.toHaveProperty('passwordHash');
    expect(await auth.restoreSession()).toEqual(user);
  });
});

describe('UserService', () => {
  async function setup() {
    const repo = new InMemoryUserRepository();
    const service = new UserService(repo, fakeHasher, sequentialIds(), fixedClock);
    const admin = makeUser('admin');
    const morador = makeUser('morador');
    await insertUser(repo, admin);
    await insertUser(repo, morador);
    return { repo, service, admin, morador };
  }

  it('apenas admin lista usuários', async () => {
    const { service, admin, morador } = await setup();
    await expect(service.list(morador)).rejects.toBeInstanceOf(ForbiddenError);
    expect(await service.list(admin)).toHaveLength(2);
  });

  it('morador edita o próprio perfil mas não pode se promover', async () => {
    const { service, morador } = await setup();
    const updated = await service.update(morador, morador.id, { ...morador, name: 'Carlos Souza' });
    expect(updated.name).toBe('Carlos Souza');

    await expect(service.update(morador, morador.id, { ...morador, role: 'admin' })).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('não permite remover o último administrador', async () => {
    const { service, admin, repo } = await setup();
    const otherAdmin = makeUser('morador', { id: 'x', email: 'x@teste.com' });
    await insertUser(repo, otherAdmin);

    await expect(service.update(admin, admin.id, { ...admin, role: 'voluntario' })).rejects.toBeInstanceOf(DomainError);
    await expect(service.delete(admin, admin.id)).rejects.toThrow('própria conta');
  });

  it('troca senha exigindo a senha atual', async () => {
    const { service, morador, repo } = await setup();
    await expect(service.changePassword(morador, 'errada', 'novaSenha')).rejects.toBeInstanceOf(AuthenticationError);
    await service.changePassword(morador, 'senha123', 'novaSenha');
    expect(repo.rows.get(morador.id)!.passwordHash).toBe('salt:novaSenha');
  });
});

describe('AnimalService', () => {
  function setup() {
    const repo = new InMemoryAnimalRepository();
    const service = new AnimalService(repo, sequentialIds(), fixedClock);
    return { repo, service };
  }

  it('cria animal como denunciado e registra a timeline', async () => {
    const { service, repo } = setup();
    const morador = makeUser('morador');
    const animal = await service.create(morador, validAnimalInput);

    expect(animal.status).toBe('denunciado');
    expect(animal.healthNotes).toBeNull();
    expect(animal.createdBy).toBe(morador.id);
    expect(await repo.statusHistory(animal.id)).toEqual([
      expect.objectContaining({ fromStatus: null, toStatus: 'denunciado' }),
    ]);
  });

  it('morador não pode definir status inicial diferente de denunciado', async () => {
    const { service } = setup();
    await expect(service.create(makeUser('morador'), validAnimalInput, 'disponivel')).rejects.toBeInstanceOf(ForbiddenError);
    const animal = await service.create(makeUser('voluntario'), validAnimalInput, 'disponivel');
    expect(animal.status).toBe('disponivel');
  });

  it('valida idade inválida vinda do formulário', async () => {
    const { service } = setup();
    const error = await service.create(makeUser('admin'), { ...validAnimalInput, ageMonths: Number('abc') }).catch((e) => e);
    expect((error as ValidationError).fieldErrors).toHaveProperty('ageMonths');
  });

  it('denunciante edita a própria denúncia só enquanto não há resgate', async () => {
    const { service, repo } = setup();
    const morador = makeUser('morador');
    const animal = await service.create(morador, validAnimalInput);

    await service.update(morador, animal.id, { ...validAnimalInput, name: 'Paçoquinha' });
    expect((await service.getById(animal.id)).name).toBe('Paçoquinha');

    await repo.update({ ...animal, status: 'resgatado' });
    await expect(service.update(morador, animal.id, validAnimalInput)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(service.update(makeUser('morador', { id: 'outro' }), animal.id, validAnimalInput)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('só admin exclui, e nunca animais adotados', async () => {
    const { service, repo } = setup();
    const admin = makeUser('admin');
    const animal = await service.create(admin, validAnimalInput, 'disponivel');

    await expect(service.delete(makeUser('voluntario'), animal.id)).rejects.toBeInstanceOf(ForbiddenError);
    await repo.update({ ...animal, status: 'adotado' });
    await expect(service.delete(admin, animal.id)).rejects.toBeInstanceOf(DomainError);
  });
});
