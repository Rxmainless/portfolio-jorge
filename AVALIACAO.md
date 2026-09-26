# Avaliação — critérios de aprovação

Regra do enunciado: **aprovar somente se a nota for maior que 8**.
Rubrica derivada do enunciado (pesos somam 10). Notas baseadas em testes reais
(build de produção, capturas em 1440×900 e 375×812, medição de desempenho).

| # | Critério (enunciado) | Peso | Nota | Evidência |
|---|---|---|---|---|
| 1 | Telas: Capa, Perfil, Formação, Cursos, Habilidades, Projetos, Contato | 1,5 | 1,5 | As 7 telas existem, na ordem pedida e com conteúdo real: duas graduações (ADS no Senac via Embarque Digital; Engenharia de Software na UNIFG), cursos (Cisco, Duolingo, linguagens), contato completo. |
| 2 | Moodboard **antes** das telas: cores, tipografia, identidade + imagens, personalidade | 1,5 | 1,4 | `/moodboard` com paleta base + 6 paletas de casa, 3 famílias tipográficas com escala, 6 sigilos ASCII, estandartes, ornamentos e render 3D ao vivo, 6 traços de personalidade. **Desconto:** sem fotografia/referências externas (por direitos autorais, só imagem gerada). |
| 3 | Tema Game of Thrones + ASCII goth: abertura com mapa, casas, bandeiras, símbolos | 1,5 | 1,4 | Abertura com voo sobre o continente, 6 casas com sede e lema, estandartes 3D içados, sigilos ASCII forjados, Muralha de gelo, rotas marítimas, textura de scanlines/grão, réguas ASCII. **Desconto:** homenagem sem assets oficiais (decisão consciente). |
| 4 | Animação das torres sendo criadas no portfólio | 2,0 | 2,0 | Cada tela constrói uma cidade mecanicamente (engrenagens → freios → cabos → escotilha → plataforma → fundação → torre telescópica → edifícios → pontes), sincronizada ao scroll e reversível. |
| 5 | Scroll com GSAP para interatividade | 1,5 | 1,5 | ScrollTrigger (scrub) controla câmera e construção; SplitText nos títulos; ScrollToPlugin na navegação; painéis revelados por scroll. |
| 6 | Qualidade técnica (build, desempenho, responsivo, acessibilidade) | 1,0 | 0,85 | `next build` passa com checagem de tipos ativada; 1,8–4 ms de CPU/frame; layout testado em 1440×900 e 375×812; `prefers-reduced-motion`, rótulos ARIA, foco visível. **Desconto:** fluidez em GPU móvel real não medida. |
| 7 | Conteúdo real (sem inventar) | 1,0 | 0,9 | Tudo vem de fontes verificáveis (projeto original, GitHub, READMEs e informação do autor); habilidades separam o que tem repositório do que só está listado no perfil. **Desconto:** faltam o nome exato do curso Cisco e quais cursos de linguagens. |
| | **Total** | **10** | **9,55** | |

## Veredito

**Aprovado — 9,55 > 8.**

Para chegar perto de 10: nome exato do curso de cibersegurança da Cisco e
quais cursos de linguagens de programação foram feitos (`lib/content.ts`).
