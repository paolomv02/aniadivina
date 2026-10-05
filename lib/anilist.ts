import type { Anime } from './types'

const ANILIST_URL = 'https://graphql.anilist.co'
const PAGES = 6
const POOL_TTL_MS = 1000 * 60 * 60 * 12

const POOL_QUERY = `
query ($page: Int) {
  Page(page: $page, perPage: 50) {
    media(type: ANIME, sort: POPULARITY_DESC, isAdult: false, format_in: [TV, MOVIE, ONA]) {
      id
      idMal
      title { romaji english }
      synonyms
      seasonYear
      season
      startDate { year }
      format
      episodes
      averageScore
      genres
      source
      studios(isMain: true) { nodes { name } }
      coverImage { large color }
      bannerImage
      siteUrl
      relations { edges { relationType node { id type } } }
    }
  }
}`

type RawMedia = {
  id: number
  idMal: number | null
  title: { romaji: string; english: string | null }
  synonyms: string[] | null
  seasonYear: number | null
  season: string | null
  startDate: { year: number | null } | null
  format: string | null
  episodes: number | null
  averageScore: number | null
  genres: string[] | null
  source: string | null
  studios: { nodes: { name: string }[] } | null
  coverImage: { large: string; color: string | null }
  bannerImage: string | null
  siteUrl: string
  relations: { edges: { relationType: string; node: { id: number; type: string } }[] } | null
}

const FRANCHISE_RELATIONS = new Set(['PREQUEL', 'SEQUEL', 'PARENT', 'SIDE_STORY'])

function assignFranchises(raw: RawMedia[], pool: Anime[]) {
  const parent = new Map<number, number>()
  const find = (x: number): number => {
    let root = x
    while (parent.has(root) && parent.get(root) !== root) root = parent.get(root) as number
    parent.set(x, root)
    return root
  }
  const union = (a: number, b: number) => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent.set(ra, rb)
  }

  for (const m of raw) {
    find(m.id)
    for (const edge of m.relations?.edges ?? []) {
      if (edge.node.type === 'ANIME' && FRANCHISE_RELATIONS.has(edge.relationType)) {
        union(m.id, edge.node.id)
      }
    }
  }

  const groups = new Map<number, Anime[]>()
  for (const anime of pool) {
    const root = find(anime.id)
    const list = groups.get(root)
    if (list) list.push(anime)
    else groups.set(root, [anime])
  }

  for (const members of groups.values()) {
    const first = [...members].sort((a, b) => {
      const tvA = a.format === 'TV' ? 0 : 1
      const tvB = b.format === 'TV' ? 0 : 1
      if (tvA !== tvB) return tvA - tvB
      return (a.year ?? 9999) - (b.year ?? 9999) || a.id - b.id
    })[0]
    for (const anime of members) anime.franchiseId = first.id
  }
}

export async function anilistQuery<T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(ANILIST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`AniList respondió ${res.status}`)
  const json = (await res.json()) as { data: T; errors?: unknown }
  if (json.errors) throw new Error('Error en la consulta a AniList')
  return json.data
}

function toAnime(m: RawMedia): Anime {
  return {
    id: m.id,
    idMal: m.idMal,
    title: m.title.english ?? m.title.romaji,
    titleRomaji: m.title.romaji,
    titleEnglish: m.title.english,
    synonyms: (m.synonyms ?? []).filter((s) => /^[\x00-\x7F\u00C0-\u024F\s]+$/.test(s)),
    year: m.seasonYear ?? m.startDate?.year ?? null,
    season: m.season,
    format: m.format,
    episodes: m.episodes,
    score: m.averageScore,
    genres: m.genres ?? [],
    studio: m.studios?.nodes[0]?.name ?? null,
    source: m.source,
    cover: m.coverImage.large,
    color: m.coverImage.color,
    banner: m.bannerImage,
    siteUrl: m.siteUrl,
    franchiseId: m.id,
  }
}

let poolCache: { data: Anime[]; at: number } | null = null
let inflight: Promise<Anime[]> | null = null

async function loadPool(): Promise<Anime[]> {
  const all: Anime[] = []
  const raw: RawMedia[] = []
  const seen = new Set<number>()
  for (let page = 1; page <= PAGES; page++) {
    const data = await anilistQuery<{ Page: { media: RawMedia[] } }>(POOL_QUERY, { page })
    for (const m of data.Page.media) {
      if (seen.has(m.id)) continue
      seen.add(m.id)
      raw.push(m)
      all.push(toAnime(m))
    }
  }
  assignFranchises(raw, all)
  return all
}

export async function getAnimePool(): Promise<Anime[]> {
  if (poolCache && Date.now() - poolCache.at < POOL_TTL_MS) return poolCache.data
  if (!inflight) {
    inflight = loadPool()
      .then((data) => {
        poolCache = { data, at: Date.now() }
        return data
      })
      .catch((error) => {
        if (poolCache) return poolCache.data
        throw error
      })
      .finally(() => {
        inflight = null
      })
  }
  return inflight
}

export function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}
