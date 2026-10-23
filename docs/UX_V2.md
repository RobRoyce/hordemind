# UX principles / prototype specification

## The three modes

1. **Strategy Lab**: rare configuration; character, class, build URL, Torment, kill-speed estimates, War Plan names, objectives. One screen with progressive disclosure. Never block starting a run for optional fields.
2. **Live Run**: full-screen primary workflow. Show wave, cumulative Aether, current offering stack, and 3–4 offer rows. Search once per slot (reuse quick history). Each card has a two-line reason, optional expandable math, keyboard shortcut, big choose button. After choice prompt for wave-end Aether (skip allowed), then move forward. Undo produces a correction event.
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
