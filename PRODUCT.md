# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

**Morador de Arvorezinha/RS** — adulto acostumado com apps (usa WhatsApp e Instagram sem dificuldade). Abre o app na rua, no celular, ao se deparar com um animal abandonado ou ferido. Está com pressa, muitas vezes com uma mão só, e quer registrar a situação e seguir em frente. Também é quem procura um animal para adotar.

**Voluntário da ONG** — atende as denúncias, faz o resgate e acompanha o tratamento. Atualiza o estado do animal ao longo da jornada e mantém o catálogo de adoção verdadeiro.

**Administrador da ONG** — gerencia o catálogo, os usuários da equipe e as doações. É o único que remove registros e altera perfis.

## Product Purpose

Conectar a comunidade de Arvorezinha/RS à ONG Patinhas em Ação, de modo que um animal visto na rua vire uma denúncia rastreável, a denúncia vire um resgate acompanhado, e o resgate termine em adoção. Sucesso é o ciclo completo registrado e visível: menos animais em risco na cidade, e um histórico que a ONG possa mostrar a doadores e à comunidade.

## Positioning

O app acompanha o animal individual do primeiro avistamento até a adoção, em uma linha do tempo única e auditável (`denunciado → resgatado → em tratamento → disponível → adotado`). Um grupo de WhatsApp recebe denúncias e as perde no scroll; um catálogo de adoção mostra só o fim da história. Aqui denúncia, resgate e adoção são o mesmo registro ao longo do tempo, com autoria e data em cada mudança.

## Operating Context

- **A denúncia acontece na rua**, no momento do avistamento: foto tirada na hora, descrição curta, localização do ponto. Conexão pode estar ruim ou ausente.
- **O trabalho da ONG acontece depois**, em outro lugar e outro dispositivo: o voluntário lê a denúncia, vai ao local, resgata e volta para atualizar o estado.
- **A adoção é navegação de catálogo**, sem urgência: o visitante folheia, compara e se interessa.
- Esses três momentos usam o mesmo app, mas não têm a mesma pressa nem o mesmo estado emocional.

**Contexto acadêmico:** trabalho da Univates, entregue em sprints (Arthur Predebon Rostirolla, João Alberto Gehlen, Pedro Oliveira Fonseca). Será avaliado por banca, mas a meta declarada é uso real pela ONG — decisões de design atendem ao uso real, não à demonstração.

## Capabilities and Constraints

**Já existe (Sprint 1):** cadastro e login com sessão persistente; três perfis com permissões distintas; CRUD de animais com foto de câmera ou galeria; catálogo com busca e filtros por espécie, porte e status; CRUD de usuários para admin; edição de perfil e troca de senha; timeline de status gravada no banco.

**Planejado:** GPS e mapa das ocorrências, e o fluxo de alteração de status (Sprint 2); formulário de adoção e doações via PIX (Sprint 3).

**Restrições técnicas:**
- Expo SDK 57 / React Native, distribuído via Expo Go — sem código nativo customizado.
- Dados 100% locais em SQLite no dispositivo. Não há backend, sincronização entre aparelhos, nem notificações push. A arquitetura foi desenhada para trocar o repositório por um backend depois, mas isso não está no escopo atual.
- Autenticação local com hash SHA-256 salgado; protótipo, não produção.
- Aparelho-alvo é um celular modesto — desempenho e peso de imagem importam.
- Idioma único: português do Brasil.

**Vocabulário do produto:** *denúncia* (o registro feito pelo morador), *resgate*, *jornada*/*timeline* (a sequência de status), *morador* / *voluntário* / *administrador* (os três perfis).

**Explicitamente indefinido:** se moradores poderão acompanhar o desfecho da própria denúncia; se haverá notificação quando um animal muda de status; como a candidatura à adoção será avaliada pela ONG.

## Brand Commitments

A ONG Patinhas em Ação é real e atua em Arvorezinha/RS. O nome é fato e não muda.

Ela **não possui identidade visual definida** — não há logo, paleta ou tipografia oficiais. O laranja/turquesa com Nunito hoje no código é escolha da equipe, não compromisso de marca, e está livre para ser substituído. Propor essa identidade faz parte do trabalho.

## Evidence on Hand

**Nenhum material real da ONG está disponível no momento.** Tudo que está no app é placeholder e precisa ser tratado como tal:

- As fotos dos animais no seed vêm do Unsplash (`src/infrastructure/database/seed.ts`) — não são animais atendidos pela ONG.
- As contas de demonstração (`admin@patinhas.org`, etc.) e seus dados são fictícias.
- Não há chave PIX, dados bancários, telefone, endereço ou redes sociais reais.
- Não há contato estabelecido com a ONG para validar o fluxo de resgate ou obter materiais.

Não inventar depoimentos, números de animais resgatados, parcerias, prestação de contas ou qualquer prova social. Onde a prova é necessária e não existe, deixar o espaço explicitamente vazio e sinalizado, não preenchido com ficção.

## Product Principles

1. **A denúncia é o momento crítico.** Ela acontece na rua, com pressa e com uma mão. Todo atrito nela custa um animal não reportado — ela tem prioridade sobre qualquer outra tela do app.
2. **Cada animal é um indivíduo, não uma linha de lista.** O registro carrega nome, jeito e história. A interface deve fazer o usuário ver um bicho, não um item de inventário.
3. **O estado do animal é sempre visível e sempre verdadeiro.** A jornada é o coração do produto; nunca mostrar como disponível quem não está, nem esconder onde o animal se encontra agora.
4. **Perfil define o que se vê, não só o que se pode clicar.** Morador, voluntário e administrador têm trabalhos diferentes; cada um vê a interface do seu trabalho, sem botões mortos nem funções que não lhe pertencem.
5. **Não fabricar credibilidade.** Sem materiais reais da ONG, o app não simula prova social. Honestidade sobre o que ainda não existe é parte da confiança.

## Accessibility & Inclusion

Nenhum padrão formal (WCAG ou equivalente) foi estabelecido como requisito. Necessidades confirmadas pelo contexto de uso:

- **Uso ao ar livre, com uma mão.** Alvos de toque generosos e alcançáveis com o polegar; contraste que sobreviva à luz do sol.
- **Aparelho modesto.** A interface não pode depender de animação pesada ou de imagens grandes para ser legível.
- **Português do Brasil apenas.** Sem i18n no escopo.
