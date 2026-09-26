'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Menu, X } from 'lucide-react'
import { getCopy, type Locale } from '@/lib/i18n'

const chars = ' .·:+=*#%@'

function AsciiCanvas({ alt, compact = false }: { alt: string; compact?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const reduced = useRef(false)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    reduced.current = media.matches
    let frame = 0
    let raf = 0
    let pointer = { x: 0, y: 0 }
    const resize = () => { const ratio = Math.min(window.devicePixelRatio || 1, 1.5); canvas.width = canvas.clientWidth * ratio; canvas.height = canvas.clientHeight * ratio; context.font = `${compact ? 8 : 11}px monospace` }
    const draw = () => {
      const width = canvas.width; const height = canvas.height; const cols = compact ? 45 : Math.min(78, Math.floor(width / 10)); const rows = compact ? 22 : Math.min(42, Math.floor(height / 16)); const cellW = width / cols; const cellH = height / rows
      context.clearRect(0, 0, width, height); context.fillStyle = '#d9f76c'; context.textAlign = 'center'; context.textBaseline = 'middle'
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) { const nx = (x / cols - .5) * 2; const ny = (y / rows - .5) * 2; const wave = Math.sin(nx * 7 + frame * .018) * .18 + Math.cos(ny * 5 - frame * .014) * .14; const sphere = Math.max(0, 1 - Math.sqrt(nx * nx + ny * ny)); const ripple = Math.sin((nx * nx + ny * ny) * 18 - frame * .02) * .08; const light = sphere + wave + ripple + pointer.x * nx * .08 + pointer.y * ny * .08; if (light > .06) { const index = Math.max(0, Math.min(chars.length - 1, Math.floor(light * chars.length * 1.3))); context.globalAlpha = Math.min(.9, .25 + light); context.fillText(chars[index], x * cellW + cellW / 2, y * cellH + cellH / 2) } }
      context.globalAlpha = 1; if (!reduced.current) { frame++; raf = requestAnimationFrame(draw) }
    }
    const move = (event: MouseEvent) => { pointer = { x: (event.clientX / window.innerWidth - .5) * 2, y: (event.clientY / window.innerHeight - .5) * 2 } }
    resize(); draw(); window.addEventListener('resize', resize); window.addEventListener('mousemove', move)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); window.removeEventListener('mousemove', move) }
  }, [compact])
  return <canvas ref={ref} className="ascii-canvas" role="img" aria-label={alt} />
}

export function Portfolio({ initialLocale = 'pt-BR' }: { initialLocale?: Locale }) {
  const [locale, setLocale] = useState<Locale>(initialLocale)
  const [menuOpen, setMenuOpen] = useState(false)
  const [selected, setSelected] = useState('Code')
  const copy = getCopy(locale)
  useEffect(() => { const saved = window.localStorage.getItem('jorge-locale') as Locale | null; if (saved === 'pt-BR' || saved === 'en') setLocale(saved) }, [])
  useEffect(() => { window.localStorage.setItem('jorge-locale', locale); document.documentElement.lang = locale; document.title = copy.metaTitle }, [locale, copy.metaTitle])
  const toggleLocale = () => setLocale(locale === 'pt-BR' ? 'en' : 'pt-BR')
  const closeMenu = () => setMenuOpen(false)
  return <main className="portfolio-shell" id="top">
    <header className="site-header"><a href="#top" className="wordmark" aria-label="Jorge Mesquita, início">JM<span>.</span></a><nav className={menuOpen ? 'nav-links is-open' : 'nav-links'} aria-label="Navegação principal"><a href="#work" onClick={closeMenu}>01 / {copy.nav.work}</a><a href="#system" onClick={closeMenu}>02 / {copy.nav.system}</a><a href="#process" onClick={closeMenu}>03 / {copy.nav.process}</a><a href="#about" onClick={closeMenu}>04 / {copy.nav.about}</a><a href="#contact" onClick={closeMenu}>05 / {copy.nav.contact}</a></nav><div className="header-actions"><button className="language-toggle" type="button" onClick={toggleLocale} aria-label={`${copy.language}: ${locale}`}>{locale === 'pt-BR' ? 'PT' : 'EN'} <span>↔</span></button><button className="menu-toggle" type="button" aria-label={menuOpen ? copy.close : copy.menu} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}</button></div></header>
    <section className="hero section-grid" aria-labelledby="hero-title"><div className="hero-copy"><p className="eyebrow"><span className="status-dot" /> {copy.hero.eyebrow}</p><h1 id="hero-title">{copy.hero.title.split('\n').map((line, i) => <span key={line}>{i > 0 && <br />}<em className={i === 1 ? 'hero-emphasis' : undefined}>{line}</em></span>)}</h1><p className="hero-intro">{copy.hero.intro}</p><a className="text-link" href="#work">{copy.hero.cta} <ArrowUpRight aria-hidden="true" /></a></div><div className="ascii-stage"><div className="ascii-glow" /><AsciiCanvas alt={copy.hero.artifactAlt} /><div className="ascii-caption"><span>{copy.hero.artifact}</span><span>scroll / transform</span></div></div><div className="hero-meta"><span>{copy.hero.location}</span><span>{copy.hero.scroll} <ArrowDownRight aria-hidden="true" /></span></div></section>
    <section id="work" className="work-section content-section" aria-labelledby="work-title"><div className="section-heading"><p className="section-number">{copy.work.label}</p><h2 id="work-title">{copy.work.title.split('\n').map((line, i) => <span key={line}>{i > 0 && <br />}<em>{line}</em></span>)}</h2><p className="section-note">{copy.work.note}</p></div><article className="case-study"><div className="case-top"><div><p className="eyebrow">{copy.work.dash.type}</p><h3>{copy.work.dash.title}</h3></div><span className="case-status">{copy.work.dash.status}</span></div><p className="case-description">{copy.work.dash.description}</p><div className="pipeline" aria-label="Pipeline do projeto">{copy.work.dash.pipeline.map((step, i) => <div className="pipeline-step" key={step}><span>{String(i + 1).padStart(2, '0')}</span><strong>{step}</strong>{i < copy.work.dash.pipeline.length - 1 && <ArrowUpRight aria-hidden="true" />}</div>)}</div><div className="case-fields">{[copy.work.dash.problem, copy.work.dash.system, copy.work.dash.implementation, copy.work.dash.decisions, copy.work.dash.technology, copy.work.dash.testing, copy.work.dash.deployment, copy.work.dash.result].map(field => <div key={field}><span>{field}</span><p>{locale === 'pt-BR' ? 'A documentar com dados e decisões do projeto real.' : 'To be documented with real project data and decisions.'}</p></div>)}</div></article></section>
    <section id="system" className="system-section content-section" aria-labelledby="system-title"><div className="section-heading"><p className="section-number">{copy.system.label}</p><h2 id="system-title">{copy.system.title.split('\n').map((line, i) => <span key={line}>{i > 0 && <br />}<em>{line}</em></span>)}</h2><p className="section-note">{copy.system.note}</p></div><div className="system-explorer"><div className="system-visual"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="system-core">JM<span>/</span><small>CORE</small></div>{Object.keys(copy.system.details).map((item, i) => <button type="button" key={item} className={`system-node node-${i + 1} ${selected === item ? 'is-selected' : ''}`} onClick={() => setSelected(item)}>{item}</button>)}</div><div className="system-detail"><p className="eyebrow">{copy.system.hint}</p><h3>{selected}</h3><p>{copy.system.details[selected as keyof typeof copy.system.details]}</p></div></div></section>
    <section id="process" className="process-section content-section" aria-labelledby="process-title"><div className="section-heading"><p className="section-number">{copy.process.label}</p><h2 id="process-title">{copy.process.title.split('\n').map((line, i) => <span key={line}>{i > 0 && <br />}<em>{line}</em></span>)}</h2></div><div className="process-grid">{copy.process.steps.map(([num, title, text]) => <div className="process-step" key={num}><span>{num}</span><h3>{title}</h3><p>{text}</p></div>)}</div></section>
    <section id="about" className="about-section content-section" aria-labelledby="about-title"><div className="section-heading"><p className="section-number">{copy.about.label}</p><h2 id="about-title">{copy.about.title.split('\n').map((line, i) => <span key={line}>{i > 0 && <br />}<em>{line}</em></span>)}</h2></div><div className="about-copy"><p className="eyebrow">{copy.about.profile}</p><p className="large-copy">{copy.about.copy}</p><div className="about-details">{[[copy.about.education, copy.about.educationValue], [copy.about.courses, copy.about.coursesValue], [copy.about.skills, copy.about.skillsValue]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></div></section>
    <section id="contact" className="contact-section" aria-labelledby="contact-title"><p className="section-number">{copy.contact.label}</p><h2 id="contact-title">{copy.contact.title.split('\n').map((line, i) => <span key={line}>{i > 0 && <br />}<em>{line}</em></span>)}</h2><p className="contact-copy">{copy.contact.copy}</p><a className="contact-link" href="mailto:seu-email-profissional@exemplo.com">{copy.contact.email} <ArrowUpRight aria-hidden="true" /></a><div className="contact-footer"><span>Jorge Mesquita © 2026</span><span>{copy.contact.footer}</span><a href="#top">{copy.contact.top} ↑</a></div></section>
  </main>
}
