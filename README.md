# O Reino dos Sistemas — portfólio de Jorge Mesquita

Portfólio em Next.js com tema inspirado em **Game of Thrones + ASCII goth**.
Cada tela é uma casa; cada casa tem uma cidade que uma máquina de latão
constrói, torre por torre, conforme o scroll (GSAP ScrollTrigger).

```bash
pnpm install
pnpm dev        # http://localhost:3000   ·   moodboard em /moodboard
pnpm build
```

## Telas

| Tela | Casa · sede | Conteúdo |
|---|---|---|
| Capa | o continente inteiro | abertura: voo sobre o mapa, título forjado |
| Perfil | Stark · Winterfell | quem sou |
| Formação | Hightower · Vilavelha | graduação em ADS |
| Cursos | Tyrell · Jardim de Cima | corrente de meistre (a preencher) |
| Habilidades | Lannister · Rochedo Casterly | tecnologias + onde foram usadas |
| Projetos | Targaryen · Pedra do Dragão | Dash Digital, Lumen, ONDA, RadarPME, Skill Map 3D |
| Contato | Patrulha da Noite · Castelo Negro | GitHub / e-mail |

## Estrutura

```
app/
  page.tsx, layout.tsx      fontes (Cinzel, Cormorant Garamond, JetBrains Mono)
  moodboard/                moodboard (cores, tipografia, identidade, personalidade)
  globals.css, realm.css    tokens do reino e estilos
components/
  portfolio.tsx             telas + coreografia GSAP (ScrollTrigger, SplitText, ScrollTo)
  moodboard.tsx
  realm-canvas.tsx          monta a cena 3D só no cliente
  ascii-sigil.tsx           sigilos ASCII animados
lib/
  content.ts                TODO o texto (PT/EN) — só fatos verificáveis
  realm-data.ts             casas: sede, lema, cores, posição, arquétipo
  sigils.ts, sigil-canvas.ts
  realm/                    motor 3D (vem do projeto Skill Map 3D)
    RealmScene.ts           câmera guiada pelo scroll + construção reversível
    world/…                 engrenagens, cabos, guinchos, cidades, continente, estandartes
```

## Completar o conteúdo

Edite `lib/content.ts`: cursos, instituição/período da graduação e e-mail
profissional ainda estão como "a forjar". Nada foi inventado.

## Créditos e direitos

Homenagem inspirada em Game of Thrones (HBO / George R. R. Martin). Casas,
sedes e lemas curtos são referências temáticas. Sigilos ASCII, mapa, cidades,
animações e código são originais. Nenhum logotipo, imagem, fonte ou música
oficial é utilizado.

Avaliação pelos critérios da atividade: [AVALIACAO.md](AVALIACAO.md).
