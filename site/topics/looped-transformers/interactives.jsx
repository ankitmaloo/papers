/* global React */
const { useState, useEffect, useRef, useMemo } = React;

/* ============================================================
   FIGURE 1 — Computation graph: feedforward vs looped
   With a token traveling through and a residual stream evolving
   ============================================================ */
function Fig1_LoopVsFF() {
  const [mode, setMode] = useState("loop"); // "ff" | "loop"
  const [t, setT] = useState(0); // 0..1
  const [playing, setPlaying] = useState(true);
  const rafRef = useRef();

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const tick = (now) => {
      const dt = (now - last) / 1000; last = now;
      setT(prev => (prev + dt * 0.18) % 1);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing]);

  // 12 layers either way. FF = 12 distinct. Loop = 2 prelude + 4 recurrent x 2 + 2 coda.
  const W = 560, H = 320;
  const layerCount = 12;
  const layerY = (i) => 30 + (260 / (layerCount - 1)) * i;

  // residual stream: sample 24 dims, evolve smoothly per layer
  const residualBars = useMemo(() => {
    const dims = 24;
    const seed = (i, l) => Math.sin(i * 1.7 + l * 0.6) * 0.5 + Math.sin(i * 0.5 + l * 1.3) * 0.4;
    return (l) => Array.from({ length: dims }, (_, i) => seed(i, l));
  }, []);

  // current "depth" position of token
  const depth = t * (layerCount - 1);
  const li = Math.floor(depth);
  const lf = depth - li;
  const tokenY = layerY(li) + (layerY(li + 1) - layerY(li)) * lf;

  // For loop mode: layers 2-5 are the recurrent block, repeated. Visual cycle.
  const loopBlock = { start: 2, end: 5 }; // inclusive, 4 layers
  const loopIter = mode === "loop" ? Math.floor(t * 3) % 3 : 0; // 3 passes shown

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
        <div className="seg">
          <button className={mode === "ff" ? "on" : ""} onClick={() => setMode("ff")}>Feedforward</button>
          <button className={mode === "loop" ? "on" : ""} onClick={() => setMode("loop")}>Looped</button>
        </div>
        <button className="btn" onClick={() => setPlaying(p => !p)}>{playing ? "Pause" : "Play"}</button>
        <input className="range" type="range" min="0" max="1000" value={t * 1000}
          onChange={e => { setPlaying(false); setT(+e.target.value / 1000); }}
          style={{ flex: 1 }} />
        <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-muted)", minWidth: 60, textAlign: "right" }}>
          depth {depth.toFixed(1)}
        </div>
      </div>

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 200px", gap: 16, minHeight: 0 }}>
        {/* graph */}
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%" }}>
          <defs>
            <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" fill="var(--ink-faint)" />
            </marker>
          </defs>

          {/* embed + lm head labels */}
          <text x={W / 2} y={16} textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-faint)" letterSpacing="0.08em">EMBED</text>
          <text x={W / 2} y={H - 4} textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-faint)" letterSpacing="0.08em">UNEMBED → next-token</text>

          {/* layer rectangles */}
          {Array.from({ length: layerCount }, (_, i) => {
            const y = layerY(i);
            const inLoop = mode === "loop" && i >= loopBlock.start && i <= loopBlock.end;
            const isActive = mode === "loop"
              ? (inLoop ? (Math.floor(t * 12) % 4) === (i - loopBlock.start) : Math.abs(i - depth) < 0.6)
              : Math.abs(i - depth) < 0.6;
            return (
              <g key={i}>
                <rect
                  x={W / 2 - 80} y={y - 8} width={160} height={16}
                  rx={3}
                  fill={inLoop ? "var(--accent-soft)" : "var(--paper)"}
                  stroke={isActive ? "var(--accent)" : (inLoop ? "var(--accent-line)" : "var(--rule-strong)")}
                  strokeWidth={isActive ? 1.4 : 1}
                />
                <text x={W / 2 - 70} y={y + 3.5} fontFamily="var(--mono)" fontSize="10" fill="var(--ink-soft)">
                  {mode === "loop" && inLoop
                    ? `L${i} · loop block`
                    : `L${i}`}
                </text>
                <text x={W / 2 + 70} y={y + 3.5} textAnchor="end" fontFamily="var(--mono)" fontSize="9.5" fill="var(--ink-faint)">
                  {mode === "loop" ? (inLoop ? "shared" : "unique") : "unique"}
                </text>
              </g>
            );
          })}

          {/* connecting arrows */}
          {Array.from({ length: layerCount - 1 }, (_, i) => (
            <line key={i} x1={W / 2} y1={layerY(i) + 8} x2={W / 2} y2={layerY(i + 1) - 8}
              stroke="var(--rule-strong)" strokeWidth="1" markerEnd="url(#arr)" />
          ))}

          {/* loop arc — only in loop mode */}
          {mode === "loop" && (
            <>
              <path
                d={`M ${W / 2 + 80} ${layerY(loopBlock.end)} 
                    C ${W / 2 + 160} ${layerY(loopBlock.end)}, 
                      ${W / 2 + 160} ${layerY(loopBlock.start)}, 
                      ${W / 2 + 80} ${layerY(loopBlock.start)}`}
                fill="none" stroke="var(--accent)" strokeWidth="1.5"
                strokeDasharray={li >= loopBlock.start && li < loopBlock.end ? "0" : "3 3"}
                markerEnd="url(#arr)"
              />
              <text x={W / 2 + 168} y={(layerY(loopBlock.start) + layerY(loopBlock.end)) / 2 + 3}
                fontFamily="var(--mono)" fontSize="10" fill="var(--accent)" letterSpacing="0.04em">
                × R = {loopIter + 1}/3
              </text>
            </>
          )}

          {/* token marker */}
          <g transform={`translate(${W / 2 - 110}, ${tokenY})`}>
            <circle r="4" fill="var(--accent)" />
            <circle r="8" fill="none" stroke="var(--accent)" strokeOpacity="0.3" strokeWidth="1" />
            <text x="-12" y="3" textAnchor="end" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-soft)">x</text>
          </g>
        </svg>

        {/* residual stream bars */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 8, borderLeft: "1px solid var(--rule)" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-faint)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            residual stream · 24d
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 3, flex: 1 }}>
            {residualBars(depth).map((v, i) => {
              const m = Math.abs(v);
              const c = v >= 0 ? "var(--accent)" : "var(--teal)";
              return (
                <div key={i} style={{
                  background: c,
                  opacity: 0.18 + m * 0.7,
                  borderRadius: 2,
                  minHeight: 14,
                  height: `${20 + m * 60}%`,
                  alignSelf: "end",
                  transition: "height .12s, opacity .12s",
                }} />
              );
            })}
          </div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-faint)" }}>
            {mode === "loop"
              ? `pass ${loopIter + 1} · re-applied weights`
              : `unique block at L${li}`}
          </div>
        </div>
      </div>

      <div className="figure-caption">
        <b>Figure 1 · Computation graph</b>
        Feedforward applies <i>K</i> distinct blocks once. Looped applies a single shared block <i>R</i> times — same parameters, more compute, the residual stream re-enters the same weights. Watch the loop arc and the bar pattern: the same dimensions get re-stirred, not replaced.
      </div>
    </div>
  );
}

/* ============================================================
   FIGURE 2 — Recurrence scrubber: PCA fixed points + TTC curve
   ============================================================ */
function Fig2_FixedPoints() {
  const [r, setR] = useState(8);   // num recurrences 1..32
  const [show, setShow] = useState("pca"); // pca | ttc

  // synthesise PCA-style trajectories per layer (4 layers in cycle), drifting toward distinct fixed points
  const trajectories = useMemo(() => {
    const layers = 4;
    const target = [
      [-6, 4], [4, 5], [6, -4], [-4, -5]
    ];
    const arr = [];
    for (let l = 0; l < layers; l++) {
      const path = [];
      let p = [Math.cos(l * 1.7) * 9, Math.sin(l * 1.7) * 9];
      for (let i = 0; i < 32; i++) {
        const tgt = target[l];
        const k = 0.18 + l * 0.02;
        const noise = 0.6 * Math.exp(-i * 0.25);
        p = [
          p[0] + (tgt[0] - p[0]) * k + (Math.sin(i * (1.3 + l)) * noise),
          p[1] + (tgt[1] - p[1]) * k + (Math.cos(i * (1.7 + l * 0.5)) * noise)
        ];
        path.push([...p]);
      }
      arr.push({ path, target: target[l], color: ["var(--accent)", "var(--teal)", "var(--ink-soft)", "var(--ink-muted)"][l] });
    }
    return arr;
  }, []);

  // TTC accuracy curve — saturating exponential approach (Parcae / Huginn shape)
  const ttcPoints = useMemo(() => {
    const tasks = [
      { name: "GSM8K", asym: 51, k: 0.085, base: 8, color: "var(--accent)" },
      { name: "ARC-C", asym: 44, k: 0.18,  base: 22, color: "var(--teal)" },
      { name: "OBQA",  asym: 41, k: 0.32,  base: 28, color: "var(--ink-soft)" },
    ];
    return tasks.map(t => ({
      ...t,
      pts: Array.from({ length: 32 }, (_, i) => {
        const x = i + 1;
        const y = t.base + (t.asym - t.base) * (1 - Math.exp(-t.k * x));
        return [x, y];
      })
    }));
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
        <div className="seg">
          <button className={show === "pca" ? "on" : ""} onClick={() => setShow("pca")}>Latent PCA</button>
          <button className={show === "ttc" ? "on" : ""} onClick={() => setShow("ttc")}>Test-time compute</button>
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-muted)" }}>R = {r}</span>
      </div>

      <input className="range" type="range" min="1" max="32" value={r} onChange={e => setR(+e.target.value)} style={{ marginBottom: 14 }} />

      <div style={{ flex: 1, minHeight: 0 }}>
        {show === "pca"
          ? <PCAPlot trajectories={trajectories} r={r} />
          : <TTCPlot tasks={ttcPoints} r={r} />}
      </div>

      <div className="figure-caption">
        <b>Figure 2 · {show === "pca" ? "Cyclic fixed points" : "Test-time compute scaling"}</b>
        {show === "pca"
          ? <>Each line is one layer inside a 4-layer recurrent block. As recurrence grows, each layer drifts toward its <i>own</i> fixed point — the block traces a stable cycle. Models that reach this cycle extrapolate gracefully past their training depth.</>
          : <>Accuracy as a function of recurrence depth at test time. The curves saturate — each task has a "compute appetite". Reasoning-heavy tasks (GSM8K) keep climbing; memorization-heavy tasks (OBQA) plateau early.</>}
      </div>
    </div>
  );
}

function PCAPlot({ trajectories, r }) {
  const W = 540, H = 380;
  const cx = W / 2, cy = H / 2, scale = 16;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%" }}>
      {/* axes */}
      <line x1={20} y1={cy} x2={W - 20} y2={cy} stroke="var(--rule)" strokeDasharray="2 3" />
      <line x1={cx} y1={20} x2={cx} y2={H - 20} stroke="var(--rule)" strokeDasharray="2 3" />
      <text x={W - 22} y={cy - 6} textAnchor="end" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-faint)">PC 1</text>
      <text x={cx + 6} y={26} fontFamily="var(--mono)" fontSize="10" fill="var(--ink-faint)">PC 2</text>

      {trajectories.map((tr, li) => {
        const sliced = tr.path.slice(0, r);
        const d = sliced.map(([x, y], i) =>
          `${i === 0 ? "M" : "L"} ${cx + x * scale} ${cy - y * scale}`
        ).join(" ");
        return (
          <g key={li}>
            <path d={d} fill="none" stroke={tr.color} strokeWidth="1.2" opacity="0.85" />
            {sliced.map(([x, y], i) => (
              <circle key={i} cx={cx + x * scale} cy={cy - y * scale} r={i === sliced.length - 1 ? 3.4 : 1.3}
                fill={tr.color} opacity={0.3 + 0.7 * (i / Math.max(1, sliced.length - 1))} />
            ))}
            {/* fixed point target */}
            <circle cx={cx + tr.target[0] * scale} cy={cy - tr.target[1] * scale} r={6}
              fill="none" stroke={tr.color} strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
            <text x={cx + tr.target[0] * scale + 9} y={cy - tr.target[1] * scale + 3}
              fontFamily="var(--mono)" fontSize="10" fill={tr.color}>L{li + 1}</text>
          </g>
        );
      })}

      <text x={20} y={H - 10} fontFamily="var(--mono)" fontSize="10" fill="var(--ink-muted)">
        recurrences shown: 1..{r}
      </text>
    </svg>
  );
}

function TTCPlot({ tasks, r }) {
  const W = 540, H = 380, m = { l: 36, r: 14, t: 14, b: 32 };
  const xMax = 32, yMax = 60;
  const x = v => m.l + (v / xMax) * (W - m.l - m.r);
  const y = v => H - m.b - (v / yMax) * (H - m.t - m.b);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%" }}>
      {/* grid */}
      {[0, 15, 30, 45, 60].map(v => (
        <g key={v}>
          <line x1={m.l} y1={y(v)} x2={W - m.r} y2={y(v)} stroke="var(--rule)" />
          <text x={m.l - 6} y={y(v) + 3} textAnchor="end" fontFamily="var(--mono)" fontSize="9.5" fill="var(--ink-faint)">{v}</text>
        </g>
      ))}
      {[1, 4, 8, 16, 32].map(v => (
        <g key={v}>
          <line x1={x(v)} y1={H - m.b} x2={x(v)} y2={H - m.b + 4} stroke="var(--rule-strong)" />
          <text x={x(v)} y={H - m.b + 16} textAnchor="middle" fontFamily="var(--mono)" fontSize="9.5" fill="var(--ink-faint)">{v}</text>
        </g>
      ))}
      <text x={(W) / 2} y={H - 6} textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-muted)" letterSpacing="0.04em">
        recurrence R (test-time)
      </text>
      <text x={10} y={H / 2} fontFamily="var(--mono)" fontSize="10" fill="var(--ink-muted)" transform={`rotate(-90, 10, ${H / 2})`} letterSpacing="0.04em">accuracy %</text>

      {tasks.map((t, i) => {
        const d = t.pts.map(([xv, yv], j) => `${j === 0 ? "M" : "L"} ${x(xv)} ${y(yv)}`).join(" ");
        const cur = t.pts[r - 1];
        return (
          <g key={i}>
            <path d={d} fill="none" stroke={t.color} strokeWidth="1.6" opacity="0.4" />
            <path d={t.pts.slice(0, r).map(([xv, yv], j) => `${j === 0 ? "M" : "L"} ${x(xv)} ${y(yv)}`).join(" ")}
              fill="none" stroke={t.color} strokeWidth="2" />
            <circle cx={x(cur[0])} cy={y(cur[1])} r={4} fill={t.color} stroke="var(--paper)" strokeWidth="1.5" />
            <text x={x(cur[0]) + 8} y={y(cur[1]) - 6} fontFamily="var(--mono)" fontSize="10.5" fill={t.color}>
              {t.name} · {cur[1].toFixed(1)}%
            </text>
          </g>
        );
      })}

      {/* current R indicator */}
      <line x1={x(r)} y1={m.t} x2={x(r)} y2={H - m.b} stroke="var(--accent-line)" strokeDasharray="2 3" />
    </svg>
  );
}

/* ============================================================
   FIGURE 3 — Architecture zoo comparator
   ============================================================ */
const ARCHS = [
  {
    id: "universal", name: "Universal Transformer",
    year: "2018", who: "Dehghani et al.",
    short: "The seed idea: a single shared transformer block applied dynamically per token.",
    diagram: "loop-simple",
    blocks: { prelude: 0, loop: 1, coda: 0, R: "ACT" },
    traits: { "param share": "all", "depth": "adaptive", "stability": "low", "scale": "small" },
  },
  {
    id: "recursive", name: "Recursive / Recurrent-depth",
    year: "2024–25", who: "Bae · Geiping (Huginn)",
    short: "Modern recipe: prelude → recurrent block × R → coda. Stable, scaled to 3.5B+.",
    diagram: "prelude-loop-coda",
    blocks: { prelude: 2, loop: 4, coda: 2, R: "1..64" },
    traits: { "param share": "middle only", "depth": "test-time scalable", "stability": "med", "scale": "3.5B" },
    new: true,
  },
  {
    id: "huginn", name: "Huginn (recurrent depth)",
    year: "2025", who: "Geiping et al.",
    short: "Test-time compute lever: train with random R, scale at inference up to 50B-equivalent FLOPs.",
    diagram: "prelude-loop-coda",
    blocks: { prelude: 2, loop: 4, coda: 2, R: "stochastic 1..32" },
    traits: { "param share": "middle only", "depth": "scalable", "stability": "high", "scale": "3.5B / 800B tok" },
  },
  {
    id: "ouro", name: "Ouro (LoopLM)",
    year: "2025", who: "ByteDance Seed",
    short: "Reasoning baked into pretraining. Entropy-regularized exit gate decides depth per token.",
    diagram: "prelude-loop-coda-gate",
    blocks: { prelude: 1, loop: "N", coda: 1, R: "learned 1..4" },
    traits: { "param share": "full block", "depth": "learned exit", "stability": "med", "scale": "1.4B / 2.6B · 7.7T tok" },
    new: true,
  },
  {
    id: "parcae", name: "Parcae",
    year: "2026", who: "UCSD · Together",
    short: "Stable looping by constraining injection-spectral-norm via discretized negative diagonals.",
    diagram: "prelude-loop-coda-stable",
    blocks: { prelude: 2, loop: 4, coda: 2, R: "1..16" },
    traits: { "param share": "middle, stable", "depth": "predictable scaling", "stability": "high", "scale": "1.3B" },
    new: true,
  },
  {
    id: "hyperloop", name: "Hyperloop",
    year: "2026", who: "MIT (Zeitoun et al.)",
    short: "Looped + hyper-connections (matrix-valued residual). 50% fewer params, equal quality.",
    diagram: "prelude-loop-coda-hyper",
    blocks: { prelude: 4, loop: 10, coda: 4, R: "3" },
    traits: { "param share": "middle + hyper", "depth": "fixed R=3", "scale": "≤1B", "stability": "high" },
    new: true,
  },
];

function Fig3_ArchZoo() {
  const [sel, setSel] = useState("recursive");
  const a = ARCHS.find(x => x.id === sel);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 14 }}>
        {ARCHS.map(x => (
          <button key={x.id}
            onClick={() => setSel(x.id)}
            className={"btn" + (sel === x.id ? " on" : "")}
            style={{
              textAlign: "left",
              padding: "8px 10px",
              textTransform: "none",
              letterSpacing: 0,
              lineHeight: 1.3,
              fontSize: 11.5,
              position: "relative",
            }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 9.5, color: "var(--ink-faint)", letterSpacing: "0.04em" }}>{x.year}</span>
            <br />
            <span style={{ fontWeight: 500 }}>{x.name}</span>
            {x.new && <span style={{
              position: "absolute", top: 6, right: 6,
              fontFamily: "var(--mono)", fontSize: 8.5, color: "var(--accent)",
              border: "1px solid var(--accent-line)", background: "var(--accent-soft)",
              padding: "1px 4px", borderRadius: 3, letterSpacing: "0.06em"
            }}>NEW</span>}
          </button>
        ))}
      </div>

      <div style={{
        flex: 1, minHeight: 0,
        display: "grid", gridTemplateColumns: "200px 1fr", gap: 16,
        border: "1px solid var(--rule)", borderRadius: "var(--radius)",
        background: "var(--paper)", padding: 16
      }}>
        <ArchDiagram arch={a} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-faint)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            {a.year} · {a.who}
          </div>
          <h3 style={{ margin: "4px 0 8px", fontSize: 18 }}>{a.name}</h3>
          <p style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink-soft)", margin: 0 }}>{a.short}</p>

          <div className="kv-grid" style={{ marginTop: 14 }}>
            {Object.entries(a.traits).map(([k, v]) => (
              <React.Fragment key={k}>
                <b>{k}</b>
                <span style={{ color: "var(--ink)" }}>{v}</span>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className="figure-caption">
        <b>Figure 3 · Architecture zoo</b>
        Six looped designs, ordered roughly by year. They differ in <i>what</i> is shared (full block vs middle only), <i>how</i> R is chosen (fixed, learned, stochastic, ACT), and <i>how</i> stability is achieved (input injection, hyper-connections, spectral constraints).
      </div>
    </div>
  );
}

function ArchDiagram({ arch }) {
  // Very compact column-stack
  const W = 180, H = 320;
  const blocks = [];
  let y = 24;
  const add = (label, kind) => {
    blocks.push({ y, label, kind });
    y += kind === "loop" ? 54 : 22;
  };
  const p = typeof arch.blocks.prelude === "number" ? arch.blocks.prelude : 1;
  const c = typeof arch.blocks.coda === "number" ? arch.blocks.coda : 1;
  for (let i = 0; i < p; i++) add(`prelude L${i + 1}`, "pre");
  add(`recurrent block (×${arch.blocks.R})`, "loop");
  for (let i = 0; i < c; i++) add(`coda L${i + 1}`, "post");
  const total = y + 12;

  return (
    <svg viewBox={`0 0 ${W} ${total}`} preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%", maxHeight: 300 }}>
      <defs>
        <marker id="arr2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--ink-faint)" />
        </marker>
      </defs>
      <text x={W / 2} y={12} textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-faint)" letterSpacing="0.06em">EMBED</text>
      {blocks.map((b, i) => {
        const isLoop = b.kind === "loop";
        return (
          <g key={i}>
            <rect x={20} y={b.y} width={W - 40} height={isLoop ? 44 : 14} rx="3"
              fill={isLoop ? "var(--accent-soft)" : "var(--paper)"}
              stroke={isLoop ? "var(--accent-line)" : "var(--rule-strong)"} />
            <text x={W / 2} y={b.y + (isLoop ? 18 : 9.5)} textAnchor="middle" fontFamily="var(--mono)" fontSize="9.5"
              fill={isLoop ? "var(--accent)" : "var(--ink-soft)"}>{b.label}</text>
            {isLoop && (
              <>
                <text x={W / 2} y={b.y + 32} textAnchor="middle" fontFamily="var(--mono)" fontSize="8.5" fill="var(--ink-muted)">
                  shared params
                </text>
                <path d={`M ${W - 20} ${b.y + 8} q 18 12, 0 24 q -2 2, -2 4`} fill="none" stroke="var(--accent)" strokeDasharray="2 2" />
              </>
            )}
            {i < blocks.length - 1 && (
              <line x1={W / 2} y1={b.y + (isLoop ? 44 : 14)} x2={W / 2} y2={blocks[i + 1].y}
                stroke="var(--rule-strong)" markerEnd="url(#arr2)" />
            )}
          </g>
        );
      })}
      <text x={W / 2} y={total - 2} textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-faint)" letterSpacing="0.06em">UNEMBED</text>
    </svg>
  );
}

window.Fig1_LoopVsFF = Fig1_LoopVsFF;
window.Fig2_FixedPoints = Fig2_FixedPoints;
window.Fig3_ArchZoo = Fig3_ArchZoo;
