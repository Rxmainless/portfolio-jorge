/**
 * Trilha adaptativa original — "Tema do Reino".
 * Ré menor, 72 bpm, 4/4, progressão Dm – B♭ – Gm – A (i – VI – iv – V).
 * Composição própria e sintetizada; cada camada entra quando a cidade da sua
 * casa é construída, então o reino completo soa como a orquestra completa.
 *
 * `scheduleBar` é uma função pura sobre qualquer BaseAudioContext, para poder
 * ser renderizada offline na validação.
 */
import { noiseBuffer, type Ctx } from './sfx'

export const BPM = 72
export const BEAT = 60 / BPM
export const BAR = BEAT * 4
export const LAYERS = ['drone', 'cello', 'drums', 'harp', 'brass', 'choir', 'solo'] as const
export type Layer = (typeof LAYERS)[number]

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12)

/** Acordes (MIDI): fundamental grave + tríade. */
const CHORDS: { root: number; triad: number[] }[] = [
  { root: 38, triad: [62, 65, 69] }, // Dm
  { root: 34, triad: [58, 62, 65] }, // B♭
  { root: 31, triad: [55, 58, 62] }, // Gm
  { root: 33, triad: [57, 61, 64] }, // A (dominante maior, sabor harmônico)
]

/** Ostinato de violoncelo em colcheias (graus relativos à fundamental + oitava). */
const CELLO = [0, 12, 7, 12, 0, 12, 10, 7]
/** Harpa: arpejo em semicolcheias sobre a tríade (índices 0-2, +3 = oitava acima). */
const HARP = [0, 1, 2, 4, 2, 1, 0, 1, 2, 4, 5, 4, 2, 1, 0, 2]
/** Tambores: 1 = grave, 2 = médio, 0 = pausa (semicolcheias). */
const DRUMS = [1, 0, 0, 0, 2, 0, 1, 0, 1, 0, 0, 2, 2, 0, 1, 1]
/** Melodia solo (8 compassos, MIDI por semínima; 0 = pausa). */
const SOLO = [
  [74, 0, 72, 74],
  [77, 0, 0, 76],
  [74, 0, 70, 72],
  [73, 0, 0, 0],
  [69, 72, 74, 0],
  [77, 76, 74, 72],
  [74, 0, 0, 70],
  [69, 0, 0, 0],
]

function voice(ctx: Ctx, type: OscillatorType, freq: number, t: number, dur: number, detune = 0): OscillatorNode {
  const o = ctx.createOscillator()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  o.detune.value = detune
  o.start(t)
  o.stop(t + dur + 0.1)
  return o
}

function adsr(ctx: Ctx, t: number, a: number, hold: number, r: number, peak: number): GainNode {
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(peak, t + a)
  g.gain.setValueAtTime(peak, t + a + hold)
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + r)
  return g
}

function lp(ctx: Ctx, f: number, q = 0.7): BiquadFilterNode {
  const b = ctx.createBiquadFilter()
  b.type = 'lowpass'
  b.frequency.value = f
  b.Q.value = q
  return b
}

/**
 * Agenda um compasso (índice `bar`) a partir de `t`. `out` recebe um destino por
 * camada, já com o volume da camada aplicado pelo chamador.
 */
export function scheduleBar(ctx: Ctx, out: Record<Layer, AudioNode>, bar: number, t: number, active: Record<Layer, boolean>): void {
  const chord = CHORDS[bar % 4]
  const s8 = BEAT / 2
  const s16 = BEAT / 4

  if (active.drone) {
    // Pedal: fundamental + quinta, cordas graves filtradas, respirando
    for (const [n, a] of [[chord.root, 0.16], [chord.root + 7, 0.07], [chord.root + 12, 0.05]] as const) {
      const f = lp(ctx, 380)
      for (const det of [-7, 6]) voice(ctx, 'sawtooth', midi(n), t, BAR, det).connect(f)
      f.connect(adsr(ctx, t, 0.9, BAR - 1.2, 0.9, a)).connect(out.drone)
    }
  }

  if (active.cello) {
    CELLO.forEach((deg, i) => {
      const at = t + i * s8
      const f = lp(ctx, 900, 2)
      f.frequency.setValueAtTime(1500, at)
      f.frequency.exponentialRampToValueAtTime(420, at + s8 * 1.6)
      voice(ctx, 'sawtooth', midi(chord.root + 12 + deg), at, s8 * 1.7).connect(f)
      f.connect(adsr(ctx, at, 0.012, s8 * 0.6, s8 * 1.1, 0.13)).connect(out.cello)
    })
  }

  if (active.drums) {
    DRUMS.forEach((hit, i) => {
      if (!hit) return
      const at = t + i * s16
      const big = hit === 1
      const o = voice(ctx, 'sine', big ? 70 : 115, at, 0.5)
      o.frequency.exponentialRampToValueAtTime(big ? 38 : 70, at + 0.25)
      o.connect(adsr(ctx, at, 0.003, 0.02, big ? 0.55 : 0.28, big ? 0.4 : 0.22)).connect(out.drums)
      const n = ctx.createBufferSource()
      n.buffer = noiseBuffer(ctx)
      n.start(at, (i * 0.137) % 1.5)
      n.stop(at + 0.2)
      n.connect(lp(ctx, big ? 700 : 1600)).connect(adsr(ctx, at, 0.002, 0.01, 0.12, big ? 0.16 : 0.1)).connect(out.drums)
    })
  }

  if (active.harp) {
    const notes = [...chord.triad, ...chord.triad.map((n) => n + 12)]
    HARP.forEach((idx, i) => {
      const at = t + i * s16
      const f = midi(notes[idx % notes.length])
      voice(ctx, 'triangle', f, at, 1.2).connect(adsr(ctx, at, 0.004, 0.02, 1.0, 0.1)).connect(out.harp)
      voice(ctx, 'sine', f * 2, at, 0.6).connect(adsr(ctx, at, 0.002, 0.01, 0.4, 0.018)).connect(out.harp)
    })
  }

  if (active.brass) {
    // Metais: acordes que incham em mínimas
    for (let half = 0; half < 2; half++) {
      const at = t + half * BEAT * 2
      const f = lp(ctx, 500, 1.2)
      f.frequency.setValueAtTime(400, at)
      f.frequency.linearRampToValueAtTime(1500, at + BEAT * 1.2)
      f.frequency.linearRampToValueAtTime(700, at + BEAT * 2)
      for (const n of chord.triad) for (const det of [-5, 5]) voice(ctx, 'sawtooth', midi(n - 12), at, BEAT * 2.2, det).connect(f)
      f.connect(adsr(ctx, at, BEAT * 0.8, BEAT * 0.7, BEAT * 0.6, 0.045)).connect(out.brass)
    }
  }

  if (active.choir) {
    // Coro "ah": serras desafinadas por formantes vocálicos
    for (const n of chord.triad) {
      const mix = ctx.createGain()
      mix.gain.value = 1
      for (const det of [-9, 0, 8]) voice(ctx, 'sawtooth', midi(n), t, BAR, det).connect(mix)
      for (const [fq, g] of [[750, 1], [1150, 0.6], [2600, 0.18]] as const) {
        const bp = ctx.createBiquadFilter()
        bp.type = 'bandpass'
        bp.frequency.value = fq
        bp.Q.value = 7
        const fg = ctx.createGain()
        fg.gain.value = g
        mix.connect(bp).connect(fg).connect(adsr(ctx, t, 1.1, BAR - 1.6, 1.0, 0.11)).connect(out.choir)
      }
    }
  }

  if (active.solo) {
    SOLO[bar % 8].forEach((n, i) => {
      if (!n) return
      const at = t + i * BEAT
      // Duração: até a próxima nota (pausas prolongam)
      let len = 1
      const row = SOLO[bar % 8]
      while (i + len < 4 && !row[i + len]) len++
      const dur = len * BEAT
      const o = voice(ctx, 'sine', midi(n), at, dur)
      const vib = voice(ctx, 'sine', 5.2, at, dur)
      const depth = ctx.createGain()
      depth.gain.setValueAtTime(0, at)
      depth.gain.linearRampToValueAtTime(midi(n) * 0.012, at + dur * 0.6)
      vib.connect(depth).connect(o.frequency)
      const h = voice(ctx, 'triangle', midi(n) * 2, at, dur)
      const g = adsr(ctx, at, 0.09, dur * 0.55, dur * 0.4, 0.1)
      o.connect(g)
      h.connect(adsr(ctx, at, 0.09, dur * 0.5, dur * 0.4, 0.012)).connect(g)
      g.connect(out.solo)
    })
    // Sino no primeiro tempo a cada 2 compassos
    if (bar % 2 === 0) {
      const at = t
      for (const [m, a, d] of [[1, 0.05, 2.4], [2.76, 0.025, 1.5], [5.4, 0.012, 0.8]] as const) voice(ctx, 'sine', midi(chord.root + 36) * m, at, d).connect(adsr(ctx, at, 0.003, 0.01, d, a)).connect(out.solo)
    }
  }
}

/**
 * Motor da trilha em tempo real: agenda compassos com antecedência e ajusta o
 * volume de cada camada conforme o progresso das cidades.
 */
export class AdaptiveScore {
  readonly bus: GainNode
  private readonly layerGain = {} as Record<Layer, GainNode>
  private readonly levels = {} as Record<Layer, number>
  private timer: number | null = null
  private nextBarTime = 0
  private bar = 0

  constructor(private readonly ctx: AudioContext, destination: AudioNode, reverb: AudioNode) {
    this.bus = ctx.createGain()
    this.bus.gain.value = 0
    this.bus.connect(destination)
    const toVerb = ctx.createGain()
    toVerb.gain.value = 0.55
    this.bus.connect(toVerb).connect(reverb)
    for (const l of LAYERS) {
      const g = ctx.createGain()
      g.gain.value = 0
      g.connect(this.bus)
      this.layerGain[l] = g
      this.levels[l] = 0
    }
  }

  get playing(): boolean {
    return this.timer !== null
  }

  start(): void {
    if (this.timer !== null) return
    const now = this.ctx.currentTime
    this.nextBarTime = now + 0.1
    this.bus.gain.cancelScheduledValues(now)
    this.bus.gain.setTargetAtTime(0.55, now, 1.2)
    this.tick()
    this.timer = window.setInterval(() => this.tick(), 50)
  }

  stop(): void {
    if (this.timer === null) return
    window.clearInterval(this.timer)
    this.timer = null
    this.bus.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4)
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
    if (!this.playing) return
    const t = this.ctx.currentTime
    this.bus.gain.cancelScheduledValues(t)
    this.bus.gain.setTargetAtTime(0.55 * amount, t, 0.04)
    this.bus.gain.setTargetAtTime(0.55, t + seconds, 0.5)
  }

  private tick(): void {
    // Agenda até 1,5 compasso à frente; camadas quase mudas não geram notas
    while (this.nextBarTime < this.ctx.currentTime + BAR * 1.5) {
      const active = {} as Record<Layer, boolean>
      for (const l of LAYERS) active[l] = this.levels[l] > 0.02
      scheduleBar(this.ctx, this.layerGain, this.bar, this.nextBarTime, active)
      this.nextBarTime += BAR
      this.bar++
    }
  }
}
