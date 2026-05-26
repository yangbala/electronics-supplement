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

  g.append('rect').attr('width', iW).attr('height', iH)
    .attr('fill', '#0d1117').attr('rx', 3);

  const xScale = d3.scaleBand()
    .domain(['ID1', 'ID2'])
    .range([0, iW])
    .padding(0.35);

  const yScale = d3.scaleLinear().range([iH, 0]);

  const xAxis = g.append('g').attr('transform', `translate(0,${iH})`)
    .call(d3.axisBottom(xScale).tickSize(0))
    .call(ax => ax.select('.domain').attr('stroke', COLORS.axis))
    .call(ax => ax.selectAll('text').attr('fill', COLORS.axis).attr('font-size', 10));

  const yAxisG = g.append('g');
  const gridG  = g.append('g').attr('class', 'grid');

  const bars = g.selectAll('.bar')
    .data(['ID1', 'ID2'])
    .join('rect')
    .attr('class', 'bar')
    .attr('x', d => xScale(d))
    .attr('width', xScale.bandwidth())
    .attr('fill', d => d === 'ID1' ? COLORS.id1 : COLORS.id2)
    .attr('rx', 2);

  const labels = g.selectAll('.bar-label')
    .data(['ID1', 'ID2'])
    .join('text')
    .attr('class', 'bar-label')
    .attr('x', d => xScale(d) + xScale.bandwidth() / 2)
    .attr('text-anchor', 'middle')
    .attr('font-size', 9)
    .attr('font-family', 'monospace');

  const ibiasLine = g.append('line')
    .attr('stroke', '#58a6ff')
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', '4,3');

  const ibiasLabel = g.append('text')
    .attr('fill', '#58a6ff')
    .attr('font-size', 8)
    .attr('font-family', 'monospace');

  svg.append('text')
    .attr('transform', `translate(10,${M.top + iH / 2}) rotate(-90)`)
    .attr('text-anchor', 'middle')
    .attr('fill', COLORS.axis)
    .attr('font-size', 9)
    .text('電流 (mA)');

  function update({ id1, id2, ibias }) {
    const maxY = ibias * 1.15;
    yScale.domain([0, maxY]);

    yAxisG.call(
      d3.axisLeft(yScale)
        .ticks(4)
        .tickFormat(d => `${(d * 1000).toFixed(1)}`)
    ).call(ax => ax.select('.domain').attr('stroke', COLORS.axis))
     .call(ax => ax.selectAll('text').attr('fill', COLORS.axis).attr('font-size', 9))
     .call(ax => ax.selectAll('line').attr('stroke', COLORS.axis));

    gridG.selectAll('line').remove();
    yScale.ticks(4).forEach(v => {
      gridG.append('line')
        .attr('x1', 0).attr('x2', iW)
        .attr('y1', yScale(v)).attr('y2', yScale(v))
        .attr('stroke', COLORS.grid).attr('stroke-width', 0.5);
    });

    const vals = { ID1: id1, ID2: id2 };
    bars
      .attr('y',      d => yScale(vals[d]))
      .attr('height', d => iH - yScale(vals[d]));

    labels
      .attr('y', d => yScale(vals[d]) - 3)
      .attr('fill', d => d === 'ID1' ? COLORS.id1 : COLORS.id2)
      .text(d => `${(vals[d] * 1e3).toFixed(2)}`);

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
  const yL     = d3.scaleLinear().range([iH, 0]);
  const yR     = d3.scaleLinear().range([iH, 0]);

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

  const cursor = g.append('line')
    .attr('stroke', '#ffffff').attr('stroke-width', 1)
    .attr('stroke-dasharray', '3,3')
    .attr('y1', 0).attr('y2', iH);

  const legend = [
    { color: COLORS.id1,   label: 'ID1',   dash: '' },
    { color: COLORS.id2,   label: 'ID2',   dash: '' },
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

    const vids  = curveData.map(d => d.vid * 1000);
    const maxI  = d3.max(curveData, d => Math.max(d.id1, d.id2));
    const maxVd = d3.max(curveData, d => Math.abs(d.vdiff));

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
