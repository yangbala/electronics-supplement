import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcBias, calcTransferCurve, calcSmallSignal } from '../js/diff-pair-math.js';

const near = (a, b, tol = 1e-9) => Math.abs(a - b) < tol;

test('calcBias MOS: 對稱偏壓 id1=id2=IBIAS/2', () => {
  const r = calcBias(1e-3, 2e3, 'mos');
  assert.ok(near(r.id1, r.id2),       `id1 != id2: ${r.id1} ${r.id2}`);
  assert.ok(near(r.id1, 5e-4, 1e-12), `id1 should be 0.5 mA, got ${r.id1}`);
  assert.ok(near(r.vout1, r.vout2),   `vout1 != vout2`);
});

test('calcBias BJT: 對稱偏壓 id1=id2=IBIAS/2', () => {
  const r = calcBias(1e-3, 2e3, 'bjt');
  assert.ok(near(r.id1, 5e-4, 1e-12));
  assert.ok(near(r.id1, r.id2));
});

test('calcBias MOS: vout = VDD - id*rd', () => {
  const r = calcBias(1e-3, 2e3, 'mos');
  assert.ok(near(r.vout1, 3.3 - 5e-4 * 2e3, 1e-9));
});

test('calcBias BJT: vout = VDD - id*rd', () => {
  const r = calcBias(1e-3, 2e3, 'bjt');
  assert.ok(near(r.vout1, 3.3 - 5e-4 * 2e3, 1e-9));
});

test('calcBias MOS: av = -gm*rd', () => {
  const r = calcBias(1e-3, 2e3, 'mos');
  assert.ok(near(r.av, -r.gm * 2e3, 1e-9));
  assert.ok(r.gm > 0);
});

test('calcBias BJT: av = -gm*rd', () => {
  const r = calcBias(1e-3, 2e3, 'bjt');
  assert.ok(near(r.av, -r.gm * 2e3, 1e-9));
  assert.ok(r.gm > 0);
});

test('calcTransferCurve BJT: id1+id2=IBIAS 在所有點', () => {
  const pts = calcTransferCurve(1e-3, 2e3, 'bjt');
  for (const p of pts) {
    assert.ok(near(p.id1 + p.id2, 1e-3, 1e-12), `sum=${p.id1 + p.id2} at vid=${p.vid}`);
  }
});

test('calcTransferCurve MOS: id1+id2=IBIAS 在所有點', () => {
  const pts = calcTransferCurve(1e-3, 2e3, 'mos');
  for (const p of pts) {
    assert.ok(near(p.id1 + p.id2, 1e-3, 1e-9), `sum=${p.id1 + p.id2} at vid=${p.vid}`);
  }
});

test('calcTransferCurve: vid=0 時 vdiff=0（反對稱）', () => {
  for (const type of ['mos', 'bjt']) {
    const pts = calcTransferCurve(1e-3, 2e3, type);
    const mid = pts[Math.floor(pts.length / 2)];
    assert.ok(near(mid.vid, 0, 0.002), `中點 vid=${mid.vid}`);
    assert.ok(near(mid.vdiff, 0, 1e-9), `vid=0 時 vdiff=${mid.vdiff}`);
  }
});

test('calcTransferCurve MOS: |vid|>2Vov 時一側飽和', () => {
  const ibias = 1e-3;
  const vov = Math.sqrt(ibias / 1e-3); // 1V
  const pts = calcTransferCurve(ibias, 2e3, 'mos', vov * 2.5);
  const last = pts[pts.length - 1];
  assert.ok(near(last.id1, ibias, 1e-12), `大 vid 時 id1 應等於 IBIAS`);
  assert.ok(near(last.id2, 0, 1e-12));
});

test('calcSmallSignal 與 calcBias 一致', () => {
  const b = calcBias(1e-3, 2e3, 'mos');
  const s = calcSmallSignal(1e-3, 2e3, 'mos');
  assert.ok(near(s.gm, b.gm));
  assert.ok(near(s.av, b.av));
});
