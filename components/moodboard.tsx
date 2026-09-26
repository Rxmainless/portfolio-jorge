'use client'

import dynamic from 'next/dynamic'
import { houses, palette } from '@/lib/realm-data'
import { AsciiSigil } from './ascii-sigil'

const RealmPreview = dynamic(() => import('./realm-canvas').then((m) => m.RealmPreview), { ssr: false })

const SOUNDS: [string, string, string][] = [
  ['gears', 'Engrenagens', 'catraca acelerando + motor'],
  ['mechanism', 'Mecanismo', 'lâmpadas, freio solto'],
  ['cables', 'Cabos', 'corda metálica tensionando'],
  ['hatch', 'Escotilha', 'destrava e desliza na pedra'],
  ['platform', 'Plataforma', 'baque + catraca de içamento'],
  ['foundation', 'Fundação', 'arrasto pesado e travamento'],
  ['tower', 'Torre', 'seções telescópicas travando'],
  ['buildings', 'Edifícios', 'três travamentos em sequência'],
  ['complete', 'Cidade completa', 'sino de latão + estandarte'],
]

/** Toca cada efeito isolado (o contexto de áudio nasce no clique). */
function SoundBoard() {
  /** Tema do Reino: um compasso por camada, somando até a orquestra completa. */
  const playScore = async () => {
    const w = window as unknown as { __mbAudio?: AudioContext }
    const ctx = (w.__mbAudio ??= new AudioContext())
    await ctx.resume()
    const { scheduleBar, LAYERS, BAR } = await import('@/lib/realm/audio/score')
    const bus = ctx.createGain()
    bus.gain.value = 0.7
    bus.connect(ctx.destination)
    const outs = Object.fromEntries(LAYERS.map((l) => [l, bus as AudioNode])) as unknown as Record<(typeof LAYERS)[number], AudioNode>
    const t0 = ctx.currentTime + 0.1
    LAYERS.forEach((_, bar) => {
      const active = Object.fromEntries(LAYERS.map((l, i) => [l, i <= bar])) as unknown as Record<(typeof LAYERS)[number], boolean>
      scheduleBar(ctx, outs, bar, t0 + bar * BAR, active)
    })
  }
  const play = async (id: string) => {
    const w = window as unknown as { __mbAudio?: AudioContext }
    const ctx = (w.__mbAudio ??= new AudioContext())
    await ctx.resume()
    const { STAGE_SFX } = await import('@/lib/realm/audio/sfx')
    const out = ctx.createGain()
    out.gain.value = 0.8
    out.connect(ctx.destination)
    STAGE_SFX[id]?.(ctx, out, ctx.currentTime + 0.02)
  }
  return (
    <div className="mb-sounds">
      <button type="button" className="mb-sound mb-score" onClick={playScore}>
        <span className="n">♪</span>
        <strong>Tema do Reino</strong>
        <small>trilha original · ré menor · uma camada por casa (≈ 23 s)</small>
        <span className="play" aria-hidden="true">▶</span>
      </button>
      {SOUNDS.map(([id, name, desc], i) => (
        <button key={id} type="button" className="mb-sound" onClick={() => play(id)}>
          <span className="n">{String(i + 1).padStart(2, '0')}</span>
          <strong>{name}</strong>
          <small>{desc}</small>
          <span className="play" aria-hidden="true">▶</span>
        </button>
      ))}
    </div>
  )
}

const SECTION_LABEL: Record<string, string> = {
  perfil: 'Perfil',
  formacao: 'Formação',
  cursos: 'Cursos',
  habilidades: 'Habilidades',
  projetos: 'Projetos',
  contato: 'Contato',
}

const traits = [
  ['⚙', 'Mecânico', 'O mundo é uma máquina. Nada aparece: tudo é içado, girado, travado.'],
  ['⛨', 'Heráldico', 'Cada seção é uma casa, com sigilo, cor, metal e lema próprios.'],
  ['░', 'ASCII goth', 'Glifos de terminal como matéria-prima: sigilos, réguas e textura.'],
  ['◐', 'Sombrio', 'Noite de obsidiana, luz de brasa. Contraste alto, cor com parcimônia.'],
  ['✦', 'Artesanal', 'Latão, ferro e pergaminho. Ornamento funcional, nunca decoração vazia.'],
  ['⌖', 'Preciso', 'Tipografia pequena e técnica nos rótulos; épico só nos títulos.'],
] as const

const ORN_A = String.raw`╔═══════════════ ✦ ═══════════════╗
║   O REINO DOS SISTEMAS          ║
╚═══════════════ ✦ ═══════════════╝
─── ⚙ ───────────────────── ⚙ ───
 ░▒▓█  forja  █▓▒░`

const ORN_B = String.raw`   .-=-.      [ 01 / PERFIL ]
  (  ⚙  )     ─────────────────
   '-=-'      Casa Stark · Winterfell
 ─┼──┼──┼──   "O inverno está chegando"`

export function Moodboard() {
  return (
    <main className="mb grain">
      <header className="mb-hero">
        <p className="eyebrow">Moodboard · Portfólio · Jorge Mesquita</p>
        <h1 className="display">O Reino<br />dos Sistemas</h1>
        <p className="lead">Um portfólio contado como a abertura de uma saga: um mapa-máquina onde cada parte da minha trajetória é uma cidade que se ergue diante de quem rola a página.</p>
        <div className="ascii-rule" aria-hidden="true">{'░▒▓█▓▒░ ─── ⚙ ─────────────────────────────────── ✦ ─────────────────────────────────── ⚙ ─── ░▒▓█▓▒░'}</div>
      </header>

      <section className="mb-section" aria-labelledby="mb-personality">
        <div className="mb-head">
          <span className="n">01</span>
          <h2 id="mb-personality" className="display">Personalidade</h2>
          <p>Game of Thrones pela lente de um terminal: a grandiosidade das casas e da abertura mecânica, traduzida em glifos, latão e escuridão.</p>
        </div>
        <div className="mb-traits">
          {traits.map(([g, t, d]) => (
            <div className="mb-trait" key={t}>
              <span className="glyph" aria-hidden="true">{g}</span>
              <h3>{t}</h3>
              <p>{d}</p>
            </div>
          ))}
        </div>
        <div className="mb-refs">
          <div>
            <p className="eyebrow">Referência 01 · Abertura mecânica</p>
            <p>O mapa como maquete viva: engrenagens de latão movem plataformas, torres telescópicas sobem do chão, cabos tensionam. É a animação central do portfólio.</p>
          </div>
          <div>
            <p className="eyebrow">Referência 02 · ASCII goth</p>
            <p>Arte de caracteres, dithering e scanlines. Os sigilos das casas são desenhados em ASCII e "forjados" caractere por caractere quando aparecem.</p>
          </div>
        </div>
      </section>

      <section className="mb-section" aria-labelledby="mb-colors">
        <div className="mb-head">
          <span className="n">02</span>
          <h2 id="mb-colors" className="display">Cores</h2>
          <p>Base escura e metálica; as cores das casas só aparecem quando a casa está em foco.</p>
        </div>
        <div className="mb-swatches">
          {palette.map((c) => (
            <div className="mb-swatch" key={c.hex}>
              <div className="chip" style={{ background: c.hex }} />
              <div className="meta">
                <strong>{c.name}</strong>
                <code>{c.hex}</code>
                <span>{c.use}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mb-houses">
          {houses.map((h) => (
            <div className="mb-house" key={h.section} style={{ ['--c' as string]: h.color }}>
              <span className="sec">{SECTION_LABEL[h.section]}</span>
              <div className="sig">
                <AsciiSigil sigil={h.sigil} color={h.color} label={`Sigilo da ${h.house}`} />
              </div>
              <div>
                <h3>{h.house}</h3>
                <em>“{h.words}”</em>
                <div className="pair" aria-label={`Cor ${h.color}, metal ${h.metal}`}>
                  <i style={{ background: h.color }} />
                  <i style={{ background: h.metal }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-section" aria-labelledby="mb-type">
        <div className="mb-head">
          <span className="n">03</span>
          <h2 id="mb-type" className="display">Tipografia</h2>
          <p>Três vozes: a inscrição (títulos), o cronista (texto) e a máquina (rótulos e ASCII).</p>
        </div>
        <div className="mb-type">
          <div>
            <p className="role"><b>Cinzel</b>Títulos · caixa-alta<br />espaçamento 0.08em</p>
            <p className="spec-display">Jorge Mesquita</p>
          </div>
          <div>
            <p className="role"><b>Cormorant Garamond</b>Texto corrido · itálico<br />para citações e lemas</p>
            <p className="spec-serif">“Ainda estou no começo, mas nunca estive parado.” Cada projeto é uma pedra a mais nas muralhas.</p>
          </div>
          <div>
            <p className="role"><b>JetBrains Mono</b>Rótulos · dados · ASCII<br />11–14px, caixa-alta</p>
            <p className="spec-mono">{'[ 03 / CURSOS ]  ░▒▓ forjando ▓▒░  0x1F ⚙ ok'}</p>
          </div>
        </div>
        <div className="mb-scale" aria-label="Escala tipográfica">
          <div><span style={{ fontSize: '4.2rem' }}>Aa</span> 72</div>
          <div><span style={{ fontSize: '2.6rem' }}>Aa</span> 44</div>
          <div><span style={{ fontSize: '1.6rem' }}>Aa</span> 28</div>
          <div><span style={{ fontSize: '1.1rem' }}>Aa</span> 18</div>
          <div><span style={{ fontSize: '0.7rem', fontFamily: 'var(--mono)' }}>AA</span> 11</div>
        </div>
      </section>

      <section className="mb-section" aria-labelledby="mb-identity">
        <div className="mb-head">
          <span className="n">04</span>
          <h2 id="mb-identity" className="display">Identidade + imagens</h2>
          <p>Sigilos ASCII originais, estandartes, ornamentos de terminal e a imagem-chave: a máquina erguendo o reino.</p>
        </div>
        <div className="mb-sigils">
          {houses.map((h) => (
            <figure className="mb-sigil" key={h.sigil} style={{ ['--c' as string]: h.color }}>
              <AsciiSigil sigil={h.sigil} color={h.color} label={`Sigilo ASCII da ${h.house}`} />
              <figcaption>{h.house} · {h.seat}</figcaption>
            </figure>
          ))}
        </div>

        <div className="mb-banners" aria-label="Estandartes">
          {houses.map((h) => (
            <div className="banner" key={h.section} style={{ ['--c' as string]: h.cloth ?? h.color }}>
              <div className="pole" />
              <div className="cloth">
                <div><AsciiSigil sigil={h.sigil} color={h.cloth ? h.color : h.metal} label={`Estandarte da ${h.house}`} /></div>
              </div>
              <p>{h.seat}</p>
            </div>
          ))}
        </div>

        <figure className="mb-key">
          <RealmPreview />
          <figcaption>Imagem-chave · a máquina constrói uma cidade (render ao vivo)</figcaption>
        </figure>

        <div className="mb-ornaments" aria-label="Ornamentos ASCII">
          <pre>{ORN_A}</pre>
          <pre>{ORN_B}</pre>
        </div>
      </section>

      <section className="mb-section" aria-labelledby="mb-map">
        <div className="mb-head">
          <span className="n">05</span>
          <h2 id="mb-map" className="display">O mapa do portfólio</h2>
          <p>Cada tela do portfólio é uma casa. O scroll (GSAP) leva a câmera de sede em sede e cada cidade é construída pela máquina quando você chega.</p>
        </div>
        <table className="mb-map">
          <thead>
            <tr><th>Tela</th><th>Casa · sede</th><th>Por quê</th></tr>
          </thead>
          <tbody>
            <tr><td>Capa</td><td>O mapa inteiro</td><td>A abertura: o continente-máquina visto do alto.</td></tr>
            {houses.map((h) => (
              <tr key={h.section} style={{ ['--c' as string]: h.color }}>
                <td><span className="dot" />{SECTION_LABEL[h.section]}</td>
                <td>{h.house} · {h.seat}</td>
                <td>{WHY[h.section]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mb-note">Homenagem inspirada em Game of Thrones (HBO / George R. R. Martin). Casas, sedes e lemas curtos são referências temáticas; sigilos, mapa, cidades e animações são criações originais. Nenhum logotipo, imagem, fonte ou música oficial é utilizado.</p>
      </section>

      <section className="mb-section" aria-labelledby="mb-sound">
        <div className="mb-head">
          <span className="n">06</span>
          <h2 id="mb-sound" className="display">Paisagem sonora</h2>
          <p>Uma trilha original que se forma com o reino — cada casa construída acrescenta um instrumento — e a voz da máquina. Latão, ferro e pedra, sintetizados em tempo real (Web Audio API) — cada etapa da construção tem sua voz, e o ronco do motor segue a velocidade do scroll.</p>
        </div>
        <SoundBoard />
      </section>
    </main>
  )
}

const WHY: Record<string, string> = {
  perfil: 'Identidade e raízes: quem eu sou, de onde venho.',
  formacao: 'A Cidadela forma os meistres — a formação acadêmica.',
  cursos: '“Crescendo fortes”: cada curso é um elo a mais.',
  habilidades: 'O arsenal e o ouro da casa: o que sei usar.',
  projetos: '“Fogo e sangue”: o que já foi forjado de fato.',
  contato: 'A Patrulha envia corvos: é por aqui que se fala comigo.',
}
