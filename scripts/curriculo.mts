/**
 * Gera o currículo em PDF (PT e EN) a partir do mesmo conteúdo do site.
 * Uso: node scripts/curriculo.mts  → public/curriculo-jorge-mesquita.pdf e public/resume-jorge-mesquita.pdf
 * Sem telefone: contato por e-mail, LinkedIn, GitHub e o próprio site.
 */
import { chromium } from '@playwright/test'
import { writeFileSync } from 'node:fs'
import { EMAIL, copy, type Locale } from '../lib/content.ts'

const SITE = 'portfolio-jorge.pages.dev'

const T = {
  'pt-BR': { role: 'Desenvolvedor Backend · Python · SQL · APIs · Automação', summary: 'Resumo', education: 'Formação', courses: 'Cursos e certificação', skills: 'Habilidades', projects: 'Projetos', languages: 'Idiomas', seeking: 'Busca', file: 'curriculo-jorge-mesquita.pdf' },
  en: { role: 'Backend Developer · Python · SQL · APIs · Automation', summary: 'Summary', education: 'Education', courses: 'Courses and certification', skills: 'Skills', projects: 'Projects', languages: 'Languages', seeking: 'Seeking', file: 'resume-jorge-mesquita.pdf' },
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function html(locale: Locale): string {
  const c = copy[locale]
  const t = T[locale]
  const facts = Object.fromEntries(c.perfil.facts as [string, string][])
  const langKey = locale === 'en' ? 'Languages' : 'Idiomas'
  const seekKey = locale === 'en' ? 'Seeking' : 'Busca'
  const baseKey = locale === 'en' ? 'Based in' : 'Base'
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600&family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=JetBrains+Mono:wght@400;500&display=block" rel="stylesheet">
<style>
@page { size: A4; margin: 12mm 14mm; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font: 500 9.7pt/1.25 'Cormorant Garamond', serif; color: #1d1a16; }
header { display: grid; grid-template-columns: 1fr auto; gap: 4mm; align-items: end; padding-bottom: 3mm; border-bottom: 1.2pt solid #b08d57; }
h1 { font: 600 23pt/1 Cinzel, serif; letter-spacing: 0.06em; }
.role { margin-top: 2mm; font: 500 8.4pt 'JetBrains Mono', monospace; letter-spacing: 0.08em; color: #7a5f33; text-transform: uppercase; }
.contact { text-align: right; font: 8.2pt/1.55 'JetBrains Mono', monospace; color: #3b352c; }
h2 { margin: 3.2mm 0 1.3mm; font: 600 9.4pt Cinzel, serif; letter-spacing: 0.18em; text-transform: uppercase; color: #7a5f33; }
h2::after { content: ''; display: block; height: 0.6pt; margin-top: 1mm; background: linear-gradient(90deg, #b08d57, transparent); }
p + p { margin-top: 1.2mm; }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 0 7mm; }
.item { margin-bottom: 1.6mm; }
.item b { font-weight: 600; }
.meta { font: 7.8pt 'JetBrains Mono', monospace; color: #6b6356; }
.skills { display: grid; grid-template-columns: 1fr 1fr; gap: 1.2mm 7mm; }
.skills div b { font: 600 8pt 'JetBrains Mono', monospace; letter-spacing: 0.06em; text-transform: uppercase; color: #3b352c; }
.skills div span { display: block; }
.proj { margin-bottom: 1.3mm; break-inside: avoid; }
a { color: inherit; text-decoration: none; }
</style></head><body>
<header>
  <div><h1>Jorge Mesquita</h1><p class="role">${esc(t.role)}</p></div>
  <div class="contact">${esc(facts[baseKey] ?? 'Recife · PE')}<br><a href="mailto:${EMAIL}">${EMAIL}</a><br><a href="https://www.linkedin.com/in/mesquitaforall">linkedin.com/in/mesquitaforall</a><br><a href="https://github.com/Rxmainless">github.com/Rxmainless</a><br><a href="https://${SITE}">${SITE}</a></div>
</header>

<h2>${t.summary}</h2>
<p>${esc(c.perfil.lead)}</p>
<p>${esc(c.perfil.body)}</p>
<p class="meta" style="margin-top:1.4mm">${t.seeking}: ${esc(facts[seekKey] ?? '')}</p>

<div class="two">
  <section><h2>${t.education}</h2>
  ${c.formacao.degrees.map((d) => `<div class="item"><b>${esc(d.name)}</b><br>${esc(d.institution)} <span class="meta">· ${esc(d.detail)}</span></div>`).join('')}
  <h2>${t.languages}</h2>
  <p>${esc(facts[langKey] ?? '')}</p>
  </section>
  <section><h2>${t.courses}</h2>
  ${c.cursos.items.map((i) => `<div class="item"><b>${esc(i.name)}</b><br><span class="meta">${esc(i.provider)}</span></div>`).join('')}
  </section>
</div>

<h2>${t.skills}</h2>
<div class="skills">
${c.skillGroups.map((g) => `<div><b>${esc(g.title)}</b><span>${g.items.map((s) => esc(s.name)).join(' · ')}</span></div>`).join('')}
</div>

<h2>${t.projects}</h2>
${c.projects.map((p) => `<div class="proj"><b>${esc(p.name)}</b> <span class="meta">· ${esc(p.kind)}${p.links[0] ? ` · ${esc(p.links[p.links.length - 1].url.replace(/^https:\/\//, ''))}` : ''}</span><br>${esc(p.summary)}</div>`).join('')}
</body></html>`
}

const browser = await chromium.launch()
for (const locale of ['pt-BR', 'en'] as const) {
  const page = await browser.newPage({ viewport: { width: 794, height: 1123 } })
  await page.setContent(html(locale), { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  if (process.env.CV_SHOT) await page.emulateMedia({ media: 'print' })
  if (process.env.CV_SHOT) await page.screenshot({ path: `${process.env.CV_SHOT}-${locale}.png`, fullPage: true })
  const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true })
  writeFileSync(`public/${T[locale].file}`, pdf)
  console.log(`public/${T[locale].file}`, `${Math.round(pdf.length / 1024)} KB`)
}
await browser.close()
