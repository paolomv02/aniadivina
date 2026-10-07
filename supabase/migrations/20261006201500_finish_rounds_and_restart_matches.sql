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
  next_score int := 0;
  all_exhausted boolean := true;
BEGIN
  SELECT * INTO current_room
  FROM mp_rooms
  WHERE id = target_room_id
  FOR UPDATE;

  IF current_room IS NULL
     OR current_room.round_number <> target_round
     OR current_room.round_status <> 'active'
     OR NOT EXISTS (
       SELECT 1
       FROM jsonb_array_elements(current_room.players) p
       WHERE p->>'id' = player_id
     ) THEN
    RETURN current_room;
  END IF;

  FOR player IN SELECT value FROM jsonb_array_elements(current_room.players)
  LOOP
    IF player->>'id' = player_id THEN
      IF jsonb_array_length(COALESCE(player->'attempts', '[]'::jsonb)) >= 5 THEN
        RETURN current_room;
      END IF;

      next_score := COALESCE((player->>'score')::int, 0) + CASE WHEN is_correct THEN 1 ELSE 0 END;
      player := jsonb_set(
        player,
        '{attempts}',
        COALESCE(player->'attempts', '[]'::jsonb) || jsonb_build_array(attempt)
      );
      player := jsonb_set(player, '{score}', to_jsonb(next_score));
    END IF;

    IF jsonb_array_length(COALESCE(player->'attempts', '[]'::jsonb)) < 5 THEN
      all_exhausted := false;
    END IF;
    next_players := next_players || jsonb_build_array(player);
  END LOOP;

  UPDATE mp_rooms
  SET players = next_players,
      round_status = CASE WHEN is_correct OR all_exhausted THEN 'won' ELSE round_status END,
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

CREATE OR REPLACE FUNCTION restart_mp_room(
  target_room_id uuid,
  expected_host_id text
)
RETURNS mp_rooms
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  updated_room mp_rooms;
  reset_players jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', p->>'id',
      'nickname', p->>'nickname',
      'score', 0,
      'attempts', '[]'::jsonb
    )
  ), '[]'::jsonb)
  INTO reset_players
  FROM jsonb_array_elements(
    (SELECT players FROM mp_rooms WHERE id = target_room_id)
  ) p;

  UPDATE mp_rooms
  SET players = reset_players,
      host_score = 0,
      guest_score = 0,
      status = 'playing',
      match_winner_id = NULL,
      round_status = 'idle',
      round_winner = NULL,
      round_data = NULL,
      host_attempts = '[]'::jsonb,
      guest_attempts = '[]'::jsonb,
      round_started_at = NULL
  WHERE id = target_room_id
    AND host_player_id = expected_host_id
    AND status = 'finished'
  RETURNING * INTO updated_room;

  RETURN updated_room;
END;
$$;
