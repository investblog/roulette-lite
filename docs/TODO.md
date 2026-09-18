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
- [ ] M6 — release 0.1.0 (each outward step on the user's go) — in progress 2026-09-18

## Open

- eslint 10 across all four libs at once (npm marks 9.x unsupported).

## Later (not v0.1)

- Digits on the number ring (`numbers`, `detail: 3`) — moved out of v0.1 at the size freeze (ADR 009).

- `polymorph`: vary element encodings by seed so the skeleton differs too (ADR 005, known limit).
- Siblings on the same engine for other casino motifs — chips, cards, dice.
