# Patinhas em Ação

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
│   ├── vaquinhas/       Página da campanha (`[id]`), criação e edição (admin)
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

vaquinhas                                       vaquinha_entradas
─────────                                       ─────────────────
id (PK), title, description (resumo)            id (PK)
details (texto longo), cover_uri                vaquinha_id (FK → vaquinhas, cascade)
photo_uris (até 10 URLs do Storage)             amount_cents  (> 0)
goal_cents                                      note
raised_cents  (soma das entradas, por trigger)  created_by (FK → profiles, set null)
pix_key       (nullable — chave PIX da ONG)     created_at
animal_id     (FK → animals, set null; null = campanha geral)
active
created_by (FK → profiles, set null)
created_at, updated_at
```

Senha e e-mail são do `auth.users`; `profiles.email` é espelho mantido por trigger e não pode ser alterado por update no perfil. `created_by` e `changed_by` são `ON DELETE SET NULL`: o registro do resgate sobrevive à exclusão da conta de quem o criou. Excluir um usuário pelo app é **exclusão lógica** (`deleted_at`, via RPC `soft_delete_user`): a conta some do app, mas a autoria dos registros permanece. O arrecadado de uma vaquinha é a soma dos lançamentos (`vaquinha_entradas`) que a ONG faz — o trigger `vaquinha_sync_raised` recalcula `raised_cents` em todo insert/update, então nenhum cliente consegue gravar um total. Nenhum pagamento é confirmado pelo app. A observação de uma mudança de status vai em `animals.status_note`, um campo de passagem que o trigger copia para o histórico e zera.

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
| Ver vaquinhas abertas e lançamentos  | —                           | ✅      | ✅    |
| Criar, editar, encerrar e excluir vaquinha | —                     | —       | ✅    |
| Lançar e remover valor arrecadado    | —                           | —       | ✅    |
| Listar e gerenciar usuários          | —                           | —       | ✅    |

## Entregas

O backlog completo, com requisitos (RF) e estimativas, está no documento de entrega. Os códigos PBxx abaixo são os mesmos de lá. O texto pronto para o documento da Sprint 2 e o planejamento da Sprint 3 ficam em [docs/ENTREGA-SPRINT-2-3.md](docs/ENTREGA-SPRINT-2-3.md).

### Sprint 1 — Base e Cadastro (03/08 a 14/09/2026) ✅

Protótipo funcional, arquitetura, banco e o cadastro completo de animais e usuários.

| PB | Entrega | RF |
| --- | --- | --- |
| PB01–PB03 | Requisitos, casos de uso, modelagem; arquitetura em camadas (domínio, aplicação, infraestrutura, apresentação); banco com migrações e dados de demonstração | — |
| PB04 | Cadastro (sempre como morador) e login com sessão persistente | RF0001, RF0002 |
| PB05 | Gestão de usuários pelo admin (listar, buscar, filtrar, criar, editar, definir perfil); edição do próprio perfil e troca de senha com a senha atual | RF0003, RF0004 |
| PB06 | Registro de animal com foto (câmera ou galeria), espécie, porte, sexo, idade, temperamento ("Bravo" sinaliza cuidado), descrição e saúde | RF0005 |
| PB07 | Catálogo com busca por nome/descrição, filtro de situação sempre visível com contagem, espécie e porte em painel recolhível | RF0006 |
| PB08 | Edição e exclusão pelo admin (adotados não são excluídos); histórico de situações com linha do tempo e jornada na tela do animal | RF0007, RF0008 |
| PB09 | Protótipo e identidade visual escura (laranja e bege sobre café, Archivo + Chivo Mono) | — |
| PB10 | Testes automatizados de domínio e serviços com repositórios em memória | — |
| PB11 | Documentação da Entrega 1 | — |

### Sprint 2 — Localização e Status ✅

Mapas e GPS, fluxo de status do resgate, migração para o Supabase, modo convidado, denúncia sem conexão e campanhas de arrecadação.

| PB | Entrega | RF |
| --- | --- | --- |
| PB12 | GPS capturado ao abrir o formulário de denúncia, atualizável com um toque; denúncia aceita sem coordenada, com aviso de que não aparecerá no mapa | RF0009 |
| PB13 | Mapa como tela inicial: localização do usuário, marcador por animal na cor da situação, cartão com foto e nome. Google Maps no Android, Apple Maps no iOS | RF0010 |
| PB14 | Alteração da situação pelo admin, oferecendo só as transições válidas, com **observação opcional** gravada no histórico. A transição é validada também por trigger no banco, que grava o histórico | RF0011 |
| PB17 | Persistência no Supabase: Postgres com RLS, Auth e Storage para as fotos; dados compartilhados entre aparelhos | RNF0002, RNF0010 |
| PB25 | **Denúncia sem conexão**: sem internet, a denúncia (com foto e GPS) fica numa fila no aparelho e é enviada sozinha quando a conexão volta — ao reconectar, ao reabrir o app ou por tarefa em segundo plano. Aparece como "Pendente" no mapa, no catálogo e no detalhe. O id é gerado no aparelho, então reenviar nunca duplica | RF0018 |
| PB30 | Modo convidado: sessão anônima que denuncia e acompanha só as próprias denúncias; cadastro posterior preserva as denúncias (mesmo id) | UC15 |
| PB16 | Vaquinhas completas: capa, resumo, texto de detalhes, galeria de até 10 fotos, vínculo opcional com um animal, meta e chave PIX copiável. O admin **lança os valores recebidos** (valor, observação, data) e cada lançamento move a barra de progresso; o total é a soma dos lançamentos, calculada pelo banco. Encerrar e reabrir campanha; lançamento errado é removido e lançado de novo. Vaquinhas abertas aparecem na página do animal | RF0014, UC08, UC16 |
| PB31 | Exclusão lógica de usuário (`deleted_at`, RPC `soft_delete_user`), preservando a autoria dos registros; a Edge Function `admin-users` ficou só com a criação de contas | RF0003 |
| PB22 | Interface na identidade escura, revisada em auditoria de acessibilidade (alvos de toque de 44pt, contraste, leitor de tela) | — |

Ficou fora: **PB28 – Fila de casos abertos** (RF0021), remanejado para a sprint final. Entrou antecipado: **PB25 – Denúncia sem conexão**, previsto para a Sprint 3.

### Sprint 3 — Interação e Social (planejada)

| PB | Entrega prevista | RF | Estimativa |
| --- | --- | --- | --- |
| PB24 | **Mural de notícias da ONG** — ver detalhes abaixo | RF0017 | 12 h |
| PB15 | Formulário digital de adoção com acompanhamento da solicitação | RF0013 | 12 h |
| PB23 | Foto de perfil, exibida também no histórico do animal | RF0016 | 6 h |
| PB18 | Central de avisos dentro do app (push fica para quando houver build própria) | RF0012 | 12 h |
| | | **Total** | **42 h** |

**Mural de notícias (PB24).** Posts curtos da ONG — resgate concluído, campanha nova, mutirão — com título, texto, capa, até 6 fotos e vínculo opcional com um animal ou uma vaquinha, que aparece como cartão clicável. Só o admin publica, edita, exclui e fixa um post no topo; morador e admin leem; o convidado não vê (RF0017: "usuários com conta"). O Mural vira uma aba, e a gestão de usuários do admin passa para dentro do Perfil, mantendo cinco abas.

**Formulário de adoção (PB15).** Disponível só para animais "Disponível para adoção". Perguntas sobre moradia, pátio, outros animais, crianças, experiência e motivo. A solicitação segue *Enviada → Em análise → Aprovada / Recusada*; o morador acompanha em "Minhas solicitações" e o admin avalia numa fila. Um pedido aberto por pessoa e animal. Aprovar não marca o animal como adotado: isso continua no fluxo de status, que deixa rastro no histórico.

**Central de avisos (PB18).** Denúncia nova avisa a equipe da ONG; mudança de situação avisa quem denunciou. Fica dentro do app, com contador, porque o Expo Go não entrega push. Push real exige *development build* (EAS) e fica para quando o app deixar de depender do Expo Go.

**Fora do escopo:** PB26 – Lares temporários (RF0019) foi retirado do projeto por decisão da equipe.

### Sprint final — Refinamento e QA

- PB19 / PB29 — Prestação de contas visual e periódica (RF0015, RF0022, RF0023)
- PB20 — Polimento de UI/UX e testes de usabilidade com a ONG
- PB27 — Acompanhamento pós-adoção (RF0020)
- PB28 — Fila de casos abertos (RF0021), vindo da Sprint 2
- PB21 — Documentação final e apresentação
