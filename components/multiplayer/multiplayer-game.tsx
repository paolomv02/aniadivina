'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Send, SkipForward, Trophy } from 'lucide-react'
import { AnimeSearch } from '@/components/game/anime-search'
import { Button } from '@/components/ui/button'
import { useAnimePool } from '@/hooks/use-anime-pool'
import { getSupabase, type MpRoom, type MultiplayerAttempt } from '@/lib/supabase'
import { matchesCharacterName } from '@/lib/search'
import type { Anime, CharacterRound, OpeningRound } from '@/lib/types'

type CaptureRound = { anime: Anime; focusX: number; focusY: number }
type AnimedleRound = { anime: Anime }
type DuelRound = CharacterRound | OpeningRound | CaptureRound | AnimedleRound

const MAX_ATTEMPTS = 5
const FILTERS = [
  'grayscale(0.9) brightness(0.45) contrast(1.35) blur(12px)',
  'grayscale(0.9) brightness(0.55) contrast(1.25) blur(9px)',
  'grayscale(0.7) brightness(0.65) contrast(1.15) blur(6px)',
  'grayscale(0.3) brightness(0.85) blur(3px)',
  'brightness(1) blur(1.5px)',
]

function isCharacter(round: DuelRound): round is CharacterRound {
  return 'character' in round
}

function isOpening(round: DuelRound): round is OpeningRound {
  return 'audioUrl' in round
}

function isCapture(round: DuelRound): round is CaptureRound {
  return 'focusX' in round
}

function isCorrect(round: DuelRound, label: string) {
  if (isCharacter(round)) return matchesCharacterName(label, round.character.nameVariants)
  return round.anime.franchiseId === Number(label)
}

function getLabel(round: DuelRound) {
  return isCharacter(round) ? round.character.name : round.anime.title
}

export function MultiplayerGame({
  room,
  playerId,
  isHost,
}: {
  room: MpRoom
  playerId: string
  isHost: boolean
}) {
  const { data: pool } = useAnimePool()
  const [guess, setGuess] = useState('')
  const [busy, setBusy] = useState(false)
  const generating = useRef(false)
  const round = room.round_data as DuelRound | null
  const currentPlayer = room.players?.find((player) => player.id === playerId)
  const mine = currentPlayer?.attempts ?? []
  const maxAttempts = MAX_ATTEMPTS

  useEffect(() => {
    if (!isHost || room.status !== 'playing' || room.round_status !== 'idle' || generating.current) return
    generating.current = true
    void createRound(room.game_type, pool).finally(() => { generating.current = false })
  }, [isHost, pool, room.game_type, room.round_number, room.round_status, room.status])

  async function createRound(gameType: string, animePool: Anime[] | undefined) {
    let data: DuelRound
    if (gameType === 'personaje') {
      data = await fetch('/api/character').then((response) => response.json() as Promise<CharacterRound>)
    } else if (gameType === 'opening') {
      data = await fetch('/api/opening').then((response) => response.json() as Promise<OpeningRound>)
    } else {
      if (!animePool?.length) return
      const candidates = animePool.filter((anime) => gameType === 'captura' ? !!anime.banner : anime.id === anime.franchiseId)
      const anime = candidates[Math.floor(Math.random() * candidates.length)] ?? animePool[0]
      data = gameType === 'captura'
        ? { anime, focusX: 20 + Math.random() * 60, focusY: 25 + Math.random() * 50 }
        : { anime }
    }
    await getSupabase().from('mp_rooms').update({
      round_number: room.round_number + 1,
      round_status: 'active',
      round_winner: null,
      round_data: data,
      host_attempts: [],
      guest_attempts: [],
      players: room.players.map((player) => ({ ...player, attempts: [] })),
      round_started_at: new Date().toISOString(),
    }).eq('id', room.id).eq('round_number', room.round_number).eq('round_status', 'idle')
  }

  async function submit(label: string, correct: boolean, skipped = false) {
    if (!round || room.round_status !== 'active' || busy || mine.length >= maxAttempts) return
    setBusy(true)
    const attempt: MultiplayerAttempt = { label, correct, ...(skipped ? { skipped: true } : {}) }
    const attempts = [...mine, attempt]
    const supabase = getSupabase()
    await supabase.rpc('record_mp_attempt', {
      target_room_id: room.id,
      target_round: room.round_number,
      player_id: playerId,
      attempt,
    })
    setGuess('')
    setBusy(false)
  }

  async function nextRound() {
    if (!isHost || room.status !== 'playing' || room.round_status !== 'won') return
    await getSupabase().from('mp_rooms').update({
      round_status: 'idle',
      round_winner: null,
      round_data: null,
      host_attempts: [],
      guest_attempts: [],
      players: room.players.map((player) => ({ ...player, attempts: [] })),
    }).eq('id', room.id).eq('round_number', room.round_number).eq('round_status', 'won')
  }

  async function restartMatch() {
    if (!isHost || room.status !== 'finished') return
    await getSupabase().rpc('restart_mp_room', {
      target_room_id: room.id,
      expected_host_id: playerId,
    })
  }

  if (!round || room.round_status === 'idle') {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-8 text-center">
        <Loader2 className="size-7 animate-spin text-primary" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">{isHost ? 'Preparando el reto...' : 'Esperando el reto del anfitrión...'}</p>
      </div>
    )
  }

  const finished = room.round_status === 'won'
  const winnerName = room.players?.find((player) => player.id === room.round_winner)?.nickname ?? null
  const stage = Math.min(mine.length, FILTERS.length - 1)

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Ronda {room.round_number}</span>
        <span className="text-muted-foreground">Tus intentos: {mine.length}/{maxAttempts}</span>
      </div>

      {isCharacter(round) && (
        <div className="relative mx-auto aspect-[3/4] w-full max-w-[240px] overflow-hidden rounded-2xl border border-border">
          <img src={round.character.image || '/placeholder.svg'} alt={finished ? getLabel(round) : 'Personaje misterioso'} className="size-full object-cover" style={{ filter: finished ? 'none' : FILTERS[stage], transform: finished ? undefined : 'scale(1.1)' }} />
        </div>
      )}
      {isCapture(round) && (
        <div className="relative aspect-[16/7] w-full overflow-hidden rounded-2xl border border-border">
          <img src={round.anime.banner || '/placeholder.svg'} alt={finished ? round.anime.title : 'Captura misteriosa'} className="size-full object-cover" style={{ transform: `scale(${finished ? 1 : Math.max(1.15, 4.2 - mine.length * 0.75)})`, transformOrigin: `${round.focusX}% ${round.focusY}%` }} />
        </div>
      )}
      {isOpening(round) && <OpeningAudio key={round.audioUrl} src={round.audioUrl} />}
      {isAnimedle(round) && <p className="rounded-xl border border-border p-5 text-center text-sm text-muted-foreground">Adivina el anime del día con las pistas de cada intento.</p>}

      {finished ? (
        <div className="flex flex-col items-center gap-3 rounded-xl bg-primary/10 p-5 text-center">
          <Trophy className="size-7 text-primary" aria-hidden="true" />
          <p className="font-semibold">
            {room.status === 'finished'
              ? `${winnerName ?? 'Un jugador'} gana la partida`
              : winnerName ? `${winnerName} gana la ronda` : 'Ronda terminada'}
          </p>
          <p className="text-sm text-muted-foreground">Respuesta: {getLabel(round)}</p>
          {isHost && room.status === 'playing' && <Button onClick={nextRound}>Nueva ronda</Button>}
          {isHost && room.status === 'finished' && <Button onClick={restartMatch}>Reiniciar partida</Button>}
        </div>
      ) : (
        <>
          {isCharacter(round) ? (
            <form onSubmit={(event) => { event.preventDefault(); if (guess.trim()) void submit(guess.trim(), isCorrect(round, guess.trim())) }} className="flex gap-2">
              <input value={guess} onChange={(event) => setGuess(event.target.value)} placeholder="Escribe tu respuesta..." className="h-11 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 outline-none focus:border-primary" disabled={busy} />
              <Button type="submit" disabled={busy || guess.trim().length < 2}><Send className="size-4" aria-hidden="true" /></Button>
            </form>
          ) : isAnimedle(round) ? (
            <AnimeSearch pool={pool ?? []} excludeIds={mine.map((attempt) => Number(attempt.label))} focusKey={room.round_number} onSelect={(anime) => void submit(anime.title, anime.franchiseId === round.anime.franchiseId)} />
          ) : (
            <AnimeSearch pool={pool ?? []} excludeIds={mine.map((attempt) => Number(attempt.label))} focusKey={room.round_number} onSelect={(anime) => void submit(anime.title, anime.franchiseId === round.anime.franchiseId)} onSkip={() => void submit('', false, true)} />
          )}
          {isCharacter(round) && <Button variant="secondary" onClick={() => void submit('', false, true)} disabled={busy}><SkipForward className="size-4" aria-hidden="true" />Saltar</Button>}
        </>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {room.players?.filter((player) => player.id !== playerId).map((player) => (
          <AttemptSummary key={player.id} name={`Intentos de ${player.nickname}`} attempts={player.attempts} />
        ))}
      </div>
    </div>
  )
}

function isAnimedle(round: DuelRound): round is AnimedleRound {
  return 'anime' in round && !isCharacter(round) && !isOpening(round) && !isCapture(round)
}

function OpeningAudio({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !ready) return
    void audio.play().catch(() => {
      // El navegador puede bloquear autoplay con sonido; el control sigue disponible.
    })
  }, [ready, src])

  return (
    <audio
      ref={audioRef}
      controls
      autoPlay
      preload="auto"
      src={src}
      onCanPlay={() => setReady(true)}
      className="w-full"
    />
  )
}

function AttemptSummary({ name, attempts }: { name: string; attempts: MultiplayerAttempt[] }) {
  return <div className="rounded-xl bg-muted/50 p-3 text-sm"><p className="mb-1 font-medium">{name}</p><p className="text-muted-foreground">{attempts.length ? attempts.map((attempt) => attempt.label || 'Saltó').join(' · ') : 'Esperando primer intento...'}</p></div>
}
