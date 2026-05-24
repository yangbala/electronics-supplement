import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  complex, cmul, cdiv, evalH, stepResponse, bodePlot, dampingInfo,
} from '../js/transfer-function.js';

test('cmul: (1+2j)(3+4j) = -5+10j', () => {
  const r = cmul(complex(1, 2), complex(3, 4));
  assert.ok(Math.abs(r.re - (-5)) < 1e-10);
  assert.ok(Math.abs(r.im - 10) < 1e-10);
});

test('cdiv: (1+j)/(1+j) = 1+0j', () => {
  const r = cdiv(complex(1, 1), complex(1, 1));
  assert.ok(Math.abs(r.re - 1) < 1e-10);
  assert.ok(Math.abs(r.im) < 1e-10);
});

test('evalH: H(s)=1/(s+2), H(0)=0.5', () => {
  const h0 = evalH(complex(0), [complex(-2)], [], 1);
  assert.ok(Math.abs(h0.re - 0.5) < 1e-10, `got ${h0.re}`);
});

test('stepResponse: H(s)=1/(s+1) stable, final value ≈ 1', () => {
  const { values, isUnstable } = stepResponse([complex(-1)], [], 1, 200);
  assert.strictEqual(isUnstable, false);
  assert.ok(
    Math.abs(values[values.length - 1] - 1) < 0.02,
    `final=${values[values.length - 1]}`
  );
});

test('stepResponse: H(s)=1/(s-1) isUnstable=true', () => {
  const { isUnstable } = stepResponse([complex(1)], [], 1);
  assert.strictEqual(isUnstable, true);
});

test('bodePlot: H(s)=1/(s+1), DC≈0dB, ω=1 rad/s≈-3dB', () => {
  const { freqs, gains } = bodePlot([complex(-1)], [], 1, 200);
  assert.ok(Math.abs(gains[0]) < 0.5, `DC dB = ${gains[0]}`);
  const idx = freqs.findIndex((f) => f >= 1);
  assert.ok(Math.abs(gains[idx] - (-3)) < 0.7, `gain at ω=1: ${gains[idx]} dB`);
});

test('dampingInfo: p=-1±2j → ζ=1/√5, ωₙ=√5', () => {
  const info = dampingInfo([complex(-1, 2), complex(-1, -2)]);
  assert.strictEqual(info.length, 1);
  assert.ok(Math.abs(info[0].wn - Math.sqrt(5)) < 1e-9);
  assert.ok(Math.abs(info[0].zeta - 1 / Math.sqrt(5)) < 1e-9);
});

test('stepResponse: empty poles (pure gain) returns valid data', () => {
  const { times, values, isUnstable } = stepResponse([], [], 2, 10);
  assert.strictEqual(isUnstable, false);
  assert.strictEqual(times.length, 10);
  assert.ok(times.every(Number.isFinite), 'all times finite');
  assert.ok(values.every(Number.isFinite), 'all values finite');
});

test('stepResponse: integrator pole p=0 returns finite values', () => {
  const { values, isMarginal } = stepResponse([complex(0)], [], 1, 50);
  assert.strictEqual(isMarginal, true);
  assert.ok(values.every(Number.isFinite), 'no NaN/Infinity in values');
});

test('stepResponse: repeated poles p=-1,-1 returns finite values', () => {
  const { values, isUnstable } = stepResponse([complex(-1), complex(-1)], [], 1, 50);
  assert.strictEqual(isUnstable, false);
  assert.ok(values.every(Number.isFinite), 'no NaN/Infinity in repeated-pole case');
});
