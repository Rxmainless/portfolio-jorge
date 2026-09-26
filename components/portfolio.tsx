'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'
import { SplitText } from 'gsap/SplitText'
import { ArrowUpRight, Menu, X } from 'lucide-react'
import { EMAIL, GITHUB, LINKEDIN, getCopy, type Copy, type Locale } from '@/lib/content'
import { houses, type House } from '@/lib/realm-data'
import type { RealmScene } from '@/lib/realm/RealmScene'
import { RealmAudio } from '@/lib/realm/audio/RealmAudio'
import { AsciiSigil } from './ascii-sigil'
import { RealmCanvas } from './realm-canvas'
import { SoundMixer } from './sound-mixer'

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin, SplitText)

/** Lado do painel por seção — a câmera enquadra a cidade no lado oposto. */
const SIDES: ('left' | 'right')[] = houses.map((_, i) => (i % 2 === 0 ? 'left' : 'right'))
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const smooth = (v: number) => v * v * (3 - 2 * v)

export function Portfolio() {
  const [locale, setLocale] = useState<Locale>('pt-BR')
  const [menuOpen, setMenuOpen] = useState(false)
  const [realm, setRealm] = useState<RealmScene | null>(null)
  // Sem WebGL: página plana, só o conteúdo, com os sigilos já revelados
  const [flat, setFlat] = useState(false)
  const [builds, setBuilds] = useState<number[]>(() => houses.map(() => 0))
  const copy = getCopy(locale)
  const rootRef = useRef<HTMLElement>(null)
  const hudRef = useRef<HTMLDivElement>(null)
  const labelsRef = useRef<(HTMLDivElement | null)[]>([])
  const journeyRef = useRef(-1)
  const introPlayed = useRef(false)
  const audioRef = useRef<RealmAudio | null>(null)
  const [soundOn, setSoundOn] = useState(false)
  const [audio, setAudio] = useState<RealmAudio | null>(null)

  useEffect(() => {
    const saved = window.localStorage.getItem('jorge-locale')
    if (saved === 'pt-BR' || saved === 'en') setLocale(saved)
  }, [])

  // ———————————————————————————————— som (Web Audio, só após um gesto do usuário)
  useEffect(() => {
    const audio = new RealmAudio()
    audioRef.current = audio
    setAudio(audio)
    if (process.env.NODE_ENV !== 'production') {
      Object.assign(window, { __audio: audio })
      import('@/lib/realm/audio/sfx').then((m) => Object.assign(window, { __sfx: m })) // validação offline
      import('@/lib/realm/audio/score').then((m) => Object.assign(window, { __score: m }))
    }
    // Preferência salva: religa no primeiro clique/tecla (autoplay exige gesto)
    let cleanup = () => {}
    if (window.localStorage.getItem('jorge-sound') === 'on') {
      const resume = (e: Event) => {
        // O próprio botão de som cuida do clique (senão ligaria e desligaria em seguida)
        if ((e.target as Element | null)?.closest?.('.sound-toggle, .sound-invite')) return
        cleanup()
        if (audio.isEnabled || window.localStorage.getItem('jorge-sound') !== 'on') return
        audio.enable().then((ok) => setSoundOn(ok))
      }
      window.addEventListener('pointerdown', resume)
      window.addEventListener('keydown', resume)
      cleanup = () => {
        window.removeEventListener('pointerdown', resume)
        window.removeEventListener('keydown', resume)
      }
    }
    return () => {
      cleanup()
      audio.dispose()
    }
  }, [])
  useEffect(() => {
    realm?.setSoundSink(audioRef.current)
    return () => realm?.setSoundSink(null)
  }, [realm])

  const toggleSound = async () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.isEnabled) {
      audio.disable()
      setSoundOn(false)
      window.localStorage.setItem('jorge-sound', 'off')
    } else {
      const ok = await audio.enable()
      setSoundOn(ok)
      window.localStorage.setItem('jorge-sound', ok ? 'on' : 'off')
    }
  }
  useEffect(() => {
    window.localStorage.setItem('jorge-locale', locale)
    document.documentElement.lang = locale
    document.title = copy.metaTitle
  }, [locale, copy.metaTitle])

  const onReady = useCallback((scene: RealmScene) => {
    setRealm(scene)
    if (process.env.NODE_ENV !== 'production') Object.assign(window, { __realm: scene, __gsap: gsap, __ST: ScrollTrigger }) // validação
  }, [])

  const onNoWebGL = useCallback(() => {
    setFlat(true)
    setBuilds(houses.map(() => 1))
  }, [])

  // Título forjado logo na chegada, sem esperar o 3D (o mapa aparece por trás quando fica pronto)
  const titleForged = useRef(false)
  useEffect(() => {
    if (titleForged.current) return
    titleForged.current = true
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const ctx = gsap.context(() => {
      const title = new SplitText('.cover-title', { type: 'words,chars' })
      gsap.from(title.chars, { yPercent: 110, opacity: 0, duration: reduced ? 0.01 : 1.1, ease: 'power3.out', stagger: 0.045, delay: 0.2 })
      gsap.from('.cover-reveal', { y: 18, opacity: 0, duration: reduced ? 0.01 : 0.9, ease: 'power2.out', stagger: 0.12, delay: 1 })
    }, rootRef)
    return () => ctx.revert()
  }, [])

  // ———————————————————————————————— coreografia de scroll (GSAP ScrollTrigger)
  useEffect(() => {
    if (!realm || !rootRef.current) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const buildState = houses.map(() => 0)
    let introDone = false
    let lastBuildsKey = ''

    const ctx = gsap.context(() => {
      // Abertura: o voo sobre o mapa enquanto o título é forjado
      // (só na primeira montagem — trocar o idioma não repete a abertura)
      const intro = introPlayed.current ? null : realm.playIntro()
      introPlayed.current = true
      if (intro) intro.eventCallback('onComplete', () => (introDone = true))
      else introDone = true

      const setJourney = (v: number) => {
        journeyRef.current = v
        realm.setJourney(v)
      }

      // Cada casa: câmera voa até a sede, depois a máquina constrói a cidade
      houses.forEach((h, i) => {
        const proxy = { p: 0 }
        gsap.to(proxy, {
          p: 1,
          ease: 'none',
          scrollTrigger: { trigger: `#${h.section}`, start: 'top bottom', end: 'bottom bottom', scrub: reduced ? true : 0.9 },
          onUpdate: () => {
            const p = proxy.p
            if (p > 0 && !introDone) {
              intro?.kill()
              introDone = true
            }
            if (p > 0 || (i === 0 && introDone)) setJourney(i + smooth(clamp01(p / 0.4)))
            const b = reduced ? (p > 0.35 ? 1 : 0) : clamp01((p - 0.32) / 0.6)
            buildState[i] = b
            realm.setBuild(i, b)
          },
        })
        // Painel: surge quando a câmera chega à sede
        gsap.fromTo(
          `#${h.section} .house-panel`,
          { autoAlpha: 0, y: 36 },
          { autoAlpha: 1, y: 0, ease: 'power2.out', scrollTrigger: { trigger: `#${h.section}`, start: 'top 45%', end: 'top 5%', scrub: reduced ? true : 0.6 } },
        )
      })

      // Epílogo: a câmera sobe e mostra o reino inteiro, estradas acesas
      const ep = { p: 0 }
      gsap.to(ep, {
        p: 1,
        ease: 'none',
        scrollTrigger: { trigger: '#epilogo', start: 'top bottom', end: 'bottom bottom', scrub: reduced ? true : 0.9 },
        onUpdate: () => {
          if (ep.p > 0) setJourney(houses.length + smooth(ep.p))
        },
      })

      // Títulos das seções: letras forjadas ao entrar
      gsap.utils.toArray<HTMLElement>('.split-title').forEach((el) => {
        const s = new SplitText(el, { type: 'words,chars' })
        gsap.from(s.chars, { yPercent: 100, opacity: 0, stagger: 0.03, duration: reduced ? 0.01 : 0.7, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 85%' } })
      })
      gsap.utils.toArray<HTMLElement>('.stagger-in').forEach((group) => {
        gsap.from(group.children, { y: 20, opacity: 0, stagger: 0.06, duration: reduced ? 0.01 : 0.6, ease: 'power2.out', scrollTrigger: { trigger: group, start: 'top 88%' } })
      })
    }, rootRef)

    // HUD da máquina + rótulos do mapa (sem re-render do React)
    let raf = 0
    const loop = () => {
      const j = journeyRef.current
      const near = Math.round(j) - 1
      const hud = hudRef.current
      if (hud) {
        if (near >= 0 && near < houses.length) {
          const st = realm.stageOf(near)
          const h = houses[near]
          const bar = '▓'.repeat(Math.round(st.progress * 14)).padEnd(14, '░')
          hud.textContent = `${h.house} · ${h.seat}   ${st.index >= 0 ? String(st.index + 1).padStart(2, '0') + ' ' + st.label : '—'}   ${bar} ${Math.round(st.progress * 100)}%`
          hud.style.opacity = st.progress > 0 ? '1' : '0.4'
        } else hud.style.opacity = '0'
      }
      // Só com a capa estabilizada (não durante o voo de abertura) e no epílogo
      const showLabels = (j > -0.12 && j < 0.35) || j > houses.length + 0.4
      houses.forEach((_, i) => {
        const el = labelsRef.current[i]
        if (!el) return
        const pr = realm.project(i)
        el.style.transform = `translate(${pr.x.toFixed(1)}px, ${pr.y.toFixed(1)}px) translate(-50%, -100%)`
        el.style.opacity = showLabels && pr.visible ? '1' : '0'
      })
      const key = buildState.map((b) => (b >= 0.999 ? 1 : 0)).join('')
      if (key !== lastBuildsKey) {
        lastBuildsKey = key
        setBuilds(buildState.map((b) => (b >= 0.999 ? 1 : b)))
      }
      raf = requestAnimationFrame(loop)
    }
    loop()
    ScrollTrigger.refresh()

    return () => {
      cancelAnimationFrame(raf)
      ctx.revert()
    }
  }, [realm, locale])

  /** Navegação: rola (GSAP ScrollTo) até o ponto em que a cidade já está erguida. */
  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    setMenuOpen(false)
    audioRef.current?.ui()
    const el = document.getElementById(id)
    if (!el) return
    const isHouse = houses.some((h) => h.section === id)
    const y = el.offsetTop + (isHouse ? el.offsetHeight - window.innerHeight : 0)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    gsap.to(window, { scrollTo: y, duration: reduced ? 0 : 2.2, ease: 'power2.inOut' })
  }

  const builtCount = builds.filter((b) => b >= 1).length

  return (
    <main className={flat ? "realm grain is-flat" : "realm grain"} ref={rootRef}>
      <div className="realm-stage">
        <RealmCanvas className="realm-canvas" options={{ mode: 'journey', panelSide: SIDES }} onReady={onReady} onError={onNoWebGL} label={copy.canvasAlt} />
        <div className="realm-vignette" />
        <div className="map-labels" aria-hidden="true">
          {houses.map((h, i) => (
            <div
              key={h.section}
              ref={(el) => {
                labelsRef.current[i] = el
              }}
              className="map-label"
              style={{ ['--c' as string]: h.color }}
            >
              <span>{h.seat}</span>
              <small>{h.house}</small>
            </div>
          ))}
        </div>
      </div>

      <div className={`realm-loading ${realm || flat ? 'is-done' : ''}`} aria-hidden={!!realm || flat}>
        <span className="eyebrow">{copy.loading}</span>
        <span className="loading-bar">░▒▓█▓▒░</span>
      </div>

      <header className="site-header">
        <a href="#capa" onClick={go('capa')} className="wordmark">
          J<span aria-hidden="true">·</span>M<span className="sr-only"> — Jorge Mesquita, capa</span>
        </a>
        <nav className={menuOpen ? 'nav-links is-open' : 'nav-links'} aria-label="Seções">
          {houses.map((h, i) => (
            <a key={h.section} href={`#${h.section}`} onClick={go(h.section)} style={{ ['--c' as string]: h.color }}>
              <i className={builds[i] >= 1 ? 'is-built' : ''} aria-hidden="true" />
              {String(i + 1).padStart(2, '0')} {copy.nav[h.section]}
            </a>
          ))}
          <a href="/moodboard" className="nav-mood">
            {copy.moodboard} ↗
          </a>
        </nav>
        <div className="header-actions">
          <span className="built-count" aria-live="polite">
            {builtCount}/{houses.length}
          </span>
          <button className={`sound-toggle ${soundOn ? 'is-on' : ''}`} type="button" onClick={toggleSound} aria-pressed={soundOn} title={copy.sound.label}>
            <span aria-hidden="true">{soundOn ? '♪ ▂▅▇' : '♪ ▁▁▁'}</span> {soundOn ? copy.sound.on : copy.sound.off}
          </button>
          <SoundMixer audio={audio} copy={copy.sound} />
          <button className="language-toggle" type="button" onClick={() => setLocale(locale === 'pt-BR' ? 'en' : 'pt-BR')} aria-label={`${copy.language}: ${locale}`}>
            {locale === 'pt-BR' ? 'PT' : 'EN'} <span>↔</span>
          </button>
          <button className="menu-toggle" type="button" aria-label={menuOpen ? copy.close : copy.menu} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
      </header>

      <div className="machine-hud" ref={hudRef} aria-hidden="true" />

      <section id="capa" className="cover" aria-labelledby="cover-title">
        <p className="eyebrow cover-reveal">{copy.cover.eyebrow}</p>
        <h1 id="cover-title" className="display cover-title">
          {copy.cover.title}
        </h1>
        <p className="cover-sub cover-reveal">{copy.cover.subtitle}</p>
        <p className="cover-lead cover-reveal">{copy.cover.lead}</p>
        <div className="cover-houses cover-reveal" aria-label="Casas">
          {houses.map((h) => (
            <a key={h.section} href={`#${h.section}`} onClick={go(h.section)} style={{ ['--c' as string]: h.color }} aria-label={`${copy.nav[h.section]} — ${h.house}`}>
              <AsciiSigil sigil={h.sigil} color={h.color} label={h.house} />
            </a>
          ))}
        </div>
        {!soundOn && (
          <button type="button" className="sound-invite cover-reveal" onClick={toggleSound}>
            {copy.sound.invite}
          </button>
        )}
        <div className="cover-meta cover-reveal">
          <span>{copy.cover.location}</span>
          <span className="cue">{copy.cover.cue} ↓</span>
        </div>
      </section>

      {houses.map((h, i) => (
        <section key={h.section} id={h.section} className={`house-section side-${SIDES[i]}`} aria-labelledby={`${h.section}-title`} style={{ ['--c' as string]: h.color }}>
          <div className="house-sticky">
            <article className="house-panel">
              <HouseHeader house={h} index={i} title={copy.nav[h.section]} build={builds[i]} />
              <SectionBody id={h.section} copy={copy} />
              <div className="ascii-rule panel-rule" aria-hidden="true">
                {'░▒▓ ─── ' + h.seat.toUpperCase() + ' ─── ⚙ ────────────────────────────────── ✦'}
              </div>
            </article>
          </div>
        </section>
      ))}

      <section id="epilogo" className="epilogue" aria-labelledby="epilogue-title">
        <div className="epilogue-inner">
          <p className="ornament" aria-hidden="true">
            ✦
          </p>
          <h2 id="epilogue-title" className="display split-title">
            {copy.epilogue.title}
          </h2>
          <p className="epilogue-body">{copy.epilogue.body}</p>
          <a href="#capa" onClick={go('capa')} className="text-link">
            {copy.epilogue.top} ↑
          </a>
          <p className="footer-note">
            {copy.epilogue.footer} · <a href="/moodboard">{copy.moodboard}</a>
          </p>
        </div>
      </section>
    </main>
  )
}

function HouseHeader({ house, index, title, build }: { house: House; index: number; title: string; build: number }) {
  return (
    <header className="house-head">
      <div className="house-sigil">
        <AsciiSigil sigil={house.sigil} color={house.color} label={`Sigilo da ${house.house}`} reveal={Math.max(0.02, build)} />
      </div>
      <div>
        <p className="eyebrow">
          <span className="house-n">{String(index + 1).padStart(2, '0')}</span> {house.house} · {house.seat}
        </p>
        <h2 id={`${house.section}-title`} className="display split-title">
          {title}
        </h2>
        <p className="house-words">“{house.words}”</p>
      </div>
    </header>
  )
}

function SectionBody({ id, copy }: { id: House['section']; copy: Copy }) {
  switch (id) {
    case 'perfil':
      return (
        <div className="house-body">
          <p className="lead">{copy.perfil.lead}</p>
          <p>{copy.perfil.body}</p>
          <dl className="facts stagger-in">
            {copy.perfil.facts.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      )
    case 'formacao':
      return (
        <div className="house-body">
          <div className="degrees stagger-in">
            {copy.formacao.degrees.map((d) => (
              <div className="degree" key={d.name}>
                <span className="eyebrow">{copy.formacao.level}</span>
                <h3>{d.name}</h3>
                <p className="degree-inst">
                  {d.institution} <span>· {d.detail}</span>
                </p>
              </div>
            ))}
          </div>
          <p className="note">{copy.formacao.note}</p>
        </div>
      )
    case 'cursos':
      return (
        <div className="house-body">
          <p className="lead">{copy.cursos.lead}</p>
          <ol className="chain stagger-in" aria-label={copy.cursos.title}>
            {copy.cursos.items.map((c) => (
              <li key={c.name} className="link-forged">
                <span className="link-ring" aria-hidden="true">◉</span>
                <div>
                  <strong>{c.name}</strong>
                  <small>{c.provider}</small>
                </div>
                <em>{copy.cursos.metalLabel} {c.metal}</em>
              </li>
            ))}
            <li className="link-empty">
              <span aria-hidden="true">◯</span>
              {copy.cursos.empty}
            </li>
          </ol>
        </div>
      )
    case 'habilidades':
      return (
        <div className="house-body">
          <p className="lead">{copy.habilidades.lead}</p>
          <div className="skill-groups">
            {copy.skillGroups.map((g) => (
              <div key={g.title} className="skill-group">
                <h3 className="eyebrow">{g.title}</h3>
                <ul className="stagger-in">
                  {g.items.map((s) => (
                    <li key={s.name} className={s.focus ? 'is-focus' : undefined} title={s.evidence.length ? `${copy.habilidades.used}: ${s.evidence.join(', ')}` : copy.habilidades.declared}>
                      <span>
                        {s.focus && <b aria-hidden="true">◆ </b>}
                        {s.name}
                      </span>
                      <small>{s.evidence.length ? s.evidence.join(' · ') : copy.habilidades.declared}</small>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="pending skill-legend">{copy.habilidades.legend}</p>
        </div>
      )
    case 'projetos':
      return (
        <div className="house-body">
          <p className="lead">{copy.projetos.lead}</p>
          <ul className="projects stagger-in">
            {copy.projects.map((p) => (
              <li key={p.id} className="project">
                <div className="project-top">
                  <h3>{p.name}</h3>
                  {p.status && <span className="status">{p.status}</span>}
                </div>
                <p className="eyebrow">{p.kind}</p>
                <p className="project-summary">{p.summary}</p>
                <p className="project-stack">
                  <span>{copy.projetos.stack}</span> {p.stack.join(' · ')}
                </p>
                {p.links.length > 0 && (
                  <div className="project-links">
                    {p.links.map((l) => (
                      <a key={l.url} href={l.url} target="_blank" rel="noreferrer">
                        {l.label} <ArrowUpRight aria-hidden="true" />
                      </a>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )
    case 'contato':
      return (
        <div className="house-body">
          <p className="lead">{copy.contato.lead}</p>
          <a className="raven-link" href={GITHUB} target="_blank" rel="noreferrer">
            <span className="eyebrow">{copy.contato.github}</span>
            <span className="raven-url">
              github.com/Rxmainless <ArrowUpRight aria-hidden="true" />
            </span>
          </a>
          <a className="raven-link" href={LINKEDIN} target="_blank" rel="noreferrer">
            <span className="eyebrow">{copy.contato.linkedin}</span>
            <span className="raven-url">
              in/mesquitaforall <ArrowUpRight aria-hidden="true" />
            </span>
          </a>
          <a className="raven-link" href={`mailto:${EMAIL}`}>
            <span className="eyebrow">{copy.contato.email}</span>
            <span className="raven-url">
              {EMAIL} <ArrowUpRight aria-hidden="true" />
            </span>
          </a>
        </div>
      )
  }
}
