---
version: 1
slug: "src-app-sign-in-tsx"
primary_target: "src/app/sign-in.tsx"
related_targets: ["src/presentation/theme.ts","src/presentation/components/ui.tsx"]
---

## Direction contract

THESIS: Uma tela, uma tarefa. Marca, dois campos, uma ação, com respiro suficiente para que nada compita. Recusa o arranjo que a versão anterior tinha e que o usuário rejeitou por escrito: bloco de cor chapado com título em cima, rótulo em caixa alta, linha regrada, botão retangular sólido — estética de software de desktop antigo.

OWN-WORLD: Escuro e quente. Fundo de café #16100E, nunca preto puro. Elevação por claridade de superfície: #201815 para cartão, #2B211C para campo, fio de borda #382C26. Laranja #FF7A45 em área cheia na ação primária, no foco e no link, com tinta escura #1A0E08 por cima; bege #E8D5BE como contrapeso. Archivo em caixa mista, display 34px com tracking negativo. Raios generosos. Proibido neste mundo: halo colorido de deslocamento zero, texto em gradiente, vidro como enfeite, caixa alta em rótulo e botão.

STORY: Quem chega vê um app cuidado e contemporâneo, entende em um olhar que é da ONG de Arvorezinha, e entra. Sem explicação, sem boas-vindas, sem conta de demonstração à vista.

FIRST VIEWPORT: Campo escuro cheio. Bloco centrado verticalmente: o Caramelo (120pt), "Que bom te ver." em display 34, dois campos de 56dp com ícone, o botão laranja, e "Continuar como convidado". O rodapé com "Ainda não tem conta? Criar conta" ancora a base. Nada mais na tela.

FORM: Escuro e premium, fixado pelo usuário em 14/09/2026 após rejeitar a execução da direção anterior (Caderneta de Vacinação, candidato 1; sorteio assinou Bloco de Ocorrência, índice 6). Seed 33955910, agora superado por decisão do usuário. Risco assumido: "escuro com um acento vivo" é um dos agrupamentos padrão de execução automática, e a versão preguiçosa é neon sobre preto com brilho. A defesa é estrutural — profundidade vem de claridade de superfície, e o acento é usado três vezes na tela inteira.

Interação assinatura: o Caramelo (src/presentation/components/Caramelo.tsx), escolhido no protótipo de 09/11/2026 entre Mascote, Carimbo e Folha. Abertura de ~1s (salta com mola, orelhas caem balançando, cabeça inclina, pisca); olhos seguem o e-mail, fecham na senha, espiam com a senha visível; balança carregando; murcha e treme no erro; a cor dele cobre a tela ao entrar. Só transform e opacity, e "reduzir movimento" vai direto ao estado final. O botão continua afundando ao toque (escala 0.975).

PENDENTE: as demais telas seguem o mundo escuro, mas sem revisão de finalização nem DESIGN.md; o refino (cabeçalhos, listas em linha, estados) está planejado a partir da auditoria de 09/11/2026.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
