'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Gamepad2, Loader2, Plus, Ticket, User, Users } from 'lucide-react'
import { GAMES } from '@/lib/games'
import { cn } from '@/lib/utils'

type Step = 'mode' | 'game' | 'join'

export default function ModeSelectionPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('mode')
  const [selectedGame, setSelectedGame] = useState<string | null>(null)
  const [joinCode, setJoinCode] = useState('')
  const [joinName, setJoinName] = useState('')
  const [creating, setCreating] = useState(false)

  function pickSolo(gameHref: string) {
    router.push(gameHref)
  }

  function pickMultiplayer(gameType: string, gameHref: string) {
    setCreating(true)
    const name = encodeURIComponent(joinName || 'Jugador 1')
    const game = encodeURIComponent(gameType)
    router.push(`/multijugador/crear?game=${game}&name=${name}&href=${encodeURIComponent(gameHref)}`)
  }

  function submitJoin(e: React.FormEvent) {
    e.preventDefault()
    if (joinCode.trim().length < 6) return
    const name = encodeURIComponent(joinName || 'Jugador 2')
    const code = encodeURIComponent(joinCode.trim().toUpperCase())
    router.push(`/multijugador/unirse?code=${code}&name=${name}`)
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10 md:py-16">
      <section className="flex flex-col gap-3">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-balance md:text-4xl">
          ¿Cómo quieres jugar?
        </h1>
        <p className="text-sm text-muted-foreground text-pretty md:text-base">
          Elige entre jugar solo a tu ritmo o retar a un amigo en una partida 1v1 online.
        </p>
      </section>

      {step === 'mode' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <ModeCard
            icon={<User className="size-6" />}
            title="Modo Solitario"
            description="Juega a tu ritmo. Racha, práctica y anime del día."
            badge="Sin esperas"
            onClick={() => setStep('game')}
            accent="primary"
          />
          <ModeCard
            icon={<Users className="size-6" />}
            title="Modo 1v1 Online"
            description="Crea una sala o únete con un código. El que más acierte gana."
            badge="Tiempo real"
            onClick={() => setStep('join')}
            accent="secondary"
          />
        </div>
      )}

      {step === 'game' && (
        <>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStep('mode')}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Volver
            </button>
            <h2 className="font-heading text-lg font-semibold">Elige un minijuego</h2>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {GAMES.map((game) => {
              const Icon = game.icon
              return (
                <li key={game.href}>
                  <button
                    type="button"
                    onClick={() => pickSolo(game.href)}
                    className="group flex w-full flex-col gap-3 rounded-2xl border border-border bg-card p-5 text-left transition-colors hover:border-primary/50 hover:bg-accent"
                  >
                    <span className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="font-heading text-base font-bold">{game.title}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground text-pretty">{game.description}</p>
                    </div>
                    <span className="mt-auto flex items-center gap-1 text-sm font-medium text-primary">
                      Jugar solo
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}

      {step === 'join' && (
        <>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStep('mode')}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Volver
            </button>
            <h2 className="font-heading text-lg font-semibold">Partida 1v1</h2>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Create room */}
            <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                <Plus className="size-5 text-primary" aria-hidden="true" />
                <h3 className="font-heading text-lg font-bold">Crear una sala</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Elige un minijuego, crea la sala y comparte el código con tu amigo.
              </p>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Tu apodo</span>
                <input
                  type="text"
                  maxLength={20}
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  placeholder="Jugador 1"
                  className="h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/30"
                />
              </label>
              <div className="flex flex-col gap-2">
                {GAMES.map((game) => {
                  const Icon = game.icon
                  return (
                    <button
                      key={game.href}
                      type="button"
                      disabled={creating}
                      onClick={() => pickMultiplayer(game.label.toLowerCase(), game.href)}
                      className="group flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5 text-left transition-colors hover:border-primary/50 hover:bg-accent disabled:opacity-50"
                    >
                      <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                      <span className="flex-1 text-sm font-medium">{game.title}</span>
                      <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" aria-hidden="true" />
                    </button>
                  )
                })}
              </div>
              {creating && (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  Creando sala...
                </p>
              )}
            </div>

            {/* Join room */}
            <form
              onSubmit={submitJoin}
              className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5"
            >
              <div className="flex items-center gap-2">
                <Ticket className="size-5 text-primary" aria-hidden="true" />
                <h3 className="font-heading text-lg font-bold">Unirse con un código</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Introduce el código de 6 letras que te ha compartido tu amigo.
              </p>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Tu apodo</span>
                <input
                  type="text"
                  maxLength={20}
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  placeholder="Jugador 2"
                  className="h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/30"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Código de sala</span>
                <input
                  type="text"
                  maxLength={6}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ABCD23"
                  autoComplete="off"
                  spellCheck={false}
                  className="h-12 rounded-xl border border-input bg-background px-3 text-center font-mono text-lg tracking-[0.3em] outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/30"
                />
              </label>
              <button
                type="submit"
                disabled={joinCode.trim().length < 6}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                <Gamepad2 className="size-4" aria-hidden="true" />
                Entrar en la sala
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  )
}

function ModeCard({
  icon,
  title,
  description,
  badge,
  onClick,
  accent,
}: {
  icon: React.ReactNode
  title: string
  description: string
  badge: string
  onClick: () => void
  accent: 'primary' | 'secondary'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-full flex-col gap-4 rounded-2xl border border-border bg-card p-6 text-left transition-all hover:border-primary/50 hover:bg-accent hover:shadow-lg"
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'flex size-12 items-center justify-center rounded-xl',
            accent === 'primary' ? 'bg-primary/15 text-primary' : 'bg-secondary text-secondary-foreground',
          )}
        >
          {icon}
        </span>
        <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          {badge}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="font-heading text-xl font-bold">{title}</h3>
        <p className="text-sm text-muted-foreground text-pretty">{description}</p>
      </div>
      <span className="mt-auto flex items-center gap-1 text-sm font-medium text-primary">
        Seleccionar
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
      </span>
    </button>
  )
}
