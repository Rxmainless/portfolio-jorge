# Avaliação — critérios de aprovação

Regra do enunciado: aprovar somente se a nota for **maior que 8**. Nesta entrega o
autor elevou o corte para **maior que 9**. Rubrica derivada do enunciado + o
requisito de som; pesos somam 10. Notas baseadas nos testes listados abaixo.

| # | Critério | Peso | Nota | Evidência |
|---|---|---|---|---|
| 1 | Telas: Capa, Perfil, Formação, Cursos, Habilidades, Projetos, Contato | 1,3 | 1,3 | As 7 telas, na ordem pedida, com conteúdo real: duas graduações (ADS no Senac via Embarque Digital; Engenharia de Software na UNIFG), 3 cursos (Cisco *Digital Safety and Security Awareness*, idiomas no Duolingo, linguagens no The Odin Project), 7 projetos, contato completo. |
| 2 | Moodboard antes das telas: cores, tipografia, identidade + imagens, personalidade | 1,3 | 1,25 | `/moodboard`: paleta base + 6 paletas de casa, 3 famílias tipográficas e escala, sigilos ASCII, estandartes, ornamentos, render 3D ao vivo, 6 traços de personalidade e paisagem sonora com os 9 efeitos tocáveis. **Desconto:** sem fotografia (por direitos autorais, só imagem gerada). |
| 3 | Tema Game of Thrones + ASCII goth: abertura com mapa, casas, bandeiras, símbolos | 1,3 | 1,2 | Abertura com voo sobre o continente, 6 casas com sede e lema, estandartes 3D içados, sigilos ASCII forjados, Muralha, rotas marítimas, scanlines/grão, réguas ASCII. **Desconto:** homenagem sem assets oficiais (decisão consciente). |
| 4 | Animação das torres sendo criadas | 1,7 | 1,7 | Cada tela constrói uma cidade mecanicamente (engrenagens → freios → cabos → escotilha → plataforma → fundação → torre telescópica → edifícios → pontes), sincronizada ao scroll e reversível. |
| 5 | Scroll com GSAP | 1,3 | 1,3 | ScrollTrigger (scrub) controla câmera e construção; SplitText nos títulos; ScrollToPlugin na navegação; painéis revelados por scroll. |
| 6 | Qualidade técnica (build, desempenho, responsivo, acessibilidade) | 1,0 | 0,95 | `next build` com checagem de tipos; produção: 72 fps rolando a página inteira, pior frame 18,7 ms, console sem erros; 1440×900, 963 px e 375×812 sem rolagem horizontal; `prefers-reduced-motion`, ARIA, foco visível. **Desconto:** GPU de celular real não testada. |
| 7 | Conteúdo real (sem inventar) | 0,9 | 0,85 | Fontes: projeto original, perfil e repositórios do GitHub, READMEs locais, certificado Cisco e informação do autor; habilidades separam o que tem repositório do que só está listado no perfil. **Desconto:** o LinkedIn não pôde ser lido (exige login). |
| 8 | Som: efeitos das construções | 1,2 | 1,1 | 9 efeitos sintetizados (Web Audio, sem arquivos), um por etapa, + ronco do motor e cliques de dente guiados pela velocidade do scroll, vento nos voos, rebobinar ao subir; liga só com gesto do usuário e lembra a preferência. **Desconto:** validado por medição (RMS/pico) e contagem de eventos, não por audição. |
| | **Total** | **10** | **9,65** | |

## Veredito

**Aprovado — 9,65 > 9.**

## Verificação realizada

- Build de produção (`next build`) com TypeScript estrito: ok, 2 rotas estáticas.
- Produção (`next start`), aba limpa: rolagem completa em tempo real → 6/6 cidades
  construídas, epílogo com rótulos, 72 fps, nenhum erro de console.
- Estados da jornada: capa, voo, cada uma das 6 cidades (meio e fim da construção), epílogo.
- Som, render offline de cada efeito: todos audíveis, sem NaN, pico ≤ 0,59 (sem clipping);
  mixagem rebalanceada (engrenagens 3×, cliques 3,6×).
- Som ao vivo: clique real liga o AudioContext; scroll pela casa Stark → etapas na ordem;
  salto pelo menu → 3 sons (antes 38); scroll rápido → 5; subir → rebobina sem sons de etapa.
- Religar som com preferência salva sem o clique no botão desligar em seguida (bug corrigido).
- Idioma EN: título, capa, menu, cursos e formação traduzidos; volta para PT.
- Moodboard: 5 seções + paisagem sonora, 6 sigilos, 6 estandartes, prévia 3D, botões de som.
- Links externos: GitHub, repositórios e Dash Digital respondem 200 (LinkedIn bloqueia robôs).
- Mobile 375×812: cabeçalho cabe (J·M, 6/6, som, idioma, menu), sem rolagem horizontal.
