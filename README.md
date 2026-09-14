# Patinhas em Ação 🐾

Aplicativo mobile para a ONG Patinhas em Ação (Arvorezinha/RS): denúncias de animais em risco, acompanhamento do resgate, adoção e doações.

Trabalho acadêmico — Univates. Integrantes: Arthur Predebon Rostirolla, João Alberto Gehlen e Pedro Oliveira Fonseca.

## Como rodar

O app depende de um projeto Supabase. A configuração completa está em [supabase/README.md](supabase/README.md) e leva uns 10 minutos — faça isso **antes** do primeiro `npm start`.

Com o projeto já criado, cada integrante precisa apenas do `.env`:

```bash
npm install
cp .env.example .env   # preencha com a URL e a publishable key do projeto
npm start              # abre o Expo; escaneie o QR code com o app Expo Go
npm test               # testes de domínio e serviços
npm run typecheck      # checagem de tipos
```

O `.env` não é versionado. As duas chaves são públicas por design (quem protege os dados é a RLS), mas a senha do banco e a `service_role key` **nunca** entram no repositório.

Contas de demonstração (a tela de login não as lista mais — quem apresenta digita as credenciais):

| Perfil        | E-mail                    | Senha           |
| ------------- | ------------------------- | --------------- |
| Administrador | admin@patinhas.org        | admin123        |
| Morador       | morador@patinhas.org      | morador123      |

Também dá pra entrar **sem conta**, como convidado ("Só quero avisar sobre um animal" na tela de login): registra denúncia e acompanha só as próprias, e o app oferece criar conta de verdade a qualquer momento pela aba Perfil.

## Stack

- **Expo SDK 57** + React Native + TypeScript (strict)
- **Expo Router** — navegação por arquivos, com rotas protegidas por login e perfil
- **Supabase** — Postgres com RLS, Auth (com login anônimo, para o modo convidado) e Storage. Migrações versionadas em `supabase/migrations/`
- **zod** — validação de dados na camada de aplicação
- **react-native-maps + expo-location** — mapa das denúncias e captura de GPS no registro do animal
- **expo-image-picker / expo-file-system / expo-image** — câmera, galeria, upload e exibição das fotos
- **expo-clipboard** — copiar a chave PIX na tela de vaquinhas
- **expo-sqlite** — só como storage da sessão do Supabase (`expo-sqlite/localStorage`)
- **Jest (jest-expo)** — testes

## Arquitetura

Camadas inspiradas em Clean Architecture. As dependências apontam sempre para dentro: a apresentação usa a aplicação, a aplicação usa o domínio, e a infraestrutura implementa as interfaces definidas por dentro.

```
src/
├── domain/              Regras de negócio puras (sem React, sem Expo)
│   ├── entities/        User, Animal, AnimalStatusChange, Vaquinha + enums e rótulos
│   ├── rules/           Máquina de estados do resgate, matriz de permissões
│   ├── repositories/    Interfaces (contratos) de persistência
│   └── errors.ts        ValidationError, ForbiddenError, NotFoundError...
├── application/         Casos de uso
│   ├── services/        AuthService, UserService, AnimalService, VaquinhaService
│   ├── validation/      Schemas zod e conversão para erros por campo
│   └── ports.ts         AuthProvider, ids, relógio
├── infrastructure/      Implementações concretas
│   ├── supabase/        Cliente, tipos das tabelas e mapeamento linha↔entidade
│   ├── auth/            SupabaseAuthProvider (inclui login anônimo do convidado)
│   ├── repositories/    SupabaseUserRepository, SupabaseAnimalRepository, SupabaseVaquinhaRepository
│   ├── photoStorage.ts  Upload das fotos para o Storage
│   └── container.ts     Composition root: monta os serviços
├── presentation/        UI reutilizável
│   ├── components/      Botões, campos, formulários de animal, usuário e vaquinha
│   ├── providers/       Contexto de serviços e de autenticação
│   ├── hooks/           Carregamento de dados ao focar a tela, localização atual (GPS)
│   ├── mapStyle.ts      Região inicial e tema escuro do mapa
│   └── theme.ts
├── app/                 Telas (rotas do Expo Router)
│   ├── (tabs)/          Mapa (`index`), Animais (`catalog`), Vaquinhas, Usuários, Perfil — cada aba só aparece se o perfil tem a permissão
│   ├── animals/         Detalhe, registro (`new`) e edição de animal
│   ├── vaquinhas/       Criação e edição de campanha (admin)
│   ├── users/           Criação e edição de usuário (admin)
│   ├── profile/         Editar dados e trocar senha
│   └── sign-in.tsx, sign-up.tsx
└── __tests__/           Testes com repositórios em memória

supabase/
├── migrations/          Esquema, triggers e policies de RLS
├── functions/           Edge Function admin-users
└── seed.sql             Dados de demonstração
```

**Por que assim?**

- **Testável**: os serviços recebem as dependências por construtor, então os testes rodam em memória sem emulador e sem rede.
- **Regras em um só lugar no cliente**: permissões (`domain/rules/permissions.ts`) valem tanto para esconder botões quanto para bloquear a operação no serviço.

### O que a migração para o Supabase provou (e o que não provou)

A troca de SQLite por Supabase mexeu em `infrastructure/` e em **uma linha** de composição. `AnimalService`, todas as telas e os testes de animais ficaram intactos — a inversão de dependência funcionou como prometido.

Mas ela não foi de graça, e vale registrar o que o desenho original não previa:

- **Autenticação não é persistência.** `UserRepository` perdeu `findByEmailWithCredentials` e `updateCredentials`, e `AuthService` foi reescrito sobre uma porta nova (`AuthProvider`). Trocar *onde os dados moram* é barato; trocar *quem responde pela identidade* não é.
- **A regra agora vive em dois lugares.** As policies de RLS em `supabase/migrations/0001_init.sql` espelham `domain/rules/permissions.ts`. A do cliente esconde botão; a do servidor é a que vale. **Mudou uma, mude a outra** — divergência aqui é bug silencioso.
- **Transação virou trigger.** `AnimalRepository.create` gravava animal e timeline atomicamente. Do cliente seriam dois requests; a atomicidade voltou como trigger no Postgres.
- **O último administrador virou corrida.** Com um processo só, checar antes de gravar bastava. Com rede, não: a garantia é o trigger `guard_profile_update`.

## Modelo de dados

```
auth.users (Supabase)         animals                          animal_status_history
─────────────────────         ───────                          ─────────────────────
id, email, senha              id (PK)                          id (PK)
  │  1:1 (trigger,            name                             animal_id (FK → animals, cascade)
  ▼  também sessão            species  cachorro|gato|outro     from_status
     anônima do convidado)    size     pequeno|medio|grande    to_status
profiles                      sex                              note
────────                      age_months                       changed_by (FK → profiles, set null)
id (PK, FK → auth.users)      temperament  docil|brincalhao|    changed_at
name                                       timido|agitado|bravo
email (espelho, UNIQUE,       description, health_notes
      null p/ convidado)      status   denunciado|resgatado|
phone                                  em_tratamento|disponivel|adotado
role  morador|admin           photo_uri  (URL do Storage)
deleted_at (exclusão lógica)  latitude, longitude  (GPS do celular na denúncia)
created_at, updated_at        created_by (FK → profiles, set null)
                              created_at, updated_at

vaquinhas
─────────
id (PK), title, description
goal_cents, raised_cents      (inteiro, em centavos)
pix_key                       (nullable — chave PIX da ONG)
animal_id                     (FK → animals, set null; null = campanha geral)
active
created_by (FK → profiles, set null)
created_at, updated_at
```

Senha e e-mail são do `auth.users`; `profiles.email` é espelho mantido por trigger e não pode ser alterado por update no perfil. `created_by` e `changed_by` são `ON DELETE SET NULL`: o registro do resgate sobrevive à exclusão da conta de quem o criou. Excluir um usuário pelo app é **exclusão lógica** (`deleted_at`, via RPC `soft_delete_user`): a conta some do app, mas a autoria dos registros permanece. `raised_cents` é digitado pela ONG — nenhum pagamento é confirmado pelo app.

As migrações ficam em `supabase/migrations/`. Para mudar o esquema, **adicione** um arquivo novo, sem editar os já aplicados. Ver [supabase/README.md](supabase/README.md).

## Perfis e permissões

Dois perfis — **morador** e **admin** — mais um modo sem conta, o **convidado** (sessão anônima do Supabase, que registra denúncia e acompanha só as próprias). Cada linha vale em dois lugares: no app (`domain/rules/permissions.ts`, que esconde o botão) e no Postgres (policies de RLS, que recusam a operação). As duas precisam andar juntas.

| Ação                                | Convidado                 | Morador | Admin |
| ------------------------------------ | -------------------------- | ------- | ----- |
| Registrar animal (denúncia)          | ✅                          | ✅      | ✅    |
| Ver mapa, catálogo e detalhes        | só as próprias denúncias   | ✅      | ✅    |
| Definir status inicial no cadastro   | —                           | —       | ✅    |
| Alterar status do animal             | —                           | —       | ✅    |
| Editar animal                        | —                           | —       | ✅    |
| Excluir animal (exceto adotados)     | —                           | —       | ✅    |
| Ver vaquinhas                        | —                           | ✅      | ✅    |
| Criar, editar e excluir vaquinha     | —                           | —       | ✅    |
| Listar e gerenciar usuários          | —                           | —       | ✅    |

## Entregas

**Sprint 1**

- [x] Arquitetura em camadas, com migrações versionadas
- [x] Cadastro e login, com sessão persistente
- [x] CRUD de animais com foto (câmera ou galeria), filtros e busca
- [x] CRUD de usuários (admin), edição de perfil e troca de senha
- [x] Timeline de status registrada no banco
- [x] Testes de regras de domínio e serviços

**Migração para o Supabase**

- [x] Esquema, RLS, triggers e Storage no Postgres
- [x] Autenticação pelo Supabase Auth — nenhuma senha processada pelo app
- [x] Dados compartilhados entre aparelhos: a denúncia chega ao admin
- [x] Máquina de estados do resgate validada também no servidor
- [ ] Denúncia offline — hoje o app é **online-only** (ver PRODUCT.md)

**Sprint 2 (concluída)**

- [x] Perfis reduzidos a dois (morador, admin) — o que era do voluntário passou ao admin
- [x] Modo convidado: sessão anônima que denuncia e acompanha só as próprias, sem cadastro
- [x] GPS na denúncia e mapa das ocorrências (tela inicial), com marcador colorido por status
- [x] Tela de alteração de status do animal, aplicando `canTransition` também no cliente
- [x] Vaquinhas: campanhas informativas (meta, chave PIX, progresso) para a ONG ou para um animal específico
- [x] Exclusão lógica de usuário (`deleted_at` + RPC `soft_delete_user`), sem depender da service_role key

## Próximas sprints

- **Sprint 3**: formulário de adoção
- **Final**: polimento de UI/UX, testes de usabilidade e prestação de contas
