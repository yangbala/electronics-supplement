# Differential Pair Interactive Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立差動對（MOSFET/BJT）互動教材頁面，包含偏壓操作點、差動輸入特性曲線、小訊號增益公式，以及 MOS vs BJT 比較，以 Wizard 步驟導覽呈現。

**Architecture:** 六個獨立模組（math / circuit / charts / main + HTML + CSS），數學計算與 DOM 繪製完全分離。`diff-pair-math.js` 提供純函式，`diff-pair-circuit.js` 繪製 SVG 電路圖，`diff-pair-charts.js` 提供 D3 長條圖與轉換曲線圖，`diff-pair-main.js` 串接 Wizard 步驟邏輯。

**Tech Stack:** Vanilla JS ES Modules、D3.js v7（`lib/d3.v7.min.js`）、KaTeX（CDN）、純 CSS（`css/style.css` 新增 wizard 樣式）

---

## 檔案對應表

| 動作 | 路徑 |
|------|------|
| 新增 | `js/diff-pair-math.js` |
| 新增 | `tests/diff-pair-math.test.mjs` |
| 新增 | `js/diff-pair-circuit.js` |
| 新增 | `js/diff-pair-charts.js` |
| 新增 | `js/diff-pair-main.js` |
| 新增 | `pages/differential-pair.html` |
| 修改 | `css/style.css`（附加 Wizard 樣式） |
| 修改 | `index.html`（新增差動對卡片） |

---

## Task 1: 數學模組 + 單元測試

**Files:**
- Create: `js/diff-pair-math.js`
- Create: `tests/diff-pair-math.test.mjs`

- [ ] **Step 1: 建立 `js/diff-pair-math.js`**

```js
// js/diff-pair-math.js
const KN  = 1e-3;   // kn·(W/L) = 1 mA/V²
const VTH = 0.5;    // MOSFET 臨界電壓 0.5 V
const VT  = 0.026;  // BJT 熱電壓 26 mV (300 K)
const VDD = 3.3;    // 電源電壓（固定）

/**
 * 計算 Vid=0 時的偏壓操作點。
 * @param {number} ibias - 尾電流 (A)
 * @param {number} rd    - 負載電阻 (Ω)
 * @param {'mos'|'bjt'} type
 * @returns {{ id1, id2, vout1, vout2, vgs0, vov, gm, av }}
 */
export function calcBias(ibias, rd, type) {
  const id   = ibias / 2;
  const vout = VDD - id * rd;
  if (type === 'mos') {
    const vov = Math.sqrt(ibias / KN);
    const vgs = VTH + vov;
    const gm  = 2 * id / vov;
    return { id1: id, id2: id, vout1: vout, vout2: vout, vgs0: vgs, vov, gm, av: -gm * rd };
  }
  // bjt
  const gm  = id / VT;
  const vbe = VT * Math.log(id / 1e-15);
  return { id1: id, id2: id, vout1: vout, vout2: vout, vgs0: vbe, vov: 4 * VT, gm, av: -gm * rd };
}

function _splitCurrents(ibias, vid, type) {
  if (type === 'bjt') {
    const id1 = ibias / (1 + Math.exp(-vid / VT));
    return { id1, id2: ibias - id1 };
  }
  const vov = Math.sqrt(ibias / KN);
  const x   = vid / vov;
  if (x >=  2) return { id1: ibias, id2: 0 };
  if (x <= -2) return { id1: 0,     id2: ibias };
  const id1 = (ibias / 2) * (1 + x * Math.sqrt(1 - x * x / 4));
  return { id1, id2: ibias - id1 };
}

/**
 * 產生差動輸入轉換曲線的資料點陣列。
 * @param {number} ibias
 * @param {number} rd
 * @param {'mos'|'bjt'} type
 * @param {number|null} vidRange - Vid 掃描範圍 ±vidRange (V)；null 時依類型預設
 * @param {number} steps - 取樣點數
 * @returns {Array<{ vid, id1, id2, vdiff }>}
 */
export function calcTransferCurve(ibias, rd, type, vidRange = null, steps = 200) {
  const range = vidRange ?? (type === 'mos' ? 0.3 : 0.15);
  return Array.from({ length: steps + 1 }, (_, i) => {
    const vid = -range + (2 * range * i) / steps;
    const { id1, id2 } = _splitCurrents(ibias, vid, type);
    return { vid, id1, id2, vdiff: (id2 - id1) * rd };
  });
}

/**
 * 計算小訊號參數。
 * @returns {{ gm, av, vov }}
 */
export function calcSmallSignal(ibias, rd, type) {
  const { gm, av, vov } = calcBias(ibias, rd, type);
  return { gm, av, vov };
}
```

- [ ] **Step 2: 建立 `tests/diff-pair-math.test.mjs`**

```js
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
```

- [ ] **Step 3: 執行測試，確認全部通過**

```
node --test tests/diff-pair-math.test.mjs
```

預期輸出：所有 `▶` 測試顯示 `ok`，無 `not ok`。

- [ ] **Step 4: Commit**

```bash
git add js/diff-pair-math.js tests/diff-pair-math.test.mjs
git commit -m "feat: add differential pair math module with unit tests"
```

---

## Task 2: HTML 頁面框架 + Wizard CSS

**Files:**
- Create: `pages/differential-pair.html`
- Modify: `css/style.css`（附加）

- [ ] **Step 1: 在 `css/style.css` 末尾附加 Wizard 樣式**

```css
/* ═══════════════════════════════════════════════
   差動對 Wizard 樣式
═══════════════════════════════════════════════ */
.type-toggle-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  font-size: 0.875rem;
  color: var(--text-muted);
}

.type-btn {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-muted);
  padding: 5px 14px;
  border-radius: var(--radius);
  cursor: pointer;
  font-size: 0.875rem;
  transition: border-color 0.2s, color 0.2s;
}

.type-btn.active {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}

.wizard-layout {
  display: flex;
  gap: 0;
  min-height: 520px;
}

.wizard-sidebar {
  width: 200px;
  flex-shrink: 0;
  border-right: 1px solid var(--border);
  padding: 16px 0;
}

.wizard-step-list {
  list-style: none;
}

.wizard-step-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  cursor: pointer;
  color: var(--text-muted);
  font-size: 0.875rem;
  border-left: 3px solid transparent;
  transition: color 0.2s, border-color 0.2s;
}

.wizard-step-item:hover { color: var(--text); }

.wizard-step-item.active {
  color: var(--text);
  border-left-color: var(--accent-blue);
}

.wizard-step-item.done {
  color: var(--accent-green);
}

.step-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--border);
  flex-shrink: 0;
  transition: background 0.2s;
}

.wizard-step-item.active .step-dot { background: var(--accent-blue); }
.wizard-step-item.done  .step-dot  { background: var(--accent-green); }

.wizard-content {
  flex: 1;
  padding: 24px;
  display: flex;
  flex-direction: column;
}

.step-panel { display: none; flex: 1; flex-direction: column; }
.step-panel.active { display: flex; }

.step-title {
  font-size: 1.1rem;
  margin-bottom: 16px;
  color: var(--text);
}

.step-body {
  display: flex;
  gap: 20px;
  flex: 1;
  align-items: flex-start;
}

.circuit-wrap {
  flex-shrink: 0;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px;
}

.step-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.control-group label {
  font-size: 0.875rem;
  color: var(--text-muted);
}

.control-group input[type="range"] {
  width: 100%;
  accent-color: var(--accent-blue);
}

.hint-box {
  background: #0f2538;
  border: 1px solid #1d4060;
  border-radius: var(--radius);
  padding: 10px 12px;
  font-size: 0.85rem;
  color: #7ab8e8;
  line-height: 1.5;
}

.wizard-nav {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

/* 小訊號公式卡片 */
.formula-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

.formula-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px;
}

.formula-card h4 {
  font-size: 0.8rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
}

.live-values {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.live-val-item { text-align: center; }
.live-val-item .val-num {
  font-size: 1.3rem;
  font-family: var(--font-mono);
  color: var(--accent-blue);
}
.live-val-item .val-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 2px;
}

/* 比較表 */
.compare-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
  margin-top: 16px;
}

.compare-table th,
.compare-table td {
  border: 1px solid var(--border);
  padding: 8px 12px;
  text-align: left;
}

.compare-table th {
  background: var(--surface);
  color: var(--text-muted);
  font-weight: 600;
}

.compare-table tr:nth-child(even) td { background: #0f1318; }
```

- [ ] **Step 2: 建立 `pages/differential-pair.html`**

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>差動對 — 電子學補充教材</title>
  <link rel="stylesheet" href="../css/style.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
</head>
<body>
  <nav class="navbar">
    <a href="../index.html" class="navbar-brand">⚡ 電子學補充教材</a>
    <a href="differential-pair.html" class="navbar-link active">差動對</a>
  </nav>

  <div class="page-header">
    <h1>差動對偏壓與小訊號分析</h1>
    <p>調整偏壓電流與差動輸入，即時觀察電流分配與輸出響應。</p>
  </div>

  <div class="container">
    <!-- 元件類型切換 -->
    <div class="type-toggle-bar">
      <span>元件類型：</span>
      <button class="type-btn active" id="btn-mos">MOSFET (NMOS)</button>
      <button class="type-btn"        id="btn-bjt">BJT (NPN)</button>
    </div>

    <!-- Wizard -->
    <div class="wizard-layout">
      <!-- 左側導覽 -->
      <nav class="wizard-sidebar">
        <ol class="wizard-step-list" id="wizard-step-list">
          <li class="wizard-step-item active" data-step="0">
            <span class="step-dot"></span>偏壓操作點
          </li>
          <li class="wizard-step-item" data-step="1">
            <span class="step-dot"></span>差動輸入特性
          </li>
          <li class="wizard-step-item" data-step="2">
            <span class="step-dot"></span>小訊號增益
          </li>
          <li class="wizard-step-item" data-step="3">
            <span class="step-dot"></span>MOS vs BJT 比較
          </li>
        </ol>
      </nav>

      <!-- 右側內容 -->
      <div class="wizard-content">

        <!-- 步驟 0：偏壓操作點 -->
        <div class="step-panel active" id="panel-0">
          <h2 class="step-title">步驟 1 ─ 偏壓操作點</h2>
          <div class="step-body">
            <div class="circuit-wrap">
              <svg id="circuit-svg-0" width="210" height="170" viewBox="0 0 210 170"></svg>
            </div>
            <div class="step-right">
              <div class="control-group">
                <label>尾電流 I<sub>BIAS</sub> = <span id="ibias-val">1.00</span> mA</label>
                <input type="range" id="slider-ibias" min="0.1" max="2.0" step="0.1" value="1.0">
              </div>
              <div class="control-group">
                <label>R<sub>D</sub> / R<sub>C</sub> = <span id="rd-val">2.0</span> kΩ</label>
                <input type="range" id="slider-rd" min="0.5" max="5.0" step="0.5" value="2.0">
              </div>
              <div id="bar-chart-container"></div>
              <div class="hint-box">
                Vid = 0 時，差動對完全對稱，每支電晶體各流過 I<sub>BIAS</sub>/2 的電流。
              </div>
            </div>
          </div>
        </div>

        <!-- 步驟 1：差動輸入特性 -->
        <div class="step-panel" id="panel-1">
          <h2 class="step-title">步驟 2 ─ 差動輸入特性</h2>
          <div class="step-body">
            <div class="circuit-wrap">
              <svg id="circuit-svg-1" width="210" height="170" viewBox="0 0 210 170"></svg>
            </div>
            <div class="step-right">
              <div class="control-group">
                <label>差動輸入 V<sub>id</sub> = <span id="vid-val">0</span> mV</label>
                <input type="range" id="slider-vid" min="-300" max="300" step="5" value="0">
              </div>
              <div id="transfer-chart-container"></div>
              <div class="hint-box" id="transfer-hint">
                BJT 為 tanh 形曲線，線性範圍約 ±4V<sub>T</sub> ≈ ±100 mV；
                MOSFET 線性範圍約 ±V<sub>ov</sub>。
              </div>
            </div>
          </div>
        </div>

        <!-- 步驟 2：小訊號增益 -->
        <div class="step-panel" id="panel-2">
          <h2 class="step-title">步驟 3 ─ 小訊號增益</h2>
          <div id="small-signal-content"></div>
        </div>

        <!-- 步驟 3：比較 -->
        <div class="step-panel" id="panel-3">
          <h2 class="step-title">步驟 4 ─ MOSFET vs BJT 比較</h2>
          <div id="comparison-content"></div>
        </div>

        <!-- 導覽按鈕 -->
        <div class="wizard-nav">
          <button id="btn-prev" class="tool-btn" disabled>← 上一步</button>
          <button id="btn-next" class="tool-btn active">下一步 →</button>
        </div>
      </div>
    </div>
  </div>

  <script src="../lib/d3.v7.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js"></script>
  <script type="module" src="../js/diff-pair-main.js"></script>
</body>
</html>
```

- [ ] **Step 3: 在瀏覽器開啟 `pages/differential-pair.html`，確認頁面載入無 JS 錯誤，Wizard 側欄與步驟按鈕可見。**

- [ ] **Step 4: Commit**

```bash
git add pages/differential-pair.html css/style.css
git commit -m "feat: add differential pair page shell and wizard CSS"
```

---

## Task 3: SVG 電路圖元件

**Files:**
- Create: `js/diff-pair-circuit.js`

- [ ] **Step 1: 建立 `js/diff-pair-circuit.js`**

```js
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
const Y_RD_T = 18, Y_RD_B = 36;   // 電阻矩形
const Y_DRN  = 50;                  // 汲極節點
const Y_GATE = 68;                  // 閘極/基極中心
const Y_SRC  = 86;                  // 源極/射極節點
const Y_NODE = 96;                  // 共源節點
const Y_IS_T = 96, Y_IS_CY = 112, Y_IS_B = 128;  // 電流源
const Y_GND  = 145;

/**
 * 在 svgEl 中繪製完整電路圖，並在可更新文字節點上設置 id。
 * @param {SVGElement} svgEl
 * @param {'mos'|'bjt'} type
 */
export function createCircuit(svgEl, type) {
  svgEl.innerHTML = '';

  // VDD 標籤與橫線
  _text(svgEl, XM, 9, 'VDD = 3.3 V', C.rail, 7, 'middle');
  _line(svgEl, 30, Y_VDD, 180, Y_VDD, C.rail, 2);

  // 左分支：VDD → RD → 汲極節點
  _line(svgEl, X1, Y_VDD, X1, Y_RD_T, C.wire);
  _resistor(svgEl, X1, Y_RD_T, Y_RD_B);
  _text(svgEl, X1 + 12, Y_RD_T + 10, type === 'mos' ? 'R_D' : 'R_C', C.resistor, 7);
  _line(svgEl, X1, Y_RD_B, X1, Y_DRN, C.wire);

  // 右分支：VDD → RD → 汲極節點
  _line(svgEl, X2, Y_VDD, X2, Y_RD_T, C.wire);
  _resistor(svgEl, X2, Y_RD_T, Y_RD_B);
  _text(svgEl, X2 + 12, Y_RD_T + 10, type === 'mos' ? 'R_D' : 'R_C', C.resistor, 7);
  _line(svgEl, X2, Y_RD_B, X2, Y_DRN, C.wire);

  // 電晶體符號（簡化方塊）
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

  // 電流源（圓圈＋上箭頭）
  _circle(svgEl, XM, Y_IS_CY, 10, C.isrc);
  _text(svgEl, XM, Y_IS_CY + 3, '↑', C.isrc, 10, 'middle');
  _line(svgEl, XM, Y_IS_B, XM, Y_GND, C.wire);

  // GND 符號
  _gnd(svgEl, XM, Y_GND);

  // 即時數值標籤（id 供 updateCircuit 更新）
  _text(svgEl, X1, Y_DRN - 3, '─', C.vout, 7, 'middle', 'lbl-vout1');
  _text(svgEl, X2, Y_DRN - 3, '─', C.vout, 7, 'middle', 'lbl-vout2');
  _text(svgEl, X1 - 16, Y_SRC - 2, '─', C.device, 7, 'end',    'lbl-id1');
  _text(svgEl, X2 + 16, Y_SRC - 2, '─', C.device, 7, 'start',  'lbl-id2');
  _text(svgEl, XM + 14, Y_IS_CY + 2, '─', C.isrc, 7, 'start',  'lbl-ibias');
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
  const e = _el(p, 'rect');
  e.setAttribute('x', cx - 11); e.setAttribute('y', cy - 12);
  e.setAttribute('width', 22);  e.setAttribute('height', 24);
  e.setAttribute('fill', '#161b22');
  e.setAttribute('stroke', C.device);
  e.setAttribute('stroke-width', 1.5);
  e.setAttribute('rx', 3);
  _text(p, cx, cy + 4, label, C.device, 9, 'middle');
  // 汲極連線（上）
  _line(p, cx, cy - 12, cx, Y_DRN + (cy === Y_GATE ? 0 : 0), C.wire);
  // 源極連線（下）
  _line(p, cx, cy + 12, cx, Y_SRC, C.wire);
  // 閘極連線（左側外伸）
  _line(p, cx - 11, cy, cx - 11 - 1, cy, C.wire);
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
```

- [ ] **Step 2: 在瀏覽器檢查**

在 `diff-pair-main.js` 尚未完成前，暫時在 HTML `<script type="module">` 中加入測試行來確認電路圖繪製：

```js
// 在 differential-pair.html 的 module script 暫時加入（Task 5 完成後移除）：
import { createCircuit, updateCircuit } from '../js/diff-pair-circuit.js';
const svg0 = document.getElementById('circuit-svg-0');
createCircuit(svg0, 'mos');
updateCircuit(svg0, { id1: 5e-4, id2: 5e-4, vout1: 2.3, vout2: 2.3, ibias: 1e-3 });
```

預期：兩個電晶體方塊、RD 電阻框、VDD 橫線、IBIAS 電流源均可見，即時標籤顯示數值。

- [ ] **Step 3: Commit**

```bash
git add js/diff-pair-circuit.js
git commit -m "feat: add SVG circuit diagram component for differential pair"
```

---

## Task 4: D3 圖表元件

**Files:**
- Create: `js/diff-pair-charts.js`

- [ ] **Step 1: 建立 `js/diff-pair-charts.js`**

```js
// js/diff-pair-charts.js
// createBarChart  ─ ID1/ID2 電流分配長條圖
// createTransferChart ─ 差動輸入轉換曲線（ID1, ID2, Vdiff）

const COLORS = {
  id1: '#ff6b6b', id2: '#4a9eff', vdiff: '#ffd700',
  axis: '#a0aab6', grid: '#21262d',
};

// ── 長條圖 ──────────────────────────────────────────────────────────────────

/**
 * @param {HTMLElement} containerEl
 * @returns {{ update({ id1, id2, ibias }): void }}
 */
export function createBarChart(containerEl) {
  const W = 220, H = 140, M = { top: 10, right: 20, bottom: 30, left: 44 };
  const iW = W - M.left - M.right;
  const iH = H - M.top - M.bottom;

  const svg = d3.select(containerEl).append('svg')
    .attr('width', W).attr('height', H)
    .style('display', 'block');

  const g = svg.append('g').attr('transform', `translate(${M.left},${M.top})`);

  // 背景
  g.append('rect').attr('width', iW).attr('height', iH)
    .attr('fill', '#0d1117').attr('rx', 3);

  const xScale = d3.scaleBand()
    .domain(['ID1', 'ID2'])
    .range([0, iW])
    .padding(0.35);

  const yScale = d3.scaleLinear().range([iH, 0]);

  // X 軸
  const xAxis = g.append('g').attr('transform', `translate(0,${iH})`)
    .call(d3.axisBottom(xScale).tickSize(0))
    .call(ax => ax.select('.domain').attr('stroke', COLORS.axis))
    .call(ax => ax.selectAll('text').attr('fill', COLORS.axis).attr('font-size', 10));

  // Y 軸
  const yAxisG = g.append('g');

  // Y 格線
  const gridG = g.append('g').attr('class', 'grid');

  // 長條
  const bars = g.selectAll('.bar')
    .data(['ID1', 'ID2'])
    .join('rect')
    .attr('class', 'bar')
    .attr('x', d => xScale(d))
    .attr('width', xScale.bandwidth())
    .attr('fill', d => d === 'ID1' ? COLORS.id1 : COLORS.id2)
    .attr('rx', 2);

  // 數值標籤
  const labels = g.selectAll('.bar-label')
    .data(['ID1', 'ID2'])
    .join('text')
    .attr('class', 'bar-label')
    .attr('x', d => xScale(d) + xScale.bandwidth() / 2)
    .attr('text-anchor', 'middle')
    .attr('font-size', 9)
    .attr('font-family', 'monospace');

  // IBIAS 參考線
  const ibiasLine = g.append('line')
    .attr('stroke', '#58a6ff')
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', '4,3');

  const ibiasLabel = g.append('text')
    .attr('fill', '#58a6ff')
    .attr('font-size', 8)
    .attr('font-family', 'monospace');

  // Y 軸標籤
  svg.append('text')
    .attr('transform', `translate(10,${M.top + iH / 2}) rotate(-90)`)
    .attr('text-anchor', 'middle')
    .attr('fill', COLORS.axis)
    .attr('font-size', 9)
    .text('電流 (mA)');

  function update({ id1, id2, ibias }) {
    const maxY = ibias * 1.15;
    yScale.domain([0, maxY]);

    // Y 軸
    yAxisG.call(
      d3.axisLeft(yScale)
        .ticks(4)
        .tickFormat(d => `${(d * 1000).toFixed(1)}`)
    ).call(ax => ax.select('.domain').attr('stroke', COLORS.axis))
     .call(ax => ax.selectAll('text').attr('fill', COLORS.axis).attr('font-size', 9))
     .call(ax => ax.selectAll('line').attr('stroke', COLORS.axis));

    // 格線
    gridG.selectAll('line').remove();
    yScale.ticks(4).forEach(v => {
      gridG.append('line')
        .attr('x1', 0).attr('x2', iW)
        .attr('y1', yScale(v)).attr('y2', yScale(v))
        .attr('stroke', COLORS.grid).attr('stroke-width', 0.5);
    });

    // 更新長條高度
    const vals = { ID1: id1, ID2: id2 };
    bars
      .attr('y',      d => yScale(vals[d]))
      .attr('height', d => iH - yScale(vals[d]));

    labels
      .attr('y', d => yScale(vals[d]) - 3)
      .attr('fill', d => d === 'ID1' ? COLORS.id1 : COLORS.id2)
      .text(d => `${(vals[d] * 1e3).toFixed(2)}`);

    // IBIAS 參考線
    ibiasLine
      .attr('x1', 0).attr('x2', iW)
      .attr('y1', yScale(ibias)).attr('y2', yScale(ibias));

    ibiasLabel
      .attr('x', iW + 2).attr('y', yScale(ibias) + 3)
      .text(`I=${(ibias * 1e3).toFixed(1)}`);
  }

  return { update };
}

// ── 差動輸入轉換曲線 ─────────────────────────────────────────────────────────

/**
 * @param {HTMLElement} containerEl
 * @returns {{ update(curveData: Array<{vid,id1,id2,vdiff}>, currentVid: number): void }}
 */
export function createTransferChart(containerEl) {
  const W = 320, H = 180, M = { top: 12, right: 52, bottom: 30, left: 44 };
  const iW = W - M.left - M.right;
  const iH = H - M.top - M.bottom;

  const svg = d3.select(containerEl).append('svg')
    .attr('width', W).attr('height', H)
    .style('display', 'block');

  const g = svg.append('g').attr('transform', `translate(${M.left},${M.top})`);

  g.append('rect').attr('width', iW).attr('height', iH)
    .attr('fill', '#0d1117').attr('rx', 3);

  const xScale = d3.scaleLinear().range([0, iW]);
  const yL     = d3.scaleLinear().range([iH, 0]); // 電流（左軸）
  const yR     = d3.scaleLinear().range([iH, 0]); // 電壓 Vdiff（右軸）

  const xAxisG  = g.append('g').attr('transform', `translate(0,${iH})`);
  const yAxisLG = g.append('g');
  const yAxisRG = g.append('g').attr('transform', `translate(${iW},0)`);
  const gridG   = g.append('g');

  const lineI1 = d3.line().x(d => xScale(d.vid * 1000)).y(d => yL(d.id1));
  const lineI2 = d3.line().x(d => xScale(d.vid * 1000)).y(d => yL(d.id2));
  const lineVd = d3.line().x(d => xScale(d.vid * 1000)).y(d => yR(d.vdiff));

  const pathI1 = g.append('path').attr('fill', 'none').attr('stroke', COLORS.id1).attr('stroke-width', 1.5);
  const pathI2 = g.append('path').attr('fill', 'none').attr('stroke', COLORS.id2).attr('stroke-width', 1.5);
  const pathVd = g.append('path').attr('fill', 'none').attr('stroke', COLORS.vdiff).attr('stroke-width', 1.5).attr('stroke-dasharray', '5,3');

  // 游標線
  const cursor = g.append('line')
    .attr('stroke', '#ffffff').attr('stroke-width', 1)
    .attr('stroke-dasharray', '3,3')
    .attr('y1', 0).attr('y2', iH);

  // 圖例
  const legend = [
    { color: COLORS.id1,  label: 'ID1', dash: '' },
    { color: COLORS.id2,  label: 'ID2', dash: '' },
    { color: COLORS.vdiff, label: 'Vdiff', dash: '4,2' },
  ];
  legend.forEach((l, i) => {
    const lx = 4, ly = 8 + i * 14;
    g.append('line').attr('x1', lx).attr('x2', lx + 14).attr('y1', ly).attr('y2', ly)
      .attr('stroke', l.color).attr('stroke-width', 1.5)
      .attr('stroke-dasharray', l.dash);
    g.append('text').attr('x', lx + 18).attr('y', ly + 4)
      .attr('fill', l.color).attr('font-size', 8).attr('font-family', 'monospace')
      .text(l.label);
  });

  // 軸標籤
  svg.append('text')
    .attr('transform', `translate(10,${M.top + iH / 2}) rotate(-90)`)
    .attr('text-anchor', 'middle').attr('fill', COLORS.axis).attr('font-size', 9)
    .text('電流 (mA)');
  svg.append('text')
    .attr('transform', `translate(${W - 6},${M.top + iH / 2}) rotate(90)`)
    .attr('text-anchor', 'middle').attr('fill', COLORS.vdiff).attr('font-size', 9)
    .text('Vdiff (V)');
  svg.append('text')
    .attr('x', M.left + iW / 2).attr('y', H - 2)
    .attr('text-anchor', 'middle').attr('fill', COLORS.axis).attr('font-size', 9)
    .text('Vid (mV)');

  function update(curveData, currentVid) {
    if (!curveData.length) return;

    const vids   = curveData.map(d => d.vid * 1000);
    const maxI   = d3.max(curveData, d => Math.max(d.id1, d.id2));
    const maxVd  = d3.max(curveData, d => Math.abs(d.vdiff));

    xScale.domain([vids[0], vids[vids.length - 1]]);
    yL.domain([0, maxI * 1.1]);
    yR.domain([-maxVd * 1.15, maxVd * 1.15]);

    xAxisG.call(d3.axisBottom(xScale).ticks(6).tickFormat(d => `${d}`))
      .call(ax => ax.select('.domain').attr('stroke', COLORS.axis))
      .call(ax => ax.selectAll('text').attr('fill', COLORS.axis).attr('font-size', 9))
      .call(ax => ax.selectAll('line').attr('stroke', COLORS.axis));

    yAxisLG.call(d3.axisLeft(yL).ticks(4).tickFormat(d => `${(d * 1000).toFixed(1)}`))
      .call(ax => ax.select('.domain').attr('stroke', COLORS.axis))
      .call(ax => ax.selectAll('text').attr('fill', COLORS.axis).attr('font-size', 9))
      .call(ax => ax.selectAll('line').attr('stroke', COLORS.axis));

    yAxisRG.call(d3.axisRight(yR).ticks(4).tickFormat(d => d.toFixed(1)))
      .call(ax => ax.select('.domain').attr('stroke', COLORS.vdiff))
      .call(ax => ax.selectAll('text').attr('fill', COLORS.vdiff).attr('font-size', 9))
      .call(ax => ax.selectAll('line').attr('stroke', COLORS.vdiff));

    gridG.selectAll('line').remove();
    yL.ticks(4).forEach(v => {
      gridG.append('line').attr('x1', 0).attr('x2', iW)
        .attr('y1', yL(v)).attr('y2', yL(v))
        .attr('stroke', COLORS.grid).attr('stroke-width', 0.5);
    });
    gridG.append('line').attr('x1', xScale(0)).attr('x2', xScale(0))
      .attr('y1', 0).attr('y2', iH)
      .attr('stroke', COLORS.grid).attr('stroke-width', 0.5);

    pathI1.attr('d', lineI1(curveData));
    pathI2.attr('d', lineI2(curveData));
    pathVd.attr('d', lineVd(curveData));

    cursor
      .attr('x1', xScale(currentVid * 1000))
      .attr('x2', xScale(currentVid * 1000));
  }

  return { update };
}
```

- [ ] **Step 2: Commit**

```bash
git add js/diff-pair-charts.js
git commit -m "feat: add D3 bar chart and transfer curve chart for differential pair"
```

---

## Task 5: Wizard 主控制器

**Files:**
- Create: `js/diff-pair-main.js`
- Modify: `pages/differential-pair.html`（移除 Task 3 Step 2 中加入的測試程式碼）

- [ ] **Step 1: 建立 `js/diff-pair-main.js`**

```js
// js/diff-pair-main.js
import { calcBias, calcTransferCurve, calcSmallSignal } from './diff-pair-math.js';
import { createCircuit, updateCircuit }                  from './diff-pair-circuit.js';
import { createBarChart, createTransferChart }           from './diff-pair-charts.js';

// ── 狀態 ─────────────────────────────────────────────────────────────────────
let state = {
  type:  'mos',
  ibias: 1e-3,
  rd:    2e3,
  vid:   0,
  step:  0,
};

// ── DOM 參照 ──────────────────────────────────────────────────────────────────
const btnMos   = document.getElementById('btn-mos');
const btnBjt   = document.getElementById('btn-bjt');
const btnPrev  = document.getElementById('btn-prev');
const btnNext  = document.getElementById('btn-next');
const stepItems = document.querySelectorAll('.wizard-step-item');
const panels    = document.querySelectorAll('.step-panel');

const sliderIbias = document.getElementById('slider-ibias');
const sliderRd    = document.getElementById('slider-rd');
const sliderVid   = document.getElementById('slider-vid');
const ibiasVal    = document.getElementById('ibias-val');
const rdVal       = document.getElementById('rd-val');
const vidVal      = document.getElementById('vid-val');

const svg0 = document.getElementById('circuit-svg-0');
const svg1 = document.getElementById('circuit-svg-1');

// ── 圖表建立（一次性）────────────────────────────────────────────────────────
const barChart      = createBarChart(document.getElementById('bar-chart-container'));
const transferChart = createTransferChart(document.getElementById('transfer-chart-container'));

// ── 電路初始化 ────────────────────────────────────────────────────────────────
createCircuit(svg0, state.type);
createCircuit(svg1, state.type);

// ── 渲染函式 ──────────────────────────────────────────────────────────────────

function renderAll() {
  const bias  = calcBias(state.ibias, state.rd, state.type);
  const curve = calcTransferCurve(state.ibias, state.rd, state.type, null, 200);
  const current = calcBias_atVid(state.ibias, state.rd, state.type, state.vid);

  // 步驟 0：偏壓
  updateCircuit(svg0, { ...bias, ibias: state.ibias });
  barChart.update({ id1: bias.id1, id2: bias.id2, ibias: state.ibias });

  // 步驟 1：轉換曲線
  updateCircuit(svg1, { ...current, ibias: state.ibias });
  transferChart.update(curve, state.vid);

  // 步驟 2：小訊號（重新渲染公式區）
  renderSmallSignal();
}

function calcBias_atVid(ibias, rd, type, vid) {
  // 用 calcTransferCurve 取一個點
  const pts = calcTransferCurve(ibias, rd, type, Math.abs(vid) + 0.001, 2);
  // 找最接近 vid 的點
  const pt = pts.reduce((best, p) =>
    Math.abs(p.vid - vid) < Math.abs(best.vid - vid) ? p : best, pts[0]);
  return {
    id1: pt.id1, id2: pt.id2,
    vout1: 3.3 - pt.id1 * rd,
    vout2: 3.3 - pt.id2 * rd,
  };
}

function renderSmallSignal() {
  const { gm, av, vov } = calcSmallSignal(state.ibias, state.rd, state.type);
  const isMos = state.type === 'mos';
  const el = document.getElementById('small-signal-content');
  if (!el) return;

  const gmStr  = (gm * 1000).toFixed(2);    // mA/V
  const avStr  = Math.abs(av).toFixed(1);    // V/V
  const vovStr = (vov * 1000).toFixed(1);    // mV

  el.innerHTML = `
    <div class="formula-cards">
      <div class="formula-card">
        <h4>${isMos ? 'MOSFET' : 'BJT'} gm 公式</h4>
        <div id="formula-gm"></div>
        <div style="margin-top:8px;font-size:0.8rem;color:var(--text-muted);">
          ${isMos
            ? `Vov = VGS − Vth = ${vovStr} mV`
            : `VT = 26 mV（室溫）`}
        </div>
      </div>
      <div class="formula-card">
        <h4>差動增益 Av</h4>
        <div id="formula-av"></div>
      </div>
    </div>
    <div class="live-values">
      <div class="live-val-item">
        <div class="val-num">${gmStr}</div>
        <div class="val-label">gm (mA/V)</div>
      </div>
      <div class="live-val-item">
        <div class="val-num">${avStr}</div>
        <div class="val-label">|Av| (V/V)</div>
      </div>
      <div class="live-val-item">
        <div class="val-num">${(state.ibias * 1000).toFixed(1)}</div>
        <div class="val-label">IBIAS (mA)</div>
      </div>
    </div>
    <div class="hint-box" style="margin-top:12px;">
      ${isMos
        ? 'IBIAS 越大 → gm 越大 → |Av| 越大，但 Vout 直流偏壓也會下降（需保持飽和區）。'
        : 'BJT 的 gm = IC/VT，增益與偏壓電流成正比，VT 為固定常數。'}
    </div>
    <div style="margin-top:16px;">
      <svg id="ss-circuit" width="320" height="80" viewBox="0 0 320 80"></svg>
    </div>
  `;

  // KaTeX 公式
  const gmTex = isMos
    ? `g_m = \\dfrac{2 I_D}{V_{ov}} = \\sqrt{2 k_n I_D}`
    : `g_m = \\dfrac{I_C}{V_T}`;
  const avTex = isMos
    ? `A_v = -g_m R_D`
    : `A_v = -g_m R_C`;

  katex.render(gmTex, document.getElementById('formula-gm'), { throwOnError: false, displayMode: true });
  katex.render(avTex, document.getElementById('formula-av'), { throwOnError: false, displayMode: true });

  // 小訊號等效電路簡圖
  _drawSmallSignalCircuit(document.getElementById('ss-circuit'), isMos ? 'R_D' : 'R_C');
}

function _drawSmallSignalCircuit(svgEl, rdLabel) {
  svgEl.innerHTML = '';
  const NS = 'http://www.w3.org/2000/svg';
  const mk = (tag, attrs) => {
    const e = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
    svgEl.appendChild(e);
    return e;
  };
  // vid 輸入
  mk('text',  { x: 8,   y: 28, fill: '#ff6b6b', 'font-size': 10, 'font-family': 'monospace' }).textContent = 'vid';
  mk('line',  { x1: 30, y1: 24, x2: 75, y2: 24, stroke: '#e6edf3', 'stroke-width': 1.5 });
  // gm·vid 電流源（圓圈）
  mk('circle',{ cx: 90,  cy: 50, r: 18, fill: '#0d1117', stroke: '#3fb950', 'stroke-width': 1.5 });
  mk('text',  { x: 90,  y: 54, fill: '#3fb950', 'font-size': 8, 'font-family': 'monospace', 'text-anchor': 'middle' }).textContent = 'gm·vid';
  // 接地
  mk('line',  { x1: 90,  y1: 68, x2: 90,  y2: 76, stroke: '#e6edf3', 'stroke-width': 1.5 });
  mk('line',  { x1: 80,  y1: 76, x2: 100, y2: 76, stroke: '#a0aab6', 'stroke-width': 2 });
  // 上側連線
  mk('line',  { x1: 90,  y1: 32, x2: 90,  y2: 20, stroke: '#e6edf3', 'stroke-width': 1.5 });
  mk('line',  { x1: 90,  y1: 20, x2: 220, y2: 20, stroke: '#e6edf3', 'stroke-width': 1.5 });
  // RD
  mk('rect',  { x: 208, y: 10, width: 14, height: 36, fill: 'none', stroke: '#ffd700', 'stroke-width': 1.5, rx: 2 });
  mk('text',  { x: 225, y: 30, fill: '#ffd700', 'font-size': 8, 'font-family': 'monospace' }).textContent = rdLabel;
  // 下側連線
  mk('line',  { x1: 215, y1: 46, x2: 215, y2: 76, stroke: '#e6edf3', 'stroke-width': 1.5 });
  mk('line',  { x1: 80,  y1: 76, x2: 240, y2: 76, stroke: '#e6edf3', 'stroke-width': 1.5 });
  // Vout
  mk('line',  { x1: 215, y1: 20, x2: 270, y2: 20, stroke: '#e6edf3', 'stroke-width': 1.5 });
  mk('text',  { x: 272, y: 24, fill: '#ffd700', 'font-size': 10, 'font-family': 'monospace' }).textContent = 'vout';
}

function renderComparison() {
  const el = document.getElementById('comparison-content');
  if (!el) return;
  el.innerHTML = `
    <table class="compare-table">
      <thead>
        <tr>
          <th>項目</th>
          <th style="color:#3fb950;">MOSFET (NMOS)</th>
          <th style="color:#58a6ff;">BJT (NPN)</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>輸入阻抗</td>
            <td>極高（GΩ 級，gate 氧化層絕緣）</td>
            <td>中等（β/gm，典型數十 kΩ）</td></tr>
        <tr><td>gm 公式</td>
            <td>\\(g_m = \\sqrt{2 k_n I_D}\\)</td>
            <td>\\(g_m = I_C / V_T\\)</td></tr>
        <tr><td>線性 Vid 範圍</td>
            <td>±V<sub>ov</sub>（典型 ±200–500 mV）</td>
            <td>±4V<sub>T</sub> ≈ ±100 mV（較窄）</td></tr>
        <tr><td>輸入偏壓電流</td>
            <td>幾乎為零</td>
            <td>I<sub>B</sub> = I<sub>C</sub>/β</td></tr>
        <tr><td>製程</td>
            <td>CMOS（可與數位電路整合）</td>
            <td>BiCMOS / 雙極性製程</td></tr>
        <tr><td>典型應用</td>
            <td>CMOS 運算放大器、感測器前端</td>
            <td>高速比較器、低雜訊放大器</td></tr>
      </tbody>
    </table>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px;">
      <div class="concept-card">
        <div class="concept-card-header" style="padding:10px 14px;border-left:3px solid #3fb950;">
          <strong style="font-size:0.875rem;">選 MOSFET 的時機</strong>
        </div>
        <div style="padding:10px 14px;font-size:0.85rem;color:var(--text-muted);line-height:1.6;">
          需要高輸入阻抗、低功耗、CMOS 製程整合。<br>
          如：運算放大器輸入級、高阻抗感測器介面。
        </div>
      </div>
      <div class="concept-card">
        <div class="concept-card-header" style="padding:10px 14px;border-left:3px solid #58a6ff;">
          <strong style="font-size:0.875rem;">選 BJT 的時機</strong>
        </div>
        <div style="padding:10px 14px;font-size:0.85rem;color:var(--text-muted);line-height:1.6;">
          需要高 gm（高增益）、高速、低雜訊。<br>
          如：RF 低雜訊放大器、高速比較器。
        </div>
      </div>
    </div>
  `;
  renderMathInElement(el, {
    delimiters: [
      { left: '\\(', right: '\\)', display: false },
    ],
    throwOnError: false,
  });
}

// ── 步驟切換 ───────────────────────────────────────────────────────────────────

function goToStep(n) {
  state.step = Math.max(0, Math.min(3, n));
  panels.forEach(p => p.classList.remove('active'));
  stepItems.forEach(it => {
    const i = parseInt(it.dataset.step);
    it.classList.toggle('active', i === state.step);
    it.classList.toggle('done',   i < state.step);
  });
  document.getElementById(`panel-${state.step}`).classList.add('active');
  btnPrev.disabled = state.step === 0;
  btnNext.textContent = state.step === 3 ? '完成 ✓' : '下一步 →';
  btnNext.disabled = false;

  // 步驟 3：比較（靜態，只需渲染一次）
  if (state.step === 3) renderComparison();
}

// ── 事件監聽 ──────────────────────────────────────────────────────────────────

btnMos.addEventListener('click', () => {
  state.type = 'mos';
  btnMos.classList.add('active'); btnBjt.classList.remove('active');
  sliderVid.min = -300; sliderVid.max = 300;
  createCircuit(svg0, 'mos'); createCircuit(svg1, 'mos');
  renderAll();
});

btnBjt.addEventListener('click', () => {
  state.type = 'bjt';
  btnBjt.classList.add('active'); btnMos.classList.remove('active');
  sliderVid.min = -150; sliderVid.max = 150;
  if (Math.abs(state.vid) > 0.15) { state.vid = 0; sliderVid.value = 0; }
  createCircuit(svg0, 'bjt'); createCircuit(svg1, 'bjt');
  renderAll();
});

sliderIbias.addEventListener('input', () => {
  state.ibias = parseFloat(sliderIbias.value) * 1e-3;
  ibiasVal.textContent = parseFloat(sliderIbias.value).toFixed(2);
  renderAll();
});

sliderRd.addEventListener('input', () => {
  state.rd = parseFloat(sliderRd.value) * 1e3;
  rdVal.textContent = parseFloat(sliderRd.value).toFixed(1);
  renderAll();
});

sliderVid.addEventListener('input', () => {
  state.vid = parseInt(sliderVid.value) * 1e-3;
  vidVal.textContent = sliderVid.value;
  renderAll();
});

btnPrev.addEventListener('click', () => goToStep(state.step - 1));
btnNext.addEventListener('click', () => { if (state.step < 3) goToStep(state.step + 1); });

stepItems.forEach(it => {
  it.addEventListener('click', () => goToStep(parseInt(it.dataset.step)));
});

// ── 初始渲染 ──────────────────────────────────────────────────────────────────
renderAll();
```

- [ ] **Step 2: 確認 `pages/differential-pair.html` 中 Task 3 Step 2 的臨時測試程式碼已移除**（若有加入）。

- [ ] **Step 3: 在瀏覽器開啟 `pages/differential-pair.html`，逐一驗證：**
  - [ ] MOSFET/BJT 切換按鈕可用，電路圖切換
  - [ ] 步驟 0：IBIAS 滑桿移動，電路圖數值與長條圖同步更新
  - [ ] 步驟 1：Vid 滑桿移動，電路圖與轉換曲線游標同步
  - [ ] 步驟 2：gm / Av 數值即時更新，KaTeX 公式正確渲染
  - [ ] 步驟 3：比較表顯示，KaTeX 公式渲染
  - [ ] 側欄步驟點擊可跳轉，上一步/下一步按鈕正常

- [ ] **Step 4: Commit**

```bash
git add js/diff-pair-main.js pages/differential-pair.html
git commit -m "feat: wire differential pair wizard with all interactive steps"
```

---

## Task 6: 首頁新增差動對卡片

**Files:**
- Modify: `index.html`

- [ ] **Step 1: 在 `index.html` 的卡片 grid 中，緊接現有極點零點卡片後新增：**

```html
      <a href="pages/differential-pair.html" style="text-decoration:none;">
        <div class="panel" style="padding:18px; cursor:pointer; transition:border-color 0.2s;"
             onmouseover="this.style.borderColor='#4a9eff'"
             onmouseout="this.style.borderColor='#30363d'">
          <div style="font-size:1.3rem; margin-bottom:8px;">⚡</div>
          <h3 style="font-size:0.95rem; margin-bottom:5px; color:var(--text);">差動對</h3>
          <p style="font-size:0.9rem; color:var(--text-muted); line-height:1.5;">
            偏壓操作點、差動輸入特性曲線、小訊號增益，MOSFET 與 BJT 互動比較
          </p>
        </div>
      </a>
```

- [ ] **Step 2: 在瀏覽器開啟 `index.html`，確認新卡片可見且連結正確。**

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add differential pair card to homepage"
```

---

## 自我審查記錄

**Spec 覆蓋確認：**
- ✅ 步驟導覽式 Wizard（左側欄 + 右側內容）
- ✅ MOSFET / BJT 切換器
- ✅ 步驟 1：IBIAS + RD 滑桿、SVG 電路圖、長條圖
- ✅ 步驟 2：Vid 滑桿、轉換曲線（ID1, ID2, Vdiff）、游標
- ✅ 步驟 3：KaTeX gm/Av 公式 + 即時數值 + 小訊號等效電路
- ✅ 步驟 4：比較表 + 概念卡片
- ✅ 差動輸出 Vdiff = Vout1 − Vout2
- ✅ MOSFET 解析公式（拋物線飽和）、BJT tanh 公式
- ✅ 首頁卡片整合

**型別一致性確認：**
- `calcBias` → `{ id1, id2, vout1, vout2, vgs0, vov, gm, av }` — Task 1、5 一致
- `calcTransferCurve` → `Array<{ vid, id1, id2, vdiff }>` — Task 1、5 一致
- `createBarChart().update({ id1, id2, ibias })` — Task 4、5 一致
- `createTransferChart().update(curveData, currentVid)` — Task 4、5 一致
- `createCircuit(svgEl, type)` / `updateCircuit(svgEl, { id1, id2, vout1, vout2, ibias })` — Task 3、5 一致
