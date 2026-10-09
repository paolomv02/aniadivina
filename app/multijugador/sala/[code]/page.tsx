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
    let cancelled = false
    let channel: ReturnType<ReturnType<typeof getSupabase>['channel']> | undefined
    const supabase = getSupabase()

    async function init() {
      const { data, error: dbError } = await supabase
        .from('mp_rooms')
        .select('*')
        .eq('code', code)
        .maybeSingle()

      if (cancelled) return

      if (dbError || !data) {
        setError('No se encontró la sala.')
        setLoading(false)
        return
      }

      setRoom(data)
      setLoading(false)

      channel = supabase
        .channel(`game_room:${data.id}:${crypto.randomUUID()}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'mp_rooms', filter: `id=eq.${data.id}` },
            (payload) => {
              if (cancelled) return
              if (payload.eventType === 'DELETE') {
                window.location.href = '/multijugador/terminada'
                return
              }
              setRoom(payload.new as MpRoom)
            },
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' && !cancelled) {
            setError('No se pudo conectar a la sala en tiempo real.')
          }
        })
    }

    void init()
    return () => {
      cancelled = true
      if (channel) void supabase.removeChannel(channel)
    }
  }, [code])

  const isHost = room ? playerIdRef.current === room.host_player_id : false
  const players = room?.players ?? []

  const leaveRoom = useCallback(async () => {
    if (!room) return
    const isLeavingHost = playerIdRef.current === room.host_player_id
    const supabase = getSupabase()
    await supabase.rpc('leave_mp_room', {
      target_room_id: room.id,
      leaving_player_id: playerIdRef.current,
    })
    window.location.href = isLeavingHost ? '/multijugador/terminada' : '/multijugador'
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
      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-card p-4 sm:grid-cols-3">
        {players.map((player) => (
          <ScoreCard key={player.id} name={player.nickname} score={player.score} isYou={player.id === playerIdRef.current} highlight={player.id === playerIdRef.current} />
        ))}
      </div>
      <p className="text-center text-sm text-muted-foreground">
        Meta: <span className="font-semibold text-foreground">{room.target_score} puntos</span>
      </p>

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
        <h2 className="font-heading text-sm font-bold">Cómo funciona la partida</h2>
        <ol className="mt-2 flex flex-col gap-1.5 text-sm text-muted-foreground">
          <li>1. El anfitrión prepara una ronda compartida para todos los jugadores.</li>
          <li>2. Cada jugador responde desde esta misma pantalla.</li>
          <li>3. El primer acierto gana el punto automáticamente. Se necesitan al menos 2 jugadores.</li>
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
