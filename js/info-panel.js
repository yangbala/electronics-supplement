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
