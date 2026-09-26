import { OfflineAudioContext } from 'node-web-audio-api'
import { describe, expect, it } from 'vitest'
import { BAR, BEATS_PER_BAR, CHORDS, FORM, LAYERS, MELODY, STEM_RATE, renderStem, scheduleBar, type Layer } from '@/lib/realm/audio/score'
import { STAGE_SFX } from '@/lib/realm/audio/sfx'

const SR = 22050

/** Mede pico, RMS e amostras inválidas de um buffer renderizado. */
function measure(data: Float32Array) {
  let peak = 0
  let sum = 0
  let bad = 0
  for (const x of data) {
    if (!Number.isFinite(x)) bad++
    else {
      peak = Math.max(peak, Math.abs(x))
      sum += x * x
    }
  }
  return { peak, rms: Math.sqrt(sum / data.length), bad }
}

async function renderScore(layers: readonly Layer[], bars = FORM) {
  const ctx = new OfflineAudioContext(1, Math.ceil(SR * (bars * BAR + 3)), SR)
  const out = Object.fromEntries(LAYERS.map((l) => [l, ctx.destination])) as unknown as Record<Layer, AudioNode>
  const active = Object.fromEntries(LAYERS.map((l) => [l, layers.includes(l)])) as Record<Layer, boolean>
  for (let b = 0; b < bars; b++) scheduleBar(ctx as unknown as BaseAudioContext, out, b, 0.05 + b * BAR, active)
  return measure((await ctx.startRendering()).getChannelData(0))
}

describe('Tema do Reino', () => {
  it('tem 16 compassos de harmonia e de melodia, cada compasso com 3 tempos', () => {
    expect(CHORDS).toHaveLength(FORM)
    expect(MELODY).toHaveLength(FORM)
    for (const bar of MELODY) expect(bar.reduce((s, [, beats]) => s + beats, 0)).toBeCloseTo(BEATS_PER_BAR)
  })

  it.each(LAYERS)('camada %s soa sozinha, sem valores inválidos nem clipping', async (layer) => {
    const m = await renderScore([layer])
    expect(m.bad).toBe(0)
    expect(m.rms).toBeGreaterThan(0.01)
    expect(m.peak).toBeLessThan(0.9)
  })

  it('a orquestra completa fica abaixo de 0,9 de pico em toda a forma', async () => {
    const m = await renderScore(LAYERS)
    expect(m.bad).toBe(0)
    expect(m.peak).toBeLessThan(0.9)
  })

  it('nenhuma camada domina a mixagem (RMS dentro de 3× entre si)', async () => {
    const rms = await Promise.all(LAYERS.map(async (l) => (await renderScore([l], 4)).rms))
    expect(Math.max(...rms) / Math.min(...rms)).toBeLessThan(3)
  })
})

describe('efeitos da construção', () => {
  it.each(Object.keys(STAGE_SFX))('%s é audível e não satura', async (id) => {
    const ctx = new OfflineAudioContext(1, SR * 4, SR)
    STAGE_SFX[id](ctx as unknown as BaseAudioContext, ctx.destination, 0.05)
    const m = measure((await ctx.startRendering()).getChannelData(0))
    expect(m.bad).toBe(0)
    expect(m.peak).toBeGreaterThan(0.01)
    expect(m.peak).toBeLessThan(0.95)
  })
})

describe('naipes pré-renderizados', () => {
  const make = (c: number, l: number, r: number) => new OfflineAudioContext(c, l, r) as unknown as globalThis.OfflineAudioContext

  it('têm a duração exata da forma e não saturam', async () => {
    const data = await renderStem('cello', make)
    expect(data.length).toBe(Math.round(FORM * BAR * STEM_RATE))
    expect(measure(data).bad).toBe(0)
    expect(measure(data).peak).toBeLessThan(0.9)
  })

  it('o loop não tem emenda: igual à segunda volta de duas formas seguidas', async () => {
    // Camadas sem ruído (o ruído muda a cada contexto): comparação amostra a amostra
    for (const layer of ['drone', 'brass'] as const) {
      const stem = await renderStem(layer, make)
      const ctx = new OfflineAudioContext(1, Math.round(2 * FORM * BAR * STEM_RATE), STEM_RATE)
      const out = Object.fromEntries(LAYERS.map((l) => [l, ctx.destination])) as unknown as Record<Layer, AudioNode>
      const active = Object.fromEntries(LAYERS.map((l) => [l, l === layer])) as Record<Layer, boolean>
      for (let b = 0; b < 2 * FORM; b++) scheduleBar(ctx as unknown as BaseAudioContext, out, b, b * BAR, active)
      const two = (await ctx.startRendering()).getChannelData(0)
      const second = two.subarray(stem.length, 2 * stem.length)
      let maxDiff = 0
      for (let i = 0; i < stem.length; i += 7) maxDiff = Math.max(maxDiff, Math.abs(second[i] - stem[i]))
      // Resta só o arredondamento dos inícios de compasso na grade de amostras (cerca de -40 dB)
      expect(maxDiff).toBeLessThan(5e-3)
    }
  })
})
