# Configuração do Supabase

Passo a passo para deixar o backend pronto. Uma vez só, por projeto — depois cada integrante precisa apenas do `.env`.

## 1. Criar o projeto

No painel do [Supabase](https://supabase.com): **New project**.

- Região: **South America (São Paulo)** — menor latência para o RS.
- Guarde a senha do banco num gerenciador de senhas. Ela **não** vai para o repositório.

## 2. Criar o esquema

**SQL Editor → New query**, cole o conteúdo de [`migrations/0001_init.sql`](migrations/0001_init.sql) e rode.

Isso cria as tabelas, os enums, os triggers, as policies de RLS e o bucket `animal-photos`.

## 3. Desativar a confirmação de e-mail

**Authentication → Sign In / Providers → Email** e desligue **Confirm email**.

Sem isso o cadastro pelo app não abre sessão: o Supabase espera o clique no link de confirmação, e ainda não há deep link configurado. Se o app for a uso real, religue e implemente o deep link.

## 4. Criar as contas de demonstração

**Authentication → Users → Add user → Create new user**, três vezes, com **Auto Confirm User** marcado:

| E-mail                    | Senha           |
| ------------------------- | --------------- |
| `admin@patinhas.org`      | `admin123`      |
| `voluntario@patinhas.org` | `voluntario123` |
| `morador@patinhas.org`    | `morador123`    |

Criar usuário de autenticação por SQL não é suportado, e a Admin API exigiria a `service_role key` — que não pode sair do servidor. Por isso este passo é manual.

O trigger `on_auth_user_created` cria os perfis automaticamente, todos como `morador`.

## 5. Popular com os dados de exemplo

**SQL Editor**, cole [`seed.sql`](seed.sql) e rode. Ele ajusta os nomes, promove admin e voluntária, e cria os 7 animais de demonstração.

## 6. Publicar a Edge Function

Só é necessária para o administrador **criar** e **excluir** contas pelo app. O resto funciona sem ela.

```bash
npx supabase login
npx supabase link --project-ref <seu-project-ref>
npx supabase functions deploy admin-users
```

Ou cole [`functions/admin-users/index.ts`](functions/admin-users/index.ts) em **Edge Functions → Deploy a new function**.

Sem o deploy, a tela "Novo usuário" falha com erro de servidor. Os usuários ainda podem se cadastrar sozinhos (sempre como morador) e o admin promove pela tela de edição.

## 7. Configurar o app

**Project Settings → API**, copie os dois valores para o `.env` na raiz:

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

Depois: `npx expo start -c` (o `-c` limpa o cache, necessário quando o `.env` muda).

---

## Segurança

**A `service_role key` nunca entra no app.** Ela ignora toda a RLS: dentro de um APK, equivale a dar acesso irrestrito ao banco para qualquer pessoa que baixe o aplicativo. Ela só existe dentro da Edge Function, onde o Supabase a injeta como variável de ambiente.

As duas chaves do `.env` são públicas por design. Quem protege os dados é a RLS.

## Alterando o esquema

Nunca edite `0001_init.sql` depois de aplicado. Crie `0002_*.sql` com a alteração.

E lembre: as policies espelham `src/domain/rules/permissions.ts`. Mudou a matriz de permissões no código, mude a policy — e vice-versa.

## Plano gratuito

O projeto é **pausado após 7 dias sem atividade**. Antes da apresentação para a banca, abra o painel para reativar, ou o app cai na hora da demo.
