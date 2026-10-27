# UX principles / prototype specification

## The three modes

1. **Strategy Lab**: rare configuration; character, class, build URL, Torment, kill-speed estimates, War Plan names, active Season 15 splinter chosen from a selector of the three, one rank field that shows and edits the active splinter's rank (each splinter's rank is saved), and help text for the active splinter's bonuses only, Lair Bosses War Plan nodes, objectives. One screen with progressive disclosure. Never block starting a run for optional fields.
2. **Live Run**: one screen per wave, offers before wave *k*.
   - Header shows wave *k* of *N*, the latest Aether reading, the taken-offer stack, and the Black Pact status.
   - Up to five offer rows use a searchable combobox (name, family, mechanic; recent offers first). Picking moves focus to the next row.
   - Each screen starts with three offer rows, or four with Reign in Hell. While the Black Pact is unused, its row sits below them. Empty rows are ignored.
   - A required "Aether after wave *k−1*" field and collapsed, optional event counts sit above the offers. Recording is blocked until the reading is entered or marked "Missed it", which saves no number.
   - The recommendation sits beside the offers on wide screens. On narrow screens it sits below, with a one-line summary by the record button.
   - Keys: 1–5 choose a row, Ctrl/⌘+Enter records. Undo prefills the last wave. Ending early is always available.
   - Each round after the first starts in the Aether field. Tab moves forward through the entry fields only: Aether, open event counts, each offer row, then Take. Shift+Tab keeps the full page order, so every control stays reachable by keyboard.
   - Offers with a dangerous bane show a *High danger* or *Some danger* badge with the bane text. Danger never changes the estimate.
3. **Insights**: completed/in-progress runs, event completeness, calibration warnings, future community benchmarks.
   - Report card and Your choices cover the active character and open with "For {name}."; Game numbers pools every character.
   - Report card compares how often the Aether gain landed inside the model's 80% range, with the average miss and one line per offer family. It needs 3 runs with Aether readings.
   - Your choices counts pre-selected, self-picked and other offers against the recommendation, prices the other picks and lists the offers taken most over it. Overrides are disagreements to learn from, not mistakes.
   - Game numbers are plain tallies (Chaotic Offering rate, repeat-family rate, Chaos Wave pay with and without Varshan's Vengeance).
   - Each section has an empty state that names what is missing. The analysis runs in a Web Worker in the browser; nothing is uploaded.

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
- Cumulative Aether per wave (required) and optional event counts.
- On eventual shared uploads, collect a per-user consent record separately and prohibit accidental automatic submission.

## Prototype acceptance test
A user can create a Paladin profile, record a 10-wave session, navigate between three views, refresh, see the same state, and export JSON. No auth, payments, external calls or consent pressure.
