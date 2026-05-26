// js/diff-pair-circuit.js — viewBox 0 0 340 255

const NS = 'http://www.w3.org/2000/svg';
const C = {
  rail:     '#4a9eff',
  wire:     '#c9d1d9',
  device:   '#3fb950',
  resistor: '#ffd700',
  input:    '#ff6b6b',
  vout:     '#ffd700',
  isrc:     '#58a6ff',
  muted:    '#8b949e',
};

// ── 幾何常數（viewBox 0 0 340 255） ─────────────────────────────────────────
const X1 = 90, X2 = 250, XM = 170;
const VX1 = 36, VX2 = 304;         // VDD 橫軌兩端
const Y_VDD   = 18;
const Y_RD_T  = 26,  Y_RD_B  = 76; // 電阻（鋸齒形）
const Y_DRN   = 88;                 // 汲極 / 集極出口（連到電阻下緣）
const BOX_HH  = 22;                 // 電晶體方塊半高
const Y_TR_CY = 124;               // 電晶體中心
const Y_TR_T  = Y_TR_CY - BOX_HH; // = 102  ← 上端連接點（drain/collector）
const Y_TR_B  = Y_TR_CY + BOX_HH; // = 146  ← 下端連接點（source/emitter）
const Y_SRC   = 160;               // 源極 / 射極出口
const Y_NODE  = 176;               // 共源節點（尾電流上方）
const Y_IS_CY = 198;              // 電流源圓心（r=18）
const Y_GND   = 234;

// ── 主繪製函式 ─────────────────────────────────────────────────────────────
export function createCircuit(svgEl, type) {
  svgEl.innerHTML = '';

  // VDD 橫軌
  _line(svgEl, VX1, Y_VDD, VX2, Y_VDD, C.rail, 2.5);
  _halo(svgEl, XM, Y_VDD - 5, 'VDD = 3.3 V', C.rail, 11, 'middle');

  // ── 左分支 ──────────────────────────────────────────────────────────────
  _line(svgEl, X1, Y_VDD, X1, Y_RD_T, C.wire, 2);
  _zigzagR(svgEl, X1, Y_RD_T, Y_RD_B);
  _halo(svgEl, X1 + 16, (Y_RD_T + Y_RD_B) / 2 + 4,
        type === 'mos' ? 'RD' : 'RC', C.resistor, 11);
  _line(svgEl, X1, Y_RD_B, X1, Y_DRN, C.wire, 2);
  // 汲極接點 → 電晶體頂部中心
  _line(svgEl, X1, Y_DRN, X1, Y_TR_T, C.wire, 2);

  // ── 右分支 ──────────────────────────────────────────────────────────────
  _line(svgEl, X2, Y_VDD, X2, Y_RD_T, C.wire, 2);
  _zigzagR(svgEl, X2, Y_RD_T, Y_RD_B);
  _halo(svgEl, X2 + 16, (Y_RD_T + Y_RD_B) / 2 + 4,
        type === 'mos' ? 'RD' : 'RC', C.resistor, 11);
  _line(svgEl, X2, Y_RD_B, X2, Y_DRN, C.wire, 2);
  _line(svgEl, X2, Y_DRN, X2, Y_TR_T, C.wire, 2);

  // ── 電晶體符號 ──────────────────────────────────────────────────────────
  // 汲極/源極連線以 cx 為中心上下連出（與主幹 X1/X2 對齊）
  if (type === 'mos') {
    _mosfet(svgEl, X1, Y_TR_CY, 'M1', 'left');
    _mosfet(svgEl, X2, Y_TR_CY, 'M2', 'right');
    // 閘極輸入線：直接連到方塊側邊（BW/2 = 18）
    _line(svgEl, VX1, Y_TR_CY, X1 - 18, Y_TR_CY, C.input, 1.8);
    _line(svgEl, X2 + 18, Y_TR_CY, VX2, Y_TR_CY, C.input, 1.8);
    _halo(svgEl, VX1 - 2, Y_TR_CY + 16, 'Vin+', C.input, 11, 'middle');
    _halo(svgEl, VX2 + 2, Y_TR_CY + 16, 'Vin−', C.input, 11, 'middle');
  } else {
    _bjt(svgEl, X1, Y_TR_CY, 'Q1', 'left');
    _bjt(svgEl, X2, Y_TR_CY, 'Q2', 'right');
    // 基極輸入線：直接連到圓圈側邊（R = 21）
    _line(svgEl, VX1, Y_TR_CY, X1 - 21, Y_TR_CY, C.input, 1.8);
    _line(svgEl, X2 + 21, Y_TR_CY, VX2, Y_TR_CY, C.input, 1.8);
    _halo(svgEl, VX1 - 2, Y_TR_CY + 16, 'Vb1', C.input, 11, 'middle');
    _halo(svgEl, VX2 + 2, Y_TR_CY + 16, 'Vb2', C.input, 11, 'middle');
  }

  // 源極連線 → 尾電流節點
  _line(svgEl, X1, Y_TR_B, X1, Y_SRC,  C.wire, 2);
  _line(svgEl, X2, Y_TR_B, X2, Y_SRC,  C.wire, 2);
  _line(svgEl, X1, Y_SRC,  X1, Y_NODE, C.wire, 2);
  _line(svgEl, X2, Y_SRC,  X2, Y_NODE, C.wire, 2);
  _line(svgEl, X1, Y_NODE, X2, Y_NODE, C.wire, 2);
  _dot(svgEl, X1, Y_NODE, C.wire, 3.5);
  _dot(svgEl, X2, Y_NODE, C.wire, 3.5);
  _line(svgEl, XM, Y_NODE, XM, Y_IS_CY - 18, C.wire, 2);

  // 電流源圓圈
  _circle(svgEl, XM, Y_IS_CY, 18, C.isrc, 2);
  _halo(svgEl, XM, Y_IS_CY + 5, 'I', C.isrc, 15, 'middle');
  _line(svgEl, XM, Y_IS_CY + 18, XM, Y_GND, C.wire, 2);
  _gnd(svgEl, XM, Y_GND);

  // Vout 接點（黃色小圓）
  _dot(svgEl, X1, Y_DRN, C.vout, 4);
  _dot(svgEl, X2, Y_DRN, C.vout, 4);

  // ── 即時數值標籤（帶背景色塊） ──────────────────────────────────────────
  _badge(svgEl, X1 - 5,  Y_DRN,       '─', C.vout,   10, 'end',   'lbl-vout1');
  _badge(svgEl, X2 + 5,  Y_DRN,       '─', C.vout,   10, 'start', 'lbl-vout2');
  _badge(svgEl, X1 - 5,  Y_SRC - 2,   '─', C.device, 10, 'end',   'lbl-id1');
  _badge(svgEl, X2 + 5,  Y_SRC - 2,   '─', C.device, 10, 'start', 'lbl-id2');
  _badge(svgEl, XM + 22, Y_IS_CY + 4, '─', C.isrc,   10, 'start', 'lbl-ibias');
}

export function updateCircuit(svgEl, { id1, id2, vout1, vout2, ibias }) {
  const fmtI = v => `${(v * 1e3).toFixed(2)} mA`;
  const fmtV = v => `${v.toFixed(2)} V`;
  _setTxt(svgEl, 'lbl-vout1', fmtV(vout1));
  _setTxt(svgEl, 'lbl-vout2', fmtV(vout2));
  _setTxt(svgEl, 'lbl-id1',   fmtI(id1));
  _setTxt(svgEl, 'lbl-id2',   fmtI(id2));
  _setTxt(svgEl, 'lbl-ibias', fmtI(ibias));
}

// ── MOSFET 符號（NMOS，D 在頂、S 在底、G 從側邊） ────────────────────────────
// 汲極出口：(cx, Y_TR_T) ；源極出口：(cx, Y_TR_B) ← 對齊主幹
function _mosfet(svgEl, cx, cy, label, side) {
  const BW = 36, BHH = 22;          // 方塊半寬/半高
  const gx = side === 'left' ? cx - BW / 2 : cx + BW / 2;

  // 外框
  const bx = cx - BW / 2, by = cy - BHH;
  const rect = _el(svgEl, 'rect');
  rect.setAttribute('x', bx); rect.setAttribute('y', by);
  rect.setAttribute('width', BW); rect.setAttribute('height', BHH * 2);
  rect.setAttribute('fill', '#0f1a10');
  rect.setAttribute('stroke', C.device); rect.setAttribute('stroke-width', '2');
  rect.setAttribute('rx', '4');

  // 內部：閘極電極 bar（左 or 右側，垂直短線）
  const barX = side === 'left' ? bx + 9 : bx + BW - 9;
  _line(svgEl, barX, cy - 11, barX, cy + 11, C.device, 3);

  // 汲極 stub（bar → 頂部中心）
  const stubX = side === 'left' ? barX + 5 : barX - 5;
  _line(svgEl, barX, cy - 8, stubX, cy - 8, C.wire, 1.5);
  _line(svgEl, stubX, cy - 8, cx,   cy - BHH, C.wire, 1.5);

  // 源極 stub（bar → 底部中心，NMOS 箭頭指向 bar）
  _line(svgEl, barX, cy + 8, stubX, cy + 8, C.wire, 1.5);
  _line(svgEl, stubX, cy + 8, cx,   cy + BHH, C.wire, 1.5);
  _arrowHead(svgEl, barX + (side === 'left' ? 6 : -6), cy + 8,
             barX, cy + 8, C.device, 5);

  // 閘極接點小圓（標示 gate 連接位置）
  _dot(svgEl, gx, cy, C.device, 3);

  // 標籤（框右側或框左側，避免和閘極線重疊）
  const labelX = side === 'left' ? cx + BW / 2 + 5 : cx - BW / 2 - 5;
  _halo(svgEl, labelX, cy + 5, label, C.device, 13,
        side === 'left' ? 'start' : 'end');
}

// ── BJT 符號（NPN，C 在頂、E 在底、B 從側邊） ────────────────────────────────
// 集極出口：(cx, Y_TR_T) ；射極出口：(cx, Y_TR_B)
function _bjt(svgEl, cx, cy, label, side) {
  const R = 21;

  // 外殼圓
  const circ = _el(svgEl, 'circle');
  circ.setAttribute('cx', cx); circ.setAttribute('cy', cy); circ.setAttribute('r', R);
  circ.setAttribute('fill', '#0f1419');
  circ.setAttribute('stroke', C.device); circ.setAttribute('stroke-width', '2');

  // 基極 bar（在圓內，和閘極側同方向）
  const bx = side === 'left' ? cx - 9 : cx + 9;
  _line(svgEl, bx, cy - 12, bx, cy + 12, C.device, 2.5);

  // 集極（斜線到頂部中心）
  const dx = side === 'left' ? 1 : -1;
  _line(svgEl, bx, cy - 7, cx, cy - R, C.wire, 2);

  // 射極（斜線到底部中心，含箭頭）
  _line(svgEl, bx, cy + 7, cx, cy + R, C.wire, 2);
  _arrowHead(svgEl, bx + dx * 3, cy + 9, cx, cy + R, C.device, 5);

  // 基極接點（圓側邊）
  const baseEdgeX = side === 'left' ? cx - R : cx + R;
  _line(svgEl, bx, cy, baseEdgeX, cy, C.wire, 1.5);
  _dot(svgEl, baseEdgeX, cy, C.device, 3);

  // 標籤
  const labelX = side === 'left' ? cx + R + 4 : cx - R - 4;
  _halo(svgEl, labelX, cy + 5, label, C.device, 13,
        side === 'left' ? 'start' : 'end');
}

// ── SVG 輔助函式 ──────────────────────────────────────────────────────────────
function _el(parent, tag) {
  const e = document.createElementNS(NS, tag);
  parent.appendChild(e);
  return e;
}

function _line(p, x1, y1, x2, y2, stroke, sw = 2) {
  const e = _el(p, 'line');
  e.setAttribute('x1', x1); e.setAttribute('y1', y1);
  e.setAttribute('x2', x2); e.setAttribute('y2', y2);
  e.setAttribute('stroke', stroke); e.setAttribute('stroke-width', sw);
  e.setAttribute('stroke-linecap', 'round');
}

// 文字 + 暗色光暈（任何背景下可讀）
function _halo(p, x, y, txt, fill, fs = 10, anchor = 'start', id = null) {
  const e = _el(p, 'text');
  e.setAttribute('x', x); e.setAttribute('y', y);
  e.setAttribute('fill', fill); e.setAttribute('font-size', fs);
  e.setAttribute('text-anchor', anchor);
  e.setAttribute('font-family', 'monospace');
  e.setAttribute('stroke', '#0d1117');
  e.setAttribute('stroke-width', '4');
  e.setAttribute('paint-order', 'stroke fill');
  if (id) e.setAttribute('id', id);
  e.textContent = txt;
  return e;
}

// 即時數值標籤（色框 + 光暈文字）
function _badge(p, x, y, txt, fill, fs, anchor, id) {
  const BW = 76, BH = 15;
  const bg = _el(p, 'rect');
  bg.setAttribute('y', y - 12); bg.setAttribute('height', BH); bg.setAttribute('rx', 3);
  bg.setAttribute('fill', '#161b22');
  bg.setAttribute('stroke', fill); bg.setAttribute('stroke-width', '0.8');
  bg.setAttribute('opacity', '0.92');
  if (anchor === 'end') {
    bg.setAttribute('x', x - BW); bg.setAttribute('width', BW);
  } else {
    bg.setAttribute('x', x); bg.setAttribute('width', BW);
  }
  const t = _el(p, 'text');
  t.setAttribute('x', x); t.setAttribute('y', y);
  t.setAttribute('fill', fill); t.setAttribute('font-size', fs);
  t.setAttribute('text-anchor', anchor);
  t.setAttribute('font-family', 'monospace');
  t.setAttribute('stroke', '#0d1117');
  t.setAttribute('stroke-width', '3');
  t.setAttribute('paint-order', 'stroke fill');
  if (id) t.setAttribute('id', id);
  t.textContent = txt;
}

function _circle(p, cx, cy, r, stroke, sw = 2) {
  const e = _el(p, 'circle');
  e.setAttribute('cx', cx); e.setAttribute('cy', cy); e.setAttribute('r', r);
  e.setAttribute('fill', '#0d1117');
  e.setAttribute('stroke', stroke); e.setAttribute('stroke-width', sw);
}

// 鋸齒電阻（American 符號）
function _zigzagR(p, cx, y1, y2) {
  const n = 6, w = 9, seg = (y2 - y1) / (n * 2 + 2);
  const pts = [`${cx},${y1}`, `${cx},${y1 + seg}`];
  for (let i = 0; i < n; i++) {
    pts.push(`${cx + (i % 2 === 0 ? w : -w)},${y1 + seg + (2 * i + 1) * seg}`);
    pts.push(`${cx},${y1 + seg + (2 * i + 2) * seg}`);
  }
  pts.push(`${cx},${y2}`);
  const e = _el(p, 'polyline');
  e.setAttribute('points', pts.join(' '));
  e.setAttribute('fill', 'none');
  e.setAttribute('stroke', C.resistor); e.setAttribute('stroke-width', '2');
  e.setAttribute('stroke-linejoin', 'round'); e.setAttribute('stroke-linecap', 'round');
}

// 填充箭頭尖端
function _arrowHead(p, x1, y1, x2, y2, fill, s = 5) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
  if (len < 1) return;
  const ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
  const pts = [
    `${x2},${y2}`,
    `${x2 - ux * s + nx * s * 0.45},${y2 - uy * s + ny * s * 0.45}`,
    `${x2 - ux * s - nx * s * 0.45},${y2 - uy * s - ny * s * 0.45}`,
  ].join(' ');
  const e = _el(p, 'polygon');
  e.setAttribute('points', pts); e.setAttribute('fill', fill);
}

function _dot(p, cx, cy, fill = C.wire, r = 3.5) {
  const e = _el(p, 'circle');
  e.setAttribute('cx', cx); e.setAttribute('cy', cy); e.setAttribute('r', r);
  e.setAttribute('fill', fill);
}

function _gnd(p, cx, y) {
  _line(p, cx - 14, y,      cx + 14, y,      C.muted, 2.5);
  _line(p, cx - 9,  y + 5,  cx + 9,  y + 5,  C.muted, 2);
  _line(p, cx - 4,  y + 10, cx + 4,  y + 10, C.muted, 1.5);
}

function _setTxt(svgEl, id, txt) {
  const e = svgEl.querySelector(`#${id}`);
  if (e) e.textContent = txt;
}
