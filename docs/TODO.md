---
type: note
status: active
tags: [backlog]
project: roulette-lite
---

# Backlog

The single list of open work: the v0.1 milestones, and what is outside them or was decided along
the way.

## v0.1

- [x] M0 — bootstrap, spec, ADRs 001–010, stub + module test (2026-09-18)
- [x] M1 — top view, line style, palette port, Node tests (14), playground with a 24-seed contact
  sheet (2026-09-18); **contact sheet shown to the user — awaiting their read before M2 polish**
- [x] M2 — flat style, tilted view, square framing, playground controls for style/view/tilt/roll,
  18 tests (2026-09-18); **contact sheet to the user**
- [x] M3 — motion (CSS, seeded names, reduced motion), `init()` with the off-screen pause, 28 tests;
  size budget frozen at 6656 B (2026-09-18)
- [x] M4 — verify.html (11 browser checks, green in Chromium/Firefox/WebKit and under reduced
  motion), CI and release workflows (rehearsed locally: pack, install, ESM + require), README,
  RELEASING; Codex review, three rounds, 16 findings fixed (2026-09-18). Not run: the reviewer
  agent (second echelon) — Codex was the gate.
- [x] M5 — first integration in a static site (2026-09-18): the Vite SSR path works, with
  `ssr.external` for a `link:` dependency; colours pinned as `var()`s that follow a theme toggle.
  `mark()` added for logos and favicons (ADR 012).
- [x] M6 — released 2026-09-21. **0.1.0** went out through the one-time token bootstrap at 19:35 UTC
  with provenance; **0.2.0** followed at 20:38 UTC **over OIDC with no secret in the repository at
  all**, which is the only real proof the Trusted Publisher works rather than merely being saved.
  Both verified by installing from the registry, not by a green workflow: `npm audit signatures`
  reports a verified attestation for each.
  The evening cost three surprises, all now written down in `RELEASING.md`: npm's 72-hour account
  hold had to expire first (a recovery-code sign-in on 2026-09-18 started it); a bypass-2FA token
  publishes but **cannot** configure or even read a trusted publisher, nor revoke itself — every
  one of those answers `EOTP`; and the account's second factor is a WebAuthn passkey held by a
  different Google account than the browser was signed into, which is what made the key screen
  look like a wall for half an hour.

- [x] `table()` — the betting layout as a hero band, shipped in 0.2.0 (2026-09-21). Asked for
  while the npm hold was still running. 7518 → **7580 B** against the 8192 B budget ADR 009 raised
  for it. Three defects came out of review and are fixed: red cells drawn as L-fragments (24 edges
  overpainted), the BLACK marker at 1.19:1 contrast, and the perimeter at half weight.
  The README's size line moved with it — "~6.8 KB" was true of 0.1.0 and would have been a lie
  the moment this merged.

## Open

- eslint 10 across the family (npm marks 9.x unsupported). **Five repos now, not four**, and
  `cards-lite` is already on 10 — it started there deliberately, as the pilot the rest follow
  (its ADR 001). So this is a migration of four, with a working precedent to copy.
- `actions/checkout@v4` and `actions/setup-node@v4` sit on **deprecated Node 20**: GitHub forces
  them onto Node 24 and annotates every run. v5 is the fix, and the same pin is in all five repos,
  so it is one pass rather than five decisions (noticed 2026-09-21).

- The README's "family" section lists three siblings; `cards-lite` belongs there too. Left for the
  day it publishes — the section links repositories, but adding a sibling nobody can `npm install`
  yet reads as advertising vapour.

## Later (not v0.1)

- Digits on the number ring (`numbers`, `detail: 3`) — moved out of v0.1 at the size freeze (ADR 009).

- `polymorph`: vary element encodings by seed so the skeleton differs too (ADR 005, known limit).
- ~~Siblings on the same engine for other casino motifs — chips, cards, dice.~~ **Cards are
  done**: `cards-lite` was built 2026-09-21 — public at `investblog/cards-lite`, playground live,
  62 tests, 8950 B, feature-complete for v0.1 and awaiting only an integration and its first
  publish. This line predates it (it is where the idea was first written down); what remains of it
  is **chips and dice**, which nobody has asked for.
