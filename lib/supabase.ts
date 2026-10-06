import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type MpRoom = {
  id: string
  code: string
  game_type: string
  host_player_id: string
  host_nickname: string
  guest_player_id: string | null
  guest_nickname: string | null
  status: string
  host_score: number
  guest_score: number
  created_at: string
  updated_at: string
}

let _client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (_client) return _client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error('Faltan las variables de entorno de Supabase.')
  }
  _client = createClient(url, anonKey, {
    realtime: { params: { eventsPerSecond: 10 } },
  })
  return _client
}
