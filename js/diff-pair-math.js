// js/diff-pair-math.js
const KN  = 1e-3;   // kn·(W/L) = 1 mA/V²
const VTH = 0.5;    // MOSFET 臨界電壓 0.5 V
const VT  = 0.026;  // 近似值；精確值 kT/q = 0.02585 V (300 K)
const VDD = 3.3;    // 電源電壓（固定）

/**
 * 計算 Vid=0 時的偏壓操作點。
 * @param {number} ibias - 尾電流 (A)
 * @param {number} rd    - 負載電阻 (Ω)
 * @param {'mos'|'bjt'} type
 * @returns {{ id1, id2, vout1, vout2, vgs0, vov, gm, av }}
 */
export function calcBias(ibias, rd, type) {
  if (ibias <= 0 || rd < 0) throw new RangeError(`calcBias: ibias must be > 0, rd >= 0`);
  if (type !== 'mos' && type !== 'bjt') throw new TypeError(`calcBias: unknown type "${type}"`);
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
  if (type !== 'mos' && type !== 'bjt') throw new TypeError(`_splitCurrents: unknown type "${type}"`);
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
