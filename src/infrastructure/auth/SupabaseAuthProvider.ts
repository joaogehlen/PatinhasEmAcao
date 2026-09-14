import type { AuthError } from '@supabase/supabase-js';

import type { AuthProvider, CreateUserInput, SignUpInput } from '@/application/ports';
import type { User } from '@/domain/entities/User';
import { AuthenticationError, ConflictError, DomainError, NotFoundError, ValidationError } from '@/domain/errors';

import { supabase } from '../supabase/client';
import { isOffline, OFFLINE_MESSAGE, toUser, translateError } from '../supabase/mappers';

/**
 * Autenticação sobre o Supabase Auth.
 *
 * Nenhuma senha passa por aqui além do caminho direto para o servidor: não há
 * hash local, salt local nem sessão gravada por nós. O ExpoPasswordHasher e o
 * SecureSessionStore da Sprint 1 deixaram de existir por isso.
 */
export class SupabaseAuthProvider implements AuthProvider {
  async currentUser(): Promise<User | null> {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) return null;
    return this.loadProfile(data.session.user.id, isAnonymous(data.session.user));
  }

  async signIn(email: string, password: string): Promise<User> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw translateAuthError(error);
    return this.loadProfile(data.user.id);
  }

  /**
   * Entra como convidado.
   *
   * A sessão anônima é uma conta de verdade no Supabase: tem auth.uid(), então
   * a denúncia tem autor e a RLS continua valendo. Ela fica guardada no
   * aparelho, o que é o que permite ao convidado voltar e acompanhar a própria
   * denúncia — e o que ele perde se desinstalar o app.
   */
  async signInAsGuest(): Promise<User> {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw translateAuthError(error);
    if (!data.user) throw new DomainError('Não foi possível entrar como convidado.');
    return this.loadProfile(data.user.id, true);
  }

  /**
   * Cadastro. Se já existe uma sessão anônima, ela é CONVERTIDA em vez de dar
   * lugar a uma conta nova.
   *
   * É o que preserva o id — e com ele as denúncias que a pessoa já registrou
   * como convidada. Criar uma conta separada deixaria esses registros órfãos
   * num usuário anônimo que ninguém mais acessa, sem nenhum aviso.
   */
  async signUp(input: SignUpInput): Promise<User> {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session && isAnonymous(sessionData.session.user)) {
      return this.convertGuest(input, sessionData.session.user.id);
    }

    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      // Lido pelo trigger handle_new_user para preencher o perfil.
      // O perfil nasce sempre como 'morador': mesmo que alguém forje este
      // metadata, o trigger ignora qualquer role vindo daqui.
      options: { data: { name: input.name, phone: input.phone } },
    });
    if (error) throw translateAuthError(error);
    if (!data.user) throw new DomainError('Não foi possível criar a conta.');
    if (!data.session) {
      throw new DomainError(
        'Confirme o e-mail para entrar. Se estiver testando, desative a confirmação em Authentication > Sign In / Providers > Email.',
      );
    }
    return this.loadProfile(data.user.id);
  }

  /**
   * Transforma a sessão anônima em conta definitiva.
   *
   * O id do usuário não muda, então tudo o que ele registrou como convidado
   * continua sendo dele. O trigger handle_new_user não roda de novo (não há
   * insert em auth.users), por isso nome e telefone são gravados no perfil
   * aqui; o e-mail chega sozinho pelo trigger de sincronização.
   */
  private async convertGuest(input: SignUpInput, userId: string): Promise<User> {
    const { error } = await supabase.auth.updateUser({
      email: input.email,
      password: input.password,
      data: { name: input.name, phone: input.phone },
    });
    if (error) throw translateAuthError(error);

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ name: input.name, phone: input.phone })
      .eq('id', userId);
    if (profileError) translateError(profileError);

    return this.loadProfile(userId, false);
  }

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw translateAuthError(error);
  }

  /**
   * O Supabase não valida a senha atual no updateUser. Reautenticamos primeiro
   * para não permitir que um aparelho com sessão aberta troque a senha sem
   * conhecê-la — era o que UserService.changePassword garantia na Sprint 1.
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const { data: sessionData } = await supabase.auth.getSession();
    const email = sessionData.session?.user.email;
    if (!email) throw new AuthenticationError('Sessão expirada. Entre de novo.');

    const { error: reauthError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (reauthError) throw new AuthenticationError('Senha atual incorreta.');

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw translateAuthError(error);
  }

  createUser(input: CreateUserInput): Promise<User> {
    return this.invokeAdmin<User>('create', input);
  }

  onAuthStateChange(listener: (user: User | null) => void): () => void {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        listener(null);
        return;
      }
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        void this.loadProfile(session.user.id, isAnonymous(session.user))
          .then(listener)
          .catch(() => listener(null));
      }
    });
    return () => data.subscription.unsubscribe();
  }

  /**
   * Perfil excluído não é encontrado pela policy, e é assim que a exclusão
   * lógica bloqueia o acesso: o token continua válido, o app não monta o
   * usuário. A mensagem diz isso em vez de "não encontrado".
   */
  private async loadProfile(id: string, isGuest = false): Promise<User> {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
    if (error) throw new DomainError(`Não foi possível carregar seu perfil: ${error.message}`);
    if (!data) {
      await supabase.auth.signOut();
      throw new AuthenticationError('Esta conta não está mais ativa. Fale com a ONG.');
    }
    return toUser(data, isGuest);
  }

  /**
   * Criar e excluir contas exige a service_role key, que jamais pode estar no
   * app. A Edge Function admin-users faz isso no servidor e revalida que quem
   * chamou é administrador — não basta o app ter checado.
   */
  private async invokeAdmin<T>(action: 'create' | 'delete', payload: unknown): Promise<T> {
    const { data, error } = await supabase.functions.invoke<T>('admin-users', {
      body: { action, payload },
    });
    if (error) {
      const message = await readFunctionError(error);
      if (message.toLowerCase().includes('already') || message.toLowerCase().includes('registered')) {
        throw new ConflictError('Já existe uma conta com este e-mail.');
      }
      throw new DomainError(message);
    }
    if (!data) throw new DomainError('O servidor não respondeu à operação.');
    return data;
  }
}

/** O Supabase marca a sessão anônima no próprio usuário; é daí que sai isGuest. */
function isAnonymous(user: { is_anonymous?: boolean }): boolean {
  return user.is_anonymous === true;
}

function translateAuthError(error: AuthError): DomainError {
  const message = error.message.toLowerCase();
  // Rede primeiro: sem sinal, a mensagem crua é um stack trace de Java.
  if (isOffline(error.message)) return new DomainError(OFFLINE_MESSAGE);
  if (message.includes('invalid login credentials')) return new AuthenticationError();
  if (message.includes('email not confirmed')) return new AuthenticationError('Confirme o e-mail antes de entrar.');
  if (message.includes('already registered') || message.includes('already been registered')) {
    return new ConflictError('Já existe uma conta com este e-mail.');
  }
  if (message.includes('anonymous sign-ins are disabled')) {
    return new DomainError(
      'O acesso sem conta está desligado no servidor. Ative "Anonymous sign-ins" no painel do Supabase.',
    );
  }
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return new DomainError('Muitas tentativas seguidas. Aguarde um minuto e tente de novo.');
  }
  if (message.includes('password') && message.includes('should be at least')) {
    return new ValidationError({ password: 'A senha é curta demais para o servidor.' });
  }
  // Mensagem desconhecida do servidor: vem em inglês, então é enquadrada em vez
  // de repassada crua — o usuário não deve ler erro de API.
  return new DomainError(`Não foi possível concluir: ${error.message}`);
}

/** O corpo do erro de uma Edge Function vem como Response; a mensagem útil está no JSON. */
async function readFunctionError(error: unknown): Promise<string> {
  const context = (error as { context?: unknown }).context;
  if (context instanceof Response) {
    try {
      const body = (await context.clone().json()) as { error?: string };
      if (body.error) return body.error;
    } catch {
      // resposta sem JSON; cai na mensagem genérica abaixo
    }
  }
  return error instanceof Error ? error.message : 'Falha ao contatar o servidor.';
}
