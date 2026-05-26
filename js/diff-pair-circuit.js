// js/diff-pair-circuit.js — viewBox 0 0 340 255
// 電路符號依照 Razavi 教科書標準畫法繪製。

const NS = 'http://www.w3.org/2000/svg';
const C = {
  rail: '#4a9eff', wire: '#c9d1d9', device: '#3fb950',
  resistor: '#ffd700', input: '#ff6b6b', vout: '#ffd700',
  isrc: '#58a6ff', muted: '#8b949e',
};

// ── 幾何常數（viewBox 0 0 340 255） ─────────────────────────────────────────
const X1 = 90, X2 = 250, XM = 170;
const VX1 = 36, VX2 = 304;
const Y_VDD   = 18;
const Y_RD_T  = 26,  Y_RD_B  = 78;
const Y_DRN   = 90;                   // 汲極 / 集極出口
const BOX_HH  = 22;                   // 電晶體半高（cy ± 22 = 連接點）
const Y_TR_CY = 126;
const Y_TR_T  = Y_TR_CY - BOX_HH;    // = 104  ← drain/collector 連接點
const Y_TR_B  = Y_TR_CY + BOX_HH;    // = 148  ← source/emitter 連接點
const Y_SRC   = 162;
const Y_NODE  = 178;
const Y_IS_CY = 200;
const Y_GND   = 236;

// ── 主繪製函式 ─────────────────────────────────────────────────────────────
export function createCircuit(svgEl, type) {
  svgEl.innerHTML = '';

  // VDD 橫軌
  _line(svgEl, VX1, Y_VDD, VX2, Y_VDD, C.rail, 2.5);
  _halo(svgEl, XM, Y_VDD - 5, 'VDD = 3.3 V', C.rail, 11, 'middle');

  // ── 左分支（電阻 + 縱線） ─────────────────────────────────────────────────
  _line(svgEl, X1, Y_VDD, X1, Y_RD_T, C.wire, 2);
  _zigzagR(svgEl, X1, Y_RD_T, Y_RD_B);
  _halo(svgEl, X1 + 14, (Y_RD_T + Y_RD_B) / 2 + 4,
        type === 'mos' ? 'RD' : 'RC', C.resistor, 11);
  _line(svgEl, X1, Y_RD_B, X1, Y_DRN, C.wire, 2);

  // ── 右分支 ───────────────────────────────────────────────────────────────
  _line(svgEl, X2, Y_VDD, X2, Y_RD_T, C.wire, 2);
  _zigzagR(svgEl, X2, Y_RD_T, Y_RD_B);
  _halo(svgEl, X2 + 14, (Y_RD_T + Y_RD_B) / 2 + 4,
        type === 'mos' ? 'RD' : 'RC', C.resistor, 11);
  _line(svgEl, X2, Y_RD_B, X2, Y_DRN, C.wire, 2);

  // ── 汲極 / 集極線（電阻下緣 → 電晶體頂端連接點） ──────────────────────────
  _line(svgEl, X1, Y_DRN, X1, Y_TR_T, C.wire, 2);
  _line(svgEl, X2, Y_DRN, X2, Y_TR_T, C.wire, 2);

  // ── 電晶體符號（標準教科書畫法） ─────────────────────────────────────────
  if (type === 'mos') {
    _mosfet(svgEl, X1, Y_TR_CY, 'M1', 'left');
    _mosfet(svgEl, X2, Y_TR_CY, 'M2', 'right');
    // 閘極輸入線：終點在閘極電極位置（cx ∓ 14）
    _line(svgEl, VX1, Y_TR_CY, X1 - 14, Y_TR_CY, C.input, 1.8);
    _line(svgEl, X2 + 14, Y_TR_CY, VX2, Y_TR_CY, C.input, 1.8);
    _halo(svgEl, VX1 - 2, Y_TR_CY + 16, 'Vin+', C.input, 11, 'middle');
    _halo(svgEl, VX2 + 2, Y_TR_CY + 16, 'Vin−', C.input, 11, 'middle');
  } else {
    _bjt(svgEl, X1, Y_TR_CY, 'Q1', 'left');
    _bjt(svgEl, X2, Y_TR_CY, 'Q2', 'right');
    // 基極輸入線：終點在基極 bar 位置（cx ∓ 8）
    _line(svgEl, VX1, Y_TR_CY, X1 - 8, Y_TR_CY, C.input, 1.8);
    _line(svgEl, X2 + 8, Y_TR_CY, VX2, Y_TR_CY, C.input, 1.8);
    _halo(svgEl, VX1 - 2, Y_TR_CY + 16, 'Vb1', C.input, 11, 'middle');
    _halo(svgEl, VX2 + 2, Y_TR_CY + 16, 'Vb2', C.input, 11, 'middle');
  }

  // ── 源極 / 射極線 → 尾電流節點 ───────────────────────────────────────────
  _line(svgEl, X1, Y_TR_B, X1, Y_SRC,  C.wire, 2);
  _line(svgEl, X2, Y_TR_B, X2, Y_SRC,  C.wire, 2);
  _line(svgEl, X1, Y_SRC,  X1, Y_NODE, C.wire, 2);
  _line(svgEl, X2, Y_SRC,  X2, Y_NODE, C.wire, 2);
  _line(svgEl, X1, Y_NODE, X2, Y_NODE, C.wire, 2);
  _dot(svgEl, X1, Y_NODE, C.wire, 3.5);
  _dot(svgEl, X2, Y_NODE, C.wire, 3.5);
  _line(svgEl, XM, Y_NODE, XM, Y_IS_CY - 18, C.wire, 2);

  // ── 電流源（圓圈 + 箭頭） ─────────────────────────────────────────────────
  _circle(svgEl, XM, Y_IS_CY, 18, C.isrc, 2);
  _isrcArrow(svgEl, XM, Y_IS_CY);
  _line(svgEl, XM, Y_IS_CY + 18, XM, Y_GND, C.wire, 2);
  _gnd(svgEl, XM, Y_GND);

  // ── Vout 接點（黃色節點點） ───────────────────────────────────────────────
  _dot(svgEl, X1, Y_DRN, C.vout, 4);
  _dot(svgEl, X2, Y_DRN, C.vout, 4);

  // ── 即時數值標籤（帶色框背景） ────────────────────────────────────────────
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

// ════════════════════════════════════════════════════════════════════════════
// MOSFET 符號（NMOS 增強型，標準教科書畫法）
//
//        D (cx, cy-22)
//        |
//        ├── drain stub ─┐   ← 水平短線從通道 bar 接到 cx
//        |  (channel bar)│   ← 通道 bar（垂直短線）
//   G ───|  (gate oxide) │   ← 閘極電極 bar（垂直，與通道 bar 有間距）
//        |  (channel bar)│
//     ←──┤── source stub─┘   ← 水平短線（含 NMOS 箭頭，指向通道 bar）
//        |
//        S (cx, cy+22)
//
// side='left'  → 閘極在左（M1），通道在右
// side='right' → 閘極在右（M2），鏡像
// ════════════════════════════════════════════════════════════════════════════
function _mosfet(svgEl, cx, cy, label, side) {
  // 方向係數：side='left' 時閘極在 cx 左方
  const d  = side === 'left' ? -1 : 1;   // +1 → 往右（M2），-1 → 往左（M1）
  const gx = cx + d * 14;                 // 閘極電極 x（M1: cx-14, M2: cx+14）
  const bx = cx + d * 6;                  // 通道 bar x（M1: cx-6,  M2: cx+6）

  // 閘極電極（垂直粗線，代表閘極金屬）
  _line(svgEl, gx, cy - 14, gx, cy + 14, C.device, 3);

  // 通道 bar（垂直線，與閘極電極平行，代表半導體通道）
  _line(svgEl, bx, cy - 12, bx, cy + 12, C.device, 2);

  // 汲極 stub（水平，從通道 bar 連到主幹 cx）
  _line(svgEl, bx, cy - 10, cx, cy - 10, C.wire, 2);

  // 源極 stub（水平，從通道 bar 連到主幹 cx）
  _line(svgEl, bx, cy + 10, cx, cy + 10, C.wire, 2);

  // NMOS 箭頭（指向通道 bar，表示 inversion channel 方向）
  // 箭頭尖端在通道 bar，從 cx 側往 bx 側射入
  _arrowHead(svgEl, cx + d * (-4), cy + 10, bx, cy + 10, C.device, 5);

  // 主幹縱線（drain stub → 電晶體頂端；source stub → 電晶體底端）
  _line(svgEl, cx, cy - 10, cx, Y_TR_T, C.wire, 2);
  _line(svgEl, cx, cy + 10, cx, Y_TR_B, C.wire, 2);

  // 標籤（位於兩電晶體之間的空間）
  const lx = cx + (side === 'left' ? 5 : -5);
  _halo(svgEl, lx, cy + 5, label, C.device, 12,
        side === 'left' ? 'start' : 'end');
}

// ════════════════════════════════════════════════════════════════════════════
// BJT 符號（NPN，標準教科書畫法）
//
//        C (cx, cy-22)
//        |
//         \ ← collector（斜線往右上）
//     B ───| ← base bar（垂直線）
//         /→ ← emitter（斜線往右下，箭頭向外 = NPN 方向）
//        |
//        E (cx, cy+22)
//
// side='left'  → 基極在左（Q1），集射極在右
// side='right' → 基極在右（Q2），集射極在左（鏡像）
// ════════════════════════════════════════════════════════════════════════════
function _bjt(svgEl, cx, cy, label, side) {
  const d  = side === 'left' ? -1 : 1;
  const bx = cx + d * 8;                  // 基極 bar x（Q1: cx-8, Q2: cx+8）

  // 基極 bar（垂直粗線）
  _line(svgEl, bx, cy - 12, bx, cy + 12, C.device, 3);

  // 集極（斜線從基極 bar 上方連到頂端 cx, Y_TR_T）
  _line(svgEl, bx, cy - 8, cx, Y_TR_T, C.wire, 2);

  // 射極（斜線從基極 bar 下方連到底端 cx, Y_TR_B）
  _line(svgEl, bx, cy + 8, cx, Y_TR_B, C.wire, 2);

  // NPN 箭頭（射極線上，箭頭尖端在 Y_TR_B 側，指向外側 = 電流流出）
  // 在射極線上 2/3 處標記箭頭
  const ex = bx + (cx - bx) * 0.65;
  const ey = (cy + 8) + (Y_TR_B - cy - 8) * 0.65;
  _arrowHead(svgEl, bx + (cx - bx) * 0.55, (cy + 8) + (Y_TR_B - cy - 8) * 0.55,
             ex, ey, C.device, 5);

  // 標籤
  const lx = cx + (side === 'left' ? 5 : -5);
  _halo(svgEl, lx, cy + 5, label, C.device, 12,
        side === 'left' ? 'start' : 'end');
}

// ── 輔助繪圖函式 ──────────────────────────────────────────────────────────────

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

// 電流源內部箭頭（↑）
function _isrcArrow(p, cx, cy) {
  const aw = 5, ah = 8;
  // 箭頭主線
  _line(p, cx, cy + 7, cx, cy - 6, C.isrc, 2);
  // 箭頭尖端
  const pts = [`${cx},${cy - 8}`,
               `${cx - aw},${cy - 8 + ah}`,
               `${cx + aw},${cy - 8 + ah}`].join(' ');
  const tri = _el(p, 'polygon');
  tri.setAttribute('points', pts); tri.setAttribute('fill', C.isrc);
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
