'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sparkles, Users } from 'lucide-react'
import { GAMES } from '@/lib/games'
import { cn } from '@/lib/utils'

export function SiteHeader() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <Link href="/" className="flex items-center gap-2 self-start md:self-auto">
          <span className="font-heading text-lg font-bold tracking-tight">
            Ani<span className="text-primary">Adivina</span>
          </span>
        </Link>

        <nav aria-label="Minijuegos" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
          <ul className="flex min-w-max items-center gap-1 rounded-xl border border-border bg-card p-1">
            {GAMES.map((game) => {
              const active = pathname === game.href
              const Icon = game.icon
              return (
                <li key={game.href}>
                  <Link
                    href={game.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    {game.label}
                  </Link>
                </li>
              )
            })}
            <li>
              <Link
                href="/multijugador"
                aria-current={pathname.startsWith('/multijugador') ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  pathname.startsWith('/multijugador')
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                <Users className="size-4" aria-hidden="true" />
                Multijugador
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  )
}
