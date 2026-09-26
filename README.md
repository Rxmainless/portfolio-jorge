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
| Formação | Hightower · Vilavelha | ADS (Senac, via Embarque Digital) e Engenharia de Software (UNIFG) |
| Cursos | Tyrell · Jardim de Cima | Cisco *Digital Safety and Security Awareness*, idiomas (Duolingo), linguagens (The Odin Project) |
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

## Som

Todos os sons são sintetizados em tempo real (Web Audio API) — nenhum arquivo
de áudio. Cada etapa da construção tem seu efeito; o ronco do motor e os cliques
de dente seguem a velocidade do scroll; rolar para cima rebobina. O som só liga
pelo botão **Som** (exigência de autoplay dos navegadores) e a preferência fica
salva. Ouça cada efeito isolado em `/moodboard` → Paisagem sonora.

```
lib/realm/audio/sfx.ts         efeitos (tocam também em OfflineAudioContext)
lib/realm/audio/RealmAudio.ts  mixagem, reverb, motor/vento contínuos, limites anti-avalanche
```

## Conteúdo

Todo o texto está em `lib/content.ts` (PT/EN), só com fatos verificáveis.

## Créditos e direitos

Homenagem inspirada em Game of Thrones (HBO / George R. R. Martin). Casas,
sedes e lemas curtos são referências temáticas. Sigilos ASCII, mapa, cidades,
animações e código são originais. Nenhum logotipo, imagem, fonte ou música
oficial é utilizado.

Avaliação pelos critérios da atividade: [AVALIACAO.md](AVALIACAO.md).
