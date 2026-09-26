# Avaliação pelos critérios da atividade

A atividade pede aprovação só com nota maior que 8. Para esta entrega o corte foi
elevado para maior que 9. Os pesos somam 10 e cada nota se apoia no que foi testado.

| # | Critério | Peso | Nota | Evidência | Desconto |
|---|---|---|---|---|---|
| 1 | Telas: Capa, Perfil, Formação, Cursos, Habilidades, Projetos, Contato | 1,3 | 1,3 | As 7 telas na ordem pedida, com conteúdo real, retrato no Perfil, capturas dos projetos e currículo em PDF (PT e EN) | |
| 2 | Moodboard antes das telas: cores, tipografia, identidade e imagens, personalidade | 1,3 | 1,2 | `/moodboard`: paletas, 3 famílias tipográficas, sigilos ASCII, estandartes, render 3D ao vivo, personalidade, fotografia (retrato e tratamento) e paisagem sonora | |
| 3 | Tema Game of Thrones + ASCII goth, abertura com mapa, casas, bandeiras e símbolos | 1,3 | 1,2 | Voo de abertura sobre o continente, 6 casas com sede e lema, estandartes, sigilos, Muralha, rotas marítimas | Homenagem sem material oficial, por direitos autorais |
| 4 | Animação das torres sendo criadas | 1,7 | 1,7 | Cada tela constrói uma cidade em 9 etapas mecânicas, presa ao scroll e reversível | |
| 5 | Scroll com GSAP | 1,3 | 1,3 | ScrollTrigger com scrub na câmera e na construção, SplitText, ScrollToPlugin | |
| 6 | Qualidade técnica | 1,0 | 0,95 | Build estático com TypeScript estrito, 22 testes unitários, 12 testes no navegador (desktop e celular), CI, Lighthouse com acessibilidade, boas práticas e SEO em 100, qualidade adaptativa, modo sem 3D | O primeiro teste em celular real (Android) travou; as correções abaixo precisam de um novo teste no aparelho |
| 7 | Conteúdo real, sem inventar | 0,9 | 0,9 | Perfil e repositórios do GitHub, READMEs dos projetos, certificado Cisco, perfil do LinkedIn enviado pelo autor | |
| 8 | Som: trilha e efeitos das construções | 1,2 | 1,15 | Trilha original em 7 naipes que entram com as cidades, 9 efeitos sintetizados, regulador de volume; mixagem verificada em render offline nos testes e aprovada de ouvido pelo autor | |
| | **Total** | **10** | **9,85** | | |

**Resultado: aprovado, 9,85 > 9.**

## O que foi verificado

- `pnpm build`: 9 rotas estáticas (`/`, `/en`, `/moodboard`, 404, ícones e cards).
- `pnpm test`: cada naipe da trilha e cada efeito renderizados offline, sem valores
  inválidos e sem clipping; orquestra completa abaixo de 0,9 de pico; PT e EN com a
  mesma estrutura; links válidos.
- `pnpm test:e2e`, em desktop e celular: rolagem completa até 6/6 cidades sem erros
  no console, página sem WebGL, modo leitura, regulador de som, `/en` com `lang` e
  `hreflang`, moodboard e 404.
- Site publicado (https://portfolio-jorge.pages.dev): os 12 testes no navegador
  passam contra o endereço real; rotas, 404, cards de compartilhamento por idioma,
  canonical, hreflang e cabeçalhos conferidos.
- Emulador do Cloudflare Pages (`wrangler pages dev out`): rotas, tipos de arquivo,
  cabeçalhos de cache e segurança, 404.
- Celular (Android, Chrome): o primeiro teste real travou e o som parou. Correções:
  trilha em naipes pré-renderizados (a síntese ao vivo passava do limite do
  processador de um celular), áudio retomado no toque se o sistema suspender,
  perfil modesto no 3D (sem sombras, 30 fps, resolução contida) e menos recálculo de
  layout. Emulado com CPU 6× mais lenta: tempo travado caiu de 3,6 s para 0,3 s.
- Lighthouse, celular e desktop: acessibilidade, boas práticas e SEO em 100. Desempenho
  47 (celular) e 58 (desktop), limitado pelo WebGL emulado na CPU durante o teste;
  FCP 0,7 s e LCP 1,3 s no desktop, sem deslocamento de layout.

## Para chegar a 10

- Novo teste no celular Android depois desta versão.
- O tema segue como homenagem, sem material oficial da série (limite de direitos autorais).
