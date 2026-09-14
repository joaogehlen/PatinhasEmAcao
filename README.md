# Patinhas em Ação 🐾

Aplicativo mobile para a ONG Patinhas em Ação (Arvorezinha/RS): denúncias de animais em risco, acompanhamento do resgate, adoção e doações.

Trabalho acadêmico — Univates. Integrantes: Arthur Predebon Rostirolla, João Alberto Gehlen e Pedro Oliveira Fonseca.

## Como rodar

```bash
npm install
npm start          # abre o Expo; escaneie o QR code com o app Expo Go
npm test           # testes de domínio e serviços
npm run typecheck  # checagem de tipos
```

Na primeira execução o banco é criado e populado com dados de exemplo. Contas de demonstração (também listadas na tela de login):

| Perfil        | E-mail                    | Senha           |
| ------------- | ------------------------- | --------------- |
| Administrador | admin@patinhas.org        | admin123        |
| Voluntário    | voluntario@patinhas.org   | voluntario123   |
| Morador       | morador@patinhas.org      | morador123      |

## Stack

- **Expo SDK 57** + React Native + TypeScript (strict)
- **Expo Router** — navegação por arquivos, com rotas protegidas por login e perfil
- **expo-sqlite** — banco local com migrações versionadas
- **zod** — validação de dados na camada de aplicação
- **expo-image-picker / expo-file-system** — câmera, galeria e armazenamento das fotos
- **expo-secure-store / expo-crypto** — sessão e hash de senha
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
│   └── ports.ts         Interfaces de hash de senha, sessão, ids, relógio
├── infrastructure/      Implementações concretas
│   ├── database/        Migrações SQLite e seed
│   ├── repositories/    SqliteUserRepository, SqliteAnimalRepository
│   ├── adapters.ts      Hash (expo-crypto), sessão (secure-store), UUID
│   ├── photoStorage.ts  Cópia das fotos para armazenamento permanente
│   └── container.ts     Composition root: monta os serviços
├── presentation/        UI reutilizável
│   ├── components/      Botões, campos, formulários de animal e usuário
│   ├── providers/       Contexto de serviços e de autenticação
│   ├── hooks/           Carregamento de dados ao focar a tela
│   └── theme.ts
├── app/                 Telas (rotas do Expo Router)
└── __tests__/           Testes com repositórios em memória
```

**Por que assim?**

- **Trocar SQLite por Firebase** exige só novos repositórios que implementem `UserRepository` e `AnimalRepository`, registrados em `infrastructure/container.ts`. Serviços e telas não mudam.
- **Regras em um só lugar**: permissões (`domain/rules/permissions.ts`) valem tanto para esconder botões quanto para bloquear a operação no serviço.
- **Testável**: os serviços recebem as dependências por construtor, então os testes rodam em memória sem emulador.

## Modelo de dados (Sprint 1)

```
users                         animals                          animal_status_history
─────                         ───────                          ─────────────────────
id (PK)                       id (PK)                          id (PK)
name                          name                             animal_id (FK → animals, cascade)
email (UNIQUE)                species  cachorro|gato|outro     from_status
phone                         size     pequeno|medio|grande    to_status
role  morador|voluntario|     sex                              note
      admin                   age_months                       changed_by (FK → users)
password_hash                 temperament                      changed_at
password_salt                 description, health_notes
created_at, updated_at        status   denunciado|resgatado|
                                       em_tratamento|disponivel|adotado
                              photo_uri
                              latitude, longitude  (usados na Sprint 2)
                              created_by (FK → users)
                              created_at, updated_at
```

As migrações ficam em `src/infrastructure/database/migrations.ts` e são aplicadas pelo `PRAGMA user_version`. Para mudar o esquema, **adicione** uma nova migração ao final da lista, sem editar as anteriores.

## Perfis e permissões

| Ação                                  | Morador               | Voluntário | Admin |
| ------------------------------------- | --------------------- | ---------- | ----- |
| Ver catálogo e detalhes               | ✅                    | ✅         | ✅    |
| Registrar animal (denúncia)           | ✅                    | ✅         | ✅    |
| Definir status inicial no cadastro    | —                     | ✅         | ✅    |
| Editar animal                         | só a própria denúncia, antes do resgate | ✅ | ✅ |
| Excluir animal (exceto adotados)      | —                     | —          | ✅    |
| Listar e gerenciar usuários           | —                     | —          | ✅    |

## Entregas da Sprint 1

- [x] Arquitetura em camadas e banco de dados local com migrações
- [x] Cadastro e login, com sessão persistente
- [x] CRUD de animais com foto (câmera ou galeria), filtros e busca
- [x] CRUD de usuários (admin), edição de perfil e troca de senha
- [x] Timeline de status já registrada no banco (base para a Sprint 2)
- [x] Testes de regras de domínio e serviços

## Próximas sprints

- **Sprint 2**: GPS na denúncia, mapa das ocorrências e fluxo de alteração de status (a regra `canTransition` já está pronta e testada)
- **Sprint 3**: formulário de adoção e lista de doações com chave PIX
- **Final**: polimento de UI/UX, testes de usabilidade e prestação de contas
