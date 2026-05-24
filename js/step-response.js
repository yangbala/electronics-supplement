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
