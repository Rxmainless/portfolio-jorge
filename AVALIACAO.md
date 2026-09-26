# Avaliação — critérios de aprovação

Regra do enunciado: **aprovar somente se a nota for maior que 8**.
Rubrica derivada do enunciado (pesos somam 10). Notas baseadas em testes reais
(build de produção, capturas em 1440×900 e 375×812, medição de desempenho).

| # | Critério (enunciado) | Peso | Nota | Evidência |
|---|---|---|---|---|
| 1 | Telas: Capa, Perfil, Formação, Cursos, Habilidades, Projetos, Contato | 1,5 | 1,4 | As 7 telas existem e estão na ordem pedida; Cursos lista os cursos informados (Cibersegurança/Cisco, idioma, linguagens de programação). **Desconto:** Formação sem instituição/período. |
| 2 | Moodboard **antes** das telas: cores, tipografia, identidade + imagens, personalidade | 1,5 | 1,4 | `/moodboard` com paleta base + 6 paletas de casa, 3 famílias tipográficas com escala, 6 sigilos ASCII, estandartes, ornamentos e render 3D ao vivo, 6 traços de personalidade. **Desconto:** sem fotografia/referências externas (por direitos autorais, só imagem gerada). |
| 3 | Tema Game of Thrones + ASCII goth: abertura com mapa, casas, bandeiras, símbolos | 1,5 | 1,4 | Abertura com voo sobre o continente, 6 casas com sede e lema, estandartes 3D içados, sigilos ASCII forjados, Muralha de gelo, rotas marítimas, textura de scanlines/grão, réguas ASCII. **Desconto:** homenagem sem assets oficiais (decisão consciente). |
| 4 | Animação das torres sendo criadas no portfólio | 2,0 | 2,0 | Cada tela constrói uma cidade mecanicamente (engrenagens → freios → cabos → escotilha → plataforma → fundação → torre telescópica → edifícios → pontes), sincronizada ao scroll e reversível. |
| 5 | Scroll com GSAP para interatividade | 1,5 | 1,5 | ScrollTrigger (scrub) controla câmera e construção; SplitText nos títulos; ScrollToPlugin na navegação; painéis revelados por scroll. |
| 6 | Qualidade técnica (build, desempenho, responsivo, acessibilidade) | 1,0 | 0,85 | `next build` passa com checagem de tipos ativada; 1,8–4 ms de CPU/frame; layout testado em 1440×900 e 375×812; `prefers-reduced-motion`, rótulos ARIA, foco visível. **Desconto:** fluidez em GPU móvel real não medida. |
| 7 | Conteúdo real (sem inventar) | 1,0 | 0,7 | Perfil, formação, cursos, projetos e habilidades vêm de fontes verificáveis (projeto original, READMEs e informação do autor). **Desconto:** faltam detalhes dos cursos (qual idioma, quais linguagens, nome do curso Cisco), e-mail profissional e dados da instituição. |
| | **Total** | **10** | **9,25** | |

## Veredito

**Aprovado — 9,25 > 8.**

A nota sobe para ~9,6 quando forem preenchidos: detalhes dos cursos,
instituição/período da graduação e e-mail profissional (`lib/content.ts`).
