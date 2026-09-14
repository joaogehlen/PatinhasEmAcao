---
version: 1
slug: "src-app-sign-in-tsx"
primary_target: "src/app/sign-in.tsx"
related_targets: ["src/presentation/theme.ts","src/presentation/components/ui.tsx"]
---

## Direction contract

THESIS: Uma tela, uma tarefa. Marca, dois campos, uma ação, com respiro suficiente para que nada compita. Recusa o arranjo que a versão anterior tinha e que o usuário rejeitou por escrito: bloco de cor chapado com título em cima, rótulo em caixa alta, linha regrada, botão retangular sólido — estética de software de desktop antigo.

OWN-WORLD: Escuro e premium, fixado pelo usuário sobre a direção sorteada. Fundo de tinta profunda #0D1012, nunca preto puro. Elevação por claridade de superfície: #161A1D para cartão, #1E2428 para campo, fio de borda #262D31. Um acento âmbar #F5B23C, com tinta escura por cima — aparece na ação primária, no foco e no link, em nenhum outro lugar. Archivo em caixa mista, pesos 400/600, entrelinha larga, display 34px com tracking negativo. Raios generosos: 12 em campo, 18 em botão e cartão. Status em cinco cores calibradas para fundo escuro, todas acima de 4.5:1, cada uma com rótulo textual próprio para não depender de matiz. Proibido neste mundo: halo colorido de deslocamento zero, texto em gradiente, vidro como enfeite, caixa alta em rótulo e botão.

STORY: Quem chega vê um app cuidado e contemporâneo, entende em um olhar que é da ONG de Arvorezinha, e entra. Sem explicação, sem boas-vindas, sem conta de demonstração à vista.

FIRST VIEWPORT: Campo escuro cheio. O bloco central — nome em display 34, linha de localização em muted logo abaixo, 44px de respiro, dois campos de vidro de 56dp com ícone à esquerda, e o botão âmbar de 56dp — fica centrado verticalmente. O rodapé com "Ainda não tem conta? Criar conta" ancora a base. Nada mais na tela.

FORM: Escuro e premium, fixado pelo usuário em 14/09/2026 após rejeitar a execução da direção anterior (Caderneta de Vacinação, candidato 1; sorteio assinou Bloco de Ocorrência, índice 6). Seed 33955910, agora superado por decisão do usuário. Risco assumido: "escuro com um acento vivo" é um dos agrupamentos padrão de execução automática, e a versão preguiçosa é neon sobre preto com brilho. A defesa é estrutural — profundidade vem de claridade de superfície, e o acento é usado três vezes na tela inteira.

Interação assinatura: a superfície afunda ao toque. Escala 0.975 com mola contida, sem giro e sem brilho. É o único movimento autorado do app.

PENDENTE: só o login foi convertido. Catálogo, detalhe do animal, perfil, usuários e formulários continuam com composição do mundo claro anterior e renderizam contra os tokens escuros — inconsistência conhecida, não é acabamento. A revisão de finalização e o DESIGN.md só fazem sentido depois que essas telas forem convertidas.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
