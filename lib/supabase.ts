import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(url, anonKey, {
  realtime: { params: { eventsPerSecond: 10 } },
})

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
