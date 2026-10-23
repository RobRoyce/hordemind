-- HordeMind v2 / 0001: private profiles, append-only runs, research consent.
-- Not automatically deployed: provision a Supabase project and review in staging.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.game_patches (
  id text PRIMARY KEY,
  season integer NOT NULL CHECK (season > 0),
  started_at timestamptz,
  catalog_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.character_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 100),
  class_id text NOT NULL,
  profile_schema_version integer NOT NULL DEFAULT 1 CHECK (profile_schema_version = 1),
  profile jsonb NOT NULL CHECK (jsonb_typeof(profile) = 'object'),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX character_profiles_owner_idx ON public.character_profiles(owner_id, updated_at DESC);

CREATE TABLE public.runs (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.character_profiles(id) ON DELETE SET NULL,
  game_patch text NOT NULL,
  season integer NOT NULL CHECK (season > 0),
  event_schema_version integer NOT NULL DEFAULT 1 CHECK (event_schema_version = 1),
  profile_snapshot jsonb NOT NULL CHECK (jsonb_typeof(profile_snapshot) = 'object'),
  run_status text NOT NULL DEFAULT 'in_progress' CHECK (run_status IN ('in_progress','completed','abandoned')),
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX runs_owner_started_idx ON public.runs(owner_id,started_at DESC);
CREATE INDEX runs_patch_status_idx ON public.runs(game_patch,run_status);

-- Immutable user observations; corrections are appended as a new event.
CREATE TABLE public.run_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.runs(id) ON DELETE CASCADE,
  client_event_id uuid NOT NULL,
  sequence_no integer NOT NULL CHECK (sequence_no >= 0),
  event_schema_version integer NOT NULL DEFAULT 1 CHECK (event_schema_version = 1),
  event_type text NOT NULL CHECK(event_type IN ('run_started','offers_presented','offer_chosen','wave_observed','run_finished','correction','legacy_import')),
  event_payload jsonb NOT NULL CHECK (jsonb_typeof(event_payload) = 'object'),
  recorded_at timestamptz NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  client_version text NOT NULL,
  UNIQUE(run_id,client_event_id),
  UNIQUE(run_id,sequence_no)
);
CREATE INDEX run_events_run_sequence_idx ON public.run_events(run_id,sequence_no);

CREATE TABLE public.research_contributions (
  run_id uuid PRIMARY KEY REFERENCES public.runs(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_version text NOT NULL,
  consented_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  CHECK(revoked_at IS NULL OR revoked_at >= consented_at)
);
-- Raw research records remain owner-scoped. A server-side ingestion and
-- aggregation job may use its service-role credentials. Do not expose service key in SPA.

ALTER TABLE public.game_patches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.run_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY game_patches_read ON public.game_patches FOR SELECT TO anon,authenticated USING(true);
CREATE POLICY profiles_read ON public.character_profiles FOR SELECT TO authenticated USING(owner_id=(select auth.uid()));
CREATE POLICY profiles_insert ON public.character_profiles FOR INSERT TO authenticated WITH CHECK(owner_id=(select auth.uid()));
CREATE POLICY profiles_update ON public.character_profiles FOR UPDATE TO authenticated USING(owner_id=(select auth.uid())) WITH CHECK(owner_id=(select auth.uid()));
CREATE POLICY profiles_delete ON public.character_profiles FOR DELETE TO authenticated USING(owner_id=(select auth.uid()));

CREATE POLICY runs_read ON public.runs FOR SELECT TO authenticated USING(owner_id=(select auth.uid()));
CREATE POLICY runs_insert ON public.runs FOR INSERT TO authenticated WITH CHECK(owner_id=(select auth.uid()) AND (profile_id IS NULL OR EXISTS(SELECT 1 FROM public.character_profiles p WHERE p.id=profile_id AND p.owner_id=(select auth.uid()))));
CREATE POLICY runs_update ON public.runs FOR UPDATE TO authenticated USING(owner_id=(select auth.uid())) WITH CHECK(owner_id=(select auth.uid()) AND (profile_id IS NULL OR EXISTS(SELECT 1 FROM public.character_profiles p WHERE p.id=profile_id AND p.owner_id=(select auth.uid()))));
CREATE POLICY runs_delete ON public.runs FOR DELETE TO authenticated USING(owner_id=(select auth.uid()));

CREATE POLICY events_read ON public.run_events FOR SELECT TO authenticated
 USING(EXISTS(SELECT 1 FROM public.runs r WHERE r.id=run_id AND r.owner_id=(select auth.uid())));
CREATE POLICY events_insert ON public.run_events FOR INSERT TO authenticated
 WITH CHECK(EXISTS(SELECT 1 FROM public.runs r WHERE r.id=run_id AND r.owner_id=(select auth.uid())));
-- No UPDATE or DELETE policy for run_events. Run deletion cascades owner events.

CREATE POLICY contributions_read ON public.research_contributions FOR SELECT TO authenticated USING(owner_id=(select auth.uid()));
CREATE POLICY contributions_insert ON public.research_contributions FOR INSERT TO authenticated WITH CHECK(owner_id=(select auth.uid()) AND EXISTS(SELECT 1 FROM public.runs r WHERE r.id=run_id AND r.owner_id=(select auth.uid())));
CREATE POLICY contributions_update ON public.research_contributions FOR UPDATE TO authenticated USING(owner_id=(select auth.uid())) WITH CHECK(owner_id=(select auth.uid()) AND EXISTS(SELECT 1 FROM public.runs r WHERE r.id=run_id AND r.owner_id=(select auth.uid())));
CREATE POLICY contributions_delete ON public.research_contributions FOR DELETE TO authenticated USING(owner_id=(select auth.uid()));

-- Revoke broad public access explicitly; policies above do not replace grants.
REVOKE ALL ON public.character_profiles,public.runs,public.run_events,public.research_contributions FROM anon;
GRANT SELECT ON public.game_patches TO anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.character_profiles,public.runs TO authenticated;
GRANT SELECT,INSERT ON public.run_events TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.research_contributions TO authenticated;

COMMIT;
