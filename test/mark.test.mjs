// mark(): the wheel as a logo glyph or a favicon (ADR 012), and the output contract that adding it
// had to keep (ADR 010).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import Roulette from '../roulette.js';

const sha1 = (s) => createHash('sha1').update(s).digest('hex');

test('svg() output is a contract: these renders are byte-identical to the recorded ones (ADR 010)', () => {
	// Recorded 2026-09-18, and checked equal to the output before mark() existed. Changing a hash
	// here is a deliberate act: it means a minor version and a CHANGELOG line.
	const golden = JSON.parse(readFileSync(new URL('./fixtures/svg-golden.json', import.meta.url), 'utf8'));
	for (const [opts, hash] of Object.entries(golden)) assert.equal(sha1(Roulette.svg(JSON.parse(opts))), hash, opts);
});

test('a mark is deterministic and seeded: same seed same bytes, and every variant appears', () => {
	assert.equal(Roulette.mark({ seed: 'a.example', badge: true }), Roulette.mark({ seed: 'a.example', badge: true }));
	assert.notEqual(Roulette.mark({ seed: 'a.example' }), Roulette.mark({ seed: 'b.example' }));
	const seen = { N: new Set(), hub: new Set(), arms: new Set(), plate: new Set() };
	for (let seed = 1; seed <= 200; seed++) {
		const out = Roulette.mark({ seed, badge: true });
		const dash = out.match(/stroke-dasharray="([\d.]+) ([\d.]+)"/u);
		seen.N.add(Math.round(2 * Math.PI * 19 / Number(dash[1])));
		seen.hub.add(/r="6" fill/u.test(out) ? 'dot' : /r="7"/u.test(out) ? 'ring' : 'diamond');
		seen.arms.add(/M32 18V46/u.test(out));
		seen.plate.add(out.includes('<rect') ? 'square' : 'circle');
	}
	assert.deepEqual([...seen.N].sort((a, b) => a - b), [8, 10, 12, 16]);
	assert.equal(seen.hub.size, 3);
	assert.equal(seen.arms.size, 2);
	assert.equal(seen.plate.size, 2);
});

test('mono is all currentColor, with no backplate even when one is asked for', () => {
	const out = Roulette.mark({ seed: 4, mono: true, badge: true });
	assert.doesNotMatch(out, /#[0-9a-f]{3,6}/u);
	assert.doesNotMatch(out, /<rect|r="32"/u);
	for (const m of out.matchAll(/(?:fill|stroke)="([^"]+)"/gu)) assert.ok(m[1] === 'currentColor' || m[1] === 'none', m[1]);
});

test('colour takes the wheel\'s roles; a badge sits on the body colour; pins pass through', () => {
	const p = Roulette.palette('#51a8e7');
	const out = Roulette.mark({ seed: 7, brand: '#51a8e7', badge: true });
	for (const role of ['pocketA', 'pocketB', 'zero', 'metal', 'rim']) assert.ok(out.includes(p[role]), `${role} ${p[role]} missing`);
	assert.match(out, new RegExp(`<(rect|circle)[^>]*fill="${p.rim}"`, 'u'));
	assert.ok(Roulette.mark({ seed: 7, pocketA: 'var(--red)' }).includes('var(--red)'));
});

test('the zero is exactly one segment, and the segments close the ring', () => {
	for (let seed = 1; seed <= 30; seed++) {
		const out = Roulette.mark({ seed });
		const [, a, b] = out.match(/stroke-dasharray="([\d.]+) ([\d.]+)"/u);
		const [, z, gap] = out.match(/stroke-dasharray="([\d.]+) ([\d.]+)" stroke-dashoffset/u);
		const N = Math.round(2 * Math.PI * 19 / Number(a));
		assert.equal(a, b);
		assert.equal(z, a);
		assert.ok(Math.abs(Number(z) * N - 2 * Math.PI * 19) < 0.1 && Math.abs(Number(gap) - Number(z) * (N - 1)) < 0.1, `seed ${seed}`);
	}
});

test('a mark carries no id, defs, style or signature, and parses as balanced markup', () => {
	for (const opts of [{ seed: 1 }, { seed: 2, mono: true }, { seed: 3, badge: true, title: 'A "mark"' }]) {
		const out = Roulette.mark(opts);
		assert.doesNotMatch(out, /\bid=|<defs|<style|<!--|data-|roulette|spintax|301\.st|NaN|undefined/iu);
		const open = (out.match(/<(svg|g)\b/gu) || []).length, close = (out.match(/<\/(svg|g)>/gu) || []).length;
		assert.equal(open, close, JSON.stringify(opts));
	}
	assert.match(Roulette.mark({ seed: 3, title: 'A "mark"' }), /role="img" aria-label="A &quot;mark&quot;"/u);
});
