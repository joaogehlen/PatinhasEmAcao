import { AnimalService } from '@/application/services/AnimalService';
import { AuthService } from '@/application/services/AuthService';
import { UserService } from '@/application/services/UserService';
import {
  AuthenticationError,
  ConflictError,
  DomainError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@/domain/errors';

import {
  FakeAuthProvider,
  InMemoryAnimalRepository,
  InMemoryUserRepository,
  fixedClock,
  insertUser,
  makeGuest,
  makeUser,
  sequentialIds,
  validAnimalInput,
} from './fakes';

function authSetup() {
  const users = new InMemoryUserRepository();
  const provider = new FakeAuthProvider(users);
  return { users, provider, auth: new AuthService(provider) };
}

describe('AuthService', () => {
  it('cadastra novo usuário sempre como morador e abre sessão', async () => {
    const { auth, provider } = authSetup();
    const user = await auth.register({
      name: 'Maria Silva',
      email: 'Maria@Email.com',
      phone: '(51) 99999-8888',
      password: 'segredo1',
    });

    expect(user.role).toBe('morador');
    expect(user.email).toBe('maria@email.com');
    expect(user.phone).toBe('51999998888');
    expect(provider.current).toEqual(user);
  });

  it('impede cadastro com e-mail repetido', async () => {
    const { auth } = authSetup();
    const data = { name: 'Maria Silva', email: 'maria@email.com', phone: '', password: 'segredo1' };
    await auth.register(data);
    await expect(auth.register(data)).rejects.toBeInstanceOf(ConflictError);
  });

  it('retorna erros de validação por campo', async () => {
    const { auth } = authSetup();
    const error = await auth.register({ name: 'A', email: 'invalido', phone: '', password: '1' }).catch((e) => e);

    expect(error).toBeInstanceOf(ValidationError);
    expect(Object.keys((error as ValidationError).fieldErrors).sort()).toEqual(['email', 'name', 'password']);
  });

  it('faz login com a senha correta e recusa a incorreta', async () => {
    const { auth, users, provider } = authSetup();
    insertUser(users, provider, makeUser('admin'), 'senha123');

    await expect(auth.login({ email: 'admin@teste.com', password: 'errada' })).rejects.toBeInstanceOf(
      AuthenticationError,
    );
    const user = await auth.login({ email: 'admin@teste.com', password: 'senha123' });
    expect(user).not.toHaveProperty('passwordHash');
    expect(await auth.restoreSession()).toEqual(user);
  });

  it('converte o convidado em conta sem trocar o id', async () => {
    const { auth, provider } = authSetup();
    const guest = await auth.continueAsGuest();
    expect(guest.isGuest).toBe(true);

    const account = await auth.register({
      name: 'Maria Silva',
      email: 'maria@email.com',
      phone: '',
      password: 'segredo1',
    });

    // O id é o que liga a pessoa às denúncias que ela já abriu: se mudar, elas
    // ficam órfãs num usuário anônimo que ninguém mais acessa.
    expect(account.id).toBe(guest.id);
    expect(account.isGuest).toBe(false);
    expect(account.email).toBe('maria@email.com');
    expect(provider.current?.id).toBe(guest.id);
  });

  it('avisa a aplicação quando a sessão cai', async () => {
    const { auth, users, provider } = authSetup();
    insertUser(users, provider, makeUser('morador'));
    const seen: (unknown | null)[] = [];
    const unsubscribe = auth.onAuthStateChange((user) => seen.push(user));

    await auth.login({ email: 'morador@teste.com', password: 'senha123' });
    await auth.logout();
    unsubscribe();

    expect(seen).toHaveLength(2);
    expect(seen[1]).toBeNull();
  });
});

describe('UserService', () => {
  function setup() {
    const repo = new InMemoryUserRepository();
    const provider = new FakeAuthProvider(repo);
    const service = new UserService(repo, provider);
    const admin = makeUser('admin');
    const morador = makeUser('morador');
    insertUser(repo, provider, admin);
    insertUser(repo, provider, morador);
    return { repo, provider, service, admin, morador };
  }

  it('apenas admin lista usuários', async () => {
    const { service, admin, morador } = setup();
    await expect(service.list(morador)).rejects.toBeInstanceOf(ForbiddenError);
    expect(await service.list(admin)).toHaveLength(2);
  });

  it('morador edita o próprio perfil mas não pode se promover', async () => {
    const { service, morador } = setup();
    const updated = await service.update(morador, morador.id, { ...morador, name: 'Carlos Souza' });
    expect(updated.name).toBe('Carlos Souza');

    await expect(service.update(morador, morador.id, { ...morador, role: 'admin' })).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it('ignora tentativa de trocar e-mail pelo perfil', async () => {
    const { service, morador } = setup();
    const updated = await service.update(morador, morador.id, { ...morador, email: 'outro@teste.com' });
    expect(updated.email).toBe('morador@teste.com');
  });

  it('não permite remover o último administrador', async () => {
    const { service, admin, morador, repo, provider } = setup();
    insertUser(repo, provider, makeUser('morador', { id: 'x', email: 'x@teste.com' }));

    await expect(service.update(admin, admin.id, { ...admin, role: 'morador' })).rejects.toBeInstanceOf(DomainError);
    await expect(service.delete(admin, admin.id)).rejects.toThrow('própria conta');
    await expect(service.delete(morador, 'x')).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('só admin cria usuário, e é o único caminho para criar outro admin', async () => {
    const { service, admin, morador } = setup();
    await expect(
      service.create(morador, { name: 'Ana Paula', email: 'ana@teste.com', phone: '', password: 'segredo1', role: 'admin' }),
    ).rejects.toBeInstanceOf(ForbiddenError);

    const created = await service.create(admin, {
      name: 'Ana Paula',
      email: 'ana@teste.com',
      phone: '',
      password: 'segredo1',
      role: 'admin',
    });
    expect(created.role).toBe('admin');
  });

  it('exclui usuário de forma lógica, e o perfil some das consultas', async () => {
    const { service, admin, repo, provider } = setup();
    insertUser(repo, provider, makeUser('morador', { id: 'x', email: 'x@teste.com' }));

    await service.delete(admin, 'x');

    expect(await service.list(admin)).toHaveLength(2);
    await expect(service.getById(admin, 'x')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('troca senha exigindo a senha atual', async () => {
    const { service, morador, provider } = setup();
    provider.current = morador; // simula a sessão aberta

    await expect(service.changePassword(morador, 'errada', 'novaSenha')).rejects.toBeInstanceOf(AuthenticationError);
    await service.changePassword(morador, 'senha123', 'novaSenha');
    expect(provider.passwords.get(morador.id)).toBe('novaSenha');
  });

  it('recusa senha nova fora das regras antes de chamar o servidor', async () => {
    const { service, morador, provider } = setup();
    provider.current = morador;
    await expect(service.changePassword(morador, 'senha123', '123')).rejects.toBeInstanceOf(ValidationError);
    expect(provider.passwords.get(morador.id)).toBe('senha123');
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
    await expect(service.create(makeUser('morador'), validAnimalInput, 'disponivel')).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    const animal = await service.create(makeUser('admin'), validAnimalInput, 'disponivel');
    expect(animal.status).toBe('disponivel');
  });

  it('valida idade inválida vinda do formulário', async () => {
    const { service } = setup();
    const error = await service
      .create(makeUser('admin'), { ...validAnimalInput, ageMonths: Number('abc') })
      .catch((e) => e);
    expect((error as ValidationError).fieldErrors).toHaveProperty('ageMonths');
  });

  it('nem o próprio denunciante edita o animal: edição é do admin', async () => {
    const { service } = setup();
    const morador = makeUser('morador');
    const animal = await service.create(morador, validAnimalInput);

    await expect(
      service.update(morador, animal.id, { ...validAnimalInput, name: 'Paçoquinha' }),
    ).rejects.toBeInstanceOf(ForbiddenError);

    await service.update(makeUser('admin'), animal.id, { ...validAnimalInput, name: 'Paçoquinha' });
    expect((await service.getById(animal.id)).name).toBe('Paçoquinha');
  });

  it('convidado registra denúncia, mas não define status inicial', async () => {
    const { service, repo } = setup();
    const convidado = makeGuest();

    const animal = await service.create(convidado, validAnimalInput);
    expect(animal.status).toBe('denunciado');
    expect(animal.createdBy).toBe(convidado.id);
    expect(await repo.statusHistory(animal.id)).toHaveLength(1);

    await expect(service.create(convidado, validAnimalInput, 'disponivel')).rejects.toBeInstanceOf(ForbiddenError);
    await expect(service.delete(convidado, animal.id)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('só admin exclui, e nunca animais adotados', async () => {
    const { service, repo } = setup();
    const admin = makeUser('admin');
    const animal = await service.create(admin, validAnimalInput, 'disponivel');

    await expect(service.delete(makeUser('morador'), animal.id)).rejects.toBeInstanceOf(ForbiddenError);
    await repo.update({ ...animal, status: 'adotado' });
    await expect(service.delete(admin, animal.id)).rejects.toBeInstanceOf(DomainError);
  });
});
