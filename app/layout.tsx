import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Cinzel, Cormorant_Garamond, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import './realm.css'

const display = Cinzel({ subsets: ['latin'], weight: ['400', '600', '800'], variable: '--font-display', display: 'swap' })
const serif = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '500', '600'], style: ['normal', 'italic'], variable: '--font-serif', display: 'swap' })
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono', display: 'swap' })

export const metadata: Metadata = {
  title: 'Jorge Mesquita | O Reino dos Sistemas',
  description: 'Portfólio de Jorge Mesquita — Análise e Desenvolvimento de Sistemas. Um reino onde cada habilidade é uma cidade construída por máquinas.',
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
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
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
