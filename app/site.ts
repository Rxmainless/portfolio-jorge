import type { Metadata, Viewport } from 'next'
import { Cinzel, Cormorant_Garamond, JetBrains_Mono } from 'next/font/google'

const display = Cinzel({ subsets: ['latin'], weight: ['400', '600', '800'], variable: '--font-display', display: 'swap' })
const serif = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '500', '600'], style: ['normal', 'italic'], variable: '--font-serif', display: 'swap' })
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono', display: 'swap' })

/** Classes das três famílias, aplicadas no <html> dos dois layouts (PT e EN). */
export const fontClasses = `${display.variable} ${serif.variable} ${mono.variable}`

// URL pública para o card de compartilhamento: SITE_URL (produção) ou a URL da build no Cloudflare Pages
export const siteUrl = new URL(process.env.SITE_URL ?? process.env.CF_PAGES_URL ?? 'http://localhost:3000')

export const languages = { 'pt-BR': '/', en: '/en' }

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0b0a09',
  width: 'device-width',
  initialScale: 1,
  userScalable: true,
}

export const metadataPt: Metadata = {
  metadataBase: siteUrl,
  title: 'Jorge Mesquita | O Reino dos Sistemas',
  description: 'Portfólio de Jorge Mesquita, estudante de ADS (Senac) e Engenharia de Software (UNIFG). Um reino onde cada habilidade é uma cidade construída por máquinas.',
  alternates: { canonical: '/', languages },
  openGraph: {
    title: 'Jorge Mesquita | O Reino dos Sistemas',
    description: 'Portfólio de ADS e Engenharia de Software: um reino onde cada habilidade é uma cidade construída por máquinas.',
    locale: 'pt_BR',
    alternateLocale: ['en_US'],
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
  authors: [{ name: 'Jorge Mesquita', url: 'https://www.linkedin.com/in/mesquitaforall' }],
  creator: 'Jorge Mesquita',
}

export const metadataEn: Metadata = {
  metadataBase: siteUrl,
  title: 'Jorge Mesquita | The Realm of Systems',
  description: 'Portfolio of Jorge Mesquita, Systems Analysis (Senac) and Software Engineering (UNIFG) student. A realm where each skill is a city built by machines.',
  alternates: { canonical: '/en', languages },
  openGraph: {
    title: 'Jorge Mesquita | The Realm of Systems',
    description: 'Systems Analysis and Software Engineering portfolio: a realm where each skill is a city built by machines.',
    locale: 'en_US',
    alternateLocale: ['pt_BR'],
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
  authors: [{ name: 'Jorge Mesquita', url: 'https://www.linkedin.com/in/mesquitaforall' }],
  creator: 'Jorge Mesquita',
}
