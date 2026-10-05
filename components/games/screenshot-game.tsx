'use client'

import { useMemo, useState } from 'react'
import { Lightbulb } from 'lucide-react'
import { AnimeSearch } from '@/components/game/anime-search'
import { GameError, GameLoading, GameShell } from '@/components/game/game-shell'
import { AttemptDots, AttemptList, RoundResult, type Attempt } from '@/components/game/round-parts'
import { useAnimePool } from '@/hooks/use-anime-pool'
import { useStreak } from '@/hooks/use-streak'
import { formatLabel, genreLabel } from '@/lib/labels'
import type { Anime } from '@/lib/types'

const MAX_ATTEMPTS = 5
const ZOOM = [4.2, 3.2, 2.3, 1.6, 1.15]

function pickRound(pool: Anime[], previous?: number) {
  const withBanner = pool.filter((a) => a.banner && a.id !== previous)
  const anime = withBanner[Math.floor(Math.random() * withBanner.length)]
  return {
    anime,
    focusX: 20 + Math.random() * 60,
    focusY: 25 + Math.random() * 50,
  }
}

export function ScreenshotGame() {
  const { data: pool, error, mutate } = useAnimePool()
  const [seed, setSeed] = useState(0)
  const round = useMemo(
    () => (pool ? pickRound(pool) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pool, seed],
  )
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const { streak, best, record } = useStreak()

  const won = attempts.some((a) => a.correct)
  const finished = won || attempts.length >= MAX_ATTEMPTS
  const zoom = finished ? 1 : ZOOM[Math.min(attempts.length, ZOOM.length - 1)]

  function addAttempt(attempt: Attempt) {
    const next = [...attempts, attempt]
    setAttempts(next)
    if (attempt.correct) record(true)
    else if (next.length >= MAX_ATTEMPTS) record(false)
  }

  function nextRound() {
    setAttempts([])
    setSeed((s) => s + 1)
  }

  const hints = round
    ? ([
        attempts.length >= 2 && { label: 'Formato', value: formatLabel(round.anime.format) },
        attempts.length >= 3 && { label: 'Año', value: String(round.anime.year ?? '—') },
        attempts.length >= 4 && {
          label: 'Géneros',
          value: round.anime.genres.slice(0, 3).map(genreLabel).join(', ') || '—',
        },
      ].filter(Boolean) as { label: string; value: string }[])
    : []

  return (
    <GameShell
      title="Adivina por la Captura"
      description="La imagen empieza muy ampliada y se aleja con cada intento fallido."
      streak={streak}
      best={best}
    >
      {error ? (
        <GameError message={error.message} onRetry={() => mutate()} />
      ) : !pool || !round ? (
        <GameLoading label="Preparando la captura..." />
      ) : (
        <>
          <div className="relative aspect-[16/7] w-full overflow-hidden rounded-2xl border border-border bg-card">
            <img
              key={round.anime.id}
              src={round.anime.banner || '/placeholder.svg'}
              alt={finished ? `Escena de ${round.anime.title}` : 'Captura de un anime misterioso'}
              className="size-full object-cover transition-transform duration-700 ease-out"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: `${round.focusX}% ${round.focusY}%`,
              }}
            />
            {!finished && (
              <span className="absolute top-3 left-3 rounded-md bg-background/80 px-2 py-1 font-mono text-xs backdrop-blur">
                {`Zoom x${zoom.toFixed(1)}`}
              </span>
            )}
          </div>

          <AttemptDots attempts={attempts} max={MAX_ATTEMPTS} />

          {hints.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {hints.map((h) => (
                <li
                  key={h.label}
                  className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm"
                >
                  <Lightbulb className="size-4 text-warning" aria-hidden="true" />
                  <span className="text-muted-foreground">{h.label}:</span>
                  <span className="font-medium">{h.value}</span>
                </li>
              ))}
            </ul>
          )}

          {!finished && (
            <AnimeSearch
              pool={pool}
              excludeIds={[]}
              onSelect={(anime) => addAttempt({ label: anime.title, correct: anime.id === round.anime.id })}
              onSkip={() => addAttempt({ label: '', correct: false, skipped: true })}
            />
          )}
          <AttemptList attempts={attempts} />

          {finished && (
            <RoundResult won={won} anime={round.anime} attemptsUsed={attempts.length} onNext={nextRound} />
          )}
        </>
      )}
    </GameShell>
  )
}
