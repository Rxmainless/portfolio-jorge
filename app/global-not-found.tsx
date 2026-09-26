import type { Metadata } from 'next'
import { fontClasses, siteUrl } from './site'
import './globals.css'
import './realm.css'

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: 'Página não encontrada | O Reino dos Sistemas',
  robots: { index: false },
}

/** 404 dos dois idiomas (o site tem um layout raiz por idioma). */
export default function GlobalNotFound() {
  return (
    <html lang="pt-BR" className={fontClasses}>
      <body className="antialiased">
        <main className="realm grain not-found">
          <p className="eyebrow">404 · terra não mapeada</p>
          <h1 className="display">Esta estrada não leva a nenhuma casa</h1>
          <p>
            <a className="text-link" href="/">
              Voltar ao reino
            </a>
            {'  ·  '}
            <a className="text-link" href="/en">
              Back to the realm
            </a>
          </p>
        </main>
      </body>
    </html>
  )
}
