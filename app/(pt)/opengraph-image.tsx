import { shareCard, size } from '@/lib/og/card'

export const alt = 'Jorge Mesquita, O Reino dos Sistemas. Portfólio de ADS e Engenharia de Software.'
export { size }
export const contentType = 'image/png'
export const dynamic = 'force-static'

export default function OpengraphImage() {
  return shareCard('pt-BR')
}
