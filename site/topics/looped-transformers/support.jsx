/* global React */
const { useState, useEffect, useRef } = React;

/* ============================================================
   Glossary tooltip wrapper
   ============================================================ */
const GLOSSARY = {
  "looped transformer": { term: "Looped Transformer", def: "A transformer that re-applies the same block of layers multiple times. Same parameters, more compute." },
  "residual stream": { term: "Residual stream", def: "The running vector that each transformer block reads from and writes to. The 'state' that flows through the network." },
  "fixed point": { term: "Fixed point", def: "A state x* where applying a function f leaves it unchanged: f(x*) = x*. In looped models, layers can converge to one." },
  "recurrence": { term: "Recurrence (R)", def: "Number of times the shared block is applied. R=1 is feedforward; large R is more compute." },
  "input injection": { term: "Input injection", def: "Adding the original embedding back at every recurrence so the model never 'forgets' the prompt." },
  "stages of inference": { term: "Stages of inference", def: "Lad et al.'s four-phase view of what transformer layers do: detokenize → build features → reason → predict." },
  "test-time compute": { term: "Test-time compute (TTC)", def: "Compute spent at inference, not training. Loops are a way to spend it without verbalizing tokens." },
  "chain-of-thought": { term: "Chain of thought", def: "Reasoning by emitting intermediate tokens. The opposite of latent reasoning." },
  "latent reasoning": { term: "Latent reasoning", def: "Reasoning by iterating internal vectors instead of producing intermediate text." },
  "spectral norm": { term: "Spectral norm", def: "The largest singular value of a matrix. If >1 in a recurrent map, repeated application can explode the residual." },
  "hyper-connection": { term: "Hyper-connection", def: "A matrix-valued residual that lets multiple parallel residual streams mix between blocks." },
  "act": { term: "ACT", def: "Adaptive Computation Time. Graves '16 mechanism for learning a per-token halt signal." },
  "ponder gate": { term: "Ponder gate", def: "Ouro's learned exit head. Outputs a probability of stopping at each loop, trained against task-loss improvement." },
  "early exit": { term: "Early exit", def: "Stopping computation when a confidence proxy says 'good enough' — a way to spend less compute on easy tokens." },
  "logit lens": { term: "Logit lens", def: "Project intermediate residuals through the unembed to read the model's 'best guess so far'." },
};

function G({ k, children }) {
  const g = GLOSSARY[k];
  if (!g) return children;
  return (
    <span className="gloss" tabIndex={0}>
      {children}
      <span className="gloss-pop">
        <b>{g.term}</b>
        {g.def}
      </span>
    </span>
  );
}

/* ============================================================
   Annotated equation — click to expand annotations
   ============================================================ */
function Eq({ label, expr, anno, defaultOpen }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className={"eq" + (open ? " open" : "")} onClick={() => setOpen(o => !o)}>
      <div className="eq-toggle">{open ? "click to collapse" : "click to annotate"}</div>
      {label && <div className="eq-label">{label}</div>}
      <div className="eq-line" dangerouslySetInnerHTML={{ __html: expr }} />
      <div className="eq-anno">
        {anno.map(([k, v], i) => (
          <div key={i}><dt>{k}</dt><dd>{v}</dd></div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   Citation chip — hover to expand into a paper card
   ============================================================ */
const PAPERS = {
  huginn: {
    short: "Geiping ’25",
    title: "Scaling up Test-Time Compute with Latent Reasoning: A Recurrent Depth Approach",
    authors: "Geiping, McLeish, Jain, Kirchenbauer, Singh, Bartoldson, Kailkhura, Bhatele, Goldstein",
    venue: "arXiv 2502 · ELLIS / UMD / LLNL",
    one: "3.5B-parameter recurrent-depth model trained on 800B tokens. At test time, iterate the recurrent block up to 64× to match a 50B-parameter model on reasoning. No CoT data needed.",
    nums: { params: "3.5 B", tokens: "800 B", "max R train": "32", "max R test": "∞ (works to 64+)", "GSM8K @r=32": "+24 vs r=1" },
  },
  ouro: {
    short: "Zhu ’25",
    title: "Scaling Latent Reasoning via Looped Language Models",
    authors: "Zhu, Wang, Hua, Zhang, Li, Que, Wei, Wen, Yin, … Bengio, Eshraghian",
    venue: "arXiv 2510 · ByteDance Seed",
    one: "Ouro family (1.4B / 2.6B), 7.7T tokens. Entropy-regularized objective + Ponder gate learns when to exit. Matches 12B baselines via better knowledge manipulation, not more knowledge.",
    nums: { params: "1.4 B / 2.6 B", tokens: "7.7 T", "loop count": "1..4 (learned)", "vs Qwen3-4B": "comparable @ 1.4B" },
  },
  parcae: {
    short: "Prairie ’26",
    title: "Parcae: Scaling Laws For Stable Looped Language Models",
    authors: "Prairie, Novack, Berg-Kirkpatrick, Fu",
    venue: "arXiv 2026 · UCSD · Together AI",
    one: "Recasts looping as a non-linear time-variant dynamical system. Constrains injection spectral norm via discretized negative diagonals. Predictable power-law scaling for FLOPs↔loops.",
    nums: { params: "1.3 B", "vs FF baseline": "+2.99 CORE", "FF size match": "≤2× larger FF", "training stability": "no spikes", "law": "FLOPs–loops power" },
  },
  hyperloop: {
    short: "Zeitoun ’26",
    title: "Hyperloop Transformers",
    authors: "Zeitoun, Torroba-Hennigen, Kim",
    venue: "arXiv 2026 · MIT",
    one: "Inserts hyper-connections (matrix-valued residual streams) only between loop iterations. ~50% fewer parameters than depth-matched FF; survives INT4 quantization.",
    nums: { params: "≤1 B", "vs FF": "−50% params, equal quality", "quant": "INT4 robust", "structure": "[B → M ×R → E]" },
  },
  mech: {
    short: "Blayney ’25",
    title: "A Mechanistic Analysis of Looped Reasoning Language Models",
    authors: "Blayney, Arroyo, Obando-Ceron, Castro, Courville, Bronstein, Dong",
    venue: "arXiv 2025 · Oxford · Mila",
    one: "Each layer in a recurrent block converges to a distinct fixed point — the block traces a stable cycle in latent space. Stage-of-inference structure emerges and repeats per recurrence.",
    nums: { models: "Huginn, Ouro, Llama-retro", "key finding": "cyclic fixed points", "behavior taxonomy": "fixed / orbit / slider / unknown", "implication": "stable models extrapolate" },
  },
};

function Cite({ p }) {
  const paper = PAPERS[p];
  if (!paper) return <span className="cite">[?]</span>;
  return (
    <a className="cite" href={`#paper-${p}`} title={paper.title}>{paper.short}</a>
  );
}

/* ============================================================
   Paper card (used on the citation page at bottom)
   ============================================================ */
function PaperCard({ id }) {
  const p = PAPERS[id];
  return (
    <div id={`paper-${id}`} style={{
      border: "1px solid var(--rule)", borderRadius: 8, padding: "16px 18px",
      background: "var(--paper)", marginBottom: 14, scrollMarginTop: 80,
    }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <span style={{
          fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.04em",
          padding: "2px 6px", border: "1px solid var(--accent-line)",
          background: "var(--accent-soft)", color: "var(--accent)", borderRadius: 3,
        }}>{p.short}</span>
        <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--ink-faint)", letterSpacing: "0.04em" }}>
          {p.venue}
        </span>
      </div>
      <h4 style={{ margin: "8px 0 4px", fontSize: 15.5, fontWeight: 500, letterSpacing: "-0.01em" }}>{p.title}</h4>
      <div style={{ fontSize: 12, color: "var(--ink-muted)", marginBottom: 8 }}>{p.authors}</div>
      <p style={{ fontSize: 14, color: "var(--ink-soft)", margin: "8px 0", lineHeight: 1.5 }}>{p.one}</p>
      <div className="kv-grid" style={{ marginTop: 8 }}>
        {Object.entries(p.nums).map(([k, v]) => (
          <React.Fragment key={k}>
            <b>{k}</b>
            <span style={{ color: "var(--ink)" }}>{v}</span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

window.G = G;
window.Eq = Eq;
window.Cite = Cite;
window.PaperCard = PaperCard;
window.PAPERS = PAPERS;
