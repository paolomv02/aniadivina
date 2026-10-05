import { getAnimePool, pickRandom } from '@/lib/anilist'
import type { OpeningRound } from '@/lib/types'

type Theme = {
  slug: string
  type: string
  sequence: number | null
  song: { title: string | null; artists: { name: string }[] } | null
  animethemeentries: {
    nsfw: boolean
    spoiler: boolean
    videos: { audio: { link: string } | null }[]
  }[]
}

async function findOpening(malId: number) {
  const params = new URLSearchParams({
    'filter[has]': 'resources',
    'filter[site]': 'MyAnimeList',
    'filter[external_id]': String(malId),
    include: 'animethemes.animethemeentries.videos.audio,animethemes.song.artists',
    'fields[anime]': 'id,name',
  })
  const res = await fetch(`https://api.animethemes.moe/anime?${params}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'AniAdivina/1.0' },
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) return null
  const json = (await res.json()) as { anime: { animethemes: Theme[] }[] }
  const themes = json.anime[0]?.animethemes ?? []

  const playable = themes
    .filter((t) => t.type === 'OP')
    .map((t) => {
      const entry = t.animethemeentries.find(
        (e) => !e.nsfw && !e.spoiler && e.videos.some((v) => v.audio?.link),
      )
      const audio = entry?.videos.find((v) => v.audio?.link)?.audio?.link
      return audio ? { theme: t, audio } : null
    })
    .filter((x): x is { theme: Theme; audio: string } => x !== null)
    .slice(0, 3)

  if (playable.length === 0) return null
  return pickRandom(playable)
}

export async function GET() {
  try {
    const pool = await getAnimePool()
    const candidates = pool.slice(0, 200).filter((a) => a.idMal)
    for (let attempt = 0; attempt < 5; attempt++) {
      const anime = pickRandom(candidates)
      const found = await findOpening(anime.idMal as number)
      if (!found) continue
      const round: OpeningRound = {
        anime,
        slug: found.theme.slug,
        songTitle: found.theme.song?.title ?? 'Título desconocido',
        artists: found.theme.song?.artists.map((a) => a.name) ?? [],
        audioUrl: found.audio,
      }
      return Response.json(round, { headers: { 'Cache-Control': 'no-store' } })
    }
    throw new Error('Sin openings')
  } catch {
    return Response.json(
      { error: 'No se pudo cargar un opening. Inténtalo de nuevo.' },
      { status: 502 },
    )
  }
}
