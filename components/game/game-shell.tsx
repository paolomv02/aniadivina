import { Flame, Trophy } from 'lucide-react'

type Props = {
  title: string
  description: string
  streak?: number
  best?: number
  children: React.ReactNode
}

export function GameShell({ title, description, streak, best, children }: Props) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 md:py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-balance md:text-4xl">
            {title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground text-pretty md:text-base">{description}</p>
        </div>
        {streak !== undefined && (
          <dl className="flex shrink-0 gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
              <Flame className="size-4 text-primary" aria-hidden="true" />
              <dt className="text-xs text-muted-foreground">Racha</dt>
              <dd className="font-mono text-sm font-semibold">{streak}</dd>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
              <Trophy className="size-4 text-warning" aria-hidden="true" />
              <dt className="text-xs text-muted-foreground">Mejor</dt>
              <dd className="font-mono text-sm font-semibold">{best ?? 0}</dd>
            </div>
          </dl>
        )}
      </div>
      {children}
    </div>
  )
}

export function GameError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-8 text-center"
    >
      <p className="text-sm">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Reintentar
      </button>
    </div>
  )
}

export function GameLoading({ label = 'Cargando...' }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex aspect-video w-full animate-pulse items-center justify-center rounded-2xl border border-border bg-card text-sm text-muted-foreground"
    >
      {label}
    </div>
  )
}
