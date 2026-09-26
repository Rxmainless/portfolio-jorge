import { fontClasses, metadataPt, viewport } from '../site'
import '../globals.css'
import '../realm.css'

export const metadata = metadataPt
export { viewport }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={fontClasses}>
      <body className="antialiased">{children}</body>
    </html>
  )
}
