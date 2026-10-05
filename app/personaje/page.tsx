import type { Metadata } from 'next'
import { CharacterGame } from '@/components/games/character-game'

export const metadata: Metadata = { title: 'Adivina el Personaje' }

export default function Page() {
  return <CharacterGame />
}
