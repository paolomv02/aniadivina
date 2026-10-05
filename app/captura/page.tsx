import type { Metadata } from 'next'
import { ScreenshotGame } from '@/components/games/screenshot-game'

export const metadata: Metadata = { title: 'Adivina por la Captura' }

export default function Page() {
  return <ScreenshotGame />
}
