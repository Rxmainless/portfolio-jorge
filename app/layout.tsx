import type { Metadata, Viewport } from 'next'
import { Cinzel, Cormorant_Garamond, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import './realm.css'

const display = Cinzel({ subsets: ['latin'], weight: ['400', '600', '800'], variable: '--font-display', display: 'swap' })
const serif = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '500', '600'], style: ['normal', 'italic'], variable: '--font-serif', display: 'swap' })
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono', display: 'swap' })

// URL pública para o card de compartilhamento: SITE_URL (produção) ou a URL da build no Cloudflare Pages
const siteUrl = process.env.SITE_URL ?? process.env.CF_PAGES_URL ?? 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Jorge Mesquita | O Reino dos Sistemas',
  description: 'Portfólio de Jorge Mesquita — ADS (Senac) e Engenharia de Software (UNIFG). Um reino onde cada habilidade é uma cidade construída por máquinas.',
  openGraph: {
    title: 'Jorge Mesquita | O Reino dos Sistemas',
    description: 'Portfólio de ADS e Engenharia de Software: um reino onde cada habilidade é uma cidade construída por máquinas.',
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0b0a09',
  width: 'device-width',
  initialScale: 1,
  userScalable: true,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${serif.variable} ${mono.variable}`}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
