import { getAnimePool } from '@/lib/anilist'

export async function GET() {
  try {
    const pool = await getAnimePool()
    return Response.json(pool, {
      headers: { 'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=86400' },
    })
  } catch {
    return Response.json(
      { error: 'No se pudo cargar la lista de animes. Inténtalo de nuevo.' },
      { status: 502 },
    )
  }
}
