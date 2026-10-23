-- Integration smoke test for a fresh, LOCAL Supabase/Postgres database.
-- ROLLBACK guarantees CI user fixtures never persist.
BEGIN;
DO $$
DECLARE failures text[] := '{}';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='run_events' AND rowsecurity) THEN
    failures := array_append(failures,'run_events RLS not enabled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='runs' AND rowsecurity) THEN
    failures := array_append(failures,'runs RLS not enabled');
  END IF;
  IF has_table_privilege('anon','public.runs','SELECT') THEN
    failures := array_append(failures,'anon has unexpected private run read privilege');
  END IF;
  IF has_table_privilege('authenticated','public.run_events','UPDATE') OR has_table_privilege('authenticated','public.run_events','DELETE') THEN
    failures := array_append(failures,'event log is mutable by client');
  END IF;
  IF array_length(failures,1) IS NOT NULL THEN
    RAISE EXCEPTION 'schema invariants failed: %', array_to_string(failures,', ');
  END IF;
END
$$;

-- Create fixtures through the superuser solely for RLS validation.
INSERT INTO auth.users(id,instance_id,aud,role,email,encrypted_password,created_at,updated_at)
VALUES
 ('11111111-1111-4111-8111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','hordemind-alice@example.invalid','',now(),now()),
 ('22222222-2222-4222-8222-222222222222','00000000-0000-0000-0000-000000000000','authenticated','authenticated','hordemind-bob@example.invalid','',now(),now());

INSERT INTO public.character_profiles(id,owner_id,display_name,class_id,profile)
VALUES
 ('11111111-aaaa-4aaa-8aaa-111111111111','11111111-1111-4111-8111-111111111111','Alice','Paladin','{}'::jsonb),
 ('22222222-bbbb-4bbb-8bbb-222222222222','22222222-2222-4222-8222-222222222222','Bob','Rogue','{}'::jsonb);
INSERT INTO public.runs(id,owner_id,profile_id,game_patch,season,profile_snapshot,started_at)
VALUES
 ('11111111-cccc-4ccc-8ccc-111111111111','11111111-1111-4111-8111-111111111111','11111111-aaaa-4aaa-8aaa-111111111111','S15-test',15,'{}'::jsonb,now()),
 ('22222222-dddd-4ddd-8ddd-222222222222','22222222-2222-4222-8222-222222222222','22222222-bbbb-4bbb-8bbb-222222222222','S15-test',15,'{}'::jsonb,now());

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
DO $$
DECLARE count_visible int;
BEGIN
  SELECT count(*) INTO count_visible FROM public.runs;
  IF count_visible != 1 THEN RAISE EXCEPTION 'owner isolation failed, visible runs: %',count_visible; END IF;
  IF EXISTS (SELECT 1 FROM public.runs WHERE owner_id='22222222-2222-4222-8222-222222222222') THEN
    RAISE EXCEPTION 'Alice can access Bob runs';
  END IF;
END
$$;
-- Authenticated owner may insert an event into their own run.
INSERT INTO public.run_events(run_id,client_event_id,sequence_no,event_type,event_payload,recorded_at,client_version)
VALUES ('11111111-cccc-4ccc-8ccc-111111111111','11111111-eeee-4eee-8eee-111111111111',0,'run_started','{}'::jsonb,now(),'ci-test');
-- Owner may not insert an event into a different user's run.
DO $$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    INSERT INTO public.run_events(run_id,client_event_id,sequence_no,event_type,event_payload,recorded_at,client_version)
    VALUES ('22222222-dddd-4ddd-8ddd-222222222222','22222222-eeee-4eee-8eee-222222222222',0,'run_started','{}'::jsonb,now(),'ci-test');
  EXCEPTION WHEN insufficient_privilege THEN
    blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'RLS allowed cross-owner event insert'; END IF;
END
$$;
ROLLBACK;
