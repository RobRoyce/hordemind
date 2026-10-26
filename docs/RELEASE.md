# Releasing HordeMind

## How a release happens

1. A PR merges to `main`.
2. `.github/workflows/v2-quality.yml` runs on the merge commit:
   - `quality`: install, production-dependency audit, typecheck, unit tests, build.
   - `browser`: the full e2e and kit checks against that build, at 1440×900 and 390×844.
   - `database`: migrations, RLS invariants and private sync against local Supabase.
3. `deploy` publishes the tested build to GitHub Pages. It runs only after all three pass.
4. `verify-public` waits until https://robroyce.github.io/hordemind/ serves the merge commit, then checks the JavaScript bundle.

Runs on `main` queue instead of cancelling, so a deploy in flight always finishes.

## What is live

Every page names its commit in a meta tag.

```sh
curl -s https://robroyce.github.io/hordemind/ | grep -o 'hordemind-commit" content="[^"]*"'
```

Local builds say `dev`.

## Rolling back

### Normal path: revert

```sh
git switch -c revert/<short-sha> main
git revert <bad-sha>
git push git@github.com:RobRoyce/hordemind.git revert/<short-sha>
gh pr create --fill
```

Merging the revert PR runs the full pipeline, and `verify-public` confirms the reverted commit is live.

### Fast path: redeploy the last good commit

Use this when `main` is broken and a revert PR would take too long.

1. Find the last good run on `main`:
   ```sh
   gh run list --branch main --workflow v2-quality.yml --limit 10
   ```
2. Re-run that whole run:
   ```sh
   gh run rerun <run-id>
   ```
   It checks out that run's commit, retests it, deploys it, and `verify-public` confirms it is live.
3. Open the revert PR anyway. The next merge to `main` deploys `main` again, bad change included.

GitHub only re-runs workflow runs from the last 30 days. Older commits need the revert path.

## Dependencies

- `npm audit --omit=dev --audit-level=high` gates every build on the dependencies that ship to players.
- Dependabot (`.github/dependabot.yml`) opens weekly PRs for npm packages and GitHub Actions. Minor and patch updates arrive grouped; majors arrive one per PR. Each runs the full pipeline.
- Runners are pinned to `ubuntu-24.04`. Moving to a newer image is a deliberate PR.

## Not enabled

- Branch protection on `main` is off by the owner's choice. Merges are by the owner.
