'use client'

import useSWR from 'swr'
import type { Anime } from '@/lib/types'

export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url)
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error ?? 'Error al cargar los datos')
  return json as T
}

export function useAnimePool() {
  return useSWR<Anime[]>('/api/anime', fetcher, {
    revalidateOnFocus: false,
    revalidateIfStale: false,
    revalidateOnReconnect: false,
  })
}

export const roundFetchOptions = {
  revalidateOnFocus: false,
  revalidateIfStale: false,
  revalidateOnReconnect: false,
  shouldRetryOnError: false,
}
