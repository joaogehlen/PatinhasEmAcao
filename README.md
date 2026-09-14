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

Contas de demonstração (também listadas na tela de login):

| Perfil        | E-mail                    | Senha           |
| ------------- | ------------------------- | --------------- |
| Administrador | admin@patinhas.org        | admin123        |
| Voluntário    | voluntario@patinhas.org   | voluntario123   |
| Morador       | morador@patinhas.org      | morador123      |

## Stack

- **Expo SDK 57** + React Native + TypeScript (strict)
- **Expo Router** — navegação por arquivos, com rotas protegidas por login e perfil
- **Supabase** — Postgres com RLS, Auth e Storage. Migrações versionadas em `supabase/migrations/`
- **zod** — validação de dados na camada de aplicação
- **expo-image-picker / expo-file-system** — câmera, galeria e upload das fotos
- **expo-sqlite** — só como storage da sessão do Supabase (`expo-sqlite/localStorage`)
- **Jest (jest-expo)** — testes

## Arquitetura

Camadas inspiradas em Clean Architecture. As dependências apontam sempre para dentro: a apresentação usa a aplicação, a aplicação usa o domínio, e a infraestrutura implementa as interfaces definidas por dentro.

```
src/
├── domain/              Regras de negócio puras (sem React, sem Expo)
│   ├── entities/        User, Animal, AnimalStatusChange + enums e rótulos
│   ├── rules/           Máquina de estados do resgate, matriz de permissões
│   ├── repositories/    Interfaces (contratos) de persistência
│   └── errors.ts        ValidationError, ForbiddenError, NotFoundError...
├── application/         Casos de uso
│   ├── services/        AuthService, UserService, AnimalService
│   ├── validation/      Schemas zod e conversão para erros por campo
│   └── ports.ts         AuthProvider, ids, relógio
├── infrastructure/      Implementações concretas
│   ├── supabase/        Cliente, tipos das tabelas e mapeamento linha↔entidade
│   ├── auth/            SupabaseAuthProvider
│   ├── repositories/    SupabaseUserRepository, SupabaseAnimalRepository
│   ├── photoStorage.ts  Upload das fotos para o Storage
│   └── container.ts     Composition root: monta os serviços
├── presentation/        UI reutilizável
│   ├── components/      Botões, campos, formulários de animal e usuário
│   ├── providers/       Contexto de serviços e de autenticação
│   ├── hooks/           Carregamento de dados ao focar a tela
│   └── theme.ts
├── app/                 Telas (rotas do Expo Router)
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
  │  1:1 (trigger)            name                             animal_id (FK → animals, cascade)
  ▼                           species  cachorro|gato|outro     from_status
profiles                      size     pequeno|medio|grande    to_status
────────                      sex                              note
id (PK, FK → auth.users)      age_months                       changed_by (FK → profiles, set null)
name                          temperament                      changed_at
email (espelho, UNIQUE)       description, health_notes
phone                         status   denunciado|resgatado|
role  morador|voluntario|              em_tratamento|disponivel|adotado
      admin                   photo_uri  (URL do Storage)
created_at, updated_at        latitude, longitude  (Sprint 2)
                              created_by (FK → profiles, set null)
                              created_at, updated_at
```

Senha e e-mail são do `auth.users`; `profiles.email` é espelho mantido por trigger e não pode ser alterado por update no perfil. `created_by` e `changed_by` são `ON DELETE SET NULL`: o registro do resgate sobrevive à exclusão da conta de quem o criou.

As migrações ficam em `supabase/migrations/`. Para mudar o esquema, **adicione** um arquivo novo, sem editar os já aplicados. Ver [supabase/README.md](supabase/README.md).

## Perfis e permissões

Cada linha vale em dois lugares: no app (`domain/rules/permissions.ts`, que esconde o botão) e no Postgres (policies de RLS, que recusam a operação). As duas precisam andar juntas.

| Ação                                  | Morador               | Voluntário | Admin |
| ------------------------------------- | --------------------- | ---------- | ----- |
| Ver catálogo e detalhes               | ✅                    | ✅         | ✅    |
| Registrar animal (denúncia)           | ✅                    | ✅         | ✅    |
| Definir status inicial no cadastro    | —                     | ✅         | ✅    |
| Alterar status do animal              | —                     | ✅         | ✅    |
| Editar animal                         | só a própria denúncia, antes do resgate | ✅ | ✅ |
| Excluir animal (exceto adotados)      | —                     | —          | ✅    |
| Listar e gerenciar usuários           | —                     | —          | ✅    |

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
- [x] Dados compartilhados entre aparelhos: a denúncia do morador chega ao voluntário
- [x] Máquina de estados do resgate validada também no servidor
- [ ] Denúncia offline — hoje o app é **online-only** (ver PRODUCT.md)

## Próximas sprints

- **Sprint 2**: GPS na denúncia, mapa das ocorrências e tela de alteração de status. A regra `canTransition` já está pronta, testada e também aplicada pelo trigger `guard_animal_status_change` — que já grava a timeline sozinho.
- **Sprint 3**: formulário de adoção e lista de doações com chave PIX
- **Final**: polimento de UI/UX, testes de usabilidade e prestação de contas
