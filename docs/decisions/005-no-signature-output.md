---
type: decision
status: accepted
date: 2026-09-18
tags: [output, privacy]
project: roulette-lite
---

# 005 — no signature in the output

## Context

A wheel is meant to be rendered many times over — per page, per site, a domain name as the seed. Anything fixed in the output — a class name, a comment, an id, a reference colour — would be a string every one of those renders shares, naming the tool that drew them; so would a fixed CSS custom-property name. And two wheels on one page must not collide.

## Decision

The output contains no comments, `<desc>`/`<metadata>`, `data-*`, `xmlns:xlink`, `version`, library names, or fixed reference colours. Every id, class, keyframe and custom-property name is a seeded token `[a-z][a-z0-9]{5}` from the seed's own id stream plus `salt`. Credits live only in the README, the demo and package.json.

## Consequences

- Test: seeds 1–100 share no substring longer than 32 characters outside an allowlist (xmlns URL, media query).
- Known limit, accepted for v0.1: the element skeleton is the same in every output. A later `polymorph` option can vary encodings by seed.

## Addendum — 2026-09-18: what the test checks

The first wording asked that seeds 1–100 share no substring longer than 32 characters outside an
allowlist. Written against real output, that rule cannot separate a signature from grammar:
`stroke-linejoin="round"` alone is 23 characters and every SVG on the web has it. What makes an
output *this library's* is a fixed value, not a fixed attribute name, so the test checks values:
nothing identifying (comments, metadata, `data-*`, `xlink`, library or credit names), every id a
seeded token, no id under two seeds, every reference resolving inside its own picture. The shared
skeleton stays the known limit it already was; `polymorph` remains the answer to it.

## Addendum — 2026-09-18: the shading constants are an exception, stated

An external review (Codex) pointed out that the flat style carries `#000` and `#fff` overlays on
every output, against the rule's "no fixed reference colours". They stay: volume from black and
white overlays is what lets a pinned `var()` base shade, and they are grammar of the drawing in
the same way the element skeleton is. The rule now names them as its one exception, and a test
pins that with every role pinned they are the only colour literals left. `polymorph` (later) is
the answer to both.
