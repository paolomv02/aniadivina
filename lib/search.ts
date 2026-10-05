import type { Anime } from './types'

export function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function searchAnime(pool: Anime[], query: string, exclude: Set<number>, limit = 8) {
  const q = normalize(query)
  if (q.length < 1) return []
  const scored: { anime: Anime; score: number }[] = []
  for (const anime of pool) {
    if (exclude.has(anime.id)) continue
    const names = [anime.titleEnglish, anime.titleRomaji, ...anime.synonyms]
      .filter((n): n is string => Boolean(n))
      .map(normalize)
    let best = Infinity
    for (const name of names) {
      if (name === q) best = Math.min(best, 0)
      else if (name.startsWith(q)) best = Math.min(best, 1)
      else if (name.split(' ').some((w) => w.startsWith(q))) best = Math.min(best, 2)
      else if (name.includes(q)) best = Math.min(best, 3)
    }
    if (best < Infinity) scored.push({ anime, score: best })
  }
  return scored
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((s) => s.anime)
}

function levenshtein(a: string, b: string) {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j]
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = tmp
    }
  }
  return dp[b.length]
}

export function matchesCharacterName(guess: string, variants: string[]) {
  const g = normalize(guess)
  if (g.length < 2) return false
  const compact = g.replace(/\s/g, '')
  for (const variant of variants) {
    const v = normalize(variant)
    if (!v) continue
    if (v === g || v.replace(/\s/g, '') === compact) return true
    const reversed = v.split(' ').reverse().join(' ')
    if (reversed === g) return true
    if (v.length >= 6 && levenshtein(v, g) <= 1) return true
    for (const token of v.split(' ')) {
      if (token.length >= 3 && token === g) return true
      if (token.length >= 5 && levenshtein(token, g) <= 1) return true
    }
  }
  return false
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase()}.`)
    .join(' ')
}
