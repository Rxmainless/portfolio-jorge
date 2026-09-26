# O Reino dos Sistemas

Portfólio de Jorge Mesquita, estudante de ADS (Senac) e Engenharia de Software (UNIFG).

**No ar:** https://portfolio-jorge.pages.dev

O tema é uma homenagem a Game of Thrones com estética ASCII goth. Cada seção do
portfólio é uma casa do continente, e cada casa tem uma cidade que uma máquina de
latão constrói conforme a página rola: engrenagens, cabos, plataforma, fundação,
torre e edifícios. Rolar para cima desmonta tudo na ordem inversa.

Versões: português em `/`, inglês em `/en`. O moodboard da identidade visual fica
em `/moodboard`.

## Rodar

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm build        # site estático em out/
pnpm test         # testes unitários (Vitest)
pnpm test:e2e     # testes no navegador (Playwright), depois do build
pnpm cv           # regenera o currículo em PDF (public/) a partir de lib/content.ts
```

Node 22 ou mais novo e pnpm 11.

## Seções

| Seção | Casa e sede | Conteúdo |
|---|---|---|
| Capa | o continente inteiro | voo de abertura sobre o mapa |
| Perfil | Stark, Winterfell | apresentação, foco em backend, idiomas |
| Formação | Hightower, Vilavelha | ADS (Senac, via Embarque Digital) e Engenharia de Software (UNIFG) |
| Cursos | Tyrell, Jardim de Cima | Cisco *Digital Safety and Security Awareness*, idiomas (Duolingo), linguagens (The Odin Project) |
| Habilidades | Lannister, Rochedo Casterly | tecnologias e os projetos onde cada uma foi usada |
| Projetos | Targaryen, Pedra do Dragão | Desafio Itaú, Dash Digital, Lumen, ONDA, RadarPME, Spotify UX, Skill Map 3D |
| Contato | Patrulha da Noite, Castelo Negro | GitHub, LinkedIn e e-mail |

## Como funciona

- **Scroll:** GSAP ScrollTrigger com scrub leva a câmera até cada sede e controla a
  construção da cidade. SplitText anima os títulos e ScrollToPlugin cuida do menu.
- **3D:** Three.js com um motor procedural próprio. Geometria estática fundida,
  instâncias para peças repetidas e sombras atualizadas só quando algo muda.
- **Qualidade adaptativa:** se o aparelho não sustenta cerca de 40 fps, a cena
  desliga as sombras e reduz a resolução. Sem WebGL, ou no **modo leitura** (botão
  na capa), a página mostra só o conteúdo.
- **Som:** tudo sintetizado em tempo real com a Web Audio API, sem arquivos de
  áudio. Cada etapa da construção tem um efeito, o motor acompanha a velocidade do
  scroll e rolar para cima rebobina. O regulador no cabeçalho ajusta volume geral,
  trilha e efeitos.
- **Trilha:** "Tema do Reino", composição original em ré menor, 3/4, 84 bpm, com
  ostinato de violoncelos, violinos em trêmulo, tambores de guerra, trompas, coro
  e violino solo. Cada cidade construída acrescenta um naipe, e o reino completo
  soa como a orquestra inteira. Cada naipe é renderizado uma vez em segundo plano
  e depois toca em loop, para a trilha não disputar processador com o 3D.
- **Aparelhos modestos** (celular, poucos núcleos ou pouca memória): sem sombras,
  30 fps e resolução contida.

```
app/(pt)/                 página em português e moodboard
app/(en)/en/              página em inglês
app/site.ts               fontes, metadados e URL pública
components/portfolio.tsx  seções e coreografia de scroll
components/sound-mixer.tsx
lib/content.ts            todo o texto (PT e EN)
lib/realm-data.ts         casas: sede, lema, cores, posição no mapa
lib/realm/                cena 3D, máquina, cidades, continente e áudio
tests/unit/               trilha e efeitos renderizados offline, conteúdo
tests/e2e/                jornada completa, sem WebGL, regulador, idiomas, 404
```

## Publicação (Cloudflare Pages)

O build gera um site estático em `out/`. No painel do Cloudflare: Workers & Pages,
Create, Pages, Connect to Git, e escolher este repositório.

| Configuração | Valor |
|---|---|
| Framework preset | None |
| Build command | `pnpm build` |
| Build output directory | `out` |
| Variável `SITE_URL` | o endereço final, por exemplo `https://portfolio-jorge.pages.dev` |

A versão do Node vem de `.node-version`. Cabeçalhos de cache e segurança ficam em
`public/_headers`. O GitHub Actions roda typecheck, testes e build a cada push.

## Créditos

Homenagem inspirada em Game of Thrones (HBO, George R. R. Martin). Nomes de casas,
sedes e lemas curtos são referências ao tema. Sigilos ASCII, mapa, cidades,
animações, trilha e código são originais. Nenhum logotipo, imagem, fonte ou música
oficial da série é usado.

Avaliação pelos critérios da atividade: [AVALIACAO.md](AVALIACAO.md).
