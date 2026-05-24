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
