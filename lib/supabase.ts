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
  round_number: number
  round_status: 'idle' | 'active' | 'won'
  round_winner: string | null
  round_data: Record<string, unknown> | null
  host_attempts: MultiplayerAttempt[]
  guest_attempts: MultiplayerAttempt[]
  round_started_at: string | null
  created_at: string
  updated_at: string
}

export type MultiplayerAttempt = {
  label: string
  correct: boolean
  skipped?: boolean
}

let _client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (_client) return _client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL y/o NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Configúralas en .env.local y en las variables de entorno del despliegue.',
    )
  }
  _client = createClient(url, anonKey, {
    realtime: { params: { eventsPerSecond: 10 } },
  })
  return _client
}
