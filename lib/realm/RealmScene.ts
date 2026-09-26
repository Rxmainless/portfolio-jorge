import * as THREE from 'three'
import gsap from 'gsap'
import { houses, roads, type House } from '../realm-data'
import { setupEnvironment } from './scene/environment'
import { createLighting, focusShadow, type SceneLights } from './scene/lighting'
import { palette as enginePalette } from './scene/materials'
import type { RealmSoundSink } from './audio/RealmAudio'
import { buildConstructionTimeline, type Stage } from './systems/CityConstructionSystem'
import type { SkillCityConfig } from './types/skill'
import { Banner } from './world/Banner'
import { mesh, slabWithHoles } from './world/geometry'
import { GROUND_T, SkillSite } from './world/SkillSite'
import { Continent } from './world/terrain/Continent'

type V3 = THREE.Vector3Tuple

export interface Pose {
  position: THREE.Vector3
  target: THREE.Vector3
}

export interface RealmSceneOptions {
  mode: 'journey' | 'preview'
  /** Lado em que o conteúdo da seção fica (a cidade é deslocada para o lado oposto). */
  panelSide?: ('left' | 'right')[]
}

function houseToConfig(h: House): SkillCityConfig {
  return {
    id: h.section,
    name: h.seat,
    category: h.house,
    description: h.words,
    position: { x: h.position.x, y: 0, z: h.position.z },
    complexity: h.complexity,
    color: h.color,
    archetype: h.archetype,
  }
}

/**
 * Cena do reino. No modo "journey" nada anda sozinho além da máquina ociosa:
 * câmera e construção são funções da posição de scroll (GSAP ScrollTrigger),
 * então rolar para cima desmonta — a animação é reversível e determinística.
 */
export class RealmScene {
  readonly renderer: THREE.WebGLRenderer
  readonly scene = new THREE.Scene()
  readonly camera = new THREE.PerspectiveCamera(36, 1, 0.5, 900)
  readonly sites: SkillSite[] = []
  readonly banners: Banner[] = []
  readonly continent: Continent | null = null
  private readonly builds: { tl: gsap.core.Timeline; progress: number; stages: Stage[] }[] = []
  private readonly lights: SceneLights
  private readonly shaftLight = new THREE.PointLight(enginePalette.amber, 0, 20, 1.4)
  private readonly disposeEnv: () => void
  private readonly ro: ResizeObserver
  private readonly io: IntersectionObserver
  private visible = true
  private readonly desired: Pose = { position: new THREE.Vector3(), target: new THREE.Vector3() }
  private readonly current: Pose = { position: new THREE.Vector3(), target: new THREE.Vector3() }
  private stops: Pose[] = []
  private journey = 0
  private focusIndex = -2
  private readonly pointer = new THREE.Vector2()
  private readonly pointerSmooth = new THREE.Vector2()
  private time = 0
  private frameCount = 0
  private previewLoop: gsap.core.Timeline | null = null
  private sound: RealmSoundSink | null = null
  private readonly lastDrive: number[] = []
  private readonly lastBuild: number[] = []
  private readonly tickAcc: number[] = []
  private readonly prevCam = new THREE.Vector3()
  private readonly reduced: boolean
  private readonly tmp = new THREE.Vector3()
  // Qualidade adaptativa: resolução e sombras caem se o aparelho não sustenta ~40 fps
  private pixelRatio: number
  private perfAcc = 0
  private perfFrames = 0
  private perfWarmup = 3
  private readonly onPointer = (e: PointerEvent) => this.pointer.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1)
  private readonly tick = (_t: number, dms: number) => this.frame(Math.min(dms / 1000, 0.1))

  constructor(private readonly container: HTMLElement, private readonly opts: RealmSceneOptions) {
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', stencil: true })
    const coarse = window.matchMedia('(pointer: coarse)').matches
    this.pixelRatio = Math.min(window.devicePixelRatio, opts.mode === 'preview' || coarse ? 1.5 : 1.75)
    this.renderer.setPixelRatio(this.pixelRatio)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.renderer.shadowMap.autoUpdate = false
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    container.appendChild(this.renderer.domElement)

    this.disposeEnv = setupEnvironment(this.scene, this.renderer)
    this.scene.background = new THREE.Color(0x0b0a09)
    ;(this.scene.fog as THREE.FogExp2).color.set(0x0d0b09)
    this.lights = createLighting(this.scene)
    this.lights.key.color.set(0xffd9a8)
    this.lights.ambient.color.set(0x8a7f70)
    this.scene.add(this.shaftLight)

    const list = opts.mode === 'preview' ? houses.filter((h) => h.section === 'formacao') : houses
    for (const h of list) {
      const site = new SkillSite(houseToConfig(h))
      if (opts.mode === 'preview') site.position.set(0, 0, 0)
      this.scene.add(site)
      this.sites.push(site)
      const { timeline, stages } = buildConstructionTimeline(site)
      timeline.progress(0).pause()
      site.reset()
      this.builds.push({ tl: timeline, progress: 0, stages })

      const banner = new Banner(h.sigil, h.color, h.metal, h.cloth)
      // Na lateral do poço (entre os mastros), para não encobrir a cidade
      banner.position.set(site.position.x - (site.pitHalf + 2.4), 0, site.position.z + 0.6)
      this.scene.add(banner)
      this.banners.push(banner)
    }

    if (opts.mode === 'journey') {
      this.continent = new Continent(this.sites, roads)
      this.scene.add(this.continent)
      this.stops = this.computeStops()
      this.journey = -1
      this.applyPose(this.poseAt(-1), true)
    } else {
      const s = this.sites[0]
      const ground = mesh(slabWithHoles(120, 120, GROUND_T, [{ x: 0, z: 0, w: s.pitHalf * 2, d: s.pitHalf * 2 }]), new THREE.MeshStandardMaterial({ color: 0x2a241b, roughness: 0.95 }), false, true)
      this.scene.add(ground)
      focusShadow(this.lights, new THREE.Vector3(), s.radius + 4)
      const top = s.city.topHeight
      this.applyPose({ position: new THREE.Vector3(14, top * 1.0 + 4, 22), target: new THREE.Vector3(0, top * 0.38, -1) }, true)
      this.startPreviewLoop()
    }
    this.renderer.shadowMap.needsUpdate = true

    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(container)
    this.io = new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting
      this.previewLoop?.paused(!this.visible)
    })
    this.io.observe(container)
    window.addEventListener('pointermove', this.onPointer, { passive: true })
    this.resize()
    gsap.ticker.add(this.tick)
  }

  // ———————————————————————————————————————— API da jornada (scroll)

  get stopCount(): number {
    return this.stops.length
  }

  /**
   * Posição contínua na jornada: -1 = abertura (voo baixo), 0 = capa (mapa
   * inteiro), 1..6 = sedes, 7 = epílogo. Frações interpolam em arco.
   */
  setJourney(p: number): void {
    this.journey = p
    this.desired.position.copy(this.poseAt(p).position)
    this.desired.target.copy(this.poseAt(p).target)
    const nearest = Math.round(p) - 1
    const focus = nearest >= 0 && nearest < this.sites.length ? nearest : -1
    if (focus !== this.focusIndex) {
      this.focusIndex = focus
      if (focus >= 0) focusShadow(this.lights, this.sites[focus].position, this.sites[focus].radius + 6)
      else focusShadow(this.lights, new THREE.Vector3(0, 0, -4), 140)
      this.continent?.setRegionHighlight(focus >= 0 ? this.sites[focus].config.id : null, 1)
      this.renderer.shadowMap.needsUpdate = true
    }
  }

  /** Progresso de construção (0..1) da cidade `i`, controlado pelo scroll. */
  setBuild(i: number, p: number): void {
    const b = this.builds[i]
    const site = this.sites[i]
    if (!b || Math.abs(b.progress - p) < 1e-4) return
    const before = this.stageOf(i).index
    const forward = p > b.progress
    b.progress = p
    b.tl.progress(p, true)
    // Som: cada etapa cruzada ao descer toca seu efeito (no máximo as 2 últimas,
    // para um salto grande de scroll não virar uma avalanche); subir rebobina.
    if (this.sound) {
      const after = this.stageOf(i).index
      if (forward && after > before) for (let k = Math.max(before + 1, after - 1); k <= after; k++) this.sound.stage(b.stages[k].id, i)
      else if (!forward && after < before) this.sound.rewind()
    }
    const built = p >= 0.999
    const was = site.built
    site.built = built
    site.constructing = p > 0 && !built
    if (was !== built) this.continent?.refreshRoads()
    this.banners[i].setHoist(THREE.MathUtils.clamp((p - 0.88) / 0.12, 0, 1))
  }

  /** Liga a cena a um sistema de som (ou desliga com null). */
  setSoundSink(sink: RealmSoundSink | null): void {
    this.sound = sink
  }

  /** Etapa atual da construção da cidade i (índice 0–8 e rótulo). */
  stageOf(i: number): { index: number; label: string; progress: number } {
    const b = this.builds[i]
    const t = b.tl.time()
    let idx = -1
    b.stages.forEach((s, k) => {
      if (t >= s.at - 1e-3) idx = k
    })
    if (b.progress <= 0) idx = -1
    return { index: idx, label: idx >= 0 ? b.stages[idx].label : '', progress: b.progress }
  }

  /** Abertura: voo baixo sobre o sul até a vista do reino inteiro. */
  playIntro(): gsap.core.Tween {
    const proxy = { p: -1 }
    return gsap.to(proxy, {
      p: 0,
      duration: this.reduced ? 0.01 : 5.5,
      ease: 'power2.inOut',
      onUpdate: () => this.setJourney(proxy.p),
    })
  }

  /** Posição de tela de uma sede (rótulos HTML). */
  project(i: number, height = 11): { x: number; y: number; visible: boolean } {
    const s = this.sites[i]
    this.camera.updateMatrixWorld()
    this.tmp.set(s.position.x, height, s.position.z).project(this.camera)
    const r = this.renderer.domElement.getBoundingClientRect()
    return { x: (this.tmp.x * 0.5 + 0.5) * r.width, y: (-this.tmp.y * 0.5 + 0.5) * r.height, visible: this.tmp.z < 1 && Math.abs(this.tmp.x) < 1.1 && Math.abs(this.tmp.y) < 1.1 }
  }

  // ———————————————————————————————————————— câmera

  private computeStops(): Pose[] {
    const wide = this.camera.aspect < 1
    const cover: Pose = { position: new THREE.Vector3(wide ? 0 : 30, wide ? 330 : 205, wide ? 250 : 175), target: new THREE.Vector3(wide ? 10 : 6, 0, -6) }
    const intro: Pose = { position: new THREE.Vector3(-18, 16, 150), target: new THREE.Vector3(-10, 2, 80) }
    const houseStops = this.sites.map((s, i) => {
      const side = this.opts.panelSide?.[i] ?? (i % 2 === 0 ? 'left' : 'right')
      const top = s.city.topHeight
      const k = s.pitHalf / 4.2
      const shift = wide ? 0 : (side === 'left' ? -1 : 1) * 7 * k
      // Retrato: mira abaixo da cidade para ela subir para a metade livre, acima do painel
      const target = new THREE.Vector3(s.position.x + shift, wide ? -top * 0.35 : top * 0.42, s.position.z - 1)
      const dir = new THREE.Vector3(side === 'left' ? -0.28 : 0.28, 0.5, 1).normalize()
      const dist = Math.max(29 * k, top * 2.8) * (wide ? 1.15 : 1)
      return { position: target.clone().addScaledVector(dir, dist), target }
    })
    const epilogue: Pose = { position: new THREE.Vector3(wide ? -30 : -64, wide ? 340 : 215, wide ? 260 : 210), target: new THREE.Vector3(10, 0, 4) }
    return [intro, cover, ...houseStops, epilogue]
  }

  /** Pose na posição contínua p (índices deslocados: stops[0] = abertura = p −1). */
  private poseAt(p: number): Pose {
    const idx = THREE.MathUtils.clamp(p + 1, 0, this.stops.length - 1)
    const i0 = Math.floor(idx)
    const i1 = Math.min(i0 + 1, this.stops.length - 1)
    const u = idx - i0
    const e = u * u * (3 - 2 * u)
    const a = this.stops[i0]
    const b = this.stops[i1]
    const position = a.position.clone().lerp(b.position, e)
    const target = a.target.clone().lerp(b.target, e)
    // Arco: entre duas sedes a câmera sobe para mostrar a escala do mapa
    const lift = Math.sin(Math.PI * e) * a.position.distanceTo(b.position) * 0.22
    if (i0 >= 2 && i1 <= this.stops.length - 2) position.y += lift
    return { position, target }
  }

  private applyPose(p: Pose, snap: boolean): void {
    this.desired.position.copy(p.position)
    this.desired.target.copy(p.target)
    if (snap) {
      this.current.position.copy(p.position)
      this.current.target.copy(p.target)
    }
  }

  // ———————————————————————————————————————— prévia (moodboard)

  private startPreviewLoop(): void {
    const b = this.builds[0]
    const proxy = { p: 0 }
    const dur = this.reduced ? 0.01 : b.tl.duration()
    this.previewLoop = gsap.timeline({ repeat: -1, repeatDelay: 1.2 })
    this.previewLoop.to(proxy, { p: 1, duration: dur, ease: 'none', onUpdate: () => this.setBuild(0, proxy.p) })
    this.previewLoop.to({}, { duration: 3 })
    this.previewLoop.call(() => {
      proxy.p = 0
      this.setBuild(0, 0)
    })
  }

  // ———————————————————————————————————————— loop

  /** Estado atual da qualidade adaptativa (para inspeção). */
  get quality(): { pixelRatio: number; shadows: boolean } {
    return { pixelRatio: this.pixelRatio, shadows: this.renderer.shadowMap.enabled }
  }

  private frame(dt: number): void {
    if (!this.visible) return
    this.time += dt
    this.frameCount++
    this.watchPerformance(dt)

    // Suavização da câmera (scroll com scrub) + paralaxe discreta do ponteiro
    const k = 1 - Math.exp(-dt * (this.reduced ? 30 : 5))
    this.current.position.lerp(this.desired.position, k)
    this.current.target.lerp(this.desired.target, k)
    this.pointerSmooth.lerp(this.pointer, 1 - Math.exp(-dt * 3))
    const par = this.reduced ? 0 : this.current.position.distanceTo(this.current.target) * 0.012
    this.camera.position.copy(this.current.position).add(this.tmp.set(this.pointerSmooth.x * par, -this.pointerSmooth.y * par * 0.5, 0))
    if (this.opts.mode === 'preview' && !this.reduced) {
      const a = this.time * 0.08
      const r = Math.hypot(this.current.position.x, this.current.position.z)
      this.camera.position.x = Math.sin(a) * r
      this.camera.position.z = Math.cos(a) * r
    }
    this.camera.lookAt(this.current.target)

    let active: SkillSite | null = null
    this.sites.forEach((s, i) => {
      if (s.built) s.state.idle += dt * 0.18
      s.update(dt)
      this.banners[i].update(this.time, s.built ? 1 : 0.35)
      if (s.constructing) active = s
    })
    this.continent?.update(dt)
    if (this.sound) this.updateSound(dt)
    const a = active as SkillSite | null
    if (a) {
      this.shaftLight.position.set(a.position.x, -2.5, a.position.z)
      this.shaftLight.intensity = a.state.shaftLight * 30
    } else this.shaftLight.intensity = 0

    if (a || this.frameCount % 4 === 0) this.renderer.shadowMap.needsUpdate = true
    const dist = this.camera.position.distanceTo(this.current.target)
    ;(this.scene.fog as THREE.FogExp2).density = 0.62 / Math.max(dist, 10)
    this.renderer.render(this.scene, this.camera)
  }

  /**
   * Sons contínuos derivados do movimento real: cliques de dente a cada
   * volta da engrenagem motriz, ronco proporcional à velocidade de construção,
   * vento proporcional à velocidade da câmera.
   */
  private updateSound(dt: number): void {
    if (dt <= 0) return
    let machine = 0
    this.sites.forEach((s, i) => {
      const drive = s.state.drive
      const prevDrive = this.lastDrive[i] ?? drive
      const dDrive = Math.abs(drive - prevDrive)
      this.lastDrive[i] = drive
      const prog = this.builds[i].progress
      const dProg = Math.abs(prog - (this.lastBuild[i] ?? prog))
      this.lastBuild[i] = prog
      if (!s.constructing || dProg < 1e-5) return
      machine = Math.max(machine, Math.min(1, (dProg / dt) * 6))
      // Um estalo a cada dente (40 dentes ⇒ 2π/40 rad) da engrenagem principal, com teto
      this.tickAcc[i] = (this.tickAcc[i] ?? 0) + dDrive
      const tooth = (Math.PI * 2) / 40
      if (this.tickAcc[i] >= tooth * 3) {
        this.tickAcc[i] = 0
        this.sound!.tick(machine)
      }
    })
    const camSpeed = this.prevCam.distanceTo(this.camera.position) / dt
    this.prevCam.copy(this.camera.position)
    this.sound!.setActivity(machine, Math.min(1, camSpeed / 60))
    this.sound!.setBuildLevels(this.builds.map((b) => b.progress))
  }

  /** Média de 90 quadros acima de 25 ms: um degrau de resolução; no mínimo, sem sombras. */
  private watchPerformance(dt: number): void {
    if (this.time < this.perfWarmup || dt >= 0.1) return
    this.perfAcc += dt
    if (++this.perfFrames < 90) return
    const avg = this.perfAcc / this.perfFrames
    this.perfAcc = 0
    this.perfFrames = 0
    if (avg <= 1 / 40) return
    this.perfWarmup = this.time + 1.5
    if (this.pixelRatio > 1) {
      this.pixelRatio = Math.max(1, this.pixelRatio - 0.25)
      this.renderer.setPixelRatio(this.pixelRatio)
      this.resize()
    } else if (this.pixelRatio > 0.75 && !this.renderer.shadowMap.enabled) {
      this.pixelRatio = 0.75
      this.renderer.setPixelRatio(this.pixelRatio)
      this.resize()
    } else if (this.renderer.shadowMap.enabled) {
      this.renderer.shadowMap.enabled = false
      this.scene.traverse((o) => {
        const m = (o as THREE.Mesh).material
        if (m) (Array.isArray(m) ? m : [m]).forEach((x) => (x.needsUpdate = true))
      })
    }
  }

  private resize(): void {
    const w = this.container.clientWidth
    const h = this.container.clientHeight
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / Math.max(h, 1)
    this.camera.fov = this.camera.aspect < 1 ? 50 : 36
    this.camera.updateProjectionMatrix()
    if (this.opts.mode === 'journey') {
      this.stops = this.computeStops()
      this.setJourney(this.journey)
    }
  }

  dispose(): void {
    gsap.ticker.remove(this.tick)
    this.previewLoop?.kill()
    this.builds.forEach((b) => b.tl.kill())
    this.ro.disconnect()
    this.io.disconnect()
    window.removeEventListener('pointermove', this.onPointer)
    this.sites.forEach((s) => s.dispose())
    this.banners.forEach((b) => b.dispose())
    this.continent?.dispose()
    this.disposeEnv()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
