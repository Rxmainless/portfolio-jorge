import { shareCard, size } from '@/lib/og/card'

export const alt = 'Jorge Mesquita, The Realm of Systems. Systems Analysis and Software Engineering portfolio.'
export { size }
export const contentType = 'image/png'
export const dynamic = 'force-static'

export default function OpengraphImage() {
  return shareCard('en')
}
