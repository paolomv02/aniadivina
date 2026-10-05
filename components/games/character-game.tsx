'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Lightbulb } from 'lucide-react'
import { AnimeSearch } from '@/components/game/anime-search'
import { GameError, GameLoading, GameShell } from '@/components/game/game-shell'
import { AttemptDots, AttemptList, RoundResult, type Attempt } from '@/components/game/round-parts'
import { fetcher, roundFetchOptions, useAnimePool } from '@/hooks/use-anime-pool'
import { useStreak } from '@/hooks/use-streak'
import { genreLabel } from '@/lib/labels'
import { initials } from '@/lib/search'
import type { CharacterRound } from '@/lib/types'

const MAX_ATTEMPTS = 5
const BLUR = [28, 20, 13, 7, 3]

export function CharacterGame() {
  const [roundKey, setRoundKey] = useState(0)
  const { data: pool, error: poolError, mutate: retryPool } = useAnimePool()
  const { data: round, error, isLoading, mutate } = useSWR<CharacterRound>(
    `/api/character?r=${roundKey}`,
    fetcher,
    roundFetchOptions,
  )
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [silhouette, setSilhouette] = useState(true)
  const { streak, best, record } = useStreak()

  const won = attempts.some((a) => a.correct)
  const finished = won || attempts.length >= MAX_ATTEMPTS
  const level = Math.min(attempts.length, BLUR.length - 1)
  const blur = finished ? 0 : BLUR[level]
  const showSilhouette = silhouette && !finished && attempts.length < 2

  function addAttempt(attempt: Attempt) {
    const next = [...attempts, attempt]
    setAttempts(next)
    if (attempt.correct) record(true)
    else if (next.length >= MAX_ATTEMPTS) record(false)
  }

  function nextRound() {
    setAttempts([])
    setSilhouette(true)
    setRoundKey((k) => k + 1)
  }

  const hints = round
    ? [
        attempts.length >= 1 && { label: 'Año', value: round.anime.year ?? '—' },
        attempts.length >= 2 && {
          label: 'Géneros',
          value: round.anime.genres.slice(0, 3).map(genreLabel).join(', ') || '—',
        },
        attempts.length >= 3 && { label: 'Estudio', value: round.anime.studio ?? '—' },
        attempts.length >= 4 && { label: 'Iniciales del personaje', value: initials(round.character.name) },
      ].filter(Boolean) as { label: string; value: string | number }[]
    : []

  return (
    <GameShell
      title="Adivina el Personaje"
      description="Adivina de qué anime es este personaje. La imagen se aclara con cada fallo."
      streak={streak}
      best={best}
    >
      {error || poolError ? (
        <GameError
          message={(error ?? poolError).message}
          onRetry={() => (poolError ? retryPool() : mutate())}
        />
      ) : isLoading || !round || !pool ? (
        <GameLoading label="Buscando un personaje..." />
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-[minmax(0,260px)_1fr]">
            <div className="relative mx-auto aspect-[3/4] w-full max-w-[260px] overflow-hidden rounded-2xl border border-border bg-card">
              <img
                key={round.character.image}
                src={round.character.image || '/placeholder.svg'}
                alt={finished ? `Imagen de ${round.character.name}` : 'Personaje misterioso'}
                className="size-full object-cover transition-[filter] duration-700"
                style={{
                  filter: showSilhouette
                    ? `brightness(0) blur(${Math.min(blur, 6)}px)`
                    : `blur(${blur}px)`,
                  transform: blur > 0 ? 'scale(1.08)' : undefined,
                }}
              />
              {finished && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 to-transparent p-3 pt-10">
                  <p className="text-xs text-muted-foreground">Personaje</p>
                  <p className="font-heading text-lg font-bold">{round.character.name}</p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <AttemptDots attempts={attempts} max={MAX_ATTEMPTS} />
              {!finished && (
                <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={silhouette}
                    onChange={(e) => setSilhouette(e.target.checked)}
                    disabled={attempts.length >= 2}
                    className="size-4 accent-primary"
                  />
                  Modo silueta (primeros 2 intentos)
                </label>
              )}
              {hints.length > 0 && (
                <ul className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
                  {hints.map((h) => (
                    <li key={h.label} className="flex items-start gap-2 text-sm">
                      <Lightbulb className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
                      <span className="text-muted-foreground">{h.label}:</span>
                      <span className="font-medium">{h.value}</span>
                    </li>
                  ))}
                </ul>
              )}
              <AttemptList attempts={attempts} />
              {!finished && (
                <AnimeSearch
                  pool={pool}
                  excludeIds={[]}
                  onSelect={(anime) =>
                    addAttempt({ label: anime.title, correct: anime.id === round.anime.id })
                  }
                  onSkip={() => addAttempt({ label: '', correct: false, skipped: true })}
                />
              )}
            </div>
          </div>

          {finished && (
            <RoundResult
              won={won}
              anime={round.anime}
              attemptsUsed={attempts.length}
              onNext={nextRound}
              extra={
                <p className="text-sm text-muted-foreground">
                  Personaje: <span className="text-foreground">{round.character.name}</span>
                </p>
              }
            />
          )}
        </>
      )}
    </GameShell>
  )
}
