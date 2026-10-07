'use client'

import { useRouter } from 'next/navigation'

export default function FinishedRoomPage() {
  const router = useRouter()

  return (
    <main className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-20 text-center">
      <h1 className="font-heading text-3xl font-bold">Sala terminada</h1>
      <p className="text-sm text-muted-foreground">
        El anfitrión ha cerrado la sala. Puedes volver al menú principal para crear o unirte a otra partida.
      </p>
      <button
        type="button"
        onClick={() => router.push('/multijugador')}
        className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
      >
        Volver al menú principal
      </button>
    </main>
  )
}
