import { Check, ExternalLink, RotateCw, X } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Anime } from '@/lib/types'

export type Attempt = { label: string; correct: boolean; skipped?: boolean }

export function AttemptDots({ attempts, max }: { attempts: Attempt[]; max: number }) {
  return (
    <div className="flex items-center gap-2" aria-label={`Intento ${attempts.length} de ${max}`}>
      {Array.from({ length: max }).map((_, i) => {
        const a = attempts[i]
        return (
          <span
            key={i}
            className={cn(
              'h-2 flex-1 rounded-full',
              !a && 'bg-muted',
              a?.correct && 'bg-success',
              a && !a.correct && (a.skipped ? 'bg-warning' : 'bg-destructive'),
            )}
          />
        )
      })}
    </div>
  )
}

export function AttemptList({ attempts }: { attempts: Attempt[] }) {
  if (attempts.length === 0) return null
  return (
    <ol className="flex flex-col gap-2">
      {attempts.map((a, i) => (
        <li
          key={i}
          className={cn(
            'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
            a.correct
              ? 'border-success/40 bg-success/10'
              : a.skipped
                ? 'border-warning/30 bg-warning/5 text-muted-foreground'
                : 'border-destructive/30 bg-destructive/5',
          )}
        >
          {a.correct ? (
            <Check className="size-4 text-success" aria-hidden="true" />
          ) : (
            <X className={cn('size-4', a.skipped ? 'text-warning' : 'text-destructive')} aria-hidden="true" />
          )}
          <span className="truncate">{a.skipped ? 'Saltado' : a.label}</span>
        </li>
      ))}
    </ol>
  )
}

type ResultProps = {
  won: boolean
  anime: Anime
  extra?: React.ReactNode
  attemptsUsed: number
  onNext?: () => void
  nextLabel?: string
}

export function RoundResult({ won, anime, extra, attemptsUsed, onNext, nextLabel = 'Siguiente ronda' }: ResultProps) {
  return (
    <div
      role="status"
      className={cn(
        'flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center',
        won ? 'border-success/40 bg-success/10' : 'border-destructive/40 bg-destructive/10',
      )}
    >
      <img
        src={anime.cover || '/placeholder.svg'}
        alt={`Portada de ${anime.title}`}
        className="h-32 w-24 shrink-0 self-center rounded-lg object-cover shadow-lg"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className={cn('text-sm font-semibold', won ? 'text-success' : 'text-destructive')}>
          {won
            ? `¡Correcto! Lo adivinaste en ${attemptsUsed} ${attemptsUsed === 1 ? 'intento' : 'intentos'}.`
            : 'Se acabaron los intentos.'}
        </p>
        <p className="font-heading text-xl font-bold text-balance">{anime.title}</p>
        {anime.titleRomaji !== anime.title && (
          <p className="text-sm text-muted-foreground">{anime.titleRomaji}</p>
        )}
        {extra}
        <div className="mt-2 flex flex-wrap gap-2">
          {onNext && (
            <Button onClick={onNext} className="rounded-lg">
              <RotateCw className="size-4" aria-hidden="true" />
              {nextLabel}
            </Button>
          )}
          <a
            href={anime.siteUrl}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: 'secondary', className: 'rounded-lg' })}
          >
            Ver en AniList
            <ExternalLink className="size-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
  )
}
