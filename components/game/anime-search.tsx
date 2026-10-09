'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Search, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { searchAnime } from '@/lib/search'
import type { Anime } from '@/lib/types'
import { cn } from '@/lib/utils'

type Props = {
  pool: Anime[]
  excludeIds: number[]
  onSelect: (anime: Anime) => void
  onSkip?: () => void
  disabled?: boolean
  placeholder?: string
  focusKey?: string | number
}

export function AnimeSearch({
  pool,
  excludeIds,
  onSelect,
  onSkip,
  disabled,
  placeholder = 'Escribe el nombre de un anime...',
  focusKey,
}: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()

  const exclude = useMemo(() => new Set(excludeIds), [excludeIds])
  const results = useMemo(() => searchAnime(pool, query, exclude), [pool, query, exclude])
  const showList = open && query.trim().length > 0

  useEffect(() => {
    if (focusKey !== undefined && !disabled) {
      inputRef.current?.focus()
    }
  }, [disabled, focusKey])

  function choose(anime: Anime) {
    onSelect(anime)
    setQuery('')
    setOpen(false)
    setActive(0)
    inputRef.current?.focus()
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      if (e.nativeEvent.isComposing || e.keyCode === 229) return
      e.preventDefault()
      const pick = results[active]
      if (pick) choose(pick)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="flex w-full gap-2">
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && results[active] ? `${listId}-${active}` : undefined}
          aria-label="Buscar anime"
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            setActive(0)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          className="h-12 w-full rounded-xl border border-input bg-card pr-3 pl-10 text-base outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
        />
        {showList && (
          <ul
            id={listId}
            role="listbox"
            className="absolute inset-x-0 top-full z-30 mt-2 max-h-80 overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-2xl"
          >
            {results.length === 0 ? (
              <li className="px-3 py-3 text-sm text-muted-foreground">Sin resultados</li>
            ) : (
              results.map((anime, i) => (
                <li
                  key={anime.id}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    choose(anime)
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5',
                    i === active && 'bg-accent',
                  )}
                >
                  <img
                    src={anime.cover || '/placeholder.svg'}
                    alt=""
                    className="h-12 w-9 shrink-0 rounded object-cover"
                    loading="lazy"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{anime.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {anime.titleRomaji !== anime.title ? `${anime.titleRomaji} · ` : ''}
                      {anime.year ?? '—'}
                    </p>
                  </div>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
      {onSkip && (
        <Button
          type="button"
          variant="secondary"
          className="h-12 rounded-xl px-4"
          onClick={onSkip}
          disabled={disabled}
        >
          <SkipForward className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Saltar</span>
        </Button>
      )}
    </div>
  )
}
