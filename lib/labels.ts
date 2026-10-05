const FORMAT: Record<string, string> = {
  TV: 'Serie TV',
  TV_SHORT: 'TV corta',
  MOVIE: 'Película',
  ONA: 'ONA',
  OVA: 'OVA',
  SPECIAL: 'Especial',
}

const SEASON: Record<string, string> = {
  WINTER: 'Invierno',
  SPRING: 'Primavera',
  SUMMER: 'Verano',
  FALL: 'Otoño',
}

const SOURCE: Record<string, string> = {
  ORIGINAL: 'Original',
  MANGA: 'Manga',
  LIGHT_NOVEL: 'Novela ligera',
  VISUAL_NOVEL: 'Novela visual',
  VIDEO_GAME: 'Videojuego',
  NOVEL: 'Novela',
  WEB_NOVEL: 'Novela web',
  OTHER: 'Otro',
  DOUJINSHI: 'Doujinshi',
  ANIME: 'Anime',
  LIVE_ACTION: 'Live action',
  GAME: 'Juego',
  COMIC: 'Cómic',
  MULTIMEDIA_PROJECT: 'Multimedia',
  PICTURE_BOOK: 'Libro ilustrado',
}

const GENRE: Record<string, string> = {
  Action: 'Acción',
  Adventure: 'Aventura',
  Comedy: 'Comedia',
  Drama: 'Drama',
  Ecchi: 'Ecchi',
  Fantasy: 'Fantasía',
  Horror: 'Terror',
  'Mahou Shoujo': 'Mahou Shoujo',
  Mecha: 'Mecha',
  Music: 'Música',
  Mystery: 'Misterio',
  Psychological: 'Psicológico',
  Romance: 'Romance',
  'Sci-Fi': 'Ciencia ficción',
  'Slice of Life': 'Recuentos de la vida',
  Sports: 'Deportes',
  Supernatural: 'Sobrenatural',
  Thriller: 'Suspense',
}

export const formatLabel = (v: string | null) => (v ? (FORMAT[v] ?? v) : '—')
export const seasonLabel = (v: string | null) => (v ? (SEASON[v] ?? v) : '—')
export const sourceLabel = (v: string | null) => (v ? (SOURCE[v] ?? v) : '—')
export const genreLabel = (v: string) => GENRE[v] ?? v
