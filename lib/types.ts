export type Anime = {
  id: number
  idMal: number | null
  title: string
  titleRomaji: string
  titleEnglish: string | null
  synonyms: string[]
  year: number | null
  season: string | null
  format: string | null
  episodes: number | null
  score: number | null
  genres: string[]
  studio: string | null
  source: string | null
  cover: string
  color: string | null
  banner: string | null
  siteUrl: string
}

export type CharacterRound = {
  anime: Anime
  character: {
    id: number
    name: string
    nameVariants: string[]
    image: string
    source: 'jikan' | 'anilist'
  }
}

export type OpeningRound = {
  anime: Anime
  slug: string
  songTitle: string
  artists: string[]
  audioUrl: string
}
