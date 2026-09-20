// table(): the betting layout (spec: Table). Two contracts are under test here — the layout is
// the real one (the irregular red/black pattern is what makes it readable with no digits on it),
// and adding it kept every earlier output byte-identical (ADR 010).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import Roulette from '../roulette.js';

const sha1 = (s) => createHash('sha1').update(s).digest('hex');
// the canonical red numbers of a roulette layout, written out rather than computed, so the test
// cannot agree with the code by sharing its mistake
const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

const rects = (out) => [...out.matchAll(/<rect ([^>]+)\/>/gu)].map((m) => {
	const a = {};
	for (const p of m[1].matchAll(/([\w-]+)="([^"]*)"/gu)) a[p[1]] = p[2];
	return a;
});
// the 36 number cells, keyed by the number each position carries
const cells = (out) => {
	const map = new Map();
	for (const r of rects(out)) {
		if (r.width !== '100' || r.height !== '100') continue;
		const x = Number(r.x), y = Number(r.y);
		if (x < 100 || x > 1200) continue; // 1300 is the column-bet strip
		map.set(3 * ((x - 100) / 100) + 3 - y / 100, r);
	}
	return map;
};

test('table() output is a contract: these renders are byte-identical to the recorded ones (ADR 010)', () => {
	const golden = JSON.parse(readFileSync(new URL('./fixtures/table-golden.json', import.meta.url), 'utf8'));
	for (const [opts, hash] of Object.entries(golden)) assert.equal(sha1(Roulette.table(JSON.parse(opts))), hash, opts);
});

test('the grid is the real layout: 36 numbered cells, and red/black is the canonical pattern', () => {
	const p = Roulette.palette('#00abf3');
	const c = cells(Roulette.table({ seed: 5, brand: '#00abf3' }));
	assert.equal(c.size, 36);
	for (let v = 1; v <= 36; v++) {
		assert.equal(c.get(v).fill, RED.has(v) ? p.pocketA : p.pocketB, 'number ' + v);
	}
	// a checkerboard would make red mean "odd". The real layout follows parity through 1–10 and
	// 19–28 and inverts it through 11–18 and 29–36 — that break is what the eye reads.
	const parity = [...Array(36)].map((_, k) => RED.has(k + 1) === ((k + 1) % 2 === 1));
	assert.equal(parity.filter(Boolean).length, 20);
	assert.equal(parity.filter((x) => !x).length, 16);
});

test('zero: one cell across three rows, two stacked for american, and auto picks by seed', () => {
	const euro = rects(Roulette.table({ seed: 5 })).filter((r) => r.x === '0');
	assert.equal(euro.length, 1);
	assert.equal(euro[0].height, '300');
	const amer = rects(Roulette.table({ seed: 5, variant: 'american' })).filter((r) => r.x === '0');
	assert.equal(amer.length, 2);
	assert.deepEqual(amer.map((r) => r.height), ['150', '150']);
	const seen = new Set();
	for (let seed = 1; seed <= 60; seed++) seen.add(rects(Roulette.table({ seed, variant: 'auto' })).filter((r) => r.x === '0').length);
	assert.deepEqual([...seen].sort(), [1, 2]);
});

test('deterministic, and every seeded variant shows up across 200 seeds', () => {
	assert.equal(Roulette.table({ seed: 'a.example' }), Roulette.table({ seed: 'a.example' }));
	assert.notEqual(Roulette.table({ seed: 'a.example' }), Roulette.table({ seed: 'b.example' }));
	const seen = { rx: new Set(), rule: new Set(), mark: new Set() };
	for (let seed = 1; seed <= 200; seed++) {
		const out = Roulette.table({ seed });
		seen.rx.add(/rx="6"/u.test(out));
		seen.rule.add(out.match(/stroke-width="([\d.]+)"/u)[1]);
		seen.mark.add(out.includes('<path'));
	}
	assert.equal(seen.rx.size, 2, 'corner radius varies');
	assert.deepEqual([...seen.rule].sort(), ['2.5', '4']);
	assert.equal(seen.mark.size, 2, 'the red/black boxes are marked by a diamond or a bar');
});

test('brand never touches geometry, seed never touches colour', () => {
	const strip = (s) => s.replace(/(fill|stroke)="[^"]*"/gu, '$1=""');
	assert.equal(strip(Roulette.table({ seed: 9, brand: '#00abf3' })), strip(Roulette.table({ seed: 9, brand: '#d97706' })));
	const colours = (s) => [...new Set([...s.matchAll(/(?:fill|stroke)="(#[0-9a-f]+)"/gu)].map((m) => m[1]))].sort();
	assert.deepEqual(colours(Roulette.table({ seed: 9 })), colours(Roulette.table({ seed: 400 })));
});

test('the felt: the brand background by default, any pin, or none at all', () => {
	const p = Roulette.palette('#51a8e7');
	assert.ok(Roulette.table({ seed: 2, brand: '#51a8e7' }).includes('<rect width="1400" height="500" fill="' + p.background + '"/>'));
	assert.ok(Roulette.table({ seed: 2, felt: 'var(--baize, #0a3d2c)' }).includes('fill="var(--baize, #0a3d2c)"'));
	assert.doesNotMatch(Roulette.table({ seed: 2, felt: false }), /width="1400"/u);
});

test('line style marks the red and the zero and rules the rest in metal; flat fills', () => {
	const p = Roulette.palette();
	const line = cells(Roulette.table({ seed: 5, style: 'line' }));
	for (let v = 1; v <= 36; v++) {
		assert.equal(line.get(v).fill, 'none');
		assert.equal(line.get(v).stroke, RED.has(v) ? p.pocketA : p.metal, 'number ' + v);
	}
	const flat = cells(Roulette.table({ seed: 5 }));
	for (const r of flat.values()) assert.equal(r.stroke, p.metal);
});

test('pins pass through untouched and are escaped, never parsed', () => {
	const out = Roulette.table({ seed: 3, pocketA: 'var(--red)', zero: 'rgb(0 128 0)', metal: '#fff', pocketB: '"><script>' });
	assert.ok(out.includes('fill="var(--red)"'));
	assert.ok(out.includes('fill="rgb(0 128 0)"'));
	assert.ok(out.includes('&quot;&gt;&lt;script&gt;'));
	assert.doesNotMatch(out, /<script/u);
});

test('nothing to collide and nothing to sign: no ids, defs, style or metadata (ADR 005)', () => {
	for (let seed = 1; seed <= 50; seed++) {
		const out = Roulette.table({ seed, variant: 'auto' });
		assert.doesNotMatch(out, /\sid=|<defs|<style|<!--|data-|xlink|roulette|301|spintax/iu, 'seed ' + seed);
	}
});

test('accessibility: a title makes it an image, silence makes it decoration', () => {
	assert.ok(Roulette.table({ seed: 1, title: 'Roulette table' }).includes('role="img" aria-label="Roulette table"'));
	assert.ok(Roulette.table({ seed: 1 }).includes('aria-hidden="true"'));
	assert.ok(Roulette.table({ seed: 1, size: 1400 }).includes('width="1400" height="500"'));
});
