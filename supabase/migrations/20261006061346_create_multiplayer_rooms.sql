/*
# Create multiplayer rooms table for 1v1 online mode

## Purpose
AniAdivina is a no-auth single-tenant anime guessing game. We are adding a 1v1 online
multiplayer mode where two players can join a room using a shareable 6-character code.
No user accounts are needed — each player gets a temporary random ID stored in the room row.

## New Tables
- `mp_rooms`
  - `id` (uuid, primary key)
  - `code` (text, unique, 6-char uppercase code used to invite a friend)
  - `game_type` (text, which minigame the room is for: 'personaje' | 'captura' | 'opening' | 'animedle')
  - `host_player_id` (text, temporary random ID of the host)
  - `host_nickname` (text, display name the host chose)
  - `guest_player_id` (text, nullable, temporary random ID of the guest)
  - `guest_nickname` (text, nullable, display name the guest chose)
  - `status` (text, 'waiting' | 'playing' | 'finished', default 'waiting')
  - `host_score` (int, default 0)
  - `guest_score` (int, default 0)
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

## Security
- RLS enabled on `mp_rooms`.
- This is a no-auth single-tenant app, so ALL policies use `TO anon, authenticated` with `USING (true)`.
- Room data is intentionally shared between the two players who know the code.
- Realtime is enabled on the table so both players see live updates.

## Notes
1. No user accounts — player IDs are random UUIDs generated client-side.
2. The room code is a short 6-char string for easy sharing.
3. `updated_at` is refreshed via a trigger on UPDATE.
4. An index on `code` speeds up lookups when a guest joins.
*/

CREATE TABLE IF NOT EXISTS mp_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  game_type text NOT NULL DEFAULT 'personaje',
  host_player_id text NOT NULL,
  host_nickname text NOT NULL DEFAULT 'Jugador 1',
  guest_player_id text,
  guest_nickname text,
  status text NOT NULL DEFAULT 'waiting',
  host_score int NOT NULL DEFAULT 0,
  guest_score int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE mp_rooms ENABLE ROW LEVEL SECURITY;

-- Index for fast code lookups
CREATE INDEX IF NOT EXISTS idx_mp_rooms_code ON mp_rooms (code);

-- updated_at trigger
CREATE OR REPLACE FUNCTION mp_rooms_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mp_rooms_updated_at ON mp_rooms;
CREATE TRIGGER trg_mp_rooms_updated_at
  BEFORE UPDATE ON mp_rooms
  FOR EACH ROW
  EXECUTE FUNCTION mp_rooms_set_updated_at();

-- Policies: anon + authenticated (no-auth app, intentionally shared data)
DROP POLICY IF EXISTS "anon_select_mp_rooms" ON mp_rooms;
CREATE POLICY "anon_select_mp_rooms"
  ON mp_rooms FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_mp_rooms" ON mp_rooms;
CREATE POLICY "anon_insert_mp_rooms"
  ON mp_rooms FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_mp_rooms" ON mp_rooms;
CREATE POLICY "anon_update_mp_rooms"
  ON mp_rooms FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_mp_rooms" ON mp_rooms;
CREATE POLICY "anon_delete_mp_rooms"
  ON mp_rooms FOR DELETE
  TO anon, authenticated USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE mp_rooms;
