'use client'

import { useRef, useState } from 'react'
import useSWR from 'swr'
import { Lightbulb, Send, SkipForward, Tv } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GameError, GameLoading, GameShell } from '@/components/game/game-shell'
import { AttemptDots, AttemptList, RoundResult, type Attempt } from '@/components/game/round-parts'
import { fetcher, roundFetchOptions } from '@/hooks/use-anime-pool'
import { useStreak } from '@/hooks/use-streak'
import { genreLabel } from '@/lib/labels'
import { initials, matchesCharacterName } from '@/lib/search'
import type { CharacterRound } from '@/lib/types'

const MAX_ATTEMPTS = 5
const REVEAL_FILTERS = [
  'grayscale(1) brightness(0.1) contrast(1.8) blur(16px)',
  'grayscale(1) brightness(0.25) contrast(1.5) blur(11px)',
  'grayscale(0.7) brightness(0.5) contrast(1.25) blur(7px)',
  'grayscale(0.3) brightness(0.8) blur(4px)',
  'brightness(1) blur(1.5px)',
]

export function CharacterGame() {
  const [roundKey, setRoundKey] = useState(0)
  const { data: round, error, isLoading, mutate } = useSWR<CharacterRound>(
    `/api/character?r=${roundKey}`,
    fetcher,
    roundFetchOptions,
  )
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [guess, setGuess] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { streak, best, record } = useStreak()

  const won = attempts.some((a) => a.correct)
  const finished = won || attempts.length >= MAX_ATTEMPTS
  const stage = Math.min(attempts.length, REVEAL_FILTERS.length - 1)
  const isLastAttempt = !finished && attempts.length === MAX_ATTEMPTS - 1

  function addAttempt(attempt: Attempt) {
    const next = [...attempts, attempt]
    setAttempts(next)
    if (attempt.correct) record(true)
    else if (next.length >= MAX_ATTEMPTS) record(false)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!round) return
    const value = guess.trim()
    if (value.length < 2) return
    addAttempt({ label: value, correct: matchesCharacterName(value, round.character.nameVariants) })
    setGuess('')
    inputRef.current?.focus()
  }

  function nextRound() {
    setAttempts([])
    setGuess('')
    setRoundKey((k) => k + 1)
  }

  const hints = round
    ? [
        attempts.length >= 1 && {
          label: 'Géneros del anime',
          value: round.anime.genres.slice(0, 3).map(genreLabel).join(', ') || '—',
        },
        attempts.length >= 2 && { label: 'Año del anime', value: round.anime.year ?? '—' },
        attempts.length >= 3 && { label: 'Iniciales', value: initials(round.character.name) },
      ].filter(Boolean) as { label: string; value: string | number }[]
    : []

  return (
    <GameShell
      title="Adivina el Personaje"
      description="Escribe el nombre del personaje. La silueta se aclara con cada fallo."
      streak={streak}
      best={best}
    >
      {error ? (
        <GameError message={error.message} onRetry={() => mutate()} />
      ) : isLoading || !round ? (
        <GameLoading label="Buscando un personaje..." />
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-[minmax(0,260px)_1fr]">
            <div className="relative mx-auto aspect-[3/4] w-full max-w-[260px] overflow-hidden rounded-2xl border border-border bg-card">
              <img
                key={round.character.image}
                src={round.character.image || '/placeholder.svg'}
                alt={finished ? `Imagen de ${round.character.name}` : 'Silueta de un personaje misterioso'}
                className="size-full object-cover transition-[filter,transform] duration-700"
                style={{
                  filter: finished ? 'none' : REVEAL_FILTERS[stage],
                  transform: finished ? undefined : 'scale(1.1)',
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

              {isLastAttempt && (
                <div
                  role="status"
                  className="flex items-start gap-3 rounded-xl border border-primary/40 bg-primary/10 p-3"
                >
                  <Tv className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  <div className="text-sm">
                    <p className="text-muted-foreground">Último intento · Pista final</p>
                    <p>
                      Este personaje aparece en{' '}
                      <span className="font-semibold text-foreground">{round.anime.title}</span>
                    </p>
                  </div>
                </div>
              )}

              <AttemptList attempts={attempts} />

              {!finished && (
                <form onSubmit={submit} className="flex w-full gap-2">
                  <label htmlFor="character-guess" className="sr-only">
                    Nombre del personaje
                  </label>
                  <input
                    id="character-guess"
                    ref={inputRef}
                    type="text"
                    autoComplete="off"
                    spellCheck={false}
                    value={guess}
                    onChange={(e) => setGuess(e.target.value)}
                    placeholder="Escribe el nombre del personaje..."
                    className="h-12 min-w-0 flex-1 rounded-xl border border-input bg-card px-4 text-base outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/30"
                  />
                  <Button type="submit" className="h-12 rounded-xl px-4" disabled={guess.trim().length < 2}>
                    <Send className="size-4" aria-hidden="true" />
                    <span className="hidden sm:inline">Adivinar</span>
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-12 rounded-xl px-4"
                    onClick={() => addAttempt({ label: '', correct: false, skipped: true })}
                  >
                    <SkipForward className="size-4" aria-hidden="true" />
                    <span className="hidden sm:inline">Saltar</span>
                  </Button>
                </form>
              )}
              {!finished && (
                <p className="text-xs text-muted-foreground">
                  Vale el nombre, el apellido o el nombre completo. Se toleran pequeños errores de escritura.
                </p>
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
