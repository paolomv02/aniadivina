'use client'

import { useEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import { Pause, Play, Volume2 } from 'lucide-react'
import { AnimeSearch } from '@/components/game/anime-search'
import { GameError, GameLoading, GameShell } from '@/components/game/game-shell'
import { AttemptDots, AttemptList, RoundResult, type Attempt } from '@/components/game/round-parts'
import { fetcher, roundFetchOptions, useAnimePool } from '@/hooks/use-anime-pool'
import { useStreak } from '@/hooks/use-streak'
import type { OpeningRound } from '@/lib/types'
import { cn } from '@/lib/utils'

const CLIP_SECONDS = [2, 4, 6, 8, 10]
const MAX_ATTEMPTS = CLIP_SECONDS.length

export function OpeningGame() {
  const [roundKey, setRoundKey] = useState(0)
  const { data: pool, error: poolError, mutate: retryPool } = useAnimePool()
  const { data: round, error, isLoading, mutate } = useSWR<OpeningRound>(
    `/api/opening?r=${roundKey}`,
    fetcher,
    roundFetchOptions,
  )
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const { streak, best, record } = useStreak()

  const won = attempts.some((a) => a.correct)
  const finished = won || attempts.length >= MAX_ATTEMPTS
  const clip = finished ? null : CLIP_SECONDS[Math.min(attempts.length, MAX_ATTEMPTS - 1)]

  function addAttempt(attempt: Attempt) {
    const next = [...attempts, attempt]
    setAttempts(next)
    if (attempt.correct) record(true)
    else if (next.length >= MAX_ATTEMPTS) record(false)
  }

  function nextRound() {
    setAttempts([])
    setRoundKey((k) => k + 1)
  }

  return (
    <GameShell
      title="Adivina el Opening"
      description="Escucha el fragmento y adivina el anime. Cada fallo desbloquea más segundos."
      streak={streak}
      best={best}
    >
      {error || poolError ? (
        <GameError
          message={(error ?? poolError).message}
          onRetry={() => (poolError ? retryPool() : mutate())}
        />
      ) : isLoading || !round || !pool ? (
        <GameLoading label="Afinando el opening..." />
      ) : (
        <>
          <ClipPlayer key={round.audioUrl} src={round.audioUrl} limit={clip} />
          <AttemptDots attempts={attempts} max={MAX_ATTEMPTS} />
          {!finished && (
            <AnimeSearch
              pool={pool}
              excludeIds={[]}
              focusKey={roundKey}
              onSelect={(anime) => addAttempt({ label: anime.title, correct: anime.franchiseId === round.anime.franchiseId })}
              onSkip={() => addAttempt({ label: '', correct: false, skipped: true })}
            />
          )}
          <AttemptList attempts={attempts} />
          {finished && (
            <RoundResult
              won={won}
              anime={round.anime}
              attemptsUsed={attempts.length}
              onNext={nextRound}
              extra={
                <p className="text-sm text-muted-foreground">
                  {round.slug}: <span className="text-foreground">{round.songTitle}</span>
                  {round.artists.length > 0 && ` — ${round.artists.join(', ')}`}
                </p>
              }
            />
          )}
        </>
      )}
    </GameShell>
  )
}

function ClipPlayer({ src, limit }: { src: string; limit: number | null }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [volume, setVolume] = useState(0.6)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const max = limit ?? 10

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !ready) return
    if (limit !== null) audio.currentTime = 0
    void audio.play().catch(() => {
      // El navegador puede bloquear autoplay con sonido; el botón sigue disponible.
    })
  }, [limit, ready, src])

  function toggle() {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      return
    }
    if (limit !== null) audio.currentTime = 0
    audio.play().catch(() => setFailed(true))
  }

  function onTimeUpdate() {
    const audio = audioRef.current
    if (!audio) return
    setTime(audio.currentTime)
    if (limit !== null && audio.currentTime >= limit) {
      audio.pause()
      audio.currentTime = 0
      setTime(0)
    }
  }

  const progress = limit !== null ? Math.min(time / max, 1) : 0

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
      <audio
        ref={audioRef}
        src={src}
        preload="auto"
        autoPlay
        onCanPlay={() => setReady(true)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={onTimeUpdate}
        onError={() => setFailed(true)}
      />
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={toggle}
          disabled={!ready || failed}
          aria-label={playing ? 'Pausar' : 'Reproducir fragmento'}
          className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105 disabled:opacity-50"
        >
          {playing ? <Pause className="size-6" aria-hidden="true" /> : <Play className="ml-0.5 size-6" aria-hidden="true" />}
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium">
              {failed
                ? 'No se pudo cargar el audio'
                : !ready
                  ? 'Cargando audio...'
                  : limit !== null
                    ? `Fragmento de ${limit} segundos`
                    : 'Opening completo desbloqueado'}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {limit !== null ? `${time.toFixed(1)}s / ${limit}s` : `${time.toFixed(0)}s`}
            </span>
          </div>
          {limit !== null ? (
            <div className="relative h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-100"
                style={{ width: `${progress * 100}%` }}
              />
              {CLIP_SECONDS.slice(0, -1).map((s) => (
                <span key={s} className="absolute inset-y-0 w-px bg-background/70" style={{ left: `${(s / 10) * 100}%` }} />
              ))}
            </div>
          ) : (
            <Equalizer active={playing} />
          )}
        </div>
      </div>
      <label className="flex items-center gap-3 text-sm text-muted-foreground">
        <Volume2 className="size-4" aria-hidden="true" />
        <span className="sr-only">Volumen</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="w-40 accent-primary"
        />
      </label>
    </div>
  )
}

function Equalizer({ active }: { active: boolean }) {
  return (
    <div className="flex h-2 items-end gap-1" aria-hidden="true">
      {Array.from({ length: 24 }).map((_, i) => (
        <span
          key={i}
          className={cn('w-full rounded-full bg-primary/70', active && 'animate-pulse')}
          style={{ height: active ? `${30 + ((i * 37) % 70)}%` : '30%', animationDelay: `${i * 60}ms` }}
        />
      ))}
    </div>
  )
}
