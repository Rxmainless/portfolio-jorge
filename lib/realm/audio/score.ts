/**
 * Trilha adaptativa original: "Tema do Reino".
 * Ré menor, 84 bpm, 3/4, forma de 16 compassos:
 *   A: Dm Dm B♭ C | Dm Dm Gm A     B: F C Dm B♭ | Gm Dm E♭ A
 * Linguagem de abertura de série épica: ostinato galopante de violoncelos,
 * violinos em trêmulo, tambores de guerra, trompas graves, coro e um violino
 * solo dobrado pelos violoncelos. Composição própria (melodia e ostinato
 * originais) e sintetizada; cada camada entra quando a cidade da sua casa é
 * construída, então o reino completo soa como a orquestra completa.
 *
 * `scheduleBar` é uma função pura sobre qualquer BaseAudioContext, para poder
 * ser renderizada offline na validação.
 */
import { noiseBuffer, type Ctx } from './sfx'

export const BPM = 84
export const BEAT = 60 / BPM
export const BEATS_PER_BAR = 3
export const BAR = BEAT * BEATS_PER_BAR
export const FORM = 16
export const LAYERS = ['drone', 'cello', 'drums', 'violins', 'brass', 'choir', 'solo'] as const
export type Layer = (typeof LAYERS)[number]

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12)

type Chord = { root: number; triad: number[] }
const Dm: Chord = { root: 38, triad: [62, 65, 69] }
const Bb: Chord = { root: 34, triad: [58, 62, 65] }
const C: Chord = { root: 36, triad: [60, 64, 67] }
const Gm: Chord = { root: 43, triad: [55, 58, 62] }
const A: Chord = { root: 33, triad: [57, 61, 64] }
const F: Chord = { root: 41, triad: [60, 65, 69] }
const Eb: Chord = { root: 39, triad: [58, 63, 67] }
export const CHORDS: Chord[] = [Dm, Dm, Bb, C, Dm, Dm, Gm, A, F, C, Dm, Bb, Gm, Dm, Eb, A]

/** Melodia do violino solo: [nota MIDI, duração em tempos] por compasso (0 = pausa). */
export const MELODY: [number, number][][] = [
  [[74, 1.5], [76, 0.5], [77, 1]],
  [[81, 2], [79, 0.5], [77, 0.5]],
  [[77, 1.5], [76, 0.5], [74, 1]],
  [[76, 3]],
  [[74, 1.5], [76, 0.5], [77, 1]],
  [[84, 2], [81, 0.5], [82, 0.5]],
  [[81, 1], [79, 1], [82, 1]],
  [[81, 3]],
  [[84, 1.5], [81, 0.5], [77, 1]],
  [[79, 1.5], [76, 0.5], [72, 1]],
  [[74, 1], [77, 1], [81, 1]],
  [[86, 2], [84, 0.5], [82, 0.5]],
  [[82, 1.5], [81, 0.5], [79, 1]],
  [[81, 1.5], [77, 0.5], [74, 1]],
  [[79, 1], [82, 1], [87, 1]],
  [[85, 2], [0, 1]],
]

/** Mixagem por camada, medida em render offline (RMS de cada camada isolada). */
const MIX: Record<Layer, number> = { drone: 0.35, cello: 0.6, drums: 0.32, violins: 1.25, brass: 0.55, choir: 0.85, solo: 0.6 }

/** Tambores em semicolcheias (12 por compasso): 1 taiko grave, 2 tambor médio, 3 caixa de moldura. */
const DRUMS = [1, 0, 0, 3, 2, 0, 1, 0, 2, 0, 3, 3]

// Instrumentos

function osc(ctx: Ctx, type: OscillatorType, freq: number, t: number, end: number, detune = 0): OscillatorNode {
  const o = ctx.createOscillator()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  o.detune.value = detune
  o.start(t)
  o.stop(end)
  return o
}

function env(ctx: Ctx, t: number, a: number, hold: number, r: number, peak: number): GainNode {
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(peak, t + a)
  g.gain.setValueAtTime(peak, t + a + Math.max(0, hold))
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + Math.max(0, hold) + r)
  return g
}

function filter(ctx: Ctx, type: BiquadFilterType, f: number, q = 0.7, gain = 0): BiquadFilterNode {
  const b = ctx.createBiquadFilter()
  b.type = type
  b.frequency.value = f
  b.Q.value = q
  b.gain.value = gain
  return b
}

type Bow = {
  peak: number
  /** Ataque, sustentação e soltura (s). */
  attack: number
  release: number
  /** Brilho: corte do filtro passa-baixa depois do ataque (Hz). */
  bright: number
  /** Vozes do naipe (serras desafinadas entre si). */
  voices?: number
  spread?: number
  /** Profundidade do vibrato (fração da frequência). */
  vibrato?: number
  /** Trêmulo de arco (Hz); 0 = arcada contínua. */
  tremolo?: number
  /** Ruído de crina no ataque. */
  scratch?: number
}

/**
 * Corda friccionada: naipe de serras desafinadas com vibrato que entra depois
 * do ataque, passa-baixa duplo com envelope de brilho, ressonância de caixa
 * (≈ 280 Hz e ≈ 2,8 kHz) e ruído de crina no início da arcada.
 */
function bowed(ctx: Ctx, out: AudioNode, note: number, t: number, dur: number, o: Bow): void {
  const f = midi(note)
  const n = o.voices ?? 3
  const spread = o.spread ?? 12
  const end = t + dur + o.release + 0.2
  const lp1 = filter(ctx, 'lowpass', o.bright, 0.5)
  const lp2 = filter(ctx, 'lowpass', o.bright * 1.4, 0.6)
  lp1.frequency.setValueAtTime(o.bright * 0.45, t)
  lp1.frequency.linearRampToValueAtTime(o.bright, t + o.attack)
  lp1.frequency.setTargetAtTime(o.bright * 0.78, t + o.attack, dur * 0.5 + 0.05)
  const body = filter(ctx, 'peaking', 280, 1.2, 3)
  const bite = filter(ctx, 'peaking', 2800, 1.4, 2.5)

  const vib = osc(ctx, 'sine', 5.1 + ((note * 7) % 5) * 0.12, t, end)
  const depth = ctx.createGain()
  depth.gain.setValueAtTime(0, t)
  depth.gain.linearRampToValueAtTime(0, t + Math.min(0.28, dur * 0.4))
  depth.gain.linearRampToValueAtTime(f * (o.vibrato ?? 0.004), t + Math.min(0.28, dur * 0.4) + 0.35)
  vib.connect(depth)
  for (let i = 0; i < n; i++) {
    const det = n === 1 ? 0 : spread * ((i / (n - 1)) * 2 - 1) + ((note * 13 + i * 5) % 7) - 3
    const v = osc(ctx, 'sawtooth', f, t, end, det)
    depth.connect(v.frequency)
    v.connect(lp1)
  }
  let chain: AudioNode = lp1.connect(lp2).connect(body).connect(bite)
  if (o.tremolo) {
    const am = ctx.createGain()
    am.gain.value = 0.55
    const lfo = osc(ctx, 'triangle', o.tremolo, t, end)
    const lg = ctx.createGain()
    lg.gain.value = 0.45
    lfo.connect(lg).connect(am.gain)
    chain = chain.connect(am)
  }
  chain.connect(env(ctx, t, o.attack, dur - o.attack, o.release, o.peak / Math.sqrt(n))).connect(out)

  if (o.scratch) {
    const s = ctx.createBufferSource()
    s.buffer = noiseBuffer(ctx)
    s.start(t, (note * 0.071) % 1.5)
    s.stop(t + 0.12)
    s.connect(filter(ctx, 'bandpass', Math.min(6000, f * 3), 1.4)).connect(env(ctx, t, 0.005, 0.02, 0.07, o.peak * o.scratch)).connect(out)
  }
}

/** Tambor: senoide com queda de altura + ruído de pele. */
function drum(ctx: Ctx, out: AudioNode, t: number, from: number, to: number, decay: number, peak: number, skin: number, skinHz: number): void {
  const o = osc(ctx, 'sine', from, t, t + decay + 0.1)
  o.frequency.exponentialRampToValueAtTime(to, t + decay * 0.45)
  o.connect(env(ctx, t, 0.003, 0.015, decay, peak)).connect(out)
  const n = ctx.createBufferSource()
  n.buffer = noiseBuffer(ctx)
  n.start(t, (from * 0.013) % 1.5)
  n.stop(t + 0.25)
  n.connect(filter(ctx, 'lowpass', skinHz, 0.8)).connect(env(ctx, t, 0.002, 0.01, 0.14, skin)).connect(out)
}

/** Tímpano afinado na fundamental do acorde. */
function timpani(ctx: Ctx, out: AudioNode, t: number, note: number, peak: number): void {
  let n = note
  while (n < 38) n += 12
  while (n > 50) n -= 12
  const f = midi(n)
  for (const [m, a, d] of [[1, 1, 1.4], [1.5, 0.35, 0.8], [1.99, 0.18, 0.5]] as const) {
    const o = osc(ctx, 'sine', f * m * 1.04, t, t + d + 0.1)
    o.frequency.exponentialRampToValueAtTime(f * m, t + 0.08)
    o.connect(env(ctx, t, 0.004, 0.02, d, peak * a)).connect(out)
  }
  const s = ctx.createBufferSource()
  s.buffer = noiseBuffer(ctx)
  s.start(t, 0.3)
  s.stop(t + 0.1)
  s.connect(filter(ctx, 'bandpass', 420, 1)).connect(env(ctx, t, 0.002, 0.005, 0.06, peak * 0.3)).connect(out)
}

/**
 * Agenda um compasso (índice `bar`) a partir de `t`. `out` recebe um destino por
 * camada, já com o volume da camada aplicado pelo chamador.
 */
export function scheduleBar(ctx: Ctx, dest: Record<Layer, AudioNode>, bar: number, t: number, active: Record<Layer, boolean>): void {
  const out = {} as Record<Layer, AudioNode>
  for (const l of LAYERS) {
    if (!active[l]) continue
    const g = ctx.createGain()
    g.gain.value = MIX[l]
    g.connect(dest[l])
    out[l] = g
  }
  const b = bar % FORM
  const chord = CHORDS[b]
  const s8 = BEAT / 2
  const s16 = BEAT / 4
  const cadence = b % 8 === 7

  if (active.drone) {
    // Contrabaixos e violoncelos graves sustentando fundamental e quinta; sub por baixo
    for (const [n, a] of [[chord.root, 0.2], [chord.root + 7, 0.07], [chord.root + 12, 0.06]] as const) {
      bowed(ctx, out.drone, n, t, BAR, { peak: a, attack: 0.7, release: 0.9, bright: 520, voices: 2, spread: 9, vibrato: 0.002 })
    }
    osc(ctx, 'sine', midi(chord.root - 12 < 26 ? chord.root : chord.root - 12), t, t + BAR + 1).connect(env(ctx, t, 0.6, BAR - 0.6, 0.8, 0.09)).connect(out.drone)
  }

  if (active.cello) {
    // Ostinato galopante em colcheias, acentos no 1 e no "e" do 2 (sensação de 6/8)
    const base = chord.root + 12
    const third = chord.triad[1] - chord.triad[0] === 3 ? 3 : 4
    const pattern = [0, 7, 12, 7, 12 + third, 7]
    pattern.forEach((deg, i) => {
      const at = t + i * s8
      const accent = i === 0 ? 1 : i === 3 ? 0.85 : 0.55
      bowed(ctx, out.cello, base + deg, at, s8 * 0.72, { peak: 0.2 * accent, attack: 0.018, release: 0.14, bright: 1500 + accent * 1100, voices: 3, spread: 10, vibrato: 0.0015, scratch: 0.5 })
    })
  }

  if (active.drums) {
    DRUMS.forEach((hit, i) => {
      if (!hit) return
      const at = t + i * s16
      if (hit === 1) drum(ctx, out.drums, at, 78, 40, 0.6, 0.42, 0.18, 600)
      else if (hit === 2) drum(ctx, out.drums, at, 130, 82, 0.32, 0.2, 0.12, 1400)
      else drum(ctx, out.drums, at, 260, 190, 0.1, 0.06, 0.12, 3800)
    })
    timpani(ctx, out.drums, t, chord.root, 0.26)
    if (b % 4 === 3) {
      // Rufo de tímpano crescendo no último tempo, puxando a próxima frase
      for (let k = 0; k < 10; k++) timpani(ctx, out.drums, t + BEAT * 2 + k * (BEAT / 10), CHORDS[(b + 1) % FORM].root, 0.05 + k * 0.022)
    }
    if (b % 8 === 0) {
      // Baque de guerra no início de cada frase
      const o = osc(ctx, 'sine', 55, t, t + 2)
      o.frequency.exponentialRampToValueAtTime(28, t + 1.2)
      o.connect(env(ctx, t, 0.004, 0.05, 1.5, 0.34)).connect(out.drums)
    }
  }

  if (active.violins) {
    // Violinos em trêmulo que incham ao longo do compasso (tensão sombria)
    for (const n of chord.triad) {
      bowed(ctx, out.violins, n + 12, t, BAR * 0.96, { peak: 0.06, attack: BAR * 0.62, release: 0.45, bright: 4200, voices: 3, spread: 14, vibrato: 0.003, tremolo: 13 })
    }
    // Segundos violinos: pulsos em spiccato nas colcheias, oitava acima do ostinato
    for (let i = 0; i < 6; i++) {
      const at = t + i * s8
      const n = chord.triad[i % 3 === 0 ? 0 : i % 3 === 1 ? 1 : 2]
      bowed(ctx, out.violins, n, at, s8 * 0.35, { peak: i % 3 === 0 ? 0.05 : 0.032, attack: 0.012, release: 0.09, bright: 3400, voices: 2, spread: 8, vibrato: 0, scratch: 0.4 })
    }
  }

  if (active.brass) {
    // Trompas graves: acorde fechado que cresce no compasso; nas cadências, trombones pesados
    for (const n of chord.triad) {
      const lp = filter(ctx, 'lowpass', 400, 1.3)
      lp.frequency.setValueAtTime(320, t)
      lp.frequency.linearRampToValueAtTime(1500, t + BAR * 0.55)
      lp.frequency.linearRampToValueAtTime(650, t + BAR)
      for (const [type, det] of [['sawtooth', -6], ['sawtooth', 6], ['square', 0]] as const) osc(ctx, type, midi(n - 12), t, t + BAR + 1, det).connect(lp)
      lp.connect(env(ctx, t, BAR * 0.45, BAR * 0.3, BAR * 0.35, 0.04)).connect(out.brass)
    }
    if (cadence) {
      const lp = filter(ctx, 'lowpass', 900, 1)
      for (const n of [chord.root + 12, chord.root + 19]) for (const det of [-4, 4]) osc(ctx, 'sawtooth', midi(n), t, t + BAR + 1, det).connect(lp)
      lp.connect(env(ctx, t, 0.06, BAR * 0.6, 0.6, 0.07)).connect(out.brass)
    }
  }

  if (active.choir) {
    // Coro "ah" grave: serras desafinadas por formantes vocálicos
    for (const n of chord.triad) {
      const mix = ctx.createGain()
      for (const det of [-9, 0, 8]) osc(ctx, 'sawtooth', midi(n - 12), t, t + BAR + 1.2, det).connect(mix)
      for (const [fq, g] of [[650, 1], [1080, 0.55], [2650, 0.16]] as const) {
        const fg = ctx.createGain()
        fg.gain.value = g
        mix.connect(filter(ctx, 'bandpass', fq, 7)).connect(fg).connect(env(ctx, t, 0.9, BAR - 1.2, 1.0, 0.13)).connect(out.choir)
      }
    }
  }

  if (active.solo) {
    // Violino solo (lírico, vibrato largo) dobrado duas oitavas abaixo pelos violoncelos
    let at = t
    for (const [n, beats] of MELODY[b]) {
      const dur = beats * BEAT
      if (n) {
        bowed(ctx, out.solo, n, at, dur * 0.97, { peak: 0.11, attack: 0.07, release: 0.35, bright: 5200, voices: 2, spread: 5, vibrato: 0.0065, scratch: 0.25 })
        bowed(ctx, out.solo, n - 24, at, dur * 0.97, { peak: 0.1, attack: 0.05, release: 0.3, bright: 1900, voices: 3, spread: 9, vibrato: 0.004, scratch: 0.3 })
      }
      at += dur
    }
    // Sino grave a cada frase de 4 compassos
    if (b % 4 === 0) {
      for (const [m, a, d] of [[1, 0.05, 3], [2.76, 0.022, 1.8], [5.4, 0.01, 0.9]] as const) osc(ctx, 'sine', midi(chord.root + 24) * m, t, t + d + 0.1).connect(env(ctx, t, 0.003, 0.01, d, a)).connect(out.solo)
    }
  }
}

// Naipes pré-renderizados: cada camada vira um loop de 16 compassos, gerado uma
// vez fora do tempo real. Tocar sete loops custa quase nada, então a trilha não
// disputa processador com o 3D (em celulares, a síntese ao vivo engasgava).

/** Taxa dos naipes: agudos até 12 kHz bastam para cordas e metais sintetizados. */
export const STEM_RATE = 24000

type OfflineFactory = (channels: number, length: number, sampleRate: number) => OfflineAudioContext

/**
 * Renderiza uma camada pela forma inteira. As caudas que passam do último
 * compasso são somadas ao início (o som é linear), então o loop não tem emenda.
 */
export async function renderStem(layer: Layer, make: OfflineFactory = (c, l, r) => new OfflineAudioContext(c, l, r), rate = STEM_RATE): Promise<Float32Array> {
  const loop = Math.round(FORM * BAR * rate)
  const tail = Math.round(3 * rate)
  const ctx = make(1, loop + tail, rate)
  const out = Object.fromEntries(LAYERS.map((l) => [l, ctx.destination])) as unknown as Record<Layer, AudioNode>
  const active = Object.fromEntries(LAYERS.map((l) => [l, l === layer])) as Record<Layer, boolean>
  for (let b = 0; b < FORM; b++) scheduleBar(ctx as unknown as BaseAudioContext, out, b, b * BAR, active)
  const full = (await ctx.startRendering()).getChannelData(0)
  const data = new Float32Array(loop)
  data.set(full.subarray(0, loop))
  for (let i = 0; i < tail; i++) data[i] += full[loop + i]
  return data
}

const stems = new Map<Layer, Promise<Float32Array>>()
let queue: Promise<unknown> = Promise.resolve()

/** Naipe em cache; as renderizações entram numa fila, na ordem em que as casas aparecem. */
export function getStem(layer: Layer): Promise<Float32Array> {
  let p = stems.get(layer)
  if (!p) {
    p = queue.then(() => renderStem(layer))
    queue = p.catch(() => undefined)
    stems.set(layer, p)
  }
  return p
}

/**
 * Trilha adaptativa: sete loops alinhados no mesmo relógio, com o volume de
 * cada camada seguindo o progresso da cidade da sua casa.
 */
export class AdaptiveScore {
  readonly bus: GainNode
  /** Volume da trilha escolhido pelo usuário (depois do ducking). */
  private readonly level: GainNode
  private readonly layerGain = {} as Record<Layer, GainNode>
  private readonly levels = {} as Record<Layer, number>
  private readonly buffers = new Map<Layer, AudioBuffer>()
  private readonly sources = new Map<Layer, AudioBufferSourceNode>()
  private readonly loopLength = FORM * BAR
  private active = false
  private preparing = false
  private t0 = 0

  constructor(private readonly ctx: AudioContext, destination: AudioNode, reverb: AudioNode) {
    this.bus = ctx.createGain()
    this.bus.gain.value = 0
    this.level = ctx.createGain()
    this.bus.connect(this.level).connect(destination)
    const toVerb = ctx.createGain()
    toVerb.gain.value = 0.5
    this.level.connect(toVerb).connect(reverb)
    for (const l of LAYERS) {
      const g = ctx.createGain()
      g.gain.value = 0
      g.connect(this.bus)
      this.layerGain[l] = g
      this.levels[l] = 0
    }
  }

  get playing(): boolean {
    return this.active
  }

  /** Quantos naipes já estão prontos (0..7). */
  get ready(): number {
    return this.buffers.size
  }

  start(): void {
    if (this.active) return
    this.active = true
    const now = this.ctx.currentTime
    this.t0 = now + 0.1
    this.bus.gain.cancelScheduledValues(now)
    this.bus.gain.setTargetAtTime(0.55, now, 1.2)
    for (const l of this.buffers.keys()) this.play(l)
    this.prepare()
  }

  stop(): void {
    if (!this.active) return
    this.active = false
    const now = this.ctx.currentTime
    this.bus.gain.cancelScheduledValues(now)
    this.bus.gain.setTargetAtTime(0, now, 0.12)
    for (const src of this.sources.values()) src.stop(now + 0.6)
    this.sources.clear()
  }

  /** Volume da trilha (0..1, já na curva de percepção). */
  setVolume(v: number): void {
    this.level.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05)
  }

  /** Volume alvo (0..1) de cada camada. */
  setLevels(levels: Partial<Record<Layer, number>>): void {
    const t = this.ctx.currentTime
    for (const l of LAYERS) {
      const v = levels[l]
      if (v === undefined || Math.abs(v - this.levels[l]) < 0.01) continue
      this.levels[l] = v
      this.layerGain[l].gain.setTargetAtTime(v, t, 0.8)
    }
  }

  /** Abaixa a trilha por um instante sob um efeito forte (ducking). */
  duck(amount = 0.55, seconds = 0.7): void {
    if (!this.active) return
    const t = this.ctx.currentTime
    this.bus.gain.cancelScheduledValues(t)
    this.bus.gain.setTargetAtTime(0.55 * amount, t, 0.04)
    this.bus.gain.setTargetAtTime(0.55, t + seconds, 0.5)
  }

  private prepare(): void {
    if (this.preparing) return
    this.preparing = true
    for (const l of LAYERS) {
      getStem(l)
        .then((data) => {
          const buf = this.ctx.createBuffer(1, data.length, STEM_RATE)
          buf.copyToChannel(data, 0)
          this.buffers.set(l, buf)
          if (this.active) this.play(l)
        })
        .catch(() => undefined)
    }
  }

  /** Começa o loop da camada na fase do relógio comum (entra alinhada com as outras). */
  private play(l: Layer): void {
    const buf = this.buffers.get(l)
    if (!buf || this.sources.has(l)) return
    const src = this.ctx.createBufferSource()
    src.buffer = buf
    src.loop = true
    src.connect(this.layerGain[l])
    const when = Math.max(this.t0, this.ctx.currentTime + 0.05)
    const offset = (((when - this.t0) % this.loopLength) + this.loopLength) % this.loopLength
    src.start(when, offset)
    this.sources.set(l, src)
  }
}
