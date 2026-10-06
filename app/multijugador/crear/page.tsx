'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Check, Copy, Loader2, LogOut, Users } from 'lucide-react'
import { useMultiplayer } from '@/hooks/use-multiplayer'
import { GAMES } from '@/lib/games'

export default function CreateRoomPage() {
  return (
    <Suspense fallback={<CreateRoomFallback />}>
      <CreateRoomContent />
    </Suspense>
  )
}

function CreateRoomFallback() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-20">
      <Loader2 className="size-8 animate-spin text-primary" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">Cargando...</p>
    </div>
  )
}

function CreateRoomContent() {
  const params = useSearchParams()
  const gameType = params.get('game') ?? 'personaje'
  const nickname = params.get('name') ?? 'Jugador 1'
  const gameHref = params.get('href') ?? '/personaje'
  const game = GAMES.find((g) => g.label.toLowerCase() === gameType.toLowerCase()) ?? GAMES[0]

  const { room, loading, error, createRoom, leaveRoom, isHost } = useMultiplayer()
  const createdRef = useRef(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (createdRef.current) return
    createdRef.current = true
    createRoom({ gameType: game.label.toLowerCase(), nickname })
  }, [createRoom, game.label, nickname])

  useEffect(() => {
    if (!room || room.status !== 'playing') return
    const id = setTimeout(() => {
      window.location.href = `/multijugador/sala/${room.code}`
    }, 1500)
    return () => clearTimeout(id)
  }, [room])

  async function copyCode() {
    if (!room) return
    await navigator.clipboard.writeText(room.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading && !room) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-20">
        <Loader2 className="size-8 animate-spin text-primary" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Creando la sala...</p>
      </div>
    )
  }

  if (error && !room) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-20 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <button
          type="button"
          onClick={() => createRoom({ gameType: game.label.toLowerCase(), nickname })}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Reintentar
        </button>
      </div>
    )
  }

  if (!room) return null

  const guestJoined = room.status === 'playing' && !!room.guest_player_id

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-10 md:py-16">
      <div className="flex flex-col gap-2">
        <span className="w-fit rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          {game.title}
        </span>
        <h1 className="font-heading text-2xl font-bold tracking-tight md:text-3xl">Sala de espera</h1>
        <p className="text-sm text-muted-foreground">
          Comparte el código con tu amigo para que pueda unirse.
        </p>
      </div>

      {/* Room code */}
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Código de sala</p>
        <div className="flex items-center gap-3">
          <span className="font-mono text-4xl font-bold tracking-[0.3em] text-foreground sm:text-5xl">
            {room.code}
          </span>
          <button
            type="button"
            onClick={copyCode}
            className="flex size-10 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Copiar código"
          >
            {copied ? <Check className="size-5 text-success" aria-hidden="true" /> : <Copy className="size-5" aria-hidden="true" />}
          </button>
        </div>
        {copied && <p className="text-xs text-success">Código copiado al portapapeles</p>}
      </div>

      {/* Player slots */}
      <div className="flex flex-col gap-3">
        <PlayerSlot
          name={room.host_nickname}
          status="connected"
          isYou={isHost}
        />
        <PlayerSlot
          name={room.guest_nickname ?? 'Esperando invitado...'}
          status={guestJoined ? 'connected' : 'waiting'}
          isYou={!isHost}
        />
      </div>

      {/* Status */}
      <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card p-4 text-sm">
        {guestJoined ? (
          <>
            <Check className="size-4 text-success" aria-hidden="true" />
            <span className="text-foreground">
              <span className="font-semibold">{room.guest_nickname}</span> se ha unido. ¡Comenzando la partida!
            </span>
          </>
        ) : (
          <>
            <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />
            <span className="text-muted-foreground">Esperando a que se una tu amigo...</span>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          leaveRoom()
          window.location.href = '/multijugador'
        }}
        className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <LogOut className="size-4" aria-hidden="true" />
        Cancelar y salir
      </button>
    </div>
  )
}

function PlayerSlot({
  name,
  status,
  isYou,
}: {
  name: string
  status: 'connected' | 'waiting'
  isYou: boolean
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
      <span
        className={`flex size-10 items-center justify-center rounded-lg ${
          status === 'connected' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
        }`}
      >
        <Users className="size-5" aria-hidden="true" />
      </span>
      <div className="flex-1">
        <p className="text-sm font-medium">
          {name}
          {isYou && <span className="ml-2 text-xs text-primary">(tú)</span>}
        </p>
        <p className={`text-xs ${status === 'connected' ? 'text-success' : 'text-muted-foreground'}`}>
          {status === 'connected' ? 'Conectado' : 'Pendiente'}
        </p>
      </div>
    </div>
  )
}
