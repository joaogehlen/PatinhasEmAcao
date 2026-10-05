import { allowedNextStatuses, canTransition } from '@/domain/rules/animalStatus';
import { hasPermission } from '@/domain/rules/permissions';
import { parseMoney } from '@/presentation/format';

describe('máquina de estados do animal', () => {
  it('segue o fluxo denunciado → resgatado → tratamento → disponível → adotado', () => {
    expect(canTransition('denunciado', 'resgatado')).toBe(true);
    expect(canTransition('resgatado', 'em_tratamento')).toBe(true);
    expect(canTransition('em_tratamento', 'disponivel')).toBe(true);
    expect(canTransition('disponivel', 'adotado')).toBe(true);
  });

  it('não permite pular do denunciado direto para adotado', () => {
    expect(canTransition('denunciado', 'adotado')).toBe(false);
    expect(allowedNextStatuses('denunciado')).toEqual(['resgatado']);
  });
});

describe('permissões por perfil', () => {
  const morador = { role: 'morador', isGuest: false } as const;
  const admin = { role: 'admin', isGuest: false } as const;
  const convidado = { role: 'morador', isGuest: true } as const;

  it('morador registra, vê o catálogo e as vaquinhas, mas não edita', () => {
    expect(hasPermission(morador, 'animal:create')).toBe(true);
    expect(hasPermission(morador, 'animal:viewAll')).toBe(true);
    expect(hasPermission(morador, 'vaquinha:view')).toBe(true);
    expect(hasPermission(morador, 'animal:update')).toBe(false);
    expect(hasPermission(morador, 'animal:changeStatus')).toBe(false);
    expect(hasPermission(morador, 'user:list')).toBe(false);
  });

  it('admin faz tudo, inclusive o que era do voluntário', () => {
    expect(hasPermission(admin, 'animal:changeStatus')).toBe(true);
    expect(hasPermission(admin, 'animal:update')).toBe(true);
    expect(hasPermission(admin, 'animal:delete')).toBe(true);
    expect(hasPermission(admin, 'user:manage')).toBe(true);
    expect(hasPermission(admin, 'vaquinha:manage')).toBe(true);
  });

  it('convidado só registra denúncia, mesmo tendo perfil de morador', () => {
    expect(hasPermission(convidado, 'animal:create')).toBe(true);
    expect(hasPermission(convidado, 'animal:viewAll')).toBe(false);
    expect(hasPermission(convidado, 'vaquinha:view')).toBe(false);
    expect(hasPermission(convidado, 'user:list')).toBe(false);
  });

  it('usuário não logado não tem permissões', () => {
    expect(hasPermission(null, 'animal:create')).toBe(false);
  });
});

describe('leitura de valor em reais', () => {
  it('aceita vírgula ou ponto como decimal, e ponto como milhar', () => {
    expect(parseMoney('50,50')).toBe(5050);
    expect(parseMoney('50.50')).toBe(5050);
    expect(parseMoney('50.5')).toBe(5050);
    expect(parseMoney('1.234,56')).toBe(123456);
    expect(parseMoney('1.500')).toBe(150000);
    expect(parseMoney('R$ 1.234.567')).toBe(123456700);
    expect(parseMoney('1234')).toBe(123400);
    expect(parseMoney('')).toBeNull();
    expect(parseMoney('abc')).toBeNull();
  });
});
