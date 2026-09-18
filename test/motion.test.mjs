// Motion is CSS inside the SVG (ADR 006). An inline <style> is document-global, so these pin that
// it only ever names its own seeded classes, stops for reduced motion, and never renames or moves
// anything in the static picture.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Roulette from '../roulette.js';

const TOKEN = /^[a-z][a-z0-9]{5}$/u;
const style = (out) => (out.match(/<style>(.*?)<\/style>/u) || [])[1];
const classes = (out) => [...new Set([...out.matchAll(/\bclass="([^"]+)"/gu)].map((m) => m[1]))];
const ids = (out) => [...out.matchAll(/\bid="([^"]+)"/gu)].map((m) => m[1]);
const rules = (css) => Object.fromEntries([...css.matchAll(/\.([a-z0-9]{6})\{animation:([a-z0-9]{6}) ([\d.]+)s linear infinite( reverse)?;/gu)]
	.map((m) => [m[1], { keyframes: m[2], seconds: Number(m[3]), reverse: Boolean(m[4]) }]));

test('motion is off by default, and speed 0 turns it off', () => {
	for (const opts of [{}, { motion: false }, { motion: true, speed: 0 }]) {
		const out = Roulette.svg({ seed: 5, ...opts });
		assert.equal(style(out), undefined, JSON.stringify(opts));
		assert.deepEqual(classes(out), [], JSON.stringify(opts));
	}
});

test('switching motion on renames nothing in the static picture', () => {
	for (const seed of [1, 5, 'example.com']) {
		assert.deepEqual(ids(Roulette.svg({ seed, motion: true })), ids(Roulette.svg({ seed })), `seed ${seed}`);
	}
});

test('the CSS names only its own seeded classes, and every animation stops for reduced motion', () => {
	for (const style_ of ['flat', 'line']) {
		const out = Roulette.svg({ seed: 5, motion: true, style: style_ });
		const css = style(out), used = classes(out);
		assert.equal(used.length, 3, 'rotor, orbit, counter-orbit');
		for (const k of used) assert.match(k, TOKEN);
		for (const m of css.matchAll(/([^{};]+)\{/gu)) {
			const sel = m[1].trim();
			assert.ok(/^@keyframes [a-z][a-z0-9]{5}$/u.test(sel) || sel === 'to' || sel === '@media (prefers-reduced-motion:reduce)' ||
				/^\.[a-z][a-z0-9]{5}(,\.[a-z][a-z0-9]{5})*$/u.test(sel), `selector "${sel}"`);
		}
		const reduced = css.match(/@media \(prefers-reduced-motion:reduce\)\{([^{]+)\{animation:none\}\}/u);
		assert.ok(reduced, 'no reduced-motion block');
		assert.deepEqual(reduced[1].split(',').sort(), used.map((k) => '.' + k).sort());
		assert.deepEqual(Object.keys(rules(css)).sort(), [...used].sort());
	}
});

test('an animated group carries its class and nothing else that the animation would replace', () => {
	const out = Roulette.svg({ seed: 8, motion: true });
	assert.doesNotMatch(out, /<[^>]*\bclass="[^"]*"[^>]*\btransform=|<[^>]*\btransform="[^"]*"[^>]*\bclass=/u);
});

test('the rotor and the ball run opposite ways; the counter-orbit exactly undoes the orbit', () => {
	for (let seed = 1; seed <= 40; seed++) {
		const out = Roulette.svg({ seed, motion: true });
		const r = rules(style(out)), [rotor, orbit, counter] = classes(out).map((k) => r[k]);
		assert.notEqual(rotor.reverse, orbit.reverse, `seed ${seed}: rotor and ball turn the same way`);
		assert.equal(orbit.seconds, counter.seconds, `seed ${seed}: counter-orbit out of step`);
		assert.notEqual(orbit.reverse, counter.reverse, `seed ${seed}: counter-orbit does not undo the orbit`);
		assert.ok(rotor.seconds >= 48 && rotor.seconds <= 80 && orbit.seconds >= 12 && orbit.seconds <= 22, `seed ${seed}: periods`);
	}
});

test('rotor or ball alone; speed divides the periods', () => {
	assert.equal(classes(Roulette.svg({ seed: 3, motion: 'rotor' })).length, 1);
	assert.equal(classes(Roulette.svg({ seed: 3, motion: 'ball' })).length, 2);
	const one = Object.values(rules(style(Roulette.svg({ seed: 3, motion: true }))));
	const two = Object.values(rules(style(Roulette.svg({ seed: 3, motion: true, speed: 2 }))));
	one.forEach((rule, i) => assert.ok(Math.abs(rule.seconds / 2 - two[i].seconds) < 0.011));
});

test('two wheels on one page do not share a motion name — different seeds, or one seed and a salt', () => {
	// whole six-character tokens only; the CSS words of that length are grammar, not names
	const names = (out) => new Set([...style(out).matchAll(/(?<![a-z0-9-])[a-z][a-z0-9]{5}(?![a-z0-9])/gu)].map((m) => m[0])
		.filter((t) => !['linear', 'rotate', 'origin', 'reduce', 'motion'].includes(t)));
	const a = names(Roulette.svg({ seed: 3, motion: true }));
	for (const other of [{ seed: 4 }, { seed: 3, salt: 'second' }]) {
		const b = names(Roulette.svg({ ...other, motion: true }));
		assert.deepEqual([...a].filter((t) => b.has(t)), [], JSON.stringify(other));
	}
});
