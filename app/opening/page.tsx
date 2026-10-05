import type { Metadata } from 'next'
import { OpeningGame } from '@/components/games/opening-game'

export const metadata: Metadata = { title: 'Adivina el Opening' }

export default function Page() {
  return <OpeningGame />
}
