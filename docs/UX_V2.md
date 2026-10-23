# UX principles / prototype specification

## The three modes

1. **Strategy Lab**: rare configuration; character, class, build URL, Torment, kill-speed estimates, War Plan names, objectives. One screen with progressive disclosure. Never block starting a run for optional fields.
2. **Live Run**: one screen per wave, offers before wave *k*.
   - Header shows wave *k* of *N*, the latest Aether reading, the taken-offer stack, and the Black Pact status.
   - Up to five offer rows use a searchable combobox (name, family, mechanic; recent offers first). Picking moves focus to the next row.
   - An optional "Aether after wave *k−1*" field and collapsed event counts sit above the offers.
   - The recommendation sits beside the offers on wide screens. On narrow screens it sits below, with a one-line summary by the record button.
   - Keys: 1–5 choose a row, Ctrl/⌘+Enter records. Undo prefills the last wave. Ending early is always available.
   - Offers with a dangerous bane show a *High danger* or *Some danger* badge with the bane text. Danger never changes the estimate.
3. **Insights**: completed/in-progress runs, event completeness, charts, calibration warnings, future community benchmarks.

## Keyboard and thumb ergonomics

- Offer list: up/down navigate options, enter select; shortcuts 1/2/3/4 select candidates only when no input is focused.
- No forced retyping of repeated offers. Duplicate exact names in offered slots should be allowed if actual game permits it.
- Button targets >=44 px; visible focus ring, proper labels and contrast.
- One-tap **Start run** from default profile.
- Auto-save after every choice; show a subtle “Saved locally” indicator (no fake sync).
- “I don't know” is a valid answer for event counts; do not conflate unknown and zero.
- Choose a recommendation or override it. Log **all presented choices** and chosen card, regardless of following recommendation.
- Confirmation required for deleting a complete run. Undo/correction should never erase historical evidence in synced data.

## Relevant telemetry (only after opt-in)

- Choice set shown, chosen offer and selection time.
- War Plan and profile snapshot at run start, game patch, model version.
- Optional cumulative Aether / event counts per wave.
- On eventual shared uploads, collect a per-user consent record separately and prohibit accidental automatic submission.

## Prototype acceptance test
A user can create a Paladin profile, record a 10-wave session, navigate between three views, refresh, see the same state, and export JSON. No auth, payments, external calls or consent pressure.
