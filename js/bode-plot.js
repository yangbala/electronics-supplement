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

  // x axis (only at bottom of phase chart)
  const xAxisPhase = gPhase.append('g').attr('transform', `translate(0,${halfH})`).call(xAxis);
  // Gain y axis
  const yGainAxis = gGain.append('g');
  // Phase y axis
  gPhase.append('g').call(
    d3.axisLeft(phaseScale).tickValues([-180, -90, 0, 90, 180]).tickFormat((d) => `${d}°`)
  );

  // Axis labels
  gGain.append('text').attr('transform', 'rotate(-90)').attr('x', -halfH / 2).attr('y', -38)
    .attr('fill', '#8b949e').attr('font-size', 9).attr('text-anchor', 'middle').text('增益 (dB)');
  gPhase.append('text').attr('transform', 'rotate(-90)').attr('x', -halfH / 2).attr('y', -40)
    .attr('fill', '#8b949e').attr('font-size', 9).attr('text-anchor', 'middle').text('相位 (°)');
  gPhase.append('text').attr('x', innerW / 2).attr('y', halfH + 22)
    .attr('fill', '#8b949e').attr('font-size', 9).attr('text-anchor', 'middle').text('ω (rad/s)');

  // 0 dB / 0° reference lines
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

    // Pole frequency vertical dashed lines
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
