import { anilistQuery, getAnimePool, pickRandom } from '@/lib/anilist'
import type { CharacterRound } from '@/lib/types'

type JikanCharacter = {
  role: string
  favorites: number
  character: {
    mal_id: number
    name: string
    images: { jpg?: { image_url?: string }; webp?: { image_url?: string } }
  }
}

let jikanDownUntil = 0

function jikanNameVariants(raw: string) {
  const [last, first] = raw.split(',').map((s) => s.trim())
  const display = first ? `${first} ${last}` : raw
  return { display, variants: [display, raw, last, first].filter(Boolean) as string[] }
}

async function fromJikan(malId: number): Promise<CharacterRound['character'] | null> {
  if (Date.now() < jikanDownUntil) return null
  try {
    const res = await fetch(`https://api.jikan.moe/v4/anime/${malId}/characters`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(4500),
    })
    if (!res.ok) return null
    const json = (await res.json()) as { data: JikanCharacter[] }
    const main = json.data
      .filter((c) => c.role === 'Main')
      .filter((c) => {
        const url = c.character.images.jpg?.image_url ?? ''
        return url && !url.includes('questionmark')
      })
      .sort((a, b) => b.favorites - a.favorites)
      .slice(0, 3)
    if (main.length === 0) return null
    const pick = pickRandom(main)
    const { display, variants } = jikanNameVariants(pick.character.name)
    return {
      id: pick.character.mal_id,
      name: display,
      nameVariants: variants,
      image: pick.character.images.jpg?.image_url ?? '',
      source: 'jikan',
    }
  } catch {
    jikanDownUntil = Date.now() + 1000 * 60 * 5
    return null
  }
}

const CHARACTER_QUERY = `
query ($id: Int) {
  Media(id: $id) {
    characters(role: MAIN, sort: FAVOURITES_DESC, perPage: 3) {
      nodes { id name { full alternative } image { large } }
    }
  }
}`

type AniListCharacters = {
  Media: {
    characters: {
      nodes: { id: number; name: { full: string; alternative: string[] | null }; image: { large: string } }[]
    }
  }
}

async function fromAniList(id: number): Promise<CharacterRound['character'] | null> {
  try {
    const data = await anilistQuery<AniListCharacters>(CHARACTER_QUERY, { id })
    const nodes = data.Media.characters.nodes.filter(
      (n) => n.image.large && !n.image.large.includes('default'),
    )
    if (nodes.length === 0) return null
    const pick = pickRandom(nodes)
    return {
      id: pick.id,
      name: pick.name.full,
      nameVariants: [pick.name.full, ...(pick.name.alternative ?? [])].filter(Boolean),
      image: pick.image.large,
      source: 'anilist',
    }
  } catch {
    return null
  }
}

export async function GET() {
  try {
    const pool = await getAnimePool()
    const candidates = pool.slice(0, 160)
    for (let attempt = 0; attempt < 4; attempt++) {
      const anime = pickRandom(candidates)
      const character =
        (anime.idMal ? await fromJikan(anime.idMal) : null) ?? (await fromAniList(anime.id))
      if (character) {
        const round: CharacterRound = { anime, character }
        return Response.json(round, { headers: { 'Cache-Control': 'no-store' } })
      }
    }
    throw new Error('Sin personajes')
  } catch {
    return Response.json(
      { error: 'No se pudo cargar un personaje. Inténtalo de nuevo.' },
      { status: 502 },
    )
  }
}
