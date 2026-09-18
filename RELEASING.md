# Releasing roulette-lite

No npm token ever enters this repository's code, its CI secrets beyond one day, or any agent's
hands. Releases publish via **OIDC Trusted Publishing** with provenance
(`.github/workflows/release.yml`). Every outward step below is taken on the maintainer's explicit
go — creating the repository, the token, the publish.

## One-time bootstrap (v0.1.0)

npm cannot attach a trusted publisher to a package that does not exist yet (hexagons,
2026-08-09). The house pattern, by the user's call in the siblings:

1. **The repository goes public the same day as the publish.** The name is free on npm until the
   first publish (checked 2026-09-18); a public repo announces it.
   `gh repo create investblog/roulette-lite --public`, push `main`, enable Pages
   (`investblog.github.io/roulette-lite/` must answer 200), and wait for CI to be green.
2. npmjs.com → Access Tokens → a token that can publish without an OTP (Automation, or the
   granular equivalent with write access and bypass 2FA), shortest expiry.
3. GitHub → Settings → Secrets and variables → Actions → `NPM_TOKEN`. The maintainer pastes it
   directly; it passes through no chat, file, or agent.
4. Add `bootstrap-publish.yml` (from `hexagons@31dc30b` with the names changed — it checks the
   token's shape, re-runs the gates, verifies the tarball, publishes with `--provenance`) and run
   it once from Actions.
5. **The same day:** configure the Trusted Publisher (below), delete the `NPM_TOKEN` secret,
   revoke the token on npmjs.com, delete `bootstrap-publish.yml`. Octagons' token sat in its repo
   three releases after it should have gone — that is the incident this step pins.

## Trusted Publisher (right after the first publish)

npmjs.com → package **roulette-lite** → **Settings** → **Trusted Publisher** → GitHub Actions:

| Field | Value |
|---|---|
| Organization or user | `investblog` |
| Repository | `roulette-lite` |
| Workflow filename | `release.yml` |
| Environment | *(leave empty)* |

While there, set **Publishing access** so tokens cannot publish at all.

## Every release after that

```sh
npm version minor          # any change to the output bytes is a minor (ADR 010)
# update CHANGELOG.md — say what changed in the output
git push && git push --tags
```

`release.yml` on the tag re-runs lint, build, tests and the size gate, checks the tag matches
`package.json`, checks the tarball carries `roulette.js`, `roulette.min.js` and `roulette.d.ts`,
and publishes with provenance. A version already on the registry exits green.

## The three npm failure modes, in the order they appear

Inherited from octagons: `is not a legal HTTP header value` →
whitespace in a token secret; `EOTP` → the wrong token *type* with 2FA; `404 Not Found - PUT` → a
masked 403: no publish rights or no trusted publisher — and the log prints a provenance success
line right before failing. The first two cannot occur on the OIDC path; the third is exactly how a
missing or mismatched Trusted Publisher shows up there.
