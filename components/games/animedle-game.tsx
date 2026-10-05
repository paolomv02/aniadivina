'use client'

import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Shuffle } from 'lucide-react'
import { AnimeSearch } from '@/components/game/anime-search'
import { GameError, GameLoading, GameShell } from '@/components/game/game-shell'
import { RoundResult } from '@/components/game/round-parts'
import { Button } from '@/components/ui/button'
import { useAnimePool } from '@/hooks/use-anime-pool'
import { formatLabel, genreLabel, seasonLabel, sourceLabel } from '@/lib/labels'
import type { Anime } from '@/lib/types'
import { cn } from '@/lib/utils'

const MAX_ATTEMPTS = 10
const DAILY_POOL = 150

type Status = 'match' | 'partial' | 'miss'
type Cell = { label: string; value: string; status: Status; arrow?: 'up' | 'down' }

function hashString(value: string) {
  let h = 2166136261
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function numericCell(
  label: string,
  guess: number | null,
  target: number | null,
  fmt: (v: number) => string = String,
): Cell {
  if (guess === null || target === null) {
    return { label, value: guess === null ? '—' : fmt(guess), status: guess === target ? 'match' : 'miss' }
  }
  if (guess === target) return { label, value: fmt(guess), status: 'match' }
  return { label, value: fmt(guess), status: 'miss', arrow: target > guess ? 'up' : 'down' }
}

function compare(guess: Anime, target: Anime): Cell[] {
  const shared = guess.genres.filter((g) => target.genres.includes(g))
  const genreStatus: Status =
    shared.length === target.genres.length && guess.genres.length === target.genres.length
      ? 'match'
      : shared.length > 0
        ? 'partial'
        : 'miss'

  return [
    numericCell('Año', guess.year, target.year),
    {
      label: 'Temporada',
      value: seasonLabel(guess.season),
      status: guess.season === target.season ? 'match' : 'miss',
    },
    {
      label: 'Formato',
      value: formatLabel(guess.format),
      status: guess.format === target.format ? 'match' : 'miss',
    },
    numericCell('Episodios', guess.episodes, target.episodes),
    numericCell('Puntuación', guess.score, target.score, (v) => `${v}%`),
    {
      label: 'Géneros',
      value: guess.genres.slice(0, 3).map(genreLabel).join(', ') || '—',
      status: genreStatus,
    },
    {
      label: 'Estudio',
      value: guess.studio ?? '—',
      status: guess.studio === target.studio ? 'match' : 'miss',
    },
    {
      label: 'Fuente',
      value: sourceLabel(guess.source),
      status: guess.source === target.source ? 'match' : 'miss',
    },
  ]
}

export function AnimedleGame() {
  const { data: pool, error, mutate } = useAnimePool()
  const [practiceSeed, setPracticeSeed] = useState<number | null>(null)
  const [guesses, setGuesses] = useState<Anime[]>([])

  const target = useMemo(() => {
    if (!pool) return null
    const candidates = pool.slice(0, DAILY_POOL).filter((a) => a.id === a.franchiseId)
    const seed = practiceSeed ?? hashString(todayKey())
    return candidates[seed % candidates.length]
  }, [pool, practiceSeed])

  const won = !!target && guesses.some((g) => g.franchiseId === target.franchiseId)
  const finished = won || guesses.length >= MAX_ATTEMPTS
  const isDaily = practiceSeed === null

  function startPractice() {
    setGuesses([])
    setPracticeSeed(Math.floor(Math.random() * 1_000_000))
  }

  return (
    <GameShell
      title="Animedle"
      description={
        isDaily
          ? `Adivina el anime del día (${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}). Compara los atributos de cada intento.`
          : 'Modo práctica: un anime aleatorio para seguir jugando.'
      }
    >
      {error ? (
        <GameError message={error.message} onRetry={() => mutate()} />
      ) : !pool || !target ? (
        <GameLoading label="Eligiendo el anime del día..." />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Intento <span className="font-mono text-foreground">{Math.min(guesses.length + 1, MAX_ATTEMPTS)}</span> de{' '}
              <span className="font-mono text-foreground">{MAX_ATTEMPTS}</span>
            </p>
            <Legend />
          </div>

          {!finished && (
            <AnimeSearch
              pool={pool}
              excludeIds={guesses.map((g) => g.id)}
              onSelect={(anime) => setGuesses((g) => [anime, ...g])}
            />
          )}

          {finished && (
            <RoundResult
              won={won}
              anime={target}
              attemptsUsed={guesses.length}
              onNext={startPractice}
              nextLabel={isDaily ? 'Jugar en modo práctica' : 'Otro anime aleatorio'}
              extra={
                isDaily ? (
                  <p className="text-sm text-muted-foreground">Vuelve mañana para un nuevo anime del día.</p>
                ) : null
              }
            />
          )}

          {guesses.length > 0 && (
            <ul className="flex flex-col gap-3" aria-label="Intentos">
              {guesses.map((g) => (
                <GuessRow key={g.id} guess={g} cells={compare(g, target)} correct={g.franchiseId === target.franchiseId} />
              ))}
            </ul>
          )}

          {!isDaily && !finished && (
            <Button variant="ghost" className="self-start" onClick={() => { setGuesses([]); setPracticeSeed(null) }}>
              <Shuffle className="size-4" aria-hidden="true" />
              Volver al anime del día
            </Button>
          )}
        </>
      )}
    </GameShell>
  )
}

function GuessRow({ guess, cells, correct }: { guess: Anime; cells: Cell[]; correct: boolean }) {
  return (
    <li
      className={cn(
        'flex flex-col gap-3 rounded-2xl border bg-card p-3 animate-in fade-in slide-in-from-top-2',
        correct ? 'border-success/50' : 'border-border',
      )}
    >
      <div className="flex items-center gap-3">
        <img src={guess.cover || '/placeholder.svg'} alt="" className="h-12 w-9 rounded object-cover" />
        <p className="truncate font-medium">{guess.title}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {cells.map((c) => (
          <div
            key={c.label}
            className={cn(
              'flex min-h-16 flex-col justify-center rounded-lg px-2.5 py-2',
              c.status === 'match' && 'bg-success text-success-foreground',
              c.status === 'partial' && 'bg-warning text-warning-foreground',
              c.status === 'miss' && 'bg-muted',
            )}
          >
            <span className={cn('text-[11px] uppercase tracking-wide', c.status === 'miss' ? 'text-muted-foreground' : 'opacity-75')}>
              {c.label}
            </span>
            <span className="flex items-center gap-1 text-sm font-semibold leading-tight">
              <span className="line-clamp-2">{c.value}</span>
              {c.arrow === 'up' && <ArrowUp className="size-4 shrink-0" aria-label="mayor" />}
              {c.arrow === 'down' && <ArrowDown className="size-4 shrink-0" aria-label="menor" />}
            </span>
          </div>
        ))}
      </div>
    </li>
  )
}

function Legend() {
  return (
    <ul className="flex flex-wrap gap-3 text-xs text-muted-foreground">
      <li className="flex items-center gap-1.5"><span className="size-3 rounded bg-success" />Coincide</li>
      <li className="flex items-center gap-1.5"><span className="size-3 rounded bg-warning" />Parcial</li>
      <li className="flex items-center gap-1.5"><span className="size-3 rounded bg-muted" />No coincide</li>
      <li className="flex items-center gap-1.5"><ArrowUp className="size-3" aria-hidden="true" />Mayor</li>
    </ul>
  )
}
