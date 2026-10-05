# Entrega 2 — textos para o documento de software

Conteúdo pronto para colar no documento da entrega (.docx). Cada seção indica onde entra no documento da Entrega 1. Onde houver **[preencher]**, a informação é da equipe (responsáveis, datas, horas reais) e não foi inventada.

---

## Capa

> Entrega 2 – Sprint 2: Localização e Status
> Univates – Lajeado/RS · [preencher mês] de 2026

---

## Seção 2 — Requisitos Funcionais (ajustes de texto, versão 1.1)

**RF0011 – Alteração da situação do resgate.** Acrescentar ao final:

> Ao alterar a situação, o administrador pode informar uma observação, que é gravada no histórico junto com a mudança.

**RF0014 – Necessidades e doações.** Substituir o texto por:

> O sistema deve exibir as campanhas de arrecadação abertas com capa, título, resumo, meta, valor já arrecadado e barra de progresso. Cada campanha tem uma página com texto de detalhes, galeria de fotos, vínculo opcional com um animal, chave PIX copiável com um toque e o histórico de arrecadação. O administrador cria, edita, encerra, reabre e exclui campanhas, e registra cada valor recebido como um lançamento (valor, observação e data); o valor arrecadado é a soma dos lançamentos. Lançamento errado é removido e lançado de novo. Campanha encerrada não recebe nem perde lançamentos. Os valores são informados pela ONG: o aplicativo não recebe nem confirma pagamentos.

Coluna **Versão** desses dois requisitos: 1.1.

**RNF0002 – Persistência dos dados.** Substituir a última frase ("Como consequência, o aplicativo exigirá conexão com a internet para operar.") por:

> A denúncia é a exceção: sem conexão, ela é guardada no aparelho e enviada quando a internet voltar (RF0018). As demais funções exigem conexão.

**RF0019 – Cadastro e ocupação de lares temporários.** Retirado do escopo por decisão da equipe. Manter no documento com a observação "Fora do escopo" ou remover a linha e o PB26 do backlog.

---

## Seção 5 — Modelo do Banco de Dados (acréscimos)

O modelo passa a ter cinco tabelas na aplicação: perfis, animais, histórico de situações, vaquinhas e **lançamentos de vaquinha**. Atualizar a Figura 2 com a nova tabela ligada a `vaquinhas` (1:N).

**Tabela `animals` — campo novo**

| Campo | Tipo | Restrições | Descrição |
| --- | --- | --- | --- |
| status_note | text | — | Campo de passagem: observação enviada junto com a nova situação. O gatilho a copia para o histórico e a apaga em seguida. |

**Tabela `vaquinhas` — campos novos e alterados**

| Campo | Tipo | Restrições | Descrição |
| --- | --- | --- | --- |
| details | text | até 5000 caracteres | Texto longo da página da campanha. |
| cover_uri | text | — | URL pública da capa no Storage. |
| photo_uris | text[] | NOT NULL, até 10 itens | Galeria de fotos da campanha. |
| raised_cents | bigint | NOT NULL, ≥ 0 | Valor arrecadado em centavos. **Calculado pelo banco** como soma dos lançamentos; o aplicativo não grava este campo. |

**Tabela `vaquinha_entradas` — lançamentos de arrecadação (nova)**

| Campo | Tipo | Restrições | Descrição |
| --- | --- | --- | --- |
| id | uuid | PK | Identificador único (UUID). |
| vaquinha_id | uuid | NOT NULL, FK → vaquinhas (cascade), índice | Campanha do lançamento. |
| amount_cents | integer | NOT NULL, CHECK > 0 | Valor recebido, em centavos. |
| note | text | até 200 caracteres | Observação (ex.: "Bazar de sábado"). |
| created_by | uuid | FK → profiles (ON DELETE SET NULL) | Administrador que lançou. |
| created_at | timestamptz | NOT NULL | Data do lançamento, gravada pelo servidor. |

Texto para o parágrafo de regras no servidor, acrescentar:

> O valor arrecadado de cada vaquinha é recalculado por gatilho a cada lançamento incluído ou removido, e a cada gravação da campanha — nenhum cliente consegue gravar um total diferente da soma. Os lançamentos são visíveis a quem vê a campanha; só administradores incluem ou removem, e não há alteração de lançamento (corrige-se removendo e lançando de novo). A observação de mudança de situação chega ao histórico pelo mesmo gatilho que já registrava a mudança.

---

## Seção 6 — Tecnologias (acréscimos)

| Camada | Tecnologia | Versão | Finalidade |
| --- | --- | --- | --- |
| Recursos nativos | expo-network | 57 | Saber se há internet e reagir quando a conexão volta. |
| Recursos nativos | expo-background-task, expo-task-manager | 57 | Enviar denúncias pendentes em segundo plano, com o app fechado. |

A Edge Function `admin-users` passou a fazer **apenas a criação de contas**; a exclusão é lógica e mora na função `soft_delete_user` do banco.

---

## Seção 10 — Sprint 2

**Foco:** Localização e Status. **Período:** [preencher] a [preencher].
**Objetivo:** integrar mapas e GPS, implementar o fluxo de alteração da situação do resgate, migrar a persistência para o Supabase e liberar o modo convidado e as campanhas de arrecadação.

**Planejamento e execução**

| Funcionalidade (Backlog) | Responsável | Início | Término | Duração | Situação |
| --- | --- | --- | --- | --- | --- |
| PB12 – Geolocalização na denúncia | [preencher] | | | 10 h | Concluído |
| PB13 – Mapa de ocorrências | [preencher] | | | 14 h | Concluído |
| PB14 – Alteração da situação do resgate | [preencher] | | | 10 h | Concluído |
| PB17 – Migração para o Supabase | [preencher] | | | 16 h | Concluído |
| PB25 – Denúncia sem conexão | [preencher] | | | 20 h | Concluído (antecipado da Sprint 3) |
| PB30 – Modo convidado | [preencher] | | | 10 h | Concluído |
| PB16 – Vaquinhas com meta e chave PIX | [preencher] | | | 10 h | Concluído (escopo ampliado) |
| PB31 – Exclusão lógica e Edge Function | [preencher] | | | 8 h | Concluído |
| PB22 – Melhorias na interface e identidade escura | [preencher] | | | 14 h | Concluído |
| **Total** | | | | **112 h** | |

Durações são as estimativas do backlog; substituir pelas horas reais se a equipe as registrou.

**Entregas da sprint**

- **Geolocalização (PB12):** o GPS é capturado assim que o formulário de denúncia abre e pode ser atualizado com um toque. A denúncia é aceita sem coordenada, com aviso de que o animal não aparecerá no mapa.
- **Mapa (PB13):** é a tela inicial. Mostra a localização do usuário e um marcador por animal na cor da sua situação; ao toque, um cartão com foto e nome leva ao detalhe. Google Maps no Android e Apple Maps no iOS, sem chave em desenvolvimento.
- **Situação do resgate (PB14):** o administrador avança a situação oferecendo só as transições válidas, com observação opcional. A regra é verificada no aplicativo e de novo por gatilho no banco, que grava o histórico.
- **Supabase (PB17):** PostgreSQL com Row Level Security espelhando a matriz de permissões, Supabase Auth (nenhuma senha passa pelo aplicativo) e Storage para as fotos. Seis migrações versionadas.
- **Denúncia sem conexão (PB25):** sem internet, a denúncia — com foto e coordenada — fica numa fila no aparelho e aparece como "Pendente" no mapa, no catálogo e no detalhe. É enviada sozinha quando a conexão volta, ao reabrir o aplicativo ou por uma tarefa em segundo plano. O identificador é gerado no aparelho, então um reenvio nunca cria registro duplicado.
- **Modo convidado (PB30):** sessão anônima que registra denúncias e acompanha só as próprias. Ao criar conta, a mesma identidade é mantida e as denúncias continuam com a pessoa.
- **Vaquinhas (PB16):** escopo ampliado a pedido da equipe — capa, texto de detalhes, galeria de até 10 fotos, vínculo com um animal e lançamentos de arrecadação que movem a barra de progresso (ver RF0014 e o modelo de dados).
- **Exclusão lógica (PB31):** o administrador exclui usuários sem apagar a conta: o perfil some e perde acesso, mas a autoria dos registros permanece. Não é possível excluir a si mesmo nem o último administrador.
- **Interface (PB22):** identidade escura aplicada a todas as telas e revisada em auditoria de acessibilidade: alvos de toque de 44 pt, contraste mínimo de 4,5:1 e rótulos para leitor de tela.

**Testes e verificação**

- 40 testes automatizados (eram 26 na Sprint 1), incluindo a fila de denúncias sem conexão, mudança de situação com observação, permissões das vaquinhas, soma e remoção de lançamentos, campanha encerrada e leitura de valores em reais.
- Migrações e regras de acesso verificadas em PostgreSQL: perfis admin, morador e convidado; soma dos lançamentos; tentativa de gravar o total direto; transições inválidas.

**Mudanças de escopo:**

- PB28 – Fila de casos abertos (RF0021) constava no backlog como Sprint 2, mas não entrou no planejamento; foi remanejado para a Sprint final.
- PB25 – Denúncia sem conexão (RF0018), previsto para a Sprint 3, foi antecipado e entregue nesta sprint.
- PB26 – Lares temporários (RF0019) foi retirado do escopo do projeto.

---

## Seção 11 — Sprint 3

**Foco:** Interação e Social. **Período:** a definir.
**Objetivo:** concluir o formulário digital de adoção e os itens de relacionamento com a comunidade — mural de notícias, avisos e foto de perfil.

| Funcionalidade (Backlog) | Responsável | Início | Término | Duração |
| --- | --- | --- | --- | --- |
| PB24 – Mural de notícias da ONG | A definir | — | — | 12 h |
| PB15 – Formulário de adoção | A definir | — | — | 12 h |
| PB23 – Foto de perfil do usuário | A definir | — | — | 6 h |
| PB18 – Central de avisos | A definir | — | — | 12 h |
| **Total** | | | | **42 h** |

**Detalhamento**

- **PB24 – Mural de notícias (RF0017).** Posts curtos da ONG — resgates concluídos, campanhas, mutirões — com título, texto, capa, até seis fotos e vínculo opcional com um animal ou uma vaquinha. O administrador publica, edita, exclui e fixa uma notícia no topo; quem tem conta lê. O mural vira uma aba do aplicativo, e a gestão de usuários passa para dentro do perfil do administrador. Tabela nova `noticias`, com regras de acesso no banco.
- **PB15 – Formulário de adoção (RF0013).** Para animais disponíveis, o morador informa moradia, pátio, outros animais, crianças, experiência e motivo. A solicitação segue Enviada → Em análise → Aprovada / Recusada, acompanhada pelo morador e avaliada pelo administrador. Um pedido aberto por pessoa e animal; a adoção em si continua registrada pelo fluxo de situação.
- **PB23 – Foto de perfil (RF0016).** Foto no cadastro, exibida ao lado das ações da pessoa no histórico dos animais.
- **PB18 – Avisos (RF0012).** Central de avisos dentro do aplicativo: denúncia nova avisa a equipe da ONG e mudança de situação avisa o denunciante. Notificações push exigem build própria do aplicativo (o Expo Go não as entrega) e ficam para quando o projeto deixar de depender do Expo Go.

---

## Seção 12 — Sprint final (acréscimo)

Incluir na tabela: **PB28 – Fila de casos abertos (RF0021)**, A definir, 10 h — remanejado da Sprint 2.
