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
const btnMos    = document.getElementById('btn-mos');
const btnBjt    = document.getElementById('btn-bjt');
const btnPrev   = document.getElementById('btn-prev');
const btnNext   = document.getElementById('btn-next');
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

// ── 私有輔助：計算指定 Vid 時的即時電流與輸出電壓 ────────────────────────────
function _calcAtVid(ibias, rd, type, vid) {
  const pts = calcTransferCurve(ibias, rd, type, Math.max(Math.abs(vid) + 0.001, 0.01), 2);
  const pt  = pts.reduce((best, p) =>
    Math.abs(p.vid - vid) < Math.abs(best.vid - vid) ? p : best, pts[0]);
  return {
    id1:   pt.id1,
    id2:   pt.id2,
    vout1: 3.3 - pt.id1 * rd,
    vout2: 3.3 - pt.id2 * rd,
  };
}

// ── 渲染函式 ──────────────────────────────────────────────────────────────────

function renderAll() {
  const { ibias, rd, type, vid } = state;
  const bias    = calcBias(ibias, rd, type);
  const curve   = calcTransferCurve(ibias, rd, type, null, 200);
  const current = _calcAtVid(ibias, rd, type, vid);

  // 步驟 0：偏壓操作點
  updateCircuit(svg0, { ...bias, ibias });
  barChart.update({ id1: bias.id1, id2: bias.id2, ibias });

  // 步驟 1：差動輸入特性
  updateCircuit(svg1, { ...current, ibias });
  transferChart.update(curve, vid);

  // 步驟 2：小訊號增益（若已渲染則更新）
  if (document.getElementById('formula-gm')) renderSmallSignal();
}

function renderSmallSignal() {
  const { ibias, rd, type } = state;
  const { gm, av, vov } = calcSmallSignal(ibias, rd, type);
  const isMos = type === 'mos';

  const gmStr  = (gm * 1000).toFixed(2);
  const avStr  = Math.abs(av).toFixed(1);
  const vovStr = (vov * 1000).toFixed(1);

  const el = document.getElementById('small-signal-content');
  if (!el) return;

  el.innerHTML = `
    <div class="formula-cards">
      <div class="formula-card">
        <h4>${isMos ? 'MOSFET' : 'BJT'} gm 公式</h4>
        <div id="formula-gm"></div>
        <div style="margin-top:8px;font-size:0.8rem;color:var(--text-muted);">
          ${isMos
            ? `V<sub>ov</sub> = V<sub>GS</sub> − V<sub>th</sub> = ${vovStr} mV`
            : `V<sub>T</sub> = 26 mV（室溫）`}
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
        <div class="val-num">${(ibias * 1000).toFixed(1)}</div>
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

  const gmTex = isMos
    ? `g_m = \\dfrac{2 I_D}{V_{ov}} = \\sqrt{2 k_n I_D}`
    : `g_m = \\dfrac{I_C}{V_T}`;
  const avTex = isMos ? `A_v = -g_m R_D` : `A_v = -g_m R_C`;

  katex.render(gmTex, document.getElementById('formula-gm'), { throwOnError: false, displayMode: true });
  katex.render(avTex, document.getElementById('formula-av'), { throwOnError: false, displayMode: true });

  _drawSmallSignalCircuit(document.getElementById('ss-circuit'), isMos ? 'R_D' : 'R_C');
}

function _drawSmallSignalCircuit(svgEl, rdLabel) {
  svgEl.innerHTML = '';
  const NS = 'http://www.w3.org/2000/svg';
  const mk = (tag, attrs, txt) => {
    const e = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
    if (txt !== undefined) e.textContent = txt;
    svgEl.appendChild(e);
    return e;
  };
  mk('text',   { x: 8,   y: 28, fill: '#ff6b6b', 'font-size': 10, 'font-family': 'monospace' }, 'vid');
  mk('line',   { x1: 30, y1: 24, x2: 75, y2: 24, stroke: '#e6edf3', 'stroke-width': 1.5 });
  mk('circle', { cx: 90, cy: 50, r: 18, fill: '#0d1117', stroke: '#3fb950', 'stroke-width': 1.5 });
  mk('text',   { x: 90, y: 54, fill: '#3fb950', 'font-size': 8, 'font-family': 'monospace', 'text-anchor': 'middle' }, 'gm·vid');
  mk('line',   { x1: 90, y1: 68, x2: 90,  y2: 76, stroke: '#e6edf3', 'stroke-width': 1.5 });
  mk('line',   { x1: 80, y1: 76, x2: 100, y2: 76, stroke: '#a0aab6', 'stroke-width': 2 });
  mk('line',   { x1: 90, y1: 32, x2: 90,  y2: 20, stroke: '#e6edf3', 'stroke-width': 1.5 });
  mk('line',   { x1: 90, y1: 20, x2: 220, y2: 20, stroke: '#e6edf3', 'stroke-width': 1.5 });
  mk('rect',   { x: 208, y: 10, width: 14, height: 36, fill: 'none', stroke: '#ffd700', 'stroke-width': 1.5, rx: 2 });
  mk('text',   { x: 225, y: 30, fill: '#ffd700', 'font-size': 8, 'font-family': 'monospace' }, rdLabel);
  mk('line',   { x1: 215, y1: 46, x2: 215, y2: 76, stroke: '#e6edf3', 'stroke-width': 1.5 });
  mk('line',   { x1: 80,  y1: 76, x2: 240, y2: 76, stroke: '#e6edf3', 'stroke-width': 1.5 });
  mk('line',   { x1: 215, y1: 20, x2: 270, y2: 20, stroke: '#e6edf3', 'stroke-width': 1.5 });
  mk('text',   { x: 272, y: 24, fill: '#ffd700', 'font-size': 10, 'font-family': 'monospace' }, 'vout');
}

function renderComparison() {
  const el = document.getElementById('comparison-content');
  if (!el || el.dataset.rendered) return;
  el.dataset.rendered = 'true';

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
    delimiters: [{ left: '\\(', right: '\\)', display: false }],
    throwOnError: false,
  });
}

// ── 步驟切換 ──────────────────────────────────────────────────────────────────

function goToStep(n) {
  state.step = Math.max(0, Math.min(3, n));

  panels.forEach(p => p.classList.remove('active'));
  stepItems.forEach(it => {
    const i = parseInt(it.dataset.step, 10);
    it.classList.toggle('active', i === state.step);
    it.classList.toggle('done',   i < state.step);
  });
  document.getElementById(`panel-${state.step}`).classList.add('active');

  btnPrev.disabled = state.step === 0;
  btnNext.textContent = state.step === 3 ? '完成 ✓' : '下一步 →';
  btnNext.disabled = false;

  if (state.step === 2) renderSmallSignal();
  if (state.step === 3) renderComparison();
}

// ── 事件監聽 ──────────────────────────────────────────────────────────────────

btnMos.addEventListener('click', () => {
  state.type = 'mos';
  btnMos.classList.add('active');
  btnBjt.classList.remove('active');
  sliderVid.min = -300; sliderVid.max = 300;
  createCircuit(svg0, 'mos');
  createCircuit(svg1, 'mos');
  renderAll();
});

btnBjt.addEventListener('click', () => {
  state.type = 'bjt';
  btnBjt.classList.add('active');
  btnMos.classList.remove('active');
  sliderVid.min = -150; sliderVid.max = 150;
  if (Math.abs(state.vid) > 0.15) {
    state.vid = 0;
    sliderVid.value = 0;
    vidVal.textContent = '0';
  }
  createCircuit(svg0, 'bjt');
  createCircuit(svg1, 'bjt');
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
  state.vid = parseInt(sliderVid.value, 10) * 1e-3;
  vidVal.textContent = sliderVid.value;
  renderAll();
});

btnPrev.addEventListener('click', () => goToStep(state.step - 1));
btnNext.addEventListener('click', () => {
  if (state.step < 3) goToStep(state.step + 1);
});

stepItems.forEach(it => {
  it.addEventListener('click', () => goToStep(parseInt(it.dataset.step, 10)));
});

// ── 初始渲染 ──────────────────────────────────────────────────────────────────
renderAll();
