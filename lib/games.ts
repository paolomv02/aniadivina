import { CalendarDays, Image as ImageIcon, Music, UserRound, type LucideIcon } from 'lucide-react'

export type GameInfo = {
  href: string
  label: string
  title: string
  description: string
  icon: LucideIcon
}

export const GAMES: GameInfo[] = [
  {
    href: '/personaje',
    label: 'Personaje',
    title: 'Adivina el Personaje',
    description: 'Una imagen difuminada se aclara con cada fallo. ¿Sabes quién es?',
    icon: UserRound,
  },
  {
    href: '/animedle',
    label: 'Animedle',
    title: 'Animedle',
    description: 'Descubre el anime del día comparando año, géneros, estudio y puntuación.',
    icon: CalendarDays,
  },
  {
    href: '/captura',
    label: 'Captura',
    title: 'Adivina por la Captura',
    description: 'Un fotograma muy ampliado se aleja con cada intento. ¿De qué anime es?',
    icon: ImageIcon,
  },
  {
    href: '/opening',
    label: 'Opening',
    title: 'Adivina el Opening',
    description: 'Escucha unos segundos del opening y adivina a qué anime pertenece.',
    icon: Music,
  },
]
