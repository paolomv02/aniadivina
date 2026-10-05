import type { Metadata } from 'next'
import { AnimedleGame } from '@/components/games/animedle-game'

export const metadata: Metadata = { title: 'Animedle' }

export default function Page() {
  return <AnimedleGame />
}
