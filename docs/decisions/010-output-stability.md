---
type: decision
status: accepted
date: 2026-09-18
tags: [output, release]
project: roulette-lite
---

# 010 — output stability is a contract

## Context

A consumer renders its wheels at build time. If a library update changed the bytes for the same (seed, options), every site would silently get a different wheel on its next deploy.

## Decision

Within a minor version, the SVG for a given (seed, options) is byte-identical. Any change to output bytes — geometry, colours, attribute order, precision — is a minor version bump with a CHANGELOG line saying what changed. Consumers pin the exact version.

## Consequences

- A test can pin a hash of a reference render; changing it is then a deliberate act.
- Cross-engine byte identity is likely but not promised; the build-time Node engine is what counts.
