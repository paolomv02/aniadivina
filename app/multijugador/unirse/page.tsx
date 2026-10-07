'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Check, Loader2, LogOut, Users } from 'lucide-react'
import { useMultiplayer } from '@/hooks/use-multiplayer'

export default function JoinRoomPage() {
  return (
    <Suspense fallback={<JoinRoomFallback />}>
      <JoinRoomContent />
    </Suspense>
  )
}

function JoinRoomFallback() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-20">
      <Loader2 className="size-8 animate-spin text-primary" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">Cargando...</p>
    </div>
  )
}

function JoinRoomContent() {
  const params = useSearchParams()
  const code = params.get('code') ?? ''
  const nickname = params.get('name') ?? 'Jugador 2'

  const { room, loading, error, joinRoom, leaveRoom, playerId, setError } = useMultiplayer()
  const joinedRef = useRef(false)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (joinedRef.current) return
    if (!code || code.length < 6) {
      setLocalError('El código no es válido. Debe tener 6 caracteres.')
      return
    }
    joinedRef.current = true
    joinRoom({ code, nickname })
  }, [code, nickname, joinRoom])

  useEffect(() => {
    if (!room || room.status !== 'playing') return
    const id = setTimeout(() => {
      window.location.href = `/multijugador/sala/${room.code}`
    }, 1500)
    return () => clearTimeout(id)
  }, [room])

  if (loading && !room) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-20">
        <Loader2 className="size-8 animate-spin text-primary" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Uniéndose a la sala...</p>
      </div>
    )
  }

  const displayError = localError ?? error

  if (displayError && !room) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-20 text-center">
        <p className="text-sm text-destructive">{displayError}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setLocalError(null)
              setError(null)
              joinedRef.current = false
              joinRoom({ code, nickname })
            }}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Reintentar
          </button>
          <button
            type="button"
            onClick={() => { window.location.href = '/multijugador' }}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Volver
          </button>
        </div>
      </div>
    )
  }

  if (!room) return null

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-10 md:py-16">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-bold tracking-tight md:text-3xl">
          Uniéndose a la sala
        </h1>
        <p className="text-sm text-muted-foreground">
          Código: <span className="font-mono font-semibold text-foreground">{room.code}</span>
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium">{room.players.length}/10 jugadores conectados</p>
        {room.players.map((player) => (
          <PlayerSlot key={player.id} name={player.nickname} status="connected" isYou={player.id === playerId} />
        ))}
      </div>

      <div className="flex items-center justify-center gap-2 rounded-xl border border-success/40 bg-success/10 p-4 text-sm">
        <Check className="size-4 text-success" aria-hidden="true" />
        <span className="text-foreground">
          {room.players.length >= 2 ? '¡Te has unido! Esperando a que el anfitrión inicie la partida...' : 'Te has unido. Esperando al menos un jugador más...'}
        </span>
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
        Salir de la sala
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
