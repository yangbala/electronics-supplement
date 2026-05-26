// js/diff-pair-circuit.js
// 繪製差動對電路圖（MOSFET 或 BJT）至指定 SVG 元素。
// 純 DOM SVG API，不依賴 D3。

const NS = 'http://www.w3.org/2000/svg';
const C = {
  rail: '#4a9eff', wire: '#e6edf3', device: '#3fb950',
  resistor: '#ffd700', input: '#ff6b6b', vout: '#ffd700',
  isrc: '#58a6ff', muted: '#a0aab6',
};

// 幾何常數（viewBox 0 0 210 170）
const X1 = 65, X2 = 145, XM = 105;
const Y_VDD = 12;
const Y_RD_T = 18, Y_RD_B = 36;
const Y_DRN  = 50;
const Y_GATE = 68;
const Y_SRC  = 86;
const Y_NODE = 96;
const Y_IS_T = 96, Y_IS_CY = 112, Y_IS_B = 128;
const Y_GND  = 145;

/**
 * 在 svgEl 中繪製完整電路圖。
 * @param {SVGElement} svgEl
 * @param {'mos'|'bjt'} type
 */
export function createCircuit(svgEl, type) {
  svgEl.innerHTML = '';

  _text(svgEl, XM, 9, 'VDD = 3.3 V', C.rail, 7, 'middle');
  _line(svgEl, 30, Y_VDD, 180, Y_VDD, C.rail, 2);

  // 左分支
  _line(svgEl, X1, Y_VDD, X1, Y_RD_T, C.wire);
  _resistor(svgEl, X1, Y_RD_T, Y_RD_B);
  _text(svgEl, X1 + 12, Y_RD_T + 10, type === 'mos' ? 'R_D' : 'R_C', C.resistor, 7);
  _line(svgEl, X1, Y_RD_B, X1, Y_DRN, C.wire);

  // 右分支
  _line(svgEl, X2, Y_VDD, X2, Y_RD_T, C.wire);
  _resistor(svgEl, X2, Y_RD_T, Y_RD_B);
  _text(svgEl, X2 + 12, Y_RD_T + 10, type === 'mos' ? 'R_D' : 'R_C', C.resistor, 7);
  _line(svgEl, X2, Y_RD_B, X2, Y_DRN, C.wire);

  // 電晶體
  const lbl1 = type === 'mos' ? 'M1' : 'Q1';
  const lbl2 = type === 'mos' ? 'M2' : 'Q2';
  _transistorBox(svgEl, X1, Y_GATE, lbl1);
  _transistorBox(svgEl, X2, Y_GATE, lbl2);

  // 閘極 / 基極輸入線
  _line(svgEl, 18, Y_GATE, X1 - 12, Y_GATE, C.input);
  _text(svgEl, 14, Y_GATE + 3, type === 'mos' ? 'Vin+' : 'Vb1', C.input, 7, 'middle');
  _line(svgEl, X2 + 12, Y_GATE, 192, Y_GATE, C.input);
  _text(svgEl, 196, Y_GATE + 3, type === 'mos' ? 'Vin−' : 'Vb2', C.input, 7, 'middle');

  // 源極到共源節點
  _line(svgEl, X1, Y_SRC, X1, Y_NODE, C.wire);
  _line(svgEl, X2, Y_SRC, X2, Y_NODE, C.wire);
  _line(svgEl, X1, Y_NODE, X2, Y_NODE, C.wire);
  _line(svgEl, XM, Y_NODE, XM, Y_IS_T, C.wire);

  // 電流源
  _circle(svgEl, XM, Y_IS_CY, 10, C.isrc);
  _text(svgEl, XM, Y_IS_CY + 3, '↑', C.isrc, 10, 'middle');
  _line(svgEl, XM, Y_IS_B, XM, Y_GND, C.wire);

  _gnd(svgEl, XM, Y_GND);

  // 即時數值標籤
  _text(svgEl, X1, Y_DRN - 3, '─', C.vout, 7, 'middle', 'lbl-vout1');
  _text(svgEl, X2, Y_DRN - 3, '─', C.vout, 7, 'middle', 'lbl-vout2');
  _text(svgEl, X1 - 16, Y_SRC - 2, '─', C.device, 7, 'end',   'lbl-id1');
  _text(svgEl, X2 + 16, Y_SRC - 2, '─', C.device, 7, 'start', 'lbl-id2');
  _text(svgEl, XM + 14, Y_IS_CY + 2, '─', C.isrc, 7, 'start', 'lbl-ibias');
}

/**
 * 更新電路圖上的即時數值標籤。
 * @param {SVGElement} svgEl
 * @param {{ id1, id2, vout1, vout2, ibias }} vals
 */
export function updateCircuit(svgEl, { id1, id2, vout1, vout2, ibias }) {
  const fmtI = v => `${(v * 1e3).toFixed(2)} mA`;
  const fmtV = v => `${v.toFixed(2)} V`;
  _setTxt(svgEl, 'lbl-vout1', fmtV(vout1));
  _setTxt(svgEl, 'lbl-vout2', fmtV(vout2));
  _setTxt(svgEl, 'lbl-id1',   fmtI(id1));
  _setTxt(svgEl, 'lbl-id2',   fmtI(id2));
  _setTxt(svgEl, 'lbl-ibias', fmtI(ibias));
}

// ─── SVG 繪製輔助函式 ────────────────────────────────────────────────────────

function _el(parent, tag) {
  const e = document.createElementNS(NS, tag);
  parent.appendChild(e);
  return e;
}

function _line(p, x1, y1, x2, y2, stroke, sw = 1.5) {
  const e = _el(p, 'line');
  e.setAttribute('x1', x1); e.setAttribute('y1', y1);
  e.setAttribute('x2', x2); e.setAttribute('y2', y2);
  e.setAttribute('stroke', stroke);
  e.setAttribute('stroke-width', sw);
}

function _text(p, x, y, txt, fill, fs = 8, anchor = 'start', id = null) {
  const e = _el(p, 'text');
  e.setAttribute('x', x); e.setAttribute('y', y);
  e.setAttribute('fill', fill);
  e.setAttribute('font-size', fs);
  e.setAttribute('text-anchor', anchor);
  e.setAttribute('font-family', 'monospace');
  if (id) e.setAttribute('id', id);
  e.textContent = txt;
  return e;
}

function _circle(p, cx, cy, r, stroke) {
  const e = _el(p, 'circle');
  e.setAttribute('cx', cx); e.setAttribute('cy', cy);
  e.setAttribute('r', r);
  e.setAttribute('fill', '#0d1117');
  e.setAttribute('stroke', stroke);
  e.setAttribute('stroke-width', 1.5);
}

function _resistor(p, cx, y1, y2) {
  const e = _el(p, 'rect');
  e.setAttribute('x', cx - 7); e.setAttribute('y', y1);
  e.setAttribute('width', 14); e.setAttribute('height', y2 - y1);
  e.setAttribute('fill', 'none');
  e.setAttribute('stroke', C.resistor);
  e.setAttribute('stroke-width', 1.5);
  e.setAttribute('rx', 2);
}

function _transistorBox(p, cx, cy, label) {
  const box = _el(p, 'rect');
  box.setAttribute('x', cx - 11); box.setAttribute('y', cy - 12);
  box.setAttribute('width', 22);  box.setAttribute('height', 24);
  box.setAttribute('fill', '#161b22');
  box.setAttribute('stroke', C.device);
  box.setAttribute('stroke-width', 1.5);
  box.setAttribute('rx', 3);
  _text(p, cx, cy + 4, label, C.device, 9, 'middle');
  // 汲極連線（方塊頂到 Y_DRN）
  _line(p, cx, cy - 12, cx, Y_DRN, C.wire);
  // 源極連線（方塊底到 Y_SRC）
  _line(p, cx, cy + 12, cx, Y_SRC, C.wire);
  // 閘極連線（方塊左側外伸一小段，讓 main 的 input line 對接）
  _line(p, cx - 11, cy, cx - 12, cy, C.wire);
}

function _gnd(p, cx, y) {
  _line(p, cx - 10, y,     cx + 10, y,     C.muted, 2);
  _line(p, cx - 6,  y + 4, cx + 6,  y + 4, C.muted, 1.5);
  _line(p, cx - 2,  y + 8, cx + 2,  y + 8, C.muted, 1);
}

function _setTxt(svgEl, id, txt) {
  const e = svgEl.querySelector(`#${id}`);
  if (e) e.textContent = txt;
}
