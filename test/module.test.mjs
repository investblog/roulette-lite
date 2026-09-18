// The package is CommonJS with a UMD tail (ADR 007). A consumer's build imports it from Node
// ESM with a default import, so that is the path this pins — plus require() for bundlers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import Roulette from '../roulette.js';

test('the default import from Node ESM is the API', () => {
	assert.equal(typeof Roulette.svg, 'function');
	assert.match(Roulette.svg(), /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/u);
});

test('require() returns the same API', () => {
	const required = createRequire(import.meta.url)('../roulette.js');
	assert.equal(required.svg(), Roulette.svg());
});

test('loading it defines no global under Node', () => {
	assert.equal(globalThis.Roulette, undefined);
});
