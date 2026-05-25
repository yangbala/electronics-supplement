// Depends on global window.d3 (loaded via <script src="../lib/d3.v7.min.js">)

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

  // Half-plane backgrounds
  g.append('rect')
    .attr('x', xScale(-5)).attr('y', 0)
    .attr('width', xScale(0) - xScale(-5)).attr('height', innerH)
    .attr('fill', '#4a9eff').attr('opacity', 0.04).attr('pointer-events', 'none');
  g.append('rect')
    .attr('x', xScale(0)).attr('y', 0)
    .attr('width', xScale(5) - xScale(0)).attr('height', innerH)
    .attr('fill', '#ff6b6b').attr('opacity', 0.04).attr('pointer-events', 'none');

  // Labels
  g.append('text').attr('x', xScale(-4.5)).attr('y', 16).attr('fill', '#4a9eff')
    .attr('opacity', 0.5).attr('font-size', 11).attr('pointer-events', 'none').text('LHP');
  g.append('text').attr('x', xScale(1)).attr('y', 16).attr('fill', '#ff6b6b')
    .attr('opacity', 0.5).attr('font-size', 11).attr('pointer-events', 'none').text('RHP');
  g.append('text').attr('x', xScale(0) + 3).attr('y', 12).attr('fill', '#8b949e')
    .attr('font-size', 10).attr('pointer-events', 'none').text('jω');
  g.append('text').attr('x', xScale(4.8)).attr('y', yScale(0) - 6).attr('fill', '#8b949e')
    .attr('font-size', 10).attr('pointer-events', 'none').text('σ');

  // Grid lines
  const xAxisG = g.append('g').attr('transform', `translate(0,${yScale(0)})`);
  const yAxisG = g.append('g');
  xAxisG.call(d3.axisBottom(xScale).ticks(10).tickSize(-innerH).tickFormat(d3.format('d')));
  yAxisG.call(d3.axisLeft(yScale).ticks(12).tickSize(-innerW).tickFormat(d3.format('d')));
  [xAxisG, yAxisG].forEach((ax) => {
    ax.select('.domain').remove();
    ax.selectAll('line').attr('stroke', '#1e2430');
    ax.selectAll('text').attr('fill', '#555').attr('font-size', 9);
  });

  // Main axes
  g.append('line').attr('x1', 0).attr('x2', innerW)
    .attr('y1', yScale(0)).attr('y2', yScale(0)).attr('stroke', '#444').attr('stroke-width', 1.5)
    .attr('pointer-events', 'none');
  g.append('line').attr('x1', xScale(0)).attr('x2', xScale(0))
    .attr('y1', 0).attr('y2', innerH).attr('stroke', '#444').attr('stroke-width', 1.5)
    .attr('pointer-events', 'none');

  // Click-capture layer (transparent rect)
  const clickRect = g.append('rect')
    .attr('x', 0).attr('y', 0)
    .attr('width', innerW).attr('height', innerH)
    .attr('fill', 'none').attr('pointer-events', 'all');

  // Drawing layers
  const glowLayer = g.append('g');
  const pzLayer   = g.append('g');

  // State
  let poles = [], zeros = [], K = 1;
  let addMode = 'pole';
  let conjugateLocked = true;

  // Click empty area to add
  clickRect.on('click', function (event) {
    if (addMode === 'delete') return;
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

    // RHP pole glow animation
    poles.filter((p) => p.re > 1e-6).forEach((p) => {
      glowLayer.append('circle')
        .attr('class', 'rhp-glow')
        .attr('cx', xScale(p.re))
        .attr('cy', yScale(p.im))
        .attr('r', 12);  // base radius for transform: scale() to work
    });

    // Poles
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
            if (addMode === 'delete') return;
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
        .on('click', function (event) {
          if (addMode !== 'delete') return;
          event.stopPropagation();
          poles.splice(i, 1);
          render();
          onChange?.({ poles, zeros, K });
        })
        .on('contextmenu', function (event) {
          event.preventDefault();
          poles.splice(i, 1);
          render();
          onChange?.({ poles, zeros, K });
        });
    });

    // Zeros
    zeros.forEach((z, i) => {
      pzLayer.append('circle')
        .attr('class', `zero-circle ${z.re > 1e-6 ? 'zero-rhp' : 'zero-lhp'}`)
        .attr('cx', xScale(z.re))
        .attr('cy', yScale(z.im))
        .attr('r', 8)
        .call(
          d3.drag().on('drag', function (event) {
            if (addMode === 'delete') return;
            zeros[i] = { re: xScale.invert(event.x), im: yScale.invert(event.y) };
            render();
            onChange?.({ poles, zeros, K });
          })
        )
        .on('click', function (event) {
          if (addMode !== 'delete') return;
          event.stopPropagation();
          zeros.splice(i, 1);
          render();
          onChange?.({ poles, zeros, K });
        })
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
    setAddMode(mode) {
      addMode = mode;
      svg.classed('delete-mode', mode === 'delete');
    },
    setConjugateLocked(locked) { conjugateLocked = locked; },
  };
}
