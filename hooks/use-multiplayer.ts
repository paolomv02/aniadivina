'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getSupabase, type MpRoom } from '@/lib/supabase'

function randomPlayerId() {
  return crypto.randomUUID()
}

export function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

function loadPlayerId(): string {
  if (typeof window === 'undefined') return randomPlayerId()
  const key = 'aniadivina_player_id'
  let id = localStorage.getItem(key)
  if (!id) {
    id = randomPlayerId()
    localStorage.setItem(key, id)
  }
  return id
}

export type CreateRoomOpts = {
  gameType: string
  nickname: string
}

export type JoinRoomOpts = {
  code: string
  nickname: string
}

export function useMultiplayer() {
  const [room, setRoom] = useState<MpRoom | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isHost, setIsHost] = useState(false)
  const playerIdRef = useRef<string>('')

  useEffect(() => {
    playerIdRef.current = loadPlayerId()
  }, [])

  const subscribe = useCallback((roomId: string, hostId: string) => {
    setIsHost(playerIdRef.current === hostId)
    const supabase = getSupabase()
    const channel = supabase
      .channel(`mp_room:${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mp_rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          setRoom(payload.new as MpRoom)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const createRoom = useCallback(
    async ({ gameType, nickname }: CreateRoomOpts) => {
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
          })
          .select()
          .single()

        if (dbError) throw dbError
        setRoom(data)
        setIsHost(true)
        return data
      } catch (err) {
        setError('No se pudo crear la sala. Inténtalo de nuevo.')
        return null
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  const joinRoom = useCallback(
    async ({ code, nickname }: JoinRoomOpts) => {
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
        if (existing.status !== 'waiting') {
          setError('Esa sala ya está ocupada o ha terminado.')
          return null
        }
        if (existing.guest_player_id) {
          setError('Esa sala ya tiene dos jugadores.')
          return null
        }

        const { data, error: updateError } = await supabase
          .from('mp_rooms')
          .update({
            guest_player_id: playerId,
            guest_nickname: nickname || 'Jugador 2',
            status: 'playing',
          })
          .eq('id', existing.id)
          .select()
          .single()

        if (updateError) throw updateError
        setRoom(data)
        setIsHost(playerIdRef.current === data.host_player_id)
        return data
      } catch {
        setError('No se pudo unir a la sala. Inténtalo de nuevo.')
        return null
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  const leaveRoom = useCallback(async () => {
    if (!room) return
    const playerId = playerIdRef.current
    const supabase = getSupabase()
    if (playerId === room.host_player_id) {
      await supabase.from('mp_rooms').delete().eq('id', room.id)
    } else if (playerId === room.guest_player_id) {
      await supabase
        .from('mp_rooms')
        .update({ guest_player_id: null, guest_nickname: null, status: 'waiting' })
        .eq('id', room.id)
    }
    setRoom(null)
  }, [room])

  useEffect(() => {
    if (!room) return
    const unsub = subscribe(room.id, room.host_player_id)
    return unsub
  }, [room?.id, subscribe])

  return {
    room,
    loading,
    error,
    isHost,
    playerId: playerIdRef.current,
    createRoom,
    joinRoom,
    leaveRoom,
    setError,
  }
}
