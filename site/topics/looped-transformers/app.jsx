/* global React */
const { useState, useEffect, useRef } = React;
const { Fig1_LoopVsFF, Fig2_FixedPoints, Fig3_ArchZoo, Fig4_DepthBudget, Fig5_Stages, Fig6_CoTvsLoop, G, Eq, Cite, PaperCard, PAPERS } = window;

/* ============================================================
   Section descriptors — used both for content + figure pinning
   ============================================================ */
const SECTIONS = [
  { id: "what",      num: "01", title: "What is a looped transformer?",                  fig: 1 },
  { id: "why",       num: "02", title: "Why loop?",                                      fig: 4 },
  { id: "zoo",       num: "03", title: "The architecture zoo",                           fig: 3, isNew: true },
  { id: "mech",      num: "04", title: "Mechanism: fixed points & cyclic trajectories",  fig: 2, isNew: true },
  { id: "stages",    num: "05", title: "Stages of inference, repeated",                  fig: 5 },
  { id: "stability", num: "06", title: "Training stability & scaling laws",              fig: 4, isNew: true },
  { id: "ttc",       num: "07", title: "Test-time compute scaling",                      fig: 2 },
  { id: "vs-cot",    num: "08", title: "Latent reasoning vs chain-of-thought",           fig: 6, isNew: true },
  { id: "open",      num: "09", title: "Open questions",                                 fig: null },
  { id: "implications", num: "10", title: "Implications",                                fig: null },
  { id: "glossary",  num: "11", title: "Glossary",                                       fig: null },
  { id: "papers",    num: "12", title: "Papers cited",                                   fig: null },
  { id: "changelog", num: "13", title: "Changelog",                                      fig: null },
];

const FIGS = {
  1: { num: "Fig 1", title: "Computation graph: feedforward vs looped", Comp: Fig1_LoopVsFF },
  2: { num: "Fig 2", title: "Recurrence dynamics: fixed points & TTC", Comp: Fig2_FixedPoints },
  3: { num: "Fig 3", title: "Architecture zoo", Comp: Fig3_ArchZoo },
  4: { num: "Fig 4", title: "Depth-budget allocator", Comp: Fig4_DepthBudget },
  5: { num: "Fig 5", title: "Stages of inference", Comp: Fig5_Stages },
  6: { num: "Fig 6", title: "What happens to the token? · CoT vs Looped", Comp: Fig6_CoTvsLoop },
};

/* ============================================================
   Layout
   ============================================================ */
function App() {
  const [activeSec, setActiveSec] = useState("what");
  const [activeFig, setActiveFig] = useState(1);
  const sectionRefs = useRef({});

  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      // Find the entry closest to top that's visible
      const visible = entries.filter(e => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) {
        const id = visible[0].target.id;
        setActiveSec(id);
        const sec = SECTIONS.find(s => s.id === id);
        if (sec && sec.fig) setActiveFig(sec.fig);
      }
    }, { rootMargin: "-30% 0px -55% 0px", threshold: 0 });

    SECTIONS.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) { sectionRefs.current[s.id] = el; obs.observe(el); }
    });
    return () => obs.disconnect();
  }, []);

  const goto = (id) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 70, behavior: "smooth" });
  };

  return (
    <>
      <div className="topbar">
        <div className="brand">
          <span className="brand-mark"></span>
          <span className="brand-title">Looped Transformers</span>
          <span style={{ color: "var(--ink-faint)", marginLeft: 6 }}>· a live doc</span>
        </div>
        <div className="meta">
          <span><span className="dot"></span>live · updated 24 Apr 2026</span>
          <span className="pill">5 papers · 13 sections</span>
          <span className="pill ver">v 0.4</span>
        </div>
      </div>

      <div className="shell">
        <aside className="rail">
          <div className="rail-section">
            <h4>Contents</h4>
            <ul className="rail-toc">
              {SECTIONS.map(s => (
                <li key={s.id}
                    className={activeSec === s.id ? "active" : ""}
                    onClick={() => goto(s.id)}>
                  <span className="num">{s.num}</span>
                  <span style={{ flex: 1 }}>{s.title}</span>
                  {s.isNew && <span className="new">new</span>}
                </li>
              ))}
            </ul>
          </div>

          <div className="rail-section">
            <h4>Research feed</h4>
            <a className="rail-feed-item" href="#paper-hyperloop">
              <div className="feed-meta"><span>2026 · MIT</span><span style={{ color: "var(--accent)" }}>NEW</span></div>
              <div className="feed-title">Hyperloop Transformers — matrix residuals + looping</div>
            </a>
            <a className="rail-feed-item" href="#paper-parcae">
              <div className="feed-meta"><span>2026 · UCSD</span><span style={{ color: "var(--accent)" }}>NEW</span></div>
              <div className="feed-title">Parcae — stable looping & scaling laws</div>
            </a>
            <a className="rail-feed-item" href="#paper-mech">
              <div className="feed-meta"><span>2025 · Oxford</span></div>
              <div className="feed-title">Mechanistic analysis of looped reasoning</div>
            </a>
            <a className="rail-feed-item" href="#paper-ouro">
              <div className="feed-meta"><span>2025 · ByteDance</span></div>
              <div className="feed-title">Ouro — Looped LMs, learned exits, 7.7T tokens</div>
            </a>
            <a className="rail-feed-item" href="#paper-huginn">
              <div className="feed-meta"><span>2025 · UMD</span></div>
              <div className="feed-title">Huginn — recurrent depth, latent reasoning</div>
            </a>
          </div>

          <div className="rail-section" style={{ fontSize: 11.5, color: "var(--ink-faint)", lineHeight: 1.5 }}>
            <h4>About this doc</h4>
            <p style={{ fontSize: 12, color: "var(--ink-muted)", margin: 0, lineHeight: 1.5 }}>
              A living explainer on looped transformers, written progressively. <i>Spine</i> = intuition. Click any <span style={{ fontFamily: "var(--mono)", color: "var(--accent)" }}>+</span> panel to go deeper.
            </p>
          </div>
        </aside>

        <main className="narrative">
          <Hero goto={goto} />
          <Sections />
        </main>

        <FigurePane activeFig={activeFig} />
      </div>
    </>
  );
}

function Hero({ goto }) {
  return (
    <div className="hero">
      <div className="eyebrow">
        <span>Living explainer</span><span className="sep" />
        <span>v 0.4 · 2026-04-24</span><span className="sep" />
        <span style={{ color: "var(--accent)" }}>5 source papers</span>
      </div>
      <h1 className="title">
        What if a transformer&nbsp;<em>kept thinking</em><br/>
        before it spoke?
      </h1>
      <p className="hero-deck">
        Looped transformers re-apply the same block of layers many times before producing a token.
        It's a way to spend more <em>compute</em> without spending more <em>parameters</em> — and a way
        to reason in latent space rather than out loud. This document tracks the field as it forms.
      </p>

      <div className="hero-meta">
        <div><b>Reading time</b>~22 min · spine only</div>
        <div><b>Audience</b>knows transformers · curious-to-expert</div>
        <div><b>Updates</b>every new paper, dated below</div>
        <div><b>Format</b>two-pane · click <code>+</code> panels for depth</div>
      </div>

      <div className="concept-map">
        <h5><span>The spine</span><span>13 sections</span></h5>
        <div className="concept-spine">
          {[
            { n: "01", l: "What" },
            { n: "02", l: "Why" },
            { n: "03", l: "Zoo" },
            { n: "04", l: "Mechanism" },
            { n: "05", l: "Stages" },
            { n: "06", l: "Stability" },
            { n: "07", l: "TTC" },
            { n: "08", l: "vs CoT" },
            { n: "09", l: "Open" },
            { n: "10", l: "Implications" },
          ].map(c => (
            <div key={c.n} className="concept-node" onClick={() => goto(SECTIONS.find(s => s.num === c.n)?.id)}>
              <span className="num">{c.n}</span>
              <span className="lbl">{c.l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FigurePane({ activeFig }) {
  return (
    <aside className="figure-pane">
      <div className="figure-progress">
        <span style={{ width: `${(activeFig / 6) * 100}%` }} />
      </div>
      <div className="figure-frame">
        {Object.entries(FIGS).map(([k, f]) => {
          const Comp = f.Comp;
          const active = +k === activeFig;
          return (
            <div key={k} className={"figure-slot" + (active ? " active" : "")}>
              <div className="figure-head">
                <span className="figure-num">{f.num}</span>
                <span className="figure-title">{f.title}</span>
                <span className="figure-spacer" />
                <span className="figure-controls">
                  <span style={{ color: "var(--ink-faint)" }}>pinned · scroll-driven</span>
                </span>
              </div>
              <div className="figure-body">
                {active && <Comp />}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

window.App = App;
