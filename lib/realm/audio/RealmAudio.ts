import { AdaptiveScore, LAYERS, type Layer } from './score'
import { noiseBuffer, rewind, STAGE_SFX, tick, uiClick } from './sfx'

/** Interface que a cena 3D usa para pedir sons (a cena não conhece Web Audio). */
export interface RealmSoundSink {
  /** Uma etapa da construção da cidade `site` começou (scroll para baixo). */
  stage(stageId: string, site: number): void
  /** Scroll para cima desmontando a cidade. */
  rewind(): void
  /** Dente de engrenagem passando (0..1). */
  tick(intensity: number): void
  /** Níveis contínuos: máquina trabalhando e câmera em voo (0..1). */
  setActivity(machine: number, flight: number): void
  /** Progresso de construção de cada cidade (0..1), na ordem das casas. Conduz a trilha. */
  setBuildLevels(progress: number[]): void
}

/**
 * Áudio do reino. Tudo sintetizado. O AudioContext só é criado/retomado após
 * um gesto do usuário (política de autoplay dos navegadores).
 */
export type VolumeKind = 'master' | 'music' | 'sfx'
export type Volumes = Record<VolumeKind, number>
export const DEFAULT_VOLUMES: Volumes = { master: 0.8, music: 0.75, sfx: 0.85 }

/** Curva de percepção: o controle deslizante é linear, o ouvido não. */
const curve = (v: number) => Math.max(0, Math.min(1, v)) ** 2

export class RealmAudio implements RealmSoundSink {
  private vol: Volumes = { ...DEFAULT_VOLUMES }
  private ctx: AudioContext | null = null
  private master!: GainNode
  private sfx!: GainNode
  private motor!: GainNode
  private wind!: GainNode
  private windFilter!: BiquadFilterNode
  private motorFilter!: BiquadFilterNode
  private enabled = false
  private lastTick = 0
  private lastRewind = 0
  private lastStage = new Map<string, number>()
  private lastAnyStage = -9
  private lastSite = -1
  private machine = 0
  private flight = 0
  private score: AdaptiveScore | null = null
  private readonly onVisibility = () => {
    if (!this.score) return
    if (document.hidden) this.score.stop()
    else if (this.enabled) this.revive()
  }
  // O sistema pode suspender o áudio (outra mídia, chamada, economia de energia).
  // Com o som ligado, o próximo toque na tela retoma de onde parou.
  private readonly onGesture = () => {
    if (this.enabled && this.ctx && this.ctx.state !== 'running') this.revive()
  }
  private readonly onStateChange = () => {
    if (this.enabled && this.ctx?.state === 'running' && !document.hidden) this.score?.start()
  }

  private revive(): void {
    const ctx = this.ctx
    if (!ctx) return
    ctx.resume().catch(() => undefined).then(() => {
      if (this.enabled && ctx.state === 'running' && !document.hidden) this.score?.start()
    })
  }

  get isEnabled(): boolean {
    return this.enabled
  }

  /** Liga o som. Precisa ser chamado dentro de um evento de clique/tecla. */
  async enable(): Promise<boolean> {
    if (typeof window === 'undefined') return false
    if (!this.ctx) this.build()
    const ctx = this.ctx!
    if (ctx.state !== 'running') await ctx.resume().catch(() => undefined)
    this.enabled = ctx.state === 'running'
    if (this.enabled) {
      this.master.gain.cancelScheduledValues(ctx.currentTime)
      this.master.gain.setTargetAtTime(this.masterLevel, ctx.currentTime, 0.25)
      uiClick(ctx, this.sfx, ctx.currentTime + 0.02)
      this.score?.start()
    }
    return this.enabled
  }

  disable(): void {
    this.enabled = false
    this.score?.stop()
    if (!this.ctx) return
    const t = this.ctx.currentTime
    this.master.gain.cancelScheduledValues(t)
    this.master.gain.setTargetAtTime(0, t, 0.15)
    const ctx = this.ctx
    window.setTimeout(() => {
      if (!this.enabled) ctx.suspend().catch(() => undefined)
    }, 600)
  }

  get volumes(): Volumes {
    return { ...this.vol }
  }

  /** Regulador de som: geral, trilha e efeitos (0..1). Vale antes mesmo de ligar. */
  setVolume(kind: VolumeKind, v: number): void {
    this.vol[kind] = Math.max(0, Math.min(1, v))
    if (!this.ctx) return
    const t = this.ctx.currentTime
    if (kind === 'master' && this.enabled) this.master.gain.setTargetAtTime(this.masterLevel, t, 0.05)
    if (kind === 'music') this.score?.setVolume(curve(this.vol.music))
    if (kind === 'sfx') this.sfx.gain.setTargetAtTime(0.9 * curve(this.vol.sfx), t, 0.05)
  }

  private get masterLevel(): number {
    return 1.33 * curve(this.vol.master)
  }

  ui(): void {
    if (this.enabled && this.ctx) uiClick(this.ctx, this.sfx, this.ctx.currentTime)
  }

  // RealmSoundSink

  stage(stageId: string, site = 0): void {
    const fx = STAGE_SFX[stageId]
    if (!this.enabled || !this.ctx || !fx) return
    const now = this.ctx.currentTime
    const key = `${site}:${stageId}`
    // Evita repetir a mesma etapa se o usuário oscilar o scroll no limiar
    if (now - (this.lastStage.get(key) ?? -9) < 0.6) return
    // Etapas quase simultâneas viram um som só
    if (now - this.lastAnyStage < 0.12) return
    // Voo rápido (menu, arrastar a barra) atravessando outra cidade logo em seguida: silêncio
    if (site !== this.lastSite && now - this.lastAnyStage < 1.2) return
    this.lastAnyStage = now
    this.lastSite = site
    this.lastStage.set(key, now)
    fx(this.ctx, this.sfx, now + 0.01)
    // A trilha abre espaço para os baques e o sino
    if (stageId !== 'gears' && stageId !== 'cables') this.score?.duck(stageId === 'complete' ? 0.45 : 0.7, stageId === 'complete' ? 1.6 : 0.6)
  }

  rewind(): void {
    if (!this.enabled || !this.ctx) return
    const now = this.ctx.currentTime
    if (now - this.lastRewind < 0.5) return
    this.lastRewind = now
    rewind(this.ctx, this.sfx, now)
  }

  tick(intensity: number): void {
    if (!this.enabled || !this.ctx) return
    const now = this.ctx.currentTime
    if (now - this.lastTick < 1 / 28) return
    this.lastTick = now
    tick(this.ctx, this.sfx, now, 0.35 + intensity * 0.5, 0.8 + intensity * 0.4)
  }

  setActivity(machine: number, flight: number): void {
    if (!this.ctx) return
    this.machine += (machine - this.machine) * 0.15
    this.flight += (flight - this.flight) * 0.1
    if (!this.enabled) return
    const t = this.ctx.currentTime
    const fx = curve(this.vol.sfx)
    this.motor.gain.setTargetAtTime(this.machine * 0.22 * fx, t, 0.08)
    this.motorFilter.frequency.setTargetAtTime(160 + this.machine * 380, t, 0.1)
    this.wind.gain.setTargetAtTime((0.012 + this.flight * 0.12) * fx, t, 0.2)
    this.windFilter.frequency.setTargetAtTime(280 + this.flight * 900, t, 0.25)
  }

  /** Cada cidade construída acrescenta sua camada; a base (pedal) soa sempre. */
  setBuildLevels(progress: number[]): void {
    if (!this.score) return
    const levels: Partial<Record<Layer, number>> = { drone: 1 }
    LAYERS.slice(1).forEach((l, i) => {
      const p = progress[i] ?? 0
      // A camada começa a entrar na metade da obra e está plena quando a cidade fica pronta
      levels[l] = Math.max(0, Math.min(1, (p - 0.45) / 0.55))
    })
    this.score.setLevels(levels)
  }

  dispose(): void {
    document.removeEventListener('visibilitychange', this.onVisibility)
    window.removeEventListener('pointerdown', this.onGesture)
    window.removeEventListener('touchend', this.onGesture)
    window.removeEventListener('keydown', this.onGesture)
    if (this.ctx) this.ctx.onstatechange = null
    this.score?.stop()
    this.ctx?.close().catch(() => undefined)
    this.ctx = null
  }

  // Grafo

  private build(): void {
    const ctx = new AudioContext({ latencyHint: 'interactive' })
    this.ctx = ctx
    this.master = ctx.createGain()
    this.master.gain.value = 0
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -16
    comp.ratio.value = 4
    comp.attack.value = 0.004
    comp.release.value = 0.25
    this.master.connect(comp).connect(ctx.destination)

    // Reverb de salão de pedra: resposta ao impulso gerada (ruído com queda exponencial)
    const reverb = ctx.createConvolver()
    reverb.buffer = this.impulse(ctx, 2.8)
    const wet = ctx.createGain()
    wet.gain.value = 0.32
    reverb.connect(wet).connect(this.master)

    this.sfx = ctx.createGain()
    this.sfx.gain.value = 0.9 * curve(this.vol.sfx)
    this.sfx.connect(this.master)
    this.sfx.connect(reverb)

    // Motor contínuo: segue a velocidade de construção (scroll)
    this.motorFilter = ctx.createBiquadFilter()
    this.motorFilter.type = 'lowpass'
    this.motorFilter.frequency.value = 180
    this.motor = ctx.createGain()
    this.motor.gain.value = 0
    for (const [type, f, g] of [['sawtooth', 46, 0.6], ['square', 92.5, 0.25], ['sine', 30, 0.8]] as const) {
      const o = ctx.createOscillator()
      o.type = type
      o.frequency.value = f
      const og = ctx.createGain()
      og.gain.value = g
      o.connect(og).connect(this.motorFilter)
      o.start()
    }
    const rumble = ctx.createBufferSource()
    rumble.buffer = noiseBuffer(ctx)
    rumble.loop = true
    const rg = ctx.createGain()
    rg.gain.value = 0.35
    rumble.connect(rg).connect(this.motorFilter)
    rumble.start()
    this.motorFilter.connect(this.motor).connect(this.master)

    // Vento: fundo discreto que cresce nos voos entre as casas
    const air = ctx.createBufferSource()
    air.buffer = noiseBuffer(ctx)
    air.loop = true
    this.windFilter = ctx.createBiquadFilter()
    this.windFilter.type = 'bandpass'
    this.windFilter.frequency.value = 300
    this.windFilter.Q.value = 0.7
    this.wind = ctx.createGain()
    this.wind.gain.value = 0.012
    air.connect(this.windFilter).connect(this.wind).connect(this.master)
    this.wind.connect(reverb)
    air.start()

    this.score = new AdaptiveScore(ctx, this.master, reverb)
    this.score.setVolume(curve(this.vol.music))
    document.addEventListener('visibilitychange', this.onVisibility)
    ctx.onstatechange = this.onStateChange
    window.addEventListener('pointerdown', this.onGesture, { passive: true })
    window.addEventListener('touchend', this.onGesture, { passive: true })
    window.addEventListener('keydown', this.onGesture)
  }

  private impulse(ctx: BaseAudioContext, seconds: number): AudioBuffer {
    const len = Math.floor(ctx.sampleRate * seconds)
    const buf = ctx.createBuffer(2, len, ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch)
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2)
    }
    return buf
  }
}
