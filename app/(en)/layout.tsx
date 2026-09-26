import { fontClasses, metadataEn, viewport } from '../site'
import '../globals.css'
import '../realm.css'

export const metadata = metadataEn
export { viewport }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={fontClasses}>
      <body className="antialiased">{children}</body>
    </html>
  )
}
