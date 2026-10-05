'use client'

import { useCallback, useState } from 'react'

export function useStreak() {
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(0)

  const record = useCallback((won: boolean) => {
    setStreak((current) => {
      const next = won ? current + 1 : 0
      setBest((b) => Math.max(b, next))
      return next
    })
  }, [])

  return { streak, best, record }
}
