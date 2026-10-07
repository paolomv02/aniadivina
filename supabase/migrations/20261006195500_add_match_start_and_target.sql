ALTER TABLE mp_rooms
  ADD COLUMN IF NOT EXISTS target_score int NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS match_winner_id text;

CREATE OR REPLACE FUNCTION join_mp_room(
  target_room_id uuid,
  joining_player_id text,
  joining_nickname text
)
RETURNS mp_rooms
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  current_room mp_rooms;
  updated_room mp_rooms;
  next_players jsonb;
BEGIN
  SELECT * INTO current_room FROM mp_rooms WHERE id = target_room_id FOR UPDATE;
  IF current_room IS NULL THEN RAISE EXCEPTION 'Sala no encontrada'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(current_room.players) p WHERE p->>'id' = joining_player_id) THEN
    RETURN current_room;
  END IF;
  IF current_room.status <> 'waiting' THEN RAISE EXCEPTION 'La partida ya ha comenzado'; END IF;
  IF jsonb_array_length(current_room.players) >= 10 THEN
    RAISE EXCEPTION 'La sala está llena (máximo 10 jugadores)';
  END IF;
  next_players := current_room.players || jsonb_build_array(jsonb_build_object(
    'id', joining_player_id,
    'nickname', COALESCE(NULLIF(joining_nickname, ''), 'Jugador'),
    'score', 0,
    'attempts', '[]'::jsonb
  ));
  UPDATE mp_rooms
  SET players = next_players,
      guest_player_id = CASE WHEN guest_player_id IS NULL THEN joining_player_id ELSE guest_player_id END,
      guest_nickname = CASE WHEN guest_player_id IS NULL THEN joining_nickname ELSE guest_nickname END
  WHERE id = target_room_id
  RETURNING * INTO updated_room;
  RETURN updated_room;
END;
$$;

CREATE OR REPLACE FUNCTION record_mp_attempt(
  target_room_id uuid,
  target_round int,
  player_id text,
  attempt jsonb
)
RETURNS mp_rooms
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  current_room mp_rooms;
  player jsonb;
  next_players jsonb := '[]'::jsonb;
  is_correct boolean := COALESCE((attempt->>'correct')::boolean, false);
  next_score int;
BEGIN
  SELECT * INTO current_room FROM mp_rooms WHERE id = target_room_id FOR UPDATE;
  IF current_room IS NULL OR current_room.round_number <> target_round OR current_room.round_status <> 'active' THEN
    RETURN current_room;
  END IF;
  FOR player IN SELECT value FROM jsonb_array_elements(current_room.players) LOOP
    IF player->>'id' = player_id THEN
      next_score := (player->>'score')::int + CASE WHEN is_correct THEN 1 ELSE 0 END;
      player := jsonb_set(player, '{attempts}', COALESCE(player->'attempts', '[]'::jsonb) || jsonb_build_array(attempt));
      player := jsonb_set(player, '{score}', to_jsonb(next_score));
    END IF;
    next_players := next_players || jsonb_build_array(player);
  END LOOP;
  UPDATE mp_rooms
  SET players = next_players,
      round_status = CASE WHEN is_correct THEN 'won' ELSE round_status END,
      round_winner = CASE WHEN is_correct THEN player_id ELSE round_winner END,
      status = CASE WHEN is_correct AND next_score >= target_score THEN 'finished' ELSE status END,
      match_winner_id = CASE WHEN is_correct AND next_score >= target_score THEN player_id ELSE match_winner_id END,
      host_score = host_score + CASE WHEN is_correct AND host_player_id = player_id THEN 1 ELSE 0 END,
      guest_score = guest_score + CASE WHEN is_correct AND guest_player_id = player_id THEN 1 ELSE 0 END
  WHERE id = target_room_id
  RETURNING * INTO current_room;
  RETURN current_room;
END;
$$;

CREATE OR REPLACE FUNCTION leave_mp_room(
  target_room_id uuid,
  leaving_player_id text
)
RETURNS mp_rooms
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  current_room mp_rooms;
  remaining_players jsonb;
  updated_room mp_rooms;
BEGIN
  SELECT * INTO current_room FROM mp_rooms WHERE id = target_room_id FOR UPDATE;
  IF current_room IS NULL THEN RETURN NULL; END IF;
  IF current_room.host_player_id = leaving_player_id THEN
    DELETE FROM mp_rooms WHERE id = target_room_id;
    RETURN NULL;
  END IF;
  SELECT COALESCE(jsonb_agg(p), '[]'::jsonb) INTO remaining_players
  FROM jsonb_array_elements(current_room.players) p
  WHERE p->>'id' <> leaving_player_id;
  UPDATE mp_rooms
  SET players = remaining_players,
      status = CASE
        WHEN current_room.status = 'waiting' THEN 'waiting'
        WHEN jsonb_array_length(remaining_players) >= 2 THEN current_room.status
        ELSE 'waiting'
      END,
      guest_player_id = NULLIF(remaining_players->1->>'id', ''),
      guest_nickname = NULLIF(remaining_players->1->>'nickname', '')
  WHERE id = target_room_id
  RETURNING * INTO updated_room;
  RETURN updated_room;
END;
$$;

CREATE OR REPLACE FUNCTION start_mp_room(
  target_room_id uuid,
  expected_host_id text
)
RETURNS mp_rooms
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  updated_room mp_rooms;
BEGIN
  UPDATE mp_rooms
  SET status = 'playing',
      round_status = 'idle',
      match_winner_id = NULL
  WHERE id = target_room_id
    AND host_player_id = expected_host_id
    AND status = 'waiting'
    AND jsonb_array_length(players) >= 2
  RETURNING * INTO updated_room;
  RETURN updated_room;
END;
$$;
