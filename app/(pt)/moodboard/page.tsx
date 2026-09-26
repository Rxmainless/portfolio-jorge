import type { Metadata } from 'next'
import { Moodboard } from '@/components/moodboard'

export const metadata: Metadata = {
  title: 'Moodboard | O Reino dos Sistemas · Jorge Mesquita',
  description: 'Cores, tipografia, identidade e personalidade do portfólio: Game of Thrones + ASCII goth.',
}

export default function Page() {
  return <Moodboard />
}
