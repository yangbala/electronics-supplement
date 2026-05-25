# 差動對偏壓與小訊號互動頁面設計規格

**日期：** 2026-05-26
**狀態：** 已確認，待實作

---

## 1. 頁面概述

新增一個電子學補充教材頁面，主題為「差動對（Differential Pair）的偏壓分析與小訊號輸出響應」。

頁面以步驟導覽式（Wizard）為主要互動架構，包含 MOSFET / BJT 切換器，涵蓋四個學習步驟：偏壓操作點 → 差動輸入特性 → 小訊號增益 → MOS vs BJT 比較。

適合大學電子學課程，從初學者到進階學生均適用。

---

## 2. 技術選型

沿用現有專案技術棧，無新增依賴：

| 項目 | 選擇 |
|------|------|
| 框架 | Vanilla JS + ES Module |
| 視覺化 | D3.js v7（本機 `lib/d3.v7.min.js`） |
| 數學排版 | KaTeX（CDN） |
| 樣式 | `css/style.css`（現有深色工程主題） |

---

## 3. 檔案結構

```
pages/
  differential-pair.html     ← 主頁面（Wizard 版面）
js/
  diff-pair-math.js          ← MOSFET/BJT 純函式數學計算
  diff-pair-circuit.js       ← D3/SVG 電路圖繪製元件
  diff-pair-charts.js        ← D3 電流分配圖、轉換曲線圖
  diff-pair-main.js          ← Wizard 控制器、步驟切換、事件串接
```

index.html 需新增差動對的入口卡片。

---

## 4. 版面架構

```
┌─ Navbar ──────────────────────────────────────────┐
│  ⚡ 電子學補充教材  >  差動對                      │
├───────────────────────────────────────────────────┤
│  [MOSFET ◉] [BJT ○]              ← 右上角切換器   │
├─ 左側導覽（固定 220px）┬─ 右側內容區（彈性寬）───┤
│  ✓ 1. 偏壓操作點       │                           │
│  ● 2. 差動輸入特性     │    (目前步驟內容)          │
│  ○ 3. 小訊號增益       │                           │
│  ○ 4. MOS vs BJT 比較  │                           │
│                         │  [上一步] [下一步]        │
└─────────────────────────┴───────────────────────────┘
```

左側導覽在行動裝置上折疊為頂端水平進度條。

---

## 5. 步驟內容規格

### 步驟 1：偏壓操作點

**目標：** 讓學生觀察 Vid = 0 時差動對的對稱偏壓行為。

**版面（右側）：**
- 左欄：SVG 電路圖，標示 VDD、RD×2、M1/M2（或 Q1/Q2）、IBIAS，圖上即時顯示 ID1、ID2、Vout1、Vout2 數值標籤
- 右欄：D3 長條圖，ID1（紅）與 ID2（藍）高度相等，下方顯示 IBIAS

**控制項：**
- IBIAS 滑桿：0.1 mA ～ 2.0 mA，預設 1.0 mA
- RD（或 RC）滑桿：0.5 kΩ ～ 5.0 kΩ，預設 2.0 kΩ
- VDD 固定顯示 3.3 V（不可調，避免初學者混淆）

**學習提示（頁面底部）：** 「Vid = 0 時，差動對完全對稱，每支電晶體各流過 IBIAS/2 的電流。」

---

### 步驟 2：差動輸入特性

**目標：** 讓學生觀察 Vid 改變時 ID1、ID2 的重新分配，以及差動輸出電壓的 S 形轉換曲線。

**版面（右側）：**
- 左欄：SVG 電路圖（同步驟 1），加上 Vid 雙向箭頭標示，顯示目前 ID1、ID2 即時值
- 右欄：D3 折線圖，X 軸為 Vid（±範圍），Y 軸三條線：
  - ID1（紅）、ID2（藍）
  - Vout1 − Vout2（金色），對應右側第二 Y 軸

**控制項：**
- Vid 滑桿：MOSFET ±300 mV，BJT ±150 mV，預設 0 mV
- IBIAS、RD 沿用步驟 1 的值（顯示但不可於此處調整）
- 游標（紅色垂直線）跟隨 Vid 滑桿在圖上移動

**學習提示：** MOSFET 為拋物線飽和型；BJT 為精確 tanh 形，線性範圍更窄（約 ±4VT ≈ ±100 mV）。

---

### 步驟 3：小訊號增益

**目標：** 讓學生理解 gm 的計算方式及其與 Av 的關係。

**版面（右側）：**
- 上方：KaTeX 公式卡片區
  - MOSFET：`gm = 2·ID / Vov`，`Av = −gm·RD`，`Vov = VGS − Vth`
  - BJT：`gm = IC / VT`，`Av = −gm·RC`，`VT ≈ 26 mV`
- 下方：即時計算面板，根據 IBIAS / RD 數值顯示：
  - 計算出的 gm（mA/V）
  - 計算出的 |Av|（V/V，無因次）
  - 小訊號等效電路簡圖（SVG，靜態）：`vid → gm·vid（電流源）→ RD → vout`

**說明：** gm 與 IBIAS 連動，IBIAS 越大 → gm 越大 → |Av| 越大；但同時 Vout 的直流偏壓點也會下降（需保持飽和區）。

---

### 步驟 4：MOSFET vs BJT 比較（靜態）

**目標：** 總結兩種電晶體差動對的關鍵差異。

**版面（右側）：**
- 上方：兩個 SVG 電路圖並排（MOSFET 左、BJT 右），靜態，標示主要參數名稱
- 下方：比較表（HTML `<table>`）

| 項目 | MOSFET | BJT |
|------|--------|-----|
| 輸入阻抗 | 極高（GΩ 級） | 中等（β/gm） |
| gm 公式 | `√(2·kn·ID)` | `IC/VT` |
| 線性 Vid 範圍 | ±Vov（典型 ±200 mV） | ±4VT（≈ ±100 mV） |
| 輸入偏壓電流 | 幾乎為零 | IB = IC/β |
| 典型應用 | CMOS 運算放大器 | 高速/高精度模擬電路 |

- 底部：兩張概念卡片（現有 `.concept-card` 樣式）：「何時選 MOSFET」、「何時選 BJT」

---

## 6. 數學模型（`diff-pair-math.js`）

所有計算以純函式實作，不依賴全域狀態。

### MOSFET

```
參數預設：kn = 1 mA/V²（kn·W/L）、Vth = 0.5 V、VDD = 3.3 V

單管：ID = (1/2)·kn·(VGS − Vth)²   （飽和區）
偏壓：VGS0 由 IBIAS/2 反推
  VGS0 = Vth + √(IBIAS / kn)

差動轉換曲線（解析公式，|Vid| ≤ 2·Vov）：
  x = Vid / Vov
  ID1 = (IBIAS/2)·(1 + x·√(1 − x²/4))   當 |x| ≤ 2
  ID2 = IBIAS − ID1
  當 |x| > 2：一側完全關閉，另一側承接全部 IBIAS

小訊號：
  gm = 2·(IBIAS/2) / Vov  其中 Vov = VGS0 − Vth
  Av = −gm · RD
```

### BJT

```
參數預設：IS = 1×10⁻¹⁵ A、β = 100、VT = 26 mV（300K）

差動轉換曲線（精確解析解）：
  ID1 = IBIAS / (1 + exp(−Vid / VT))
  ID2 = IBIAS − ID1

小訊號：
  IC0 = IBIAS / 2
  gm = IC0 / VT
  Av = −gm · RC
```

### 輸出電壓

```
Vout1 = VDD − ID1 · RD
Vout2 = VDD − ID2 · RD
Vdiff = Vout1 − Vout2 = (ID2 − ID1) · RD
```

---

## 7. 元件介面

### `diff-pair-math.js` 匯出

```js
calcBias(ibias, rd, type)
  → { id1, id2, vout1, vout2, vgs0, vov, gm, av }

calcTransferCurve(ibias, rd, type, vidRange, steps)
  → [{ vid, id1, id2, vdiff }]  // steps 個點的陣列

calcSmallSignal(ibias, rd, type)
  → { gm, av, vov }
```

### `diff-pair-circuit.js` 匯出

```js
drawCircuit(svgEl, { type, id1, id2, vout1, vout2, vgs, ibias })
  // 根據 type='mos'|'bjt' 繪製對應電路圖，更新即時標籤
```

### `diff-pair-charts.js` 匯出

```js
createBarChart(containerEl)
  → { update({ id1, id2, ibias }) }

createTransferChart(containerEl)
  → { update(curveData, currentVid) }
```

---

## 8. 與首頁整合

在 `index.html` 的單元卡片 grid 中新增：

```html
<a href="pages/differential-pair.html" ...>
  <div class="panel" ...>
    <div>⚡</div>
    <h3>差動對</h3>
    <p>偏壓操作點、差動輸入特性曲線、小訊號增益，MOSFET 與 BJT 互動比較</p>
  </div>
</a>
```

---

## 9. 範疇外（本次不實作）

- 共模增益（CMRR）分析
- 負載為電流鏡的差動對
- 頻率響應（頻域分析）
- 行動版響應式完整優化（基本可用即可）
