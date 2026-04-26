document.addEventListener('DOMContentLoaded', () => {

  // ── TOC active-section tracking ──
  const sections = document.querySelectorAll('section.sec');
  const tocLinks = document.querySelectorAll('.rail-toc li');
  const figSlots = document.querySelectorAll('.figure-slot');
  const figProgress = document.querySelector('.figure-progress > span');

  const FIGS = { 'what': 1, 'why': 4, 'zoo': 3, 'mech': 2, 'stages': 5,
                 'stability': 4, 'ttc': 2, 'vs-cot': 6 };

  const io = new IntersectionObserver(entries => {
    const vis = entries.filter(e => e.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
    if (!vis[0]) return;
    const id = vis[0].target.id;
    tocLinks.forEach(li => li.classList.toggle('active', li.dataset.sec === id));
    const fig = FIGS[id];
    if (fig) {
      figSlots.forEach(s => s.classList.toggle('active', +s.dataset.fig === fig));
      if (figProgress) figProgress.style.width = (fig / 6 * 100) + '%';
    }
  }, { rootMargin: '-30% 0px -55% 0px', threshold: 0 });

  sections.forEach(s => io.observe(s));

  // TOC click
  tocLinks.forEach(li => {
    li.addEventListener('click', () => {
      const el = document.getElementById(li.dataset.sec);
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 70, behavior: 'smooth' });
    });
  });

  // ── Walkthrough (Fig 6: CoT vs Loop) ──
  const QUESTION = 'Alice has 3 boxes. Each box has 4 red marbles and 2 blue. How many marbles total?';
  const PROMPT = ['Alice','has','3','boxes','.','Each','has','4','red',',','2','blue','.'];
  const COT_REASON = ['Each','box','has','4','+','2','=','6','.','3','×','6','=','18','.'];
  const ANSWER = '18';

  const STEPS = [
    { k:'prompt', title:'Step 1 · The prompt arrives',
      cap:'Both models see the same question. Tokens enter through the embedding layer and become vectors in a residual stream.' },
    { k:'embed', title:'Step 2 · Prelude',
      cap:'Both run through an initial stack of transformer layers. The residual stream now holds a rich "understanding" vector per token. Here, they\'re identical.' },
    { k:'diverge', title:'Step 3 · The fork',
      cap:'CoT must now produce a token. Its only way to "think more" is to emit a reasoning word and feed it back in. The looped model does NOT emit anything — it re-enters the same block.' },
    { k:'cot-think', title:'Step 4 · CoT: reasoning out loud',
      cap:'CoT generates one reasoning token at a time. Each compresses 4096d → ~16 bits (vocabulary bottleneck) → re-embed. Any thought not expressible as a word is lost.' },
    { k:'loop-think', title:'Step 4 · Looped: reasoning in latent space',
      cap:'The looped model re-applies the same block to its residual stream. Each loop is a full attention + MLP pass over 4096 continuous dimensions. No tokens produced. No vocabulary bottleneck.' },
    { k:'settle', title:'Step 5 · Settling on the answer',
      cap:'CoT eventually writes "3 × (4+2) = 3 × 6 = 18". The looped model\'s residual stream converges to a fixed point — its layers stop moving because the computation is "done".' },
    { k:'emit', title:'Step 6 · Both emit ONE token',
      cap:'"Yes, one token post latent space" — but the state feeding the unembed carries vastly more information in the loop case.' },
    { k:'ledger', title:'Step 7 · The ledger',
      cap:'Tally what each model spent: compute, bandwidth, and what a probe could read.' },
  ];

  const cotPane = document.getElementById('fig6-cot');
  if (!cotPane) return;  // walkthrough elements not present

  let curStep = 0;
  const stepBtns = document.querySelectorAll('#fig6-steps .step-btn');
  const caption = document.getElementById('fig6-caption');
  const loopPane = document.getElementById('fig6-loop');
  let loopAnim = null, loopIdx = 0;

  function makeTok(t, kind) {
    const s = document.createElement('span');
    s.className = 'tok ' + kind;
    s.textContent = t;
    return s;
  }

  function makeResidBar(container, seed, active) {
    container.innerHTML = '';
    const bar = document.createElement('div');
    bar.className = 'resid-bar';
    for (let i = 0; i < 32; i++) {
      const d = document.createElement('div');
      d.className = 'dim';
      const v = Math.sin(i * 0.7 + seed * 0.5) * 0.5 + Math.cos(i * 1.3 + seed * 0.3) * 0.4;
      const m = Math.abs(v);
      d.style.background = v >= 0 ? 'var(--accent)' : 'var(--teal)';
      d.style.opacity = active ? (0.25 + m * 0.75) : 0.08;
      d.style.height = active ? (30 + m * 70) + '%' : '15%';
      container.appendChild(bar);
      bar.appendChild(d);
    }
  }

  function renderCoT(step) {
    cotPane.innerHTML = '';
    if (step.k === 'ledger') {
      cotPane.innerHTML = `<div class="ledger">
        <div class="ledger-row"><div><div class="k">reasoning tokens</div><div class="note">verbalized steps</div></div><div class="v">15</div></div>
        <div class="ledger-row"><div><div class="k">bandwidth / step</div><div class="note">vocab bottleneck</div></div><div class="v">~16 bits</div></div>
        <div class="ledger-row"><div><div class="k">FLOPs / step</div><div class="note">entire net per token</div></div><div class="v">1× full forward</div></div>
        <div class="ledger-row"><div><div class="k">total cost</div><div class="note">one per reasoning token</div></div><div class="v">15× forward</div></div>
        <div class="ledger-row"><div><div class="k">trace visible</div><div class="note">but can be post-hoc</div></div><div class="v">yes — readable</div></div>
        <div class="ledger-row"><div><div class="k">faithfulness</div><div class="note">justifies, doesn't reason</div></div><div class="v warn">often unfaithful</div></div>
      </div>`;
      return;
    }
    // Tokens
    const tokWrap = document.createElement('div');
    tokWrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;padding:4px;max-height:80px;overflow:hidden;';
    PROMPT.forEach(t => tokWrap.appendChild(makeTok(t, 'prompt')));

    if (['cot-think','loop-think','settle'].includes(step.k)) {
      COT_REASON.forEach(t => tokWrap.appendChild(makeTok(t, 'gen')));
    }
    if (step.k === 'emit') {
      COT_REASON.forEach(t => tokWrap.appendChild(makeTok(t, 'gen')));
      tokWrap.appendChild(makeTok(ANSWER, 'ans'));
    }
    cotPane.appendChild(tokWrap);

    // Bottleneck
    const bw = document.createElement('div');
    bw.className = 'bw-chip';
    bw.innerHTML = `<div>per-step data flow:</div>
      <div class="flow">
        <span class="pill">residual ~4096d</span><span class="arrow">→</span>
        <span class="pill accent">vocab · 50k</span><span class="arrow">→</span>
        <span class="pill">1 token (~16 bits)</span><span class="arrow">→</span>
        <span style="font-size:9px;color:var(--ink-soft)">re-embed</span>
      </div>
      <div class="highlight">bottleneck: ~4096d → 16 bits → ~4096d every step</div>`;
    cotPane.appendChild(bw);
  }

  function renderLoop(step) {
    loopPane.innerHTML = '';
    if (loopAnim) { cancelAnimationFrame(loopAnim); loopAnim = null; }

    if (step.k === 'ledger') {
      loopPane.innerHTML = `<div class="ledger">
        <div class="ledger-row"><div><div class="k">loops</div><div class="note">shared block reapplied</div></div><div class="v">8</div></div>
        <div class="ledger-row"><div><div class="k">bandwidth / loop</div><div class="note">full residual carried</div></div><div class="v">~65,000 bits</div></div>
        <div class="ledger-row"><div><div class="k">FLOPs / loop</div><div class="note">smaller than full net</div></div><div class="v">1× block</div></div>
        <div class="ledger-row"><div><div class="k">total cost</div><div class="note">fewer FLOPs, more thought</div></div><div class="v">8× block ≈ 2× fwd</div></div>
        <div class="ledger-row"><div><div class="k">trace visible</div><div class="note">readable IF you probe</div></div><div class="v">via logit lens</div></div>
        <div class="ledger-row"><div><div class="k">faithfulness</div><div class="note">the trace IS the reason</div></div><div class="v warn">structural</div></div>
      </div>`;
      return;
    }

    // Prompt tokens (always shown)
    const tokWrap = document.createElement('div');
    tokWrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;padding:4px;max-height:60px;overflow:hidden;';
    PROMPT.forEach(t => tokWrap.appendChild(makeTok(t, 'prompt')));
    if (step.k === 'emit') tokWrap.appendChild(makeTok(ANSWER, 'ans'));
    loopPane.appendChild(tokWrap);

    // Residual stream box
    const loopActive = ['loop-think','settle'].includes(step.k);
    const box = document.createElement('div');
    box.style.cssText = `flex:1;min-height:0;border:1px dashed var(--rule-strong);border-radius:4px;padding:8px;position:relative;${loopActive ? 'background:var(--accent-soft);' : ''}transition:background .3s;margin-top:6px;`;

    const meta = document.createElement('div');
    meta.style.cssText = 'font-family:var(--mono);font-size:9.5px;color:var(--ink-muted);letter-spacing:.04em;margin-bottom:6px;';
    meta.id = 'loop-meta';
    meta.textContent = 'residual stream · 4096d (showing 32) · loop pass –/8';
    box.appendChild(meta);

    const barContainer = document.createElement('div');
    barContainer.id = 'loop-resid';
    box.appendChild(barContainer);
    makeResidBar(barContainer, 0, ['embed','diverge','cot-think','loop-think','settle','emit'].includes(step.k));

    if (loopActive) {
      const dots = document.createElement('div');
      dots.className = 'loop-dots';
      const lbl = document.createElement('span');
      lbl.style.cssText = 'font-family:var(--mono);font-size:9px;color:var(--accent);letter-spacing:.04em;';
      lbl.textContent = 'loops:';
      dots.appendChild(lbl);
      for (let i = 0; i < 8; i++) {
        const d = document.createElement('span');
        d.className = 'ld';
        d.id = 'ld-' + i;
        dots.appendChild(d);
      }
      box.appendChild(dots);

      // Animate loops
      loopIdx = 0;
      let lastTime = 0;
      const animate = (t) => {
        if (t - lastTime > 400) {
          lastTime = t;
          loopIdx = (loopIdx + 1) % 9;
          for (let i = 0; i < 8; i++) {
            const el = document.getElementById('ld-' + i);
            if (el) el.classList.toggle('on', i < loopIdx);
          }
          makeResidBar(barContainer, loopIdx, true);
          const m = document.getElementById('loop-meta');
          if (m) m.textContent = `residual stream · 4096d (showing 32) · loop pass ${Math.min(loopIdx, 8)}/8`;
        }
        loopAnim = requestAnimationFrame(animate);
      };
      loopAnim = requestAnimationFrame(animate);
    }

    if (step.k === 'emit') {
      const emit = document.createElement('div');
      emit.style.cssText = 'margin-top:10px;padding:6px 8px;background:var(--paper);border:1px solid var(--accent-line);border-radius:4px;font-size:11px;';
      emit.innerHTML = `<span style="color:var(--ink-muted)">final unembed → </span><span style="font-family:var(--mono);font-weight:500;color:var(--accent)">"${ANSWER}"</span><span style="color:var(--ink-faint);font-size:10px;margin-left:6px">one token, 8× compute behind it</span>`;
      box.appendChild(emit);
    }
    loopPane.appendChild(box);

    // Bandwidth chip
    const bw = document.createElement('div');
    bw.className = 'bw-chip';
    bw.style.marginTop = '6px';
    bw.innerHTML = `<div>per-loop data flow:</div>
      <div class="flow">
        <span class="pill">residual ~4096d</span><span class="arrow">→</span>
        <span class="pill accent">SAME block</span><span class="arrow">→</span>
        <span class="pill">residual ~4096d</span>
      </div>
      <div class="highlight">no bottleneck: ~65,000 bits carried forward each loop</div>`;
    loopPane.appendChild(bw);
  }

  function showStep(n) {
    curStep = n;
    const step = STEPS[n];
    stepBtns.forEach((b, i) => {
      b.classList.toggle('active', i === n);
      b.classList.toggle('done', i < n);
    });
    caption.innerHTML = `<b>What's happening:</b> ${step.cap}`;
    document.getElementById('fig6-step-title').textContent = step.title;
    renderCoT(step);
    renderLoop(step);
  }

  stepBtns.forEach((b, i) => b.addEventListener('click', () => showStep(i)));

  // Keyboard nav for walkthrough
  document.addEventListener('keydown', e => {
    const fig6 = document.querySelector('.figure-slot[data-fig="6"]');
    if (!fig6 || !fig6.classList.contains('active')) return;
    if (e.key === 'ArrowRight' && curStep < STEPS.length - 1) { showStep(curStep + 1); e.preventDefault(); }
    if (e.key === 'ArrowLeft' && curStep > 0) { showStep(curStep - 1); e.preventDefault(); }
  });

  showStep(0);
});
