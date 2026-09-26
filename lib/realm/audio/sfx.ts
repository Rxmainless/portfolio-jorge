/**
 * Efeitos sonoros sintetizados (Web Audio API) — nenhum arquivo de áudio,
 * tudo gerado em tempo real e original. Cada função agenda sons a partir do
 * instante `t` num contexto qualquer (inclusive OfflineAudioContext, usado
 * para validar que cada efeito produz som).
 */
export type Ctx = BaseAudioContext

const noiseCache = new WeakMap<Ctx, AudioBuffer>()

export function noiseBuffer(ctx: Ctx): AudioBuffer {
  let b = noiseCache.get(ctx)
  if (!b) {
    b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const d = b.getChannelData(0)
    let seed = 1234567
    for (let i = 0; i < d.length; i++) {
      seed = (seed * 16807) % 2147483647
      d[i] = (seed / 2147483647) * 2 - 1
    }
    noiseCache.set(ctx, b)
  }
  return b
}

function noise(ctx: Ctx, t: number, dur: number): AudioBufferSourceNode {
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(ctx)
  src.loop = true
  src.start(t, Math.random() * 1.5)
  src.stop(t + dur + 0.05)
  return src
}

/** Envelope percussivo: ataque linear, queda exponencial. */
function env(ctx: Ctx, t: number, attack: number, decay: number, peak: number): GainNode {
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(peak, t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
  return g
}

function filter(ctx: Ctx, type: BiquadFilterType, freq: number, q = 1): BiquadFilterNode {
  const f = ctx.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  f.Q.value = q
  return f
}

function osc(ctx: Ctx, type: OscillatorType, freq: number, t: number, dur: number): OscillatorNode {
  const o = ctx.createOscillator()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  o.start(t)
  o.stop(t + dur + 0.05)
  return o
}

/** Dente de engrenagem passando: estalo metálico curto. */
export function tick(ctx: Ctx, out: AudioNode, t: number, intensity = 1, pitch = 1): void {
  const f = 2300 * pitch * (0.9 + Math.random() * 0.2)
  const n = noise(ctx, t, 0.06)
  const bp = filter(ctx, 'bandpass', f, 5)
  const g = env(ctx, t, 0.001, 0.045, 0.9 * intensity)
  n.connect(bp).connect(g).connect(out)
  const ping = osc(ctx, 'sine', f * 1.4, t, 0.03)
  const pg = env(ctx, t, 0.001, 0.03, 0.09 * intensity)
  ping.connect(pg).connect(out)
}

/** Travamento de peça pesada: baque grave + clangor metálico. */
export function clunk(ctx: Ctx, out: AudioNode, t: number, weight = 1): void {
  const o = osc(ctx, 'sine', 95 / weight, t, 0.5)
  o.frequency.exponentialRampToValueAtTime(42 / weight, t + 0.2)
  o.connect(env(ctx, t, 0.004, 0.38, 0.55)).connect(out)
  const n = noise(ctx, t, 0.2)
  n.connect(filter(ctx, 'lowpass', 900)).connect(env(ctx, t, 0.002, 0.14, 0.3)).connect(out)
  const m = osc(ctx, 'square', 310 * (0.95 + Math.random() * 0.1), t, 0.25)
  m.connect(filter(ctx, 'bandpass', 1250, 6)).connect(env(ctx, t, 0.002, 0.18, 0.07)).connect(out)
}

/** Cabo tensionando: corda metálica que vibra e assenta. */
export function twang(ctx: Ctx, out: AudioNode, t: number): void {
  for (const [f, a] of [[108, 0.22], [216.8, 0.09], [327, 0.04]] as const) {
    const o = osc(ctx, 'triangle', f, t, 1.8)
    o.frequency.exponentialRampToValueAtTime(f * 0.9, t + 1.4)
    const lfo = osc(ctx, 'sine', 6.5, t, 1.8)
    const depth = ctx.createGain()
    depth.gain.setValueAtTime(f * 0.03, t)
    depth.gain.exponentialRampToValueAtTime(0.01, t + 1.5)
    lfo.connect(depth).connect(o.frequency)
    o.connect(env(ctx, t, 0.005, 1.6, a)).connect(out)
  }
  noise(ctx, t, 0.05).connect(filter(ctx, 'highpass', 2500)).connect(env(ctx, t, 0.001, 0.05, 0.12)).connect(out)
}

/** Metal deslizando (escotilha, fundação): ruído com filtro varrendo + rangido grave. */
export function scrape(ctx: Ctx, out: AudioNode, t: number, dur = 1.6, gain = 0.14): void {
  const n = noise(ctx, t, dur)
  const bp = filter(ctx, 'bandpass', 500, 4)
  bp.frequency.setValueAtTime(500, t)
  bp.frequency.linearRampToValueAtTime(1500, t + dur)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(gain, t + 0.18)
  g.gain.setValueAtTime(gain, t + dur - 0.3)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  n.connect(bp).connect(g).connect(out)
  const grind = osc(ctx, 'sawtooth', 38, t, dur)
  const gg = ctx.createGain()
  gg.gain.setValueAtTime(0.0001, t)
  gg.gain.linearRampToValueAtTime(gain * 0.55, t + 0.25)
  gg.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  grind.connect(filter(ctx, 'lowpass', 160)).connect(gg).connect(out)
}

/** Catraca acelerando (arranque das engrenagens). */
export function ratchet(ctx: Ctx, out: AudioNode, t: number, count = 18, from = 0.13, to = 0.035, pitch = 1): void {
  let at = t
  for (let i = 0; i < count; i++) {
    tick(ctx, out, at, 0.6 + (i / count) * 0.5, pitch)
    at += from + (to - from) * (i / (count - 1))
  }
}

/** Motor acelerando: zumbido que sobe. */
export function whine(ctx: Ctx, out: AudioNode, t: number, dur = 1.6): void {
  const o = osc(ctx, 'sawtooth', 70, t, dur)
  o.frequency.exponentialRampToValueAtTime(170, t + dur)
  o.connect(filter(ctx, 'bandpass', 420, 2)).connect(env(ctx, t, dur * 0.7, dur * 0.5, 0.16)).connect(out)
}

/** Sino de latão (cidade completa): parciais inarmônicas com cauda longa. */
export function bell(ctx: Ctx, out: AudioNode, t: number, base = 196): void {
  const partials: [number, number, number][] = [
    [1, 0.3, 3.6],
    [2.0, 0.16, 2.6],
    [2.76, 0.12, 2.2],
    [5.4, 0.06, 1.3],
    [8.93, 0.03, 0.8],
  ]
  for (const [m, a, d] of partials) osc(ctx, 'sine', base * m, t, d).connect(env(ctx, t, 0.003, d, a)).connect(out)
  // Tremular do estandarte sendo içado
  const n = noise(ctx, t + 0.15, 0.9)
  const bp = filter(ctx, 'bandpass', 380, 1.5)
  bp.frequency.setValueAtTime(380, t + 0.15)
  bp.frequency.linearRampToValueAtTime(900, t + 1)
  n.connect(bp).connect(env(ctx, t + 0.15, 0.3, 0.6, 0.05)).connect(out)
}

/** Rebobinar (scroll para cima): catraca descendo. */
export function rewind(ctx: Ctx, out: AudioNode, t: number): void {
  ratchet(ctx, out, t, 8, 0.05, 0.09, 0.75)
}

/** Clique de interface (menu, som ligado). */
export function uiClick(ctx: Ctx, out: AudioNode, t: number): void {
  tick(ctx, out, t, 0.7, 1.6)
  osc(ctx, 'sine', 880, t, 0.12).connect(env(ctx, t, 0.002, 0.1, 0.05)).connect(out)
}

/** Etapas da construção → efeito. */
export const STAGE_SFX: Record<string, (ctx: Ctx, out: AudioNode, t: number) => void> = {
  gears: (c, o, t) => {
    ratchet(c, o, t)
    whine(c, o, t + 0.1)
  },
  mechanism: (c, o, t) => {
    for (let i = 0; i < 3; i++) tick(c, o, t + i * 0.16, 0.9, 1.8)
    noise(c, t + 0.45, 0.3).connect(filter(c, 'highpass', 3200)).connect(env(c, t + 0.45, 0.01, 0.28, 0.07)).connect(o)
    clunk(c, o, t + 0.5, 0.7)
  },
  cables: (c, o, t) => twang(c, o, t),
  hatch: (c, o, t) => {
    clunk(c, o, t, 1.1)
    scrape(c, o, t + 0.3, 1.7)
  },
  platform: (c, o, t) => {
    clunk(c, o, t, 1.3)
    ratchet(c, o, t + 0.2, 10, 0.1, 0.06, 0.8)
  },
  foundation: (c, o, t) => {
    scrape(c, o, t, 0.9, 0.1)
    clunk(c, o, t + 0.9, 1.4)
  },
  tower: (c, o, t) => {
    ratchet(c, o, t, 8, 0.08, 0.05, 1.2)
    clunk(c, o, t + 0.55, 0.9)
  },
  buildings: (c, o, t) => {
    for (let i = 0; i < 3; i++) clunk(c, o, t + i * 0.32, 0.8)
  },
  complete: (c, o, t) => bell(c, o, t),
}
