import { allowedNextStatuses, canTransition } from '@/domain/rules/animalStatus';
import { hasPermission } from '@/domain/rules/permissions';

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
  it('morador só pode registrar animais', () => {
    expect(hasPermission({ role: 'morador' }, 'animal:create')).toBe(true);
    expect(hasPermission({ role: 'morador' }, 'animal:update')).toBe(false);
    expect(hasPermission({ role: 'morador' }, 'user:list')).toBe(false);
  });

  it('voluntário atualiza animais mas não gerencia usuários', () => {
    expect(hasPermission({ role: 'voluntario' }, 'animal:changeStatus')).toBe(true);
    expect(hasPermission({ role: 'voluntario' }, 'animal:delete')).toBe(false);
    expect(hasPermission({ role: 'voluntario' }, 'user:manage')).toBe(false);
  });

  it('usuário não logado não tem permissões', () => {
    expect(hasPermission(null, 'animal:create')).toBe(false);
  });
});
