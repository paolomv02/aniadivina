'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getSupabase, type MpRoom } from '@/lib/supabase'

function loadPlayerId(): string {
  const key = 'aniadivina_player_id'
  let id = localStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(key, id)
  }
  return id
}

export function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export type CreateRoomOpts = { gameType: string; nickname: string; targetScore?: number }
export type JoinRoomOpts = { code: string; nickname: string }

export function useMultiplayer() {
  const [room, setRoom] = useState<MpRoom | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isHost, setIsHost] = useState(false)

  // Initialize synchronously on first render so it's available before any useEffect fires.
  const playerIdRef = useRef<string>('')
  if (playerIdRef.current === '') {
    playerIdRef.current = loadPlayerId()
  }

  const subscribe = useCallback((roomId: string, hostId: string) => {
    setIsHost(playerIdRef.current === hostId)
    const supabase = getSupabase()
    const channel = supabase
      .channel(`mp_room:${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mp_rooms', filter: `id=eq.${roomId}` },
        (payload) => setRoom(payload.new as MpRoom),
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const createRoom = useCallback(async ({ gameType, nickname, targetScore = 10 }: CreateRoomOpts) => {
    setLoading(true)
    setError(null)
    try {
      const playerId = playerIdRef.current
      const code = generateRoomCode()
      const supabase = getSupabase()
      const { data, error: dbError } = await supabase
        .from('mp_rooms')
        .insert({
          code,
          game_type: gameType,
          host_player_id: playerId,
          host_nickname: nickname || 'Jugador 1',
          status: 'waiting',
          players: [{
            id: playerId,
            nickname: nickname || 'Jugador 1',
            score: 0,
            attempts: [],
          }],
          target_score: targetScore,
        })
        .select()
        .single()

      if (dbError) throw dbError
      setRoom(data)
      setIsHost(true)
      return data
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(`No se pudo crear la sala: ${msg}`)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const startGame = useCallback(async () => {
    if (!room || !isHost || room.players.length < 2) return false
    const { data, error: startError } = await getSupabase().rpc('start_mp_room', {
      target_room_id: room.id,
      expected_host_id: playerIdRef.current,
    })
    if (startError) {
      setError(`No se pudo iniciar la partida: ${startError.message}`)
      return false
    }
    setRoom(data)
    return true
  }, [isHost, room])

  const joinRoom = useCallback(async ({ code, nickname }: JoinRoomOpts) => {
    setLoading(true)
    setError(null)
    try {
      const playerId = playerIdRef.current
      const normalizedCode = code.trim().toUpperCase()
      const supabase = getSupabase()
      const { data: existing, error: queryError } = await supabase
        .from('mp_rooms')
        .select('*')
        .eq('code', normalizedCode)
        .maybeSingle()

      if (queryError) throw queryError
      if (!existing) {
        setError('No se encontró ninguna sala con ese código.')
        return null
      }
      const { data, error: updateError } = await supabase.rpc('join_mp_room', {
        target_room_id: existing.id,
        joining_player_id: playerId,
        joining_nickname: nickname || 'Jugador',
      })

      if (updateError) throw updateError
      setRoom(data)
      setIsHost(playerIdRef.current === data.host_player_id)
      return data
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(`No se pudo unir a la sala: ${msg}`)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const leaveRoom = useCallback(async () => {
    if (!room) return
    const playerId = playerIdRef.current
    const supabase = getSupabase()
    await supabase.rpc('leave_mp_room', {
      target_room_id: room.id,
      leaving_player_id: playerId,
    })
    setRoom(null)
  }, [room])

  useEffect(() => {
    if (!room) return
    return subscribe(room.id, room.host_player_id)
  }, [room?.id, subscribe])

  return { room, loading, error, isHost, playerId: playerIdRef.current, createRoom, joinRoom, startGame, leaveRoom, setError }
}
