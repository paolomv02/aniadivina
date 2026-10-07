ALTER TABLE mp_rooms
  ADD COLUMN IF NOT EXISTS round_number int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS round_status text NOT NULL DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS round_winner text,
  ADD COLUMN IF NOT EXISTS round_data jsonb,
  ADD COLUMN IF NOT EXISTS host_attempts jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS guest_attempts jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS round_started_at timestamptz;

CREATE OR REPLACE FUNCTION claim_mp_room_round(
  room_id uuid,
  expected_round int,
  winner_player_id text
)
RETURNS mp_rooms
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  updated_room mp_rooms;
BEGIN
  UPDATE mp_rooms
  SET
    round_status = 'won',
    round_winner = winner_player_id,
    host_score = host_score + CASE WHEN host_player_id = winner_player_id THEN 1 ELSE 0 END,
    guest_score = guest_score + CASE WHEN guest_player_id = winner_player_id THEN 1 ELSE 0 END
  WHERE id = room_id
    AND round_number = expected_round
    AND round_status = 'active'
    AND (host_player_id = winner_player_id OR guest_player_id = winner_player_id)
  RETURNING * INTO updated_room;

  RETURN updated_room;
END;
$$;
