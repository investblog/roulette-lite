# Releasing roulette-lite

No npm token ever enters this repository's code, its CI secrets beyond one day, or any agent's
hands. Releases publish via **OIDC Trusted Publishing** with provenance
(`.github/workflows/release.yml`). Every outward step below is taken on the maintainer's explicit
go — creating the repository, the token, the publish.

## One-time bootstrap (v0.1.0)

npm cannot attach a trusted publisher to a package that does not exist yet (hexagons,
2026-08-09). The house pattern, by the user's call in the siblings.

**Before any of it, the account must be publish-ready** (roulette-lite, 2026-09-18): npm freezes an
account for 72 hours after a recovery-code sign-in — publishing, token creation and account
settings all stop. So the second factor must be a working passkey or security key *before* a
release, and a recovery code must never be spent on the way to one.

1. **The repository goes public the same day as the publish.** The name is free on npm until the
   first publish (checked 2026-09-18); a public repo announces it.
   `gh repo create investblog/roulette-lite --public`, push `main`, enable Pages
   (`investblog.github.io/roulette-lite/` must answer 200), and wait for CI to be green.
2. npmjs.com → Access Tokens → **Granular** (classic Automation tokens are gone, 2026-09-20),
   shortest expiry, and exactly these three settings:
   **All packages** — an unpublished unscoped package cannot be picked by name;
   **Read and write (publish and stage)** — *stage only* is refused by `npm publish`;
   **Bypass 2FA** — without it CI gets `EOTP`. Direct publishing with a bypass-2FA token is
   itself due to end around January 2027, which is another reason the token path is one-time.
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

## The four npm failure modes, in the order they appear

Inherited from octagons: `is not a legal HTTP header value` →
whitespace in a token secret; `EOTP` → the wrong token *type* with 2FA; `404 Not Found - PUT` → a
masked 403: no publish rights or no trusted publisher — and the log prints a provenance success
line right before failing. The first two cannot occur on the OIDC path; the third is exactly how a
missing or mismatched Trusted Publisher shows up there.

The fourth is the account, not the credential: `403 Forbidden - PUT … Your account has been
temporarily suspended due to a recent security-sensitive action.` — npm's 72-hour hold, started
here by a recovery-code sign-in during a laptop migration (roulette-lite, 2026-09-18; npm extended
the hold to all accounts on 2026-09-09). It clears itself — no support ticket, and no new
credential helps, because nothing about the credential is wrong. Like the third, it prints the
provenance success line immediately before failing.
