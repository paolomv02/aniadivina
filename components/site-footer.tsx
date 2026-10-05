export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-6 text-xs text-muted-foreground md:flex-row md:justify-between">
        <p>AniAdivina · Minijuegos de anime hechos por fans.</p>
        <p>
          Datos de{' '}
          <a className="underline-offset-2 hover:text-foreground hover:underline" href="https://jikan.moe" target="_blank" rel="noreferrer">
            Jikan
          </a>
          ,{' '}
          <a className="underline-offset-2 hover:text-foreground hover:underline" href="https://anilist.co" target="_blank" rel="noreferrer">
            AniList
          </a>{' '}
          y{' '}
          <a className="underline-offset-2 hover:text-foreground hover:underline" href="https://animethemes.moe" target="_blank" rel="noreferrer">
            AnimeThemes
          </a>
          .
        </p>
      </div>
    </footer>
  )
}
