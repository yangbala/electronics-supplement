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
const btnPole   = document.getElementById('btn-add-pole');
const btnZero   = document.getElementById('btn-add-zero');
const btnDelete = document.getElementById('btn-delete');
const btnConj   = document.getElementById('btn-conjugate');
const gainInput = document.getElementById('gain-input');

btnPole.addEventListener('click', () => {
  sPlane.setAddMode('pole');
  btnPole.classList.add('active');
  btnZero.classList.remove('active');
  btnDelete.classList.remove('active');
});

btnZero.addEventListener('click', () => {
  sPlane.setAddMode('zero');
  btnZero.classList.add('active');
  btnPole.classList.remove('active');
  btnDelete.classList.remove('active');
});

btnDelete.addEventListener('click', () => {
  sPlane.setAddMode('delete');
  btnDelete.classList.add('active');
  btnPole.classList.remove('active');
  btnZero.classList.remove('active');
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
  { label: '一階穩定',   poles: [{ re: -2, im: 0 }],                          zeros: [],                 K: 1  },
  { label: '二階欠阻尼', poles: [{ re: -1, im: 3 }, { re: -1, im: -3 }],       zeros: [],                 K: 10 },
  { label: '臨界穩定',   poles: [{ re: 0,  im: 3 }, { re: 0,  im: -3 }],       zeros: [],                 K: 9  },
  { label: '一階不穩定', poles: [{ re: 1,  im: 0 }],                           zeros: [],                 K: 1  },
  { label: 'RHP 零點',   poles: [{ re: -2, im: 0 }],                           zeros: [{ re: 1, im: 0 }], K: 2  },
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
    title: '左半平面極點（LHP，$\\sigma &lt; 0$）',
    html: `<p>實部為負（$\\sigma < 0$）的極點在時域產生<strong>衰減包絡</strong> $e^{\\sigma t}$，響應最終收斂，系統 <strong>BIBO 穩定</strong>。$|\\sigma|$ 越大，時間常數 $\\tau = 1/|\\sigma|$ 越小，衰減越快，頻寬越寬。</p>
           <p class="formula-caption">▸ 一階系統：實數極點 $s = -a$，$a > 0$</p>
           <div class="formula">$$H(s) = \\dfrac{a}{s + a},\\quad \\tau = \\dfrac{1}{a}$$
$$h(t) = a\\,e^{-at}\\,u(t)\\quad\\text{（脈衝響應）}$$
$$y(t) = \\bigl(1 - e^{-t/\\tau}\\bigr)\\,u(t)\\quad\\text{（步階響應）}$$</div>
           <p class="formula-caption">▸ 二階欠阻尼：共軛極點 $s = -\\sigma \\pm j\\omega_d$，$0 < \\zeta < 1$</p>
           <div class="formula">$$\\omega_n = \\sqrt{\\sigma^2+\\omega_d^2},\\quad \\zeta = \\dfrac{\\sigma}{\\omega_n},\\quad \\omega_d = \\omega_n\\sqrt{1-\\zeta^2}$$
$$H(s) = \\dfrac{\\omega_n^2}{s^2 + 2\\zeta\\omega_n s + \\omega_n^2}$$
$$y(t) = 1 - \\dfrac{e^{-\\zeta\\omega_n t}}{\\sqrt{1-\\zeta^2}}\\,\\sin\\!\\left(\\omega_d t + \\arccos\\zeta\\right)u(t)$$</div>`,
    presetIdx: 0,
  },
  {
    cls: 'rhp-card',
    title: '右半平面極點（RHP，$\\sigma &gt; 0$）',
    html: `<p>實部為正（$\\sigma > 0$）的極點產生<strong>增長指數</strong> $e^{\\sigma t}$，響應隨時間無限增大，系統<strong>不穩定</strong>。</p>
           <p><em>任何一個</em> RHP 極點都足以使系統不穩定，不論其餘極點位置。</p>
           <div class="formula">$$H(s) = \\dfrac{a}{s-a},\\; a>0 \\quad\\Longrightarrow\\quad y(t) \\propto e^{+at}\\;\\text{（發散）}$$</div>`,
    presetIdx: 3,
  },
  {
    cls: 'jw-card',
    title: '虛軸極點（$\\sigma = 0$，臨界穩定）',
    html: `<p>實部恰好為零的極點產生<strong>等幅正弦振盪</strong>，振盪頻率為極點虛部 $\\omega_0$ rad/s，既不衰減也不增大。</p>
           <p>工程實務中通常不可接受，因為任何微小擾動都可能使實際系統發散。</p>
           <div class="formula">$$H(s) = \\dfrac{\\omega_0^2}{s^2+\\omega_0^2}\\quad\\Longrightarrow\\quad y(t) \\propto \\sin(\\omega_0 t)$$</div>`,
    presetIdx: 2,
  },
  {
    cls: 'rhpz-card',
    title: '右半平面零點（Non-minimum Phase）',
    html: `<p>RHP 零點不影響系統穩定性（穩定性由極點決定），但會造成<strong>非最小相位</strong>行為。</p>
           <p>步階響應初始方向與終值<em>相反</em>（先往反方向再回頭），波德圖相位滯後超出增益衰減的預期，這是控制系統設計的重要限制。</p>
           <div class="formula">$$H(s) = \\dfrac{1-s}{1+s}\\quad\\Longrightarrow\\quad\\text{初始步階響應反向後收斂}$$</div>`,
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
  <p>拉普拉斯轉換 $\\mathcal{L}\\{f(t)\\} = F(s)$ 將時域訊號映射到複數頻率域，其中 $s = \\sigma + j\\omega$。
     $\\sigma$（實部）控制指數包絡的增減速率，$\\omega$（虛部）控制振盪頻率。
     系統傳遞函數 $H(s)$ 在 s 平面上的極點決定了系統的自然響應模式，零點則決定各模式的激發程度。</p>

  <h3>2. 特徵方程式根與穩定性（Routh-Hurwitz 判準）</h3>
  <p>線性非時變（LTI）系統穩定的充要條件：傳遞函數分母多項式（特徵方程式）的所有根皆位於左半平面（$\\sigma < 0$）。</p>
  <div class="formula">$$D(s) = s^n + a_{n-1}s^{n-1} + \\cdots + a_1 s + a_0 = 0 \\implies \\operatorname{Re}(s_k) < 0 \\;\\forall\\, k$$</div>
  <p>Routh-Hurwitz 判準提供了一種無需直接求根就能判斷穩定性的代數方法：構造 Routh 陣列，若第一列元素全為正，則系統穩定。</p>

  <h3>3. 電路範例：RC 低通濾波器的極點</h3>
  <p>RC 低通濾波器的傳遞函數：</p>
  <div class="formula">$$H(s) = \\dfrac{1}{RCs + 1} = \\dfrac{1/RC}{s + 1/RC},\\quad \\omega_c = \\dfrac{1}{RC}\\text{ rad/s}$$</div>
  <p>極點位於 $s = -1/RC$（左半平面），時間常數 $\\tau = RC$ 決定衰減速率，截止頻率 $\\omega_c = 1/RC$ rad/s。
     增大 $R$ 或 $C$ 使極點更靠近虛軸，對應更慢的響應（更窄的通帶）。這是「極點位置直接對應物理性質」的最直觀範例。</p>`;

// ── 初始載入：二階欠阻尼 ────────────────────────────────
const init = PRESETS[1];
sPlane.setState(init.poles, init.zeros, init.K);
gainInput.value = init.K;
handleChange({ poles: init.poles, zeros: init.zeros, K: init.K });

// ── KaTeX 渲染（所有動態注入的內容已就緒後執行）────────
renderMathInElement(document.body, {
  delimiters: [
    { left: '$$', right: '$$', display: true  },
    { left: '$',  right: '$',  display: false },
  ],
  throwOnError: false,
});
