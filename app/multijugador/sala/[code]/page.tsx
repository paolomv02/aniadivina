'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, LogOut } from 'lucide-react'
import { getSupabase, type MpRoom } from '@/lib/supabase'
import { GAMES } from '@/lib/games'
import { cn } from '@/lib/utils'
import { MultiplayerGame } from '@/components/multiplayer/multiplayer-game'

export default function GameRoomPage() {
  const params = useParams<{ code: string }>()
  const code = params.code.toUpperCase()

  const [room, setRoom] = useState<MpRoom | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const playerIdRef = useRef<string>('')

  useEffect(() => {
    playerIdRef.current = localStorage.getItem('aniadivina_player_id') ?? crypto.randomUUID()
    localStorage.setItem('aniadivina_player_id', playerIdRef.current)
  }, [])

  useEffect(() => {
    if (!code) return
    let unsub: (() => void) | undefined

    async function init() {
      const supabase = getSupabase()
      const { data, error: dbError } = await supabase
        .from('mp_rooms')
        .select('*')
        .eq('code', code)
        .maybeSingle()

      if (dbError || !data) {
        setError('No se encontró la sala.')
        setLoading(false)
        return
      }

      setRoom(data)
      setLoading(false)

      const channel = supabase
        .channel(`game_room:${data.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'mp_rooms', filter: `id=eq.${data.id}` },
          (payload) => setRoom(payload.new as MpRoom),
        )
        .subscribe()

      unsub = () => supabase.removeChannel(channel)
    }

    init()
    return () => { unsub?.() }
  }, [code])

  const isHost = room ? playerIdRef.current === room.host_player_id : false
  const myNickname = room
    ? isHost
      ? room.host_nickname
      : room.guest_nickname ?? 'Jugador 2'
    : ''
  const oppNickname = room
    ? isHost
      ? room.guest_nickname ?? 'Rival'
      : room.host_nickname
    : ''

  const myScore = room ? (isHost ? room.host_score : room.guest_score) : 0
  const oppScore = room ? (isHost ? room.guest_score : room.host_score) : 0

  const leaveRoom = useCallback(async () => {
    if (!room) return
    const supabase = getSupabase()
    if (playerIdRef.current === room.host_player_id) {
      await supabase.from('mp_rooms').delete().eq('id', room.id)
    } else if (playerIdRef.current === room.guest_player_id) {
      await supabase
        .from('mp_rooms')
        .update({ guest_player_id: null, guest_nickname: null, status: 'waiting' })
        .eq('id', room.id)
    }
    window.location.href = '/multijugador'
  }, [room])

  if (loading) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-20">
        <Loader2 className="size-8 animate-spin text-primary" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Cargando la sala...</p>
      </div>
    )
  }

  if (error || !room) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-20 text-center">
        <p className="text-sm text-destructive">{error ?? 'Sala no encontrada'}</p>
        <button
          type="button"
          onClick={() => { window.location.href = '/multijugador' }}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Volver al menú multijugador
        </button>
      </div>
    )
  }

  const game = GAMES.find((g) => g.label.toLowerCase() === room.game_type.toLowerCase()) ?? GAMES[0]
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
      {/* Scoreboard */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
        <ScoreCard name={myNickname} score={myScore} isYou highlight />
        <div className="flex flex-col items-center gap-0.5">
          <span className="font-heading text-xs font-bold uppercase tracking-wide text-muted-foreground">VS</span>
          <span className="font-mono text-lg font-bold text-primary">{myScore} - {oppScore}</span>
        </div>
        <ScoreCard name={oppNickname} score={oppScore} highlight={false} />
      </div>

      {/* Shared game */}
      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <game.icon className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-heading text-sm font-bold">{game.title}</p>
            <p className="text-xs text-muted-foreground">
              El mismo reto aparece para los dos. El primero que acierte gana la ronda.
            </p>
          </div>
        </div>
      </div>
      <MultiplayerGame room={room} playerId={playerIdRef.current} isHost={isHost} />

      {/* Instructions */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="font-heading text-sm font-bold">Cómo funciona el 1v1</h2>
        <ol className="mt-2 flex flex-col gap-1.5 text-sm text-muted-foreground">
          <li>1. El anfitrión prepara una ronda compartida para ambos jugadores.</li>
          <li>2. Cada jugador responde desde esta misma pantalla.</li>
          <li>3. El primer acierto gana el punto automáticamente.</li>
          <li>4. El reto, los intentos y el marcador se actualizan en tiempo real.</li>
        </ol>
      </div>

      <button
        type="button"
        onClick={leaveRoom}
        className="flex items-center justify-center gap-2 self-start rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <LogOut className="size-4" aria-hidden="true" />
        Salir de la sala
      </button>
    </div>
  )
}

function ScoreCard({
  name,
  score,
  isYou,
  highlight,
}: {
  name: string
  score: number
  isYou?: boolean
  highlight: boolean
}) {
  return (
    <div className={cn('flex flex-1 flex-col gap-1 rounded-xl p-3', highlight ? 'bg-primary/10' : 'bg-muted/50')}>
      <p className="truncate text-sm font-medium">
        {name}
        {isYou && <span className="ml-1.5 text-xs text-primary">(tú)</span>}
      </p>
      <p className="font-mono text-2xl font-bold">{score}</p>
    </div>
  )
}
