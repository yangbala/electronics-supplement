# 電子學補充教材：極點與零點頁面 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立全互動式電子學補充教材網頁，讓使用者拖曳 s 平面上的極點與零點，即時觀察系統穩定性、步階響應與波德圖的變化。

**Architecture:** 純靜態網站，Vanilla JS（ES Module）+ D3.js（UMD global）。傳遞函數計算（複數運算、殘差法步階響應、頻域掃描 Bode 圖）集中在 `transfer-function.js`；各視覺化元件各自獨立，透過 `onChange` 回調串連。s 平面採「清除重繪」策略（非 D3 data join），避免拖曳互動的狀態競爭問題。

**Tech Stack:** HTML5, CSS3, JavaScript ES2022 Modules, D3.js v7（UMD global 載入），Node.js 內建測試框架（`node:test`）

---

## 檔案結構

| 檔案 | 職責 |
|------|------|
| `index.html` | 首頁導覽 |
| `pages/poles-zeros.html` | 極點零點主頁（HTML 骨架） |
| `css/style.css` | 全站深色工程主題 CSS 變數與元件樣式 |
| `js/transfer-function.js` | 複數運算、evalH、stepResponse、bodePlot、dampingInfo |
| `js/s-plane.js` | D3 s 平面互動（拖曳、新增、刪除、共軛鎖定） |
| `js/step-response.js` | D3 步階響應折線圖 |
| `js/bode-plot.js` | D3 波德圖（增益 + 相位雙子圖） |
| `js/info-panel.js` | 系統資訊面板（穩定性、ζ、ωₙ、極零點列表） |
| `js/poles-zeros-main.js` | 主頁組裝：串連所有元件、概念卡、預設情境 |
| `lib/d3.v7.min.js` | D3.js 本機副本（離線可用） |
| `tests/tf.test.mjs` | transfer-function.js 的 Node.js 單元測試 |

---

### Task 1: 專案目錄、CSS 主題、index.html、頁面骨架

**Files:**
- Create: `css/style.css`
- Create: `lib/d3.v7.min.js`（下載）
- Create: `index.html`
- Create: `pages/poles-zeros.html`

- [ ] **Step 1: 建立所有目錄**

```powershell
cd "D:\AI_Agent\0021_電子學補充網站"
mkdir css, js, lib, pages, tests
```

- [ ] **Step 2: 下載 D3.js v7**

```powershell
Invoke-WebRequest -Uri "https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js" -OutFile "lib\d3.v7.min.js"
```

驗證：`(Get-Item lib\d3.v7.min.js).length` 應大於 200000。

- [ ] **Step 3: 建立 `css/style.css`**

```css
:root {
  --bg: #0d1117;
  --surface: #161b22;
  --border: #30363d;
  --text: #e6edf3;
  --text-muted: #8b949e;
  --accent-blue: #4a9eff;
  --accent-red: #ff6b6b;
  --accent-gold: #ffd700;
  --accent-green: #3fb950;
  --font-mono: 'Courier New', monospace;
  --font-sans: 'Segoe UI', system-ui, sans-serif;
  --radius: 6px;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-sans);
  line-height: 1.6;
}

.navbar {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  padding: 12px 24px;
  display: flex;
  align-items: center;
  gap: 24px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.navbar-brand {
  color: var(--accent-blue);
  font-weight: 700;
  font-size: 1rem;
  text-decoration: none;
}

.navbar-link {
  color: var(--text-muted);
  text-decoration: none;
  font-size: 0.875rem;
  transition: color 0.2s;
}

.navbar-link:hover, .navbar-link.active { color: var(--text); }

.page-header {
  padding: 28px 24px 16px;
  border-bottom: 1px solid var(--border);
}

.page-header h1 { font-size: 1.4rem; margin-bottom: 4px; }
.page-header p { color: var(--text-muted); font-size: 0.875rem; }

.container { padding: 20px 24px; }

/* 概念卡 */
.concept-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 10px;
  margin-bottom: 20px;
}

.concept-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.lhp-card .concept-card-header  { border-left: 3px solid var(--accent-blue); }
.rhp-card .concept-card-header  { border-left: 3px solid var(--accent-red); }
.jw-card  .concept-card-header  { border-left: 3px solid var(--accent-gold); }
.rhpz-card .concept-card-header { border-left: 3px solid #a78bfa; }

.concept-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  cursor: pointer;
  user-select: none;
  font-weight: 600;
  font-size: 0.83rem;
  gap: 8px;
}

.concept-card-header:hover { background: rgba(255,255,255,0.03); }

.concept-card-body {
  padding: 10px 14px;
  border-top: 1px solid var(--border);
  font-size: 0.82rem;
  color: var(--text-muted);
}

.concept-card-body p { margin-bottom: 6px; }

.formula {
  font-family: var(--font-mono);
  background: var(--bg);
  border-radius: 4px;
  padding: 6px 10px;
  margin: 6px 0;
  color: var(--accent-gold);
  font-size: 0.78rem;
}

.load-btn {
  margin-top: 8px;
  padding: 3px 10px;
  font-size: 0.76rem;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--accent-blue);
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}

.load-btn:hover {
  border-color: var(--accent-blue);
  background: rgba(74,158,255,0.1);
}

/* 預設情境列 */
.preset-bar {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 14px;
  align-items: center;
}

.preset-bar > label { font-size: 0.76rem; color: var(--text-muted); }

.preset-btn {
  padding: 4px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
  font-size: 0.78rem;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}

.preset-btn:hover {
  border-color: var(--accent-blue);
  background: rgba(74,158,255,0.08);
}

/* 互動主區 */
.interactive-area {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

@media (max-width: 900px) {
  .interactive-area { grid-template-columns: 1fr; }
}

.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.panel-header {
  padding: 7px 12px;
  border-bottom: 1px solid var(--border);
  font-size: 0.76rem;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-body { padding: 6px; }

/* s 平面工具列 */
.splane-toolbar {
  display: flex;
  gap: 5px;
  padding: 5px 8px;
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
  align-items: center;
}

.tool-btn {
  padding: 3px 9px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: transparent;
  color: var(--text-muted);
  font-size: 0.74rem;
  cursor: pointer;
  transition: all 0.15s;
}

.tool-btn.active {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
  background: rgba(74,158,255,0.1);
}

.tool-btn:hover { color: var(--text); }

.gain-label {
  font-size: 0.74rem;
  color: var(--text-muted);
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 5px;
}

.gain-label input {
  width: 54px;
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: 4px;
  padding: 2px 5px;
  font-size: 0.74rem;
}

/* 右側三圖 */
.right-panels { display: flex; flex-direction: column; gap: 10px; }

/* 軸樣式 */
.axis-style line, .axis-style path { stroke: var(--border); }
.axis-style text { fill: var(--text-muted); font-size: 9px; }

/* 極點/零點符號 */
.pole-x {
  font-size: 20px;
  font-weight: 700;
  cursor: grab;
  user-select: none;
}
.pole-x:active { cursor: grabbing; }
.pole-lhp { fill: var(--accent-blue); }
.pole-rhp { fill: var(--accent-red); }

.zero-circle {
  fill: none;
  stroke-width: 2.5;
  cursor: grab;
}
.zero-circle:active { cursor: grabbing; }
.zero-lhp { stroke: var(--accent-gold); }
.zero-rhp { stroke: #a78bfa; }

@keyframes rhp-pulse {
  0%, 100% { opacity: 0.12; r: 14px; }
  50%       { opacity: 0.32; r: 20px; }
}

.rhp-glow {
  fill: var(--accent-red);
  animation: rhp-pulse 1.2s ease-in-out infinite;
  pointer-events: none;
}

/* 系統資訊面板 */
.info-panel { padding: 10px 12px; font-size: 0.79rem; }

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 3px 0;
  border-bottom: 1px solid rgba(48,54,61,0.6);
}

.info-label { color: var(--text-muted); }
.info-value { font-family: var(--font-mono); }
.info-value.stable   { color: var(--accent-green); }
.info-value.unstable { color: var(--accent-red); }
.info-value.marginal { color: var(--accent-gold); }

.pole-list, .zero-list { font-family: var(--font-mono); font-size: 0.74rem; margin-top: 4px; }
.pole-entry         { color: var(--accent-blue); }
.pole-entry.rhp     { color: var(--accent-red); }
.zero-entry         { color: var(--accent-gold); }

/* 深入說明區 */
.deep-section {
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
}

.deep-section h2 { font-size: 1rem; color: var(--text-muted); margin-bottom: 14px; }
.deep-section h3 { font-size: 0.88rem; color: var(--accent-blue); margin: 14px 0 6px; }
.deep-section p  { font-size: 0.83rem; color: var(--text-muted); margin-bottom: 6px; }
```

- [ ] **Step 4: 建立 `index.html`**

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>電子學補充教材</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <nav class="navbar">
    <a href="index.html" class="navbar-brand">⚡ 電子學補充教材</a>
  </nav>
  <div class="container">
    <div style="padding: 20px 0 16px;">
      <h1 style="font-size:1.3rem; margin-bottom:6px;">單元一覽</h1>
      <p style="color:var(--text-muted); font-size:0.875rem;">選擇一個主題開始學習</p>
    </div>
    <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(240px,1fr)); gap:14px;">
      <a href="pages/poles-zeros.html" style="text-decoration:none;">
        <div class="panel" style="padding:18px; cursor:pointer; transition:border-color 0.2s;"
             onmouseover="this.style.borderColor='#4a9eff'"
             onmouseout="this.style.borderColor='#30363d'">
          <div style="font-size:1.3rem; margin-bottom:8px;">📐</div>
          <h3 style="font-size:0.9rem; margin-bottom:5px;">極點與零點</h3>
          <p style="font-size:0.8rem; color:var(--text-muted);">探索極點零點在左右半平面對系統穩定性、時域與頻域響應的影響</p>
        </div>
      </a>
    </div>
  </div>
</body>
</html>
```

- [ ] **Step 5: 建立 `pages/poles-zeros.html`（完整骨架）**

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>極點與零點 — 電子學補充教材</title>
  <link rel="stylesheet" href="../css/style.css">
</head>
<body>
  <nav class="navbar">
    <a href="../index.html" class="navbar-brand">⚡ 電子學補充教材</a>
    <a href="poles-zeros.html" class="navbar-link active">極點與零點</a>
  </nav>

  <div class="page-header">
    <h1>極點與零點對系統的影響</h1>
    <p>拖曳 s 平面上的極點（×）與零點（○），即時觀察系統響應的變化。右鍵點擊可刪除。</p>
  </div>

  <div class="container">
    <div class="concept-cards" id="concept-cards"></div>

    <div class="preset-bar" id="preset-bar">
      <label>快速情境：</label>
    </div>

    <div class="interactive-area">
      <!-- 左：s 平面 -->
      <div class="panel">
        <div class="panel-header">
          <span>s 平面（複數頻率域）</span>
          <span>× 極點　○ 零點</span>
        </div>
        <div class="splane-toolbar" id="splane-toolbar">
          <button class="tool-btn active" id="btn-add-pole">＋ 極點</button>
          <button class="tool-btn" id="btn-add-zero">＋ 零點</button>
          <button class="tool-btn active" id="btn-conjugate">共軛對稱 ✓</button>
          <div class="gain-label">
            K =
            <input id="gain-input" type="number" min="0.1" max="10" step="0.1" value="1">
          </div>
        </div>
        <div class="panel-body" id="splane-container"></div>
      </div>

      <!-- 右：三個面板 -->
      <div class="right-panels">
        <div class="panel">
          <div class="panel-header">步階響應 Step Response</div>
          <div class="panel-body" id="step-container"></div>
        </div>
        <div class="panel">
          <div class="panel-header">波德圖 Bode Plot</div>
          <div class="panel-body" id="bode-container"></div>
        </div>
        <div class="panel">
          <div class="panel-header">系統資訊</div>
          <div class="info-panel" id="info-panel-container"></div>
        </div>
      </div>
    </div>

    <div class="deep-section" id="deep-section"></div>
  </div>

  <script src="../lib/d3.v7.min.js"></script>
  <script type="module" src="../js/poles-zeros-main.js"></script>
</body>
</html>
```

- [ ] **Step 6: 啟動 dev server 驗證架構**

```powershell
npx --yes serve "D:\AI_Agent\0021_電子學補充網站" -p 3000
```

開啟 `http://localhost:3000`，確認：深色背景出現、標題顯示「單元一覽」、點選卡片可跳轉至 `poles-zeros.html`（此時頁面無互動元素是正常的）。

- [ ] **Step 7: Commit**

```powershell
git -C "D:\AI_Agent\0021_電子學補充網站" init
git -C "D:\AI_Agent\0021_電子學補充網站" add index.html "pages/poles-zeros.html" "css/style.css" "lib/d3.v7.min.js"
git -C "D:\AI_Agent\0021_電子學補充網站" commit -m "feat: project scaffold with dark engineering theme"
```

---

### Task 2: 傳遞函數數值計算核心

**Files:**
- Create: `js/transfer-function.js`
- Create: `tests/tf.test.mjs`

- [ ] **Step 1: 建立 `js/transfer-function.js`**

```javascript
// 複數型別：{ re: number, im: number }
export const complex = (re, im = 0) => ({ re, im });
export const cadd = (a, b) => ({ re: a.re + b.re, im: a.im + b.im });
export const csub = (a, b) => ({ re: a.re - b.re, im: a.im - b.im });
export const cmul = (a, b) => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
});
export const cdiv = (a, b) => {
  const d = b.re * b.re + b.im * b.im;
  if (d < 1e-30) return { re: Infinity, im: Infinity };
  return {
    re: (a.re * b.re + a.im * b.im) / d,
    im: (a.im * b.re - a.re * b.im) / d,
  };
};
export const cabs = (a) => Math.sqrt(a.re * a.re + a.im * a.im);
export const carg = (a) => Math.atan2(a.im, a.re);

// 計算 H(s) = K · ∏(s−zⱼ) / ∏(s−pᵢ) 在複數點 s 的值
export function evalH(s, poles, zeros, K = 1) {
  let num = complex(K);
  for (const z of zeros) num = cmul(num, csub(s, z));
  let den = complex(1);
  for (const p of poles) den = cmul(den, csub(s, p));
  return cdiv(num, den);
}

// H(s)/s 在極點 pi 的殘差（部分分式展開，pi ≠ 0）
// Res = K · ∏(pᵢ−zⱼ) / (pᵢ · ∏_{pⱼ≠pᵢ}(pᵢ−pⱼ))
function residueAtPole(pi, poles, zeros, K) {
  let num = complex(K);
  for (const z of zeros) num = cmul(num, csub(pi, z));
  let den = { ...pi }; // 分母起始為 pᵢ（來自 H(s)/s 的 1/s）
  for (const p of poles) {
    if (Math.abs(p.re - pi.re) > 1e-9 || Math.abs(p.im - pi.im) > 1e-9) {
      den = cmul(den, csub(pi, p));
    }
  }
  return cdiv(num, den);
}

// 計算步階響應（殘差法 + 時域疊加）
// 回傳 { times, values, isUnstable, isMarginal, dcGain }
export function stepResponse(poles, zeros, K = 1, numPoints = 600) {
  const isUnstable = poles.some((p) => p.re > 1e-6);
  const isMarginal = !isUnstable && poles.some((p) => Math.abs(p.re) < 1e-6);

  let tMax;
  if (isUnstable) {
    const maxSigma = Math.max(...poles.filter((p) => p.re > 1e-6).map((p) => p.re));
    tMax = 4 / maxSigma;
  } else if (isMarginal) {
    const omega = Math.max(
      ...poles.filter((p) => Math.abs(p.re) < 1e-6).map((p) => Math.abs(p.im)),
      1
    );
    tMax = (4 * Math.PI) / omega;
  } else {
    const minSigma = Math.min(...poles.filter((p) => p.re < 0).map((p) => Math.abs(p.re)));
    tMax = 6 / (minSigma || 1);
  }

  const times = Array.from({ length: numPoints }, (_, i) => (i / (numPoints - 1)) * tMax);

  // DC 增益（穩態值）
  let dcGain = 0;
  if (!isUnstable && !isMarginal && poles.length > 0) {
    const h0 = evalH(complex(0), poles, zeros, K);
    dcGain = isFinite(h0.re) ? h0.re : 0;
  }

  const residues = poles.map((p) => residueAtPole(p, poles, zeros, K));

  // y(t) = H(0) + Re( Σ Rᵢ · e^(pᵢt) )
  const values = times.map((t) => {
    let y = dcGain;
    for (let i = 0; i < poles.length; i++) {
      const { re: sigma, im: omega } = poles[i];
      const { re: Rr, im: Ri } = residues[i];
      const eSigT = Math.exp(sigma * t);
      y += eSigT * (Rr * Math.cos(omega * t) - Ri * Math.sin(omega * t));
    }
    return y;
  });

  return { times, values, isUnstable, isMarginal, dcGain };
}

// 計算波德圖（頻域掃描）
// 回傳 { freqs, gains(dB), phases(度) }
export function bodePlot(poles, zeros, K = 1, numPoints = 300) {
  const freqs = Array.from({ length: numPoints }, (_, i) =>
    Math.pow(10, -2 + (i / (numPoints - 1)) * 5)  // 0.01 ~ 1000 rad/s
  );
  const gains = [];
  const phases = [];
  for (const w of freqs) {
    const h = evalH(complex(0, w), poles, zeros, K);
    gains.push(20 * Math.log10(Math.max(cabs(h), 1e-12)));
    phases.push((carg(h) * 180) / Math.PI);
  }
  return { freqs, gains, phases };
}

// 從極點列表中找出共軛對，計算 ζ 與 ωₙ
export function dampingInfo(poles) {
  const used = new Set();
  const result = [];
  for (let i = 0; i < poles.length; i++) {
    if (used.has(i)) continue;
    for (let j = i + 1; j < poles.length; j++) {
      if (used.has(j)) continue;
      const p1 = poles[i], p2 = poles[j];
      const isConj =
        Math.abs(p1.re - p2.re) < 1e-9 &&
        Math.abs(p1.im + p2.im) < 1e-9 &&
        Math.abs(p1.im) > 1e-6;
      if (isConj) {
        const wn = cabs(p1);
        const zeta = -p1.re / wn;
        result.push({ zeta, wn, p1, p2 });
        used.add(i);
        used.add(j);
        break;
      }
    }
  }
  return result;
}
```

- [ ] **Step 2: 建立 `tests/tf.test.mjs`**

```javascript
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
```

- [ ] **Step 3: 執行測試，確認全部通過**

```powershell
node --test "D:\AI_Agent\0021_電子學補充網站\tests\tf.test.mjs"
```

預期：7 個測試全部 `ok`，輸出末尾無 `not ok`。

- [ ] **Step 4: Commit**

```powershell
git -C "D:\AI_Agent\0021_電子學補充網站" add "js/transfer-function.js" "tests/tf.test.mjs"
git -C "D:\AI_Agent\0021_電子學補充網站" commit -m "feat: transfer function math core with 7 unit tests"
```

---

### Task 3: s 平面互動元件

**Files:**
- Create: `js/s-plane.js`

說明：採「清除重繪」策略（render 開頭 `selectAll('*').remove()`），避免 D3 data join 與拖曳事件的索引競爭問題。每次 render 重新建立所有極點/零點 DOM 元素並綁定拖曳事件。

- [ ] **Step 1: 建立 `js/s-plane.js`**

```javascript
// 依賴全域 window.d3（由 HTML <script src="../lib/d3.v7.min.js"> 提供）

export function createSPlane(containerSelector, { onChange } = {}) {
  const W = 460, H = 400;
  const margin = { top: 18, right: 18, bottom: 28, left: 36 };
  const innerW = W - margin.left - margin.right;
  const innerH = H - margin.top - margin.bottom;

  const xScale = d3.scaleLinear().domain([-5, 5]).range([0, innerW]);
  const yScale = d3.scaleLinear().domain([-6, 6]).range([innerH, 0]);

  const svg = d3.select(containerSelector)
    .append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .style('width', '100%');

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  // 半平面背景
  g.append('rect')
    .attr('x', xScale(-5)).attr('y', 0)
    .attr('width', xScale(0) - xScale(-5)).attr('height', innerH)
    .attr('fill', '#4a9eff').attr('opacity', 0.04).attr('pointer-events', 'none');
  g.append('rect')
    .attr('x', xScale(0)).attr('y', 0)
    .attr('width', xScale(5) - xScale(0)).attr('height', innerH)
    .attr('fill', '#ff6b6b').attr('opacity', 0.04).attr('pointer-events', 'none');

  // 標籤
  g.append('text').attr('x', xScale(-4.5)).attr('y', 16).attr('fill', '#4a9eff')
    .attr('opacity', 0.5).attr('font-size', 11).attr('pointer-events', 'none').text('LHP');
  g.append('text').attr('x', xScale(1)).attr('y', 16).attr('fill', '#ff6b6b')
    .attr('opacity', 0.5).attr('font-size', 11).attr('pointer-events', 'none').text('RHP');
  g.append('text').attr('x', xScale(0) + 3).attr('y', 12).attr('fill', '#8b949e')
    .attr('font-size', 10).attr('pointer-events', 'none').text('jω');
  g.append('text').attr('x', xScale(4.8)).attr('y', yScale(0) - 6).attr('fill', '#8b949e')
    .attr('font-size', 10).attr('pointer-events', 'none').text('σ');

  // 格線
  const xAxisG = g.append('g').attr('transform', `translate(0,${yScale(0)})`);
  const yAxisG = g.append('g');
  xAxisG.call(d3.axisBottom(xScale).ticks(10).tickSize(-innerH).tickFormat(d3.format('d')));
  yAxisG.call(d3.axisLeft(yScale).ticks(12).tickSize(-innerW).tickFormat(d3.format('d')));
  [xAxisG, yAxisG].forEach((ax) => {
    ax.select('.domain').remove();
    ax.selectAll('line').attr('stroke', '#1e2430');
    ax.selectAll('text').attr('fill', '#555').attr('font-size', 9);
  });

  // 主軸
  g.append('line').attr('x1', 0).attr('x2', innerW)
    .attr('y1', yScale(0)).attr('y2', yScale(0)).attr('stroke', '#444').attr('stroke-width', 1.5)
    .attr('pointer-events', 'none');
  g.append('line').attr('x1', xScale(0)).attr('x2', xScale(0))
    .attr('y1', 0).attr('y2', innerH).attr('stroke', '#444').attr('stroke-width', 1.5)
    .attr('pointer-events', 'none');

  // 點擊接收層（透明矩形）
  const clickRect = g.append('rect')
    .attr('x', 0).attr('y', 0)
    .attr('width', innerW).attr('height', innerH)
    .attr('fill', 'none').attr('pointer-events', 'all');

  // 繪製層
  const glowLayer = g.append('g');
  const pzLayer   = g.append('g');

  // 狀態
  let poles = [], zeros = [], K = 1;
  let addMode = 'pole';
  let conjugateLocked = true;

  // 點擊空白區域新增
  clickRect.on('click', function (event) {
    const [mx, my] = d3.pointer(event);
    const sx = xScale.invert(mx);
    const sy = yScale.invert(my);
    if (addMode === 'pole') {
      if (conjugateLocked && Math.abs(sy) > 0.15) {
        poles.push({ re: sx, im: sy });
        poles.push({ re: sx, im: -sy });
      } else {
        poles.push({ re: sx, im: Math.abs(sy) < 0.15 ? 0 : sy });
      }
    } else {
      zeros.push({ re: sx, im: sy });
    }
    render();
    onChange?.({ poles, zeros, K });
  });

  function render() {
    glowLayer.selectAll('*').remove();
    pzLayer.selectAll('*').remove();

    // RHP 極點光暈動畫
    poles.filter((p) => p.re > 1e-6).forEach((p) => {
      glowLayer.append('circle')
        .attr('class', 'rhp-glow')
        .attr('cx', xScale(p.re))
        .attr('cy', yScale(p.im));
    });

    // 極點
    poles.forEach((p, i) => {
      pzLayer.append('text')
        .attr('class', `pole-x ${p.re > 1e-6 ? 'pole-rhp' : 'pole-lhp'}`)
        .attr('x', xScale(p.re))
        .attr('y', yScale(p.im))
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .text('×')
        .call(
          d3.drag().on('drag', function (event) {
            poles[i] = { re: xScale.invert(event.x), im: yScale.invert(event.y) };
            if (conjugateLocked && Math.abs(poles[i].im) > 1e-4) {
              const partner = i % 2 === 0 ? i + 1 : i - 1;
              if (partner >= 0 && partner < poles.length) {
                poles[partner] = { re: poles[i].re, im: -poles[i].im };
              }
            }
            render();
            onChange?.({ poles, zeros, K });
          })
        )
        .on('contextmenu', function (event) {
          event.preventDefault();
          poles.splice(i, 1);
          render();
          onChange?.({ poles, zeros, K });
        });
    });

    // 零點
    zeros.forEach((z, i) => {
      pzLayer.append('circle')
        .attr('class', `zero-circle ${z.re > 1e-6 ? 'zero-rhp' : 'zero-lhp'}`)
        .attr('cx', xScale(z.re))
        .attr('cy', yScale(z.im))
        .attr('r', 8)
        .call(
          d3.drag().on('drag', function (event) {
            zeros[i] = { re: xScale.invert(event.x), im: yScale.invert(event.y) };
            render();
            onChange?.({ poles, zeros, K });
          })
        )
        .on('contextmenu', function (event) {
          event.preventDefault();
          zeros.splice(i, 1);
          render();
          onChange?.({ poles, zeros, K });
        });
    });
  }

  return {
    setState(newPoles, newZeros, newK = 1) {
      poles = newPoles.map((p) => ({ ...p }));
      zeros = newZeros.map((z) => ({ ...z }));
      K = newK;
      render();
    },
    getState() {
      return { poles: poles.map((p) => ({ ...p })), zeros: zeros.map((z) => ({ ...z })), K };
    },
    setAddMode(mode) { addMode = mode; },
    setConjugateLocked(locked) { conjugateLocked = locked; },
  };
}
```

- [ ] **Step 2: 暫時在 `pages/poles-zeros.html` 底部 module script 中測試**

在 `<script type="module">` 標籤（暫時替換 poles-zeros-main.js 引用）中加入：

```html
<script type="module">
import { createSPlane } from '../js/s-plane.js';
const sp = createSPlane('#splane-container', {
  onChange: ({ poles }) => console.log(poles.map(p => `${p.re.toFixed(2)}+${p.im.toFixed(2)}j`))
});
sp.setState([{ re: -1, im: 3 }, { re: -1, im: -3 }], [{ re: -4, im: 0 }]);
</script>
```

開啟瀏覽器，確認：s 平面出現藍/紅背景分區、兩個藍色 × 極點和金黃 ○ 零點、拖曳極點時 console 輸出更新座標、右鍵點擊可刪除元素。

- [ ] **Step 3: 恢復 `pages/poles-zeros.html` 為正式 script 引用**

將 `<script>` 標籤改回：

```html
<script src="../lib/d3.v7.min.js"></script>
<script type="module" src="../js/poles-zeros-main.js"></script>
```

- [ ] **Step 4: Commit**

```powershell
git -C "D:\AI_Agent\0021_電子學補充網站" add "js/s-plane.js" "pages/poles-zeros.html"
git -C "D:\AI_Agent\0021_電子學補充網站" commit -m "feat: interactive s-plane with drag, add, delete, conjugate lock"
```

---

### Task 4: 步階響應圖

**Files:**
- Create: `js/step-response.js`

- [ ] **Step 1: 建立 `js/step-response.js`**

```javascript
import { stepResponse } from './transfer-function.js';

export function createStepResponse(containerSelector) {
  const W = 400, H = 145;
  const margin = { top: 14, right: 14, bottom: 28, left: 42 };
  const innerW = W - margin.left - margin.right;
  const innerH = H - margin.top - margin.bottom;

  const svg = d3.select(containerSelector)
    .append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .style('width', '100%');

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const xScale = d3.scaleLinear().range([0, innerW]);
  const yScale = d3.scaleLinear().range([innerH, 0]);

  const xAxisG = g.append('g').attr('transform', `translate(0,${innerH})`);
  const yAxisG = g.append('g');

  g.append('text').attr('x', innerW / 2).attr('y', innerH + 22)
    .attr('fill', '#8b949e').attr('font-size', 9).attr('text-anchor', 'middle').text('t (s)');
  g.append('text').attr('transform', 'rotate(-90)').attr('x', -innerH / 2).attr('y', -32)
    .attr('fill', '#8b949e').attr('font-size', 9).attr('text-anchor', 'middle').text('幅度');

  const finalLine = g.append('line')
    .attr('stroke', '#3fb950').attr('stroke-dasharray', '4,3').attr('opacity', 0);
  const linePath = g.append('path').attr('fill', 'none').attr('stroke-width', 2);
  const warnText = g.append('text')
    .attr('x', innerW / 2).attr('y', innerH / 2)
    .attr('text-anchor', 'middle').attr('fill', '#ff6b6b').attr('font-size', 10).attr('opacity', 0);

  function update(poles, zeros, K = 1) {
    if (poles.length === 0) { linePath.attr('d', ''); return; }

    const { times, values, isUnstable, isMarginal, dcGain } = stepResponse(poles, zeros, K);

    xScale.domain([0, times[times.length - 1]]);
    const finite = values.filter(isFinite);
    const yMin = Math.min(0, ...finite);
    const yMax = Math.max(...finite);
    const pad = Math.max((yMax - yMin) * 0.15, 0.3);
    yScale.domain([yMin - pad, yMax + pad]);

    xAxisG.call(d3.axisBottom(xScale).ticks(5).tickFormat((d) => d.toFixed(1)));
    yAxisG.call(d3.axisLeft(yScale).ticks(4).tickFormat((d) => d.toFixed(1)));
    [xAxisG, yAxisG].forEach((ax) => {
      ax.selectAll('line, path').attr('stroke', '#30363d');
      ax.selectAll('text').attr('fill', '#8b949e').attr('font-size', 9);
    });

    const lineGen = d3.line()
      .x((_, i) => xScale(times[i]))
      .y((d) => yScale(Math.max(yScale.domain()[0], Math.min(yScale.domain()[1], d))))
      .defined(isFinite);

    linePath
      .attr('stroke', isUnstable ? '#ff6b6b' : isMarginal ? '#ffd700' : '#4a9eff')
      .attr('d', lineGen(values));

    if (!isUnstable && !isMarginal && isFinite(dcGain)) {
      finalLine.attr('opacity', 0.5)
        .attr('x1', 0).attr('x2', innerW)
        .attr('y1', yScale(dcGain)).attr('y2', yScale(dcGain));
    } else {
      finalLine.attr('opacity', 0);
    }

    warnText.attr('opacity', isUnstable ? 1 : 0).text('⚠ 系統發散（RHP 極點）');
  }

  return { update };
}
```

- [ ] **Step 2: Commit**

```powershell
git -C "D:\AI_Agent\0021_電子學補充網站" add "js/step-response.js"
git -C "D:\AI_Agent\0021_電子學補充網站" commit -m "feat: step response chart with stability coloring and diverge warning"
```

---

### Task 5: 波德圖

**Files:**
- Create: `js/bode-plot.js`

- [ ] **Step 1: 建立 `js/bode-plot.js`**

```javascript
import { bodePlot } from './transfer-function.js';

export function createBodePlot(containerSelector) {
  const W = 400, H = 190;
  const margin = { top: 8, right: 16, bottom: 28, left: 48 };
  const innerW = W - margin.left - margin.right;
  const halfH = Math.floor((H - margin.top - margin.bottom) / 2) - 4;

  const svg = d3.select(containerSelector)
    .append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .style('width', '100%');

  const gGain  = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
  const gPhase = svg.append('g').attr('transform', `translate(${margin.left},${margin.top + halfH + 8})`);

  const xScale    = d3.scaleLog().domain([0.01, 1000]).range([0, innerW]);
  const gainScale  = d3.scaleLinear().range([halfH, 0]);
  const phaseScale = d3.scaleLinear().domain([-200, 200]).range([halfH, 0]);

  const xTickVals = [0.01, 0.1, 1, 10, 100, 1000];
  const xAxis = d3.axisBottom(xScale)
    .tickValues(xTickVals)
    .tickFormat((d) => (d >= 1 ? d3.format('d')(d) : String(d)));

  // x 軸（只在相位圖底部顯示）
  const xAxisPhase = gPhase.append('g').attr('transform', `translate(0,${halfH})`).call(xAxis);
  // 增益 y 軸
  const yGainAxis = gGain.append('g');
  // 相位 y 軸
  gPhase.append('g').call(
    d3.axisLeft(phaseScale).tickValues([-180, -90, 0, 90, 180]).tickFormat((d) => `${d}°`)
  );

  // 軸標籤
  gGain.append('text').attr('transform', 'rotate(-90)').attr('x', -halfH / 2).attr('y', -38)
    .attr('fill', '#8b949e').attr('font-size', 9).attr('text-anchor', 'middle').text('增益 (dB)');
  gPhase.append('text').attr('transform', 'rotate(-90)').attr('x', -halfH / 2).attr('y', -40)
    .attr('fill', '#8b949e').attr('font-size', 9).attr('text-anchor', 'middle').text('相位 (°)');
  gPhase.append('text').attr('x', innerW / 2).attr('y', halfH + 22)
    .attr('fill', '#8b949e').attr('font-size', 9).attr('text-anchor', 'middle').text('ω (rad/s)');

  // 0 dB / 0° 參考線
  const ref0dB  = gGain.append('line').attr('stroke', '#30363d').attr('stroke-dasharray', '3,3')
    .attr('x1', 0).attr('x2', innerW);
  const ref0deg = gPhase.append('line').attr('stroke', '#30363d').attr('stroke-dasharray', '3,3')
    .attr('x1', 0).attr('x2', innerW);

  const gainPath  = gGain.append('path').attr('fill', 'none').attr('stroke', '#ffd700').attr('stroke-width', 1.5);
  const phasePath = gPhase.append('path').attr('fill', 'none').attr('stroke', '#a78bfa').attr('stroke-width', 1.5);
  const poleFreqLayer = gGain.append('g');

  function styleAxes() {
    [gGain, gPhase].forEach((g) => {
      g.selectAll('.domain, line').attr('stroke', '#30363d');
      g.selectAll('text').attr('fill', '#8b949e').attr('font-size', 9);
    });
  }

  function update(poles, zeros, K = 1) {
    if (poles.length === 0) return;

    const { freqs, gains, phases } = bodePlot(poles, zeros, K);

    const finiteGains = gains.filter(isFinite);
    gainScale.domain([
      Math.min(...finiteGains) - 6,
      Math.max(...finiteGains) + 6,
    ]);
    yGainAxis.call(d3.axisLeft(gainScale).ticks(4).tickFormat((d) => `${d}`));
    styleAxes();

    ref0dB.attr('y1', gainScale(0)).attr('y2', gainScale(0));
    ref0deg.attr('y1', phaseScale(0)).attr('y2', phaseScale(0));

    const gainLineGen = d3.line()
      .x((_, i) => xScale(freqs[i])).y((d) => gainScale(d)).defined(isFinite);
    const phaseLineGen = d3.line()
      .x((_, i) => xScale(freqs[i])).y((d) => phaseScale(d)).defined(isFinite);

    gainPath.attr('d', gainLineGen(gains));
    phasePath.attr('d', phaseLineGen(phases));

    // 極點頻率垂直虛線
    const pFreqs = poles
      .map((p) => Math.sqrt(p.re * p.re + p.im * p.im))
      .filter((f) => f > 0.01 && f < 1000);
    const lines = poleFreqLayer.selectAll('.pf-line').data(pFreqs);
    lines.enter().append('line').attr('class', 'pf-line')
      .merge(lines)
      .attr('x1', (f) => xScale(f)).attr('x2', (f) => xScale(f))
      .attr('y1', 0).attr('y2', halfH)
      .attr('stroke', '#4a9eff').attr('stroke-dasharray', '3,3').attr('opacity', 0.35);
    lines.exit().remove();
  }

  return { update };
}
```

- [ ] **Step 2: Commit**

```powershell
git -C "D:\AI_Agent\0021_電子學補充網站" add "js/bode-plot.js"
git -C "D:\AI_Agent\0021_電子學補充網站" commit -m "feat: Bode plot with gain/phase subcharts and pole frequency markers"
```

---

### Task 6: 系統資訊面板

**Files:**
- Create: `js/info-panel.js`

- [ ] **Step 1: 建立 `js/info-panel.js`**

```javascript
import { evalH, complex, dampingInfo } from './transfer-function.js';

export function createInfoPanel(containerSelector) {
  const el = document.querySelector(containerSelector);

  function fmt(c) {
    const re = c.re.toFixed(3);
    if (Math.abs(c.im) < 1e-6) return re;
    return `${re} ${c.im >= 0 ? '+' : '−'} ${Math.abs(c.im).toFixed(3)}j`;
  }

  function update(poles, zeros, K = 1) {
    const isUnstable = poles.some((p) => p.re > 1e-6);
    const isMarginal = !isUnstable && poles.some((p) => Math.abs(p.re) < 1e-6);

    const [stabText, stabClass] = isUnstable
      ? ['✗ 不穩定', 'unstable']
      : isMarginal
      ? ['⚠ 臨界穩定', 'marginal']
      : ['✓ 穩定', 'stable'];

    const h0 = poles.length > 0 ? evalH(complex(0), poles, zeros, K) : complex(0);
    const dcStr = isFinite(h0.re) ? h0.re.toFixed(4) : '∞';

    const dampRows = dampingInfo(poles)
      .map(
        ({ zeta, wn }) => `
          <div class="info-row">
            <span class="info-label">阻尼比 ζ</span>
            <span class="info-value">${zeta.toFixed(4)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">自然頻率 ωₙ</span>
            <span class="info-value">${wn.toFixed(4)} rad/s</span>
          </div>`
      )
      .join('');

    const poleRows = poles
      .map((p, i) => `<div class="pole-entry${p.re > 1e-6 ? ' rhp' : ''}">p${i + 1} = ${fmt(p)}</div>`)
      .join('') || '<span style="color:#555">（無極點）</span>';

    const zeroRows = zeros
      .map((z, i) => `<div class="zero-entry">z${i + 1} = ${fmt(z)}</div>`)
      .join('') || '<span style="color:#555">（無零點）</span>';

    el.innerHTML = `
      <div class="info-row">
        <span class="info-label">穩定性</span>
        <span class="info-value ${stabClass}">${stabText}</span>
      </div>
      <div class="info-row">
        <span class="info-label">直流增益 H(0)</span>
        <span class="info-value">${dcStr}</span>
      </div>
      <div class="info-row">
        <span class="info-label">增益 K</span>
        <span class="info-value">${K.toFixed(2)}</span>
      </div>
      ${dampRows}
      <div style="margin-top:8px;">
        <div class="info-label" style="margin-bottom:3px;font-size:0.74rem;">極點</div>
        <div class="pole-list">${poleRows}</div>
      </div>
      <div style="margin-top:6px;">
        <div class="info-label" style="margin-bottom:3px;font-size:0.74rem;">零點</div>
        <div class="zero-list">${zeroRows}</div>
      </div>`;
  }

  return { update };
}
```

- [ ] **Step 2: Commit**

```powershell
git -C "D:\AI_Agent\0021_電子學補充網站" add "js/info-panel.js"
git -C "D:\AI_Agent\0021_電子學補充網站" commit -m "feat: system info panel with stability, damping ratio, pole/zero list"
```

---

### Task 7: 主頁組裝（poles-zeros-main.js）

**Files:**
- Create: `js/poles-zeros-main.js`

- [ ] **Step 1: 建立 `js/poles-zeros-main.js`**

```javascript
import { createSPlane }       from './s-plane.js';
import { createStepResponse } from './step-response.js';
import { createBodePlot }     from './bode-plot.js';
import { createInfoPanel }    from './info-panel.js';

// ── 初始化元件 ──────────────────────────────────────────
const sPlane    = createSPlane('#splane-container', { onChange: handleChange });
const stepChart = createStepResponse('#step-container');
const bodeChart = createBodePlot('#bode-container');
const infoPanel = createInfoPanel('#info-panel-container');

function handleChange({ poles, zeros, K }) {
  stepChart.update(poles, zeros, K);
  bodeChart.update(poles, zeros, K);
  infoPanel.update(poles, zeros, K);
}

// ── 工具列 ──────────────────────────────────────────────
const btnPole  = document.getElementById('btn-add-pole');
const btnZero  = document.getElementById('btn-add-zero');
const btnConj  = document.getElementById('btn-conjugate');
const gainInput = document.getElementById('gain-input');

btnPole.addEventListener('click', () => {
  sPlane.setAddMode('pole');
  btnPole.classList.add('active');
  btnZero.classList.remove('active');
});

btnZero.addEventListener('click', () => {
  sPlane.setAddMode('zero');
  btnZero.classList.add('active');
  btnPole.classList.remove('active');
});

let conjLocked = true;
btnConj.addEventListener('click', () => {
  conjLocked = !conjLocked;
  sPlane.setConjugateLocked(conjLocked);
  btnConj.textContent = conjLocked ? '共軛對稱 ✓' : '共軛對稱 ✗';
  btnConj.classList.toggle('active', conjLocked);
});

gainInput.addEventListener('input', () => {
  const K = parseFloat(gainInput.value) || 1;
  const { poles, zeros } = sPlane.getState();
  sPlane.setState(poles, zeros, K);
  handleChange({ poles, zeros, K });
});

// ── 預設情境 ────────────────────────────────────────────
const PRESETS = [
  { label: '一階穩定',   poles: [{ re: -2, im: 0 }],                           zeros: [],                  K: 1  },
  { label: '二階欠阻尼', poles: [{ re: -1, im: 3 }, { re: -1, im: -3 }],        zeros: [],                  K: 10 },
  { label: '臨界穩定',   poles: [{ re: 0,  im: 3 }, { re: 0,  im: -3 }],        zeros: [],                  K: 9  },
  { label: '一階不穩定', poles: [{ re: 1,  im: 0 }],                            zeros: [],                  K: 1  },
  { label: 'RHP 零點',   poles: [{ re: -2, im: 0 }],                            zeros: [{ re: 1, im: 0 }],  K: 2  },
];

const presetBar = document.getElementById('preset-bar');
PRESETS.forEach((preset) => {
  const btn = document.createElement('button');
  btn.className = 'preset-btn';
  btn.textContent = preset.label;
  btn.addEventListener('click', () => {
    sPlane.setState(preset.poles, preset.zeros, preset.K);
    gainInput.value = preset.K;
    handleChange({ poles: preset.poles, zeros: preset.zeros, K: preset.K });
  });
  presetBar.appendChild(btn);
});

// ── 概念說明卡 ──────────────────────────────────────────
const CONCEPTS = [
  {
    cls: 'lhp-card',
    title: '左半平面極點（LHP，σ < 0）',
    html: `<p>實部為負的極點對應時域中的<strong>衰減指數</strong> e<sup>σt</sup>（σ&lt;0）。響應最終收斂至有限值，系統<strong>穩定</strong>。</p>
           <p>極點越靠近虛軸（|σ| 越小），衰減越慢；越往左衰減越快，系統反應越靈敏。</p>
           <div class="formula">H(s) = a/(s+a)，a&gt;0 &nbsp;→&nbsp; y(t) = (1−e<sup>−at</sup>)u(t)</div>`,
    presetIdx: 0,
  },
  {
    cls: 'rhp-card',
    title: '右半平面極點（RHP，σ > 0）',
    html: `<p>實部為正的極點產生<strong>增長指數</strong> e<sup>σt</sup>（σ&gt;0），響應隨時間無限增大，系統<strong>不穩定</strong>。</p>
           <p><em>任何一個</em> RHP 極點都足以使系統不穩定，不論其餘極點位置。</p>
           <div class="formula">H(s) = a/(s−a)，a&gt;0 &nbsp;→&nbsp; y(t) ∝ e<sup>+at</sup>（發散）</div>`,
    presetIdx: 3,
  },
  {
    cls: 'jw-card',
    title: '虛軸極點（σ = 0，臨界穩定）',
    html: `<p>實部恰好為零的極點產生<strong>等幅正弦振盪</strong>，振盪頻率為極點虛部 ω₀ rad/s，既不衰減也不增大。</p>
           <p>工程實務中通常不可接受，因為任何微小擾動都可能使實際系統發散。</p>
           <div class="formula">H(s) = ω₀²/(s²+ω₀²) &nbsp;→&nbsp; y(t) ∝ sin(ω₀t)</div>`,
    presetIdx: 2,
  },
  {
    cls: 'rhpz-card',
    title: '右半平面零點（Non-minimum Phase）',
    html: `<p>RHP 零點不影響系統穩定性（穩定性由極點決定），但會造成<strong>非最小相位</strong>行為。</p>
           <p>步階響應初始方向與終值<em>相反</em>（先往反方向再回頭），波德圖相位滯後超出增益衰減的預期，這是控制系統設計的重要限制。</p>
           <div class="formula">H(s) = (1−s)/(1+s) &nbsp;→&nbsp; 初始步階響應反向後收斂</div>`,
    presetIdx: 4,
  },
];

const conceptCards = document.getElementById('concept-cards');
CONCEPTS.forEach((c) => {
  const card = document.createElement('div');
  card.className = `concept-card ${c.cls}`;
  card.innerHTML = `
    <div class="concept-card-header">
      <span>${c.title}</span><span>▾</span>
    </div>
    <div class="concept-card-body">
      ${c.html}
      <button class="load-btn">點此載入範例 →</button>
    </div>`;
  card.querySelector('.concept-card-header').addEventListener('click', function () {
    const body = card.querySelector('.concept-card-body');
    body.style.display = body.style.display === 'none' ? '' : 'none';
  });
  card.querySelector('.load-btn').addEventListener('click', () => {
    const p = PRESETS[c.presetIdx];
    sPlane.setState(p.poles, p.zeros, p.K);
    gainInput.value = p.K;
    handleChange({ poles: p.poles, zeros: p.zeros, K: p.K });
    document.querySelector('.interactive-area').scrollIntoView({ behavior: 'smooth' });
  });
  conceptCards.appendChild(card);
});

// ── 深入說明區 ──────────────────────────────────────────
document.getElementById('deep-section').innerHTML = `
  <h2>深入說明</h2>

  <h3>1. 拉普拉斯轉換與 s 域的幾何意義</h3>
  <p>拉普拉斯轉換 ℒ{f(t)} = F(s) 將時域訊號映射到複數頻率域，其中 s = σ + jω。
     σ（實部）控制指數包絡的增減速率，ω（虛部）控制振盪頻率。
     系統傳遞函數 H(s) 在 s 平面上的極點決定了系統的自然響應模式，零點則決定各模式的激發程度。</p>

  <h3>2. 特徵方程式根與穩定性（Routh-Hurwitz 判準）</h3>
  <p>線性非時變（LTI）系統穩定的充要條件：傳遞函數分母多項式（特徵方程式）的所有根皆位於左半平面（σ &lt; 0）。</p>
  <div class="formula">D(s) = sⁿ + aₙ₋₁sⁿ⁻¹ + ⋯ + a₁s + a₀ = 0&nbsp;&nbsp;→&nbsp;&nbsp;所有根 Re(sₖ) &lt; 0</div>
  <p>Routh-Hurwitz 判準提供了一種無需直接求根就能判斷穩定性的代數方法：構造 Routh 陣列，若第一列元素全為正，則系統穩定。</p>

  <h3>3. 電路範例：RC 低通濾波器的極點</h3>
  <p>RC 低通濾波器的傳遞函數：</p>
  <div class="formula">H(s) = 1/(RCs + 1) = (1/RC) / (s + 1/RC)</div>
  <p>極點位於 s = −1/RC（左半平面），時間常數 τ = RC 決定衰減速率，截止頻率 ωc = 1/RC rad/s。
     增大 R 或 C 使極點更靠近虛軸，對應更慢的響應（更窄的通帶）。這是「極點位置直接對應物理性質」的最直觀範例。</p>`;

// ── 初始載入：二階欠阻尼 ────────────────────────────────
const init = PRESETS[1];
sPlane.setState(init.poles, init.zeros, init.K);
gainInput.value = init.K;
handleChange({ poles: init.poles, zeros: init.zeros, K: init.K });
```

- [ ] **Step 2: Commit**

```powershell
git -C "D:\AI_Agent\0021_電子學補充網站" add "js/poles-zeros-main.js"
git -C "D:\AI_Agent\0021_電子學補充網站" commit -m "feat: wire all components, concept cards, presets, deep section"
```

---

### Task 8: 最終整合測試

- [ ] **Step 1: 執行數學單元測試（確保未被其他變更影響）**

```powershell
node --test "D:\AI_Agent\0021_電子學補充網站\tests\tf.test.mjs"
```

預期：`# tests 7 / # pass 7 / # fail 0`

- [ ] **Step 2: 啟動 dev server**

```powershell
npx --yes serve "D:\AI_Agent\0021_電子學補充網站" -p 3000
```

- [ ] **Step 3: 逐一驗證五個預設情境**

開啟 `http://localhost:3000/pages/poles-zeros.html`，點擊每個預設按鈕並確認：

| 情境 | 步階響應（曲線顏色） | 資訊面板 |
|------|-------------------|---------|
| 一階穩定 p=−2 | 藍色，指數上升至終值 0.5 | ✓ 穩定，H(0)=0.5 |
| 二階欠阻尼 p=−1±3j | 藍色，振盪收斂 | ✓ 穩定，ζ≈0.316，ωₙ≈3.162 |
| 臨界穩定 p=±3j | 金黃色，等幅振盪 | ⚠ 臨界穩定 |
| 一階不穩定 p=+1 | 紅色，指數發散 + 「⚠ 系統發散」文字 | ✗ 不穩定 |
| RHP 零點 z=+1 | 藍色，初始先往下後收斂（Non-minimum phase） | ✓ 穩定 |

- [ ] **Step 4: 驗證互動功能**

- [ ] 拖曳極點時，三個圖表即時更新（<50ms 視覺延遲）
- [ ] 右鍵刪除極點/零點正常運作
- [ ] 點擊空白區域新增極點（極點模式）/ 零點（零點模式）
- [ ] 共軛對稱：拖曳上方極點，下方鏡像極點同步移動
- [ ] 解除共軛鎖定後，兩極點可獨立移動
- [ ] RHP 極點出現紅色脈衝光暈動畫
- [ ] 修改 K 值，三個圖表更新（步階響應幅度改變、Bode 增益曲線整體平移）
- [ ] 概念卡「點此載入範例」按鈕可正確載入並滾動至互動區
- [ ] `index.html` → `poles-zeros.html` 導覽正常

- [ ] **Step 5: 最終 Commit**

```powershell
git -C "D:\AI_Agent\0021_電子學補充網站" add .
git -C "D:\AI_Agent\0021_電子學補充網站" commit -m "feat: complete poles-zeros interactive educational page"
```
