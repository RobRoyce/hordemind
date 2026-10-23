-- HordeMind v2 / 0002: aether_observed events.
-- Cumulative Aether read at the end of a named wave (payload.afterWave).
-- Legacy wave_observed events stay valid; their timing is ambiguous.
BEGIN;
ALTER TABLE public.run_events DROP CONSTRAINT run_events_event_type_check;
ALTER TABLE public.run_events ADD CONSTRAINT run_events_event_type_check CHECK (event_type IN (
  'run_started','offers_presented','offer_chosen','wave_observed','aether_observed',
  'run_finished','correction','legacy_import'));
COMMIT;
