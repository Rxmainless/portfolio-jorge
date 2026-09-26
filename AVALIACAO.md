# Avaliação pelos critérios da atividade

A atividade pede aprovação só com nota maior que 8. Para esta entrega o corte foi
elevado para maior que 9. Os pesos somam 10 e cada nota se apoia no que foi testado.

| # | Critério | Peso | Nota | Evidência | Desconto |
|---|---|---|---|---|---|
| 1 | Telas: Capa, Perfil, Formação, Cursos, Habilidades, Projetos, Contato | 1,3 | 1,25 | As 7 telas na ordem pedida, com conteúdo real e capturas dos projetos que têm interface | Falta currículo em PDF |
| 2 | Moodboard antes das telas: cores, tipografia, identidade e imagens, personalidade | 1,3 | 1,2 | `/moodboard`: paletas, 3 famílias tipográficas, sigilos ASCII, estandartes, render 3D ao vivo, personalidade e paisagem sonora | Sem fotografia |
| 3 | Tema Game of Thrones + ASCII goth, abertura com mapa, casas, bandeiras e símbolos | 1,3 | 1,2 | Voo de abertura sobre o continente, 6 casas com sede e lema, estandartes, sigilos, Muralha, rotas marítimas | Homenagem sem material oficial, por direitos autorais |
| 4 | Animação das torres sendo criadas | 1,7 | 1,7 | Cada tela constrói uma cidade em 9 etapas mecânicas, presa ao scroll e reversível | |
| 5 | Scroll com GSAP | 1,3 | 1,3 | ScrollTrigger com scrub na câmera e na construção, SplitText, ScrollToPlugin | |
| 6 | Qualidade técnica | 1,0 | 0,95 | Build estático com TypeScript estrito, 22 testes unitários, 12 testes no navegador (desktop e celular), CI, Lighthouse com acessibilidade, boas práticas e SEO em 100, qualidade adaptativa, modo sem 3D | Não testado em celular real; o desempenho medido pelo Lighthouse fica baixo com WebGL por software |
| 7 | Conteúdo real, sem inventar | 0,9 | 0,85 | Perfil e repositórios do GitHub, READMEs dos projetos, certificado Cisco, informações do autor | LinkedIn não conferido (exige login) |
| 8 | Som: trilha e efeitos das construções | 1,2 | 1,15 | Trilha original em 7 naipes que entram com as cidades, 9 efeitos sintetizados, regulador de volume; mixagem verificada em render offline nos testes | Falta a aprovação de ouvido do autor |
| | **Total** | **10** | **9,60** | | |

**Resultado: aprovado, 9,60 > 9.**

## O que foi verificado

- `pnpm build`: 9 rotas estáticas (`/`, `/en`, `/moodboard`, 404, ícones e cards).
- `pnpm test`: cada naipe da trilha e cada efeito renderizados offline, sem valores
  inválidos e sem clipping; orquestra completa abaixo de 0,9 de pico; PT e EN com a
  mesma estrutura; links válidos.
- `pnpm test:e2e`, em desktop e celular: rolagem completa até 6/6 cidades sem erros
  no console, página sem WebGL, modo leitura, regulador de som, `/en` com `lang` e
  `hreflang`, moodboard e 404.
- Emulador do Cloudflare Pages (`wrangler pages dev out`): rotas, tipos de arquivo,
  cabeçalhos de cache e segurança, 404.
- Lighthouse, celular e desktop: acessibilidade, boas práticas e SEO em 100. Desempenho
  47 (celular) e 58 (desktop), limitado pelo WebGL emulado na CPU durante o teste;
  FCP 0,7 s e LCP 1,3 s no desktop, sem deslocamento de layout.

## Para chegar a 10

- Currículo em PDF para baixar.
- Fotografias com licença livre ou próprias no moodboard.
- Conferir o texto do LinkedIn.
- Teste num celular real depois da publicação.
- Ouvir e aprovar a trilha.
