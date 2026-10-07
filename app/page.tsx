import Link from 'next/link'
import { ArrowRight, Users } from 'lucide-react'
import { GAMES } from '@/lib/games'

export default function HomePage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12 md:py-20">
      <section className="flex max-w-2xl flex-col gap-4">
        <p className="w-fit rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          4 minijuegos · modo solitario y multijugador
        </p>
        <h1 className="font-heading text-4xl font-bold tracking-tight text-balance md:text-6xl">
          ¿Cuánto sabes de <span className="text-primary">anime</span>?
        </h1>
        <p className="text-base text-muted-foreground text-pretty md:text-lg">
          Adivina personajes, descubre el anime del día, reconoce escenas y openings.
        </p>
        <Link
          href="/multijugador"
          className="group flex w-fit items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
        >
          <Users className="size-4" aria-hidden="true" />
          Jugar multijugador
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </Link>
      </section>

      <section aria-labelledby="games-heading">
        <h2 id="games-heading" className="sr-only">
          Minijuegos
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {GAMES.map((game, i) => {
            const Icon = game.icon
            return (
              <li key={game.href}>
                <Link
                  href={game.href}
                  className="group flex h-full flex-col gap-4 rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/50 hover:bg-accent"
                  aria-label={`Jugar ${game.title}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">{`0${i + 1}`}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <h3 className="font-heading text-xl font-bold">{game.title}</h3>
                    <p className="text-sm text-muted-foreground text-pretty">{game.description}</p>
                  </div>
                  <span className="mt-auto flex items-center gap-1 text-sm font-medium text-primary">
                    Jugar
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
