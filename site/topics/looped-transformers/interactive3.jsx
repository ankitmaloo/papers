/* global React */
const { useState, useEffect, useRef, useMemo } = React;

/* ============================================================
   FIGURE 6 — "What happens to the token?"
   A narrative step-scroller comparing CoT vs Looped for
   a single concrete question, in 8 steps.
   ============================================================ */

const QUESTION = "Alice has 3 boxes. Each box has 4 red marbles and 2 blue. How many marbles total?";
const ANSWER = "18";

// ---- Scene scripts -----------------------------------------------
// Each step has: title, caption, and a render function for each pane.
// The left pane is CoT, right pane is Looped. Both show the SAME prompt
// but diverge at step 2.

const STEPS = [
  {
    k: "prompt",
    title: "Step 1 · The prompt arrives",
    cap: "Both models see the same question. Tokens enter through the embedding layer and become vectors in a residual stream. Nothing has diverged yet.",
  },
  {
    k: "embed",
    title: "Step 2 · Prelude — turning words into a state",
    cap: "Both models run the prompt through an initial stack of transformer layers. The residual stream now holds a rich 'understanding' vector per token. Here, they're identical.",
  },
  {
    k: "diverge",
    title: "Step 3 · The fork in the road",
    cap: "CoT must now produce a token. Its only way to 'think more' is to emit a reasoning word and feed it back in. The looped model does NOT emit anything — it re-enters the same block with its current state.",
  },
  {
    k: "cot-think",
    title: "Step 4 · CoT reasons OUT LOUD",
    cap: "CoT generates one reasoning token at a time. Each token compresses everything it has figured out so far through the vocabulary bottleneck — a ~50k-way multiple-choice per step. Any thought not expressible as a word is lost.",
  },
  {
    k: "loop-think",
    title: "Step 4 · Looped reasons IN LATENT SPACE",
    cap: "The looped model re-applies the same block to its residual stream. Each loop is a full round of attention + MLP over 4096 continuous dimensions. No tokens produced. No vocabulary bottleneck.",
  },
  {
    k: "settle",
    title: "Step 5 · Settling on the answer",
    cap: "CoT eventually writes '3 × (4+2) = 3 × 6 = 18'. The looped model's residual stream converges to a fixed point — its layers stop moving because the computation is 'done'.",
  },
  {
    k: "emit",
    title: "Step 6 · Both emit ONE token",
    cap: "At the end, both models do the same thing: unembed their final residual stream into a distribution and pick a token. 'Yes, one token post latent space' — but the state feeding the unembed carries vastly more information in the loop case.",
  },
  {
    k: "ledger",
    title: "Step 7 · The ledger",
    cap: "Tally up what each model spent: compute, bandwidth of the reasoning trace, and what a probe could read. This is where loops pull ahead on reasoning-dense problems.",
  },
];

function Fig6_CoTvsLoop() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const rafRef = useRef();

  // autoplay advances through steps
  useEffect(() => {
    if (!playing) return;
    let acc = 0, last = performance.now();
    const tick = (now) => {
      acc += (now - last) / 1000; last = now;
      if (acc > 2.4) {
        acc = 0;
        setStep(s => (s + 1) % STEPS.length);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing]);

  // derived sub-tick for in-step animation
  const [subT, setSubT] = useState(0);
  useEffect(() => {
    setSubT(0);
    let r;
    let last = performance.now();
    const tick = (now) => {
      const dt = (now - last) / 1000; last = now;
      setSubT(t => Math.min(1, t + dt * 0.5));
      r = requestAnimationFrame(tick);
    };
    r = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(r);
  }, [step]);

  const s = STEPS[step];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* Step nav strip */}
      <div style={{
        display: "flex", gap: 4, alignItems: "center",
        padding: "2px 0 10px", borderBottom: "1px solid var(--rule)", marginBottom: 12,
        flexWrap: "wrap"
      }}>
        {STEPS.map((_, i) => (
          <button key={i} onClick={() => { setStep(i); setPlaying(false); }} style={{
            fontFamily: "var(--mono)", fontSize: 10, padding: "3px 7px",
            border: "1px solid " + (i === step ? "var(--accent)" : "var(--rule-strong)"),
            background: i === step ? "var(--accent-soft)" : "var(--paper)",
            color: i === step ? "var(--accent)" : (i < step ? "var(--ink-soft)" : "var(--ink-faint)"),
            borderRadius: 3, cursor: "pointer", letterSpacing: "0.04em",
          }}>
            {String(i + 1).padStart(2, "0")}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button className="btn" onClick={() => setPlaying(p => !p)} style={{ fontSize: 10 }}>
          {playing ? "Pause" : "Auto-play"}
        </button>
        <button className="btn" onClick={() => { setStep(s => Math.max(0, s - 1)); setPlaying(false); }} style={{ fontSize: 10 }}>←</button>
        <button className="btn" onClick={() => { setStep(s => Math.min(STEPS.length - 1, s + 1)); setPlaying(false); }} style={{ fontSize: 10 }}>→</button>
      </div>

      <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-faint)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>
        Worked example · both models see the same question
      </div>
      <div style={{
        fontFamily: "var(--serif)", fontSize: 14.5, fontStyle: "italic",
        color: "var(--ink)", borderLeft: "2px solid var(--accent)", paddingLeft: 10, marginBottom: 12,
        lineHeight: 1.4,
      }}>
        "{QUESTION}"
      </div>

      {/* Step title */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--accent)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {s.title.split("·")[0]}
        </div>
        <div style={{ fontSize: 16, fontWeight: 500, letterSpacing: "-0.01em", marginTop: 2 }}>
          {s.title.split("·")[1]?.trim()}
        </div>
      </div>

      {/* Two panes */}
      <div style={{
        flex: 1, minHeight: 0,
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
      }}>
        <Pane label="Chain-of-Thought" sub="GPT-style · thinks in tokens" color="var(--teal)">
          <CoTPane step={s.k} subT={subT} />
        </Pane>
        <Pane label="Looped Transformer" sub="Huginn / Ouro · thinks in latent space" color="var(--accent)">
          <LoopPane step={s.k} subT={subT} />
        </Pane>
      </div>

      {/* Caption */}
      <div style={{
        marginTop: 10, padding: "10px 12px",
        background: "var(--bg-tint)", border: "1px solid var(--rule)", borderRadius: 6,
        fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.5,
      }}>
        <b style={{ color: "var(--ink)", fontWeight: 500 }}>What's happening:</b> {s.cap}
      </div>
    </div>
  );
}

function Pane({ label, sub, color, children }) {
  return (
    <div style={{
      border: "1px solid var(--rule)", borderRadius: 8, background: "var(--paper)",
      display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0,
    }}>
      <div style={{
        padding: "8px 10px", borderBottom: "1px solid var(--rule)",
        display: "flex", alignItems: "baseline", gap: 8,
      }}>
        <span style={{ width: 8, height: 8, background: color, borderRadius: "50%", display: "inline-block" }} />
        <span style={{ fontSize: 12, fontWeight: 500 }}>{label}</span>
        <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-faint)", marginLeft: "auto" }}>{sub}</span>
      </div>
      <div style={{ flex: 1, minHeight: 0, padding: 10, position: "relative", overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
}

// ---- CoT pane renderings -----------------------------------------

const PROMPT_TOKENS = ["Alice", "has", "3", "boxes", ".", "Each", "has", "4", "red", ",", "2", "blue", "."];
const COT_REASONING = ["Each", "box", "has", "4", "+", "2", "=", "6", ".", "3", "×", "6", "=", "18", "."];

function CoTPane({ step, subT }) {
  // Produce visible tokens based on step
  let tokens = [];
  let emitted = 0;
  if (step === "prompt") tokens = PROMPT_TOKENS.map(t => ({ t, k: "prompt" }));
  else if (step === "embed") tokens = PROMPT_TOKENS.map(t => ({ t, k: "prompt" }));
  else if (step === "diverge") tokens = PROMPT_TOKENS.map(t => ({ t, k: "prompt" }));
  else if (step === "cot-think") {
    emitted = Math.floor(subT * COT_REASONING.length);
    tokens = [
      ...PROMPT_TOKENS.map(t => ({ t, k: "prompt" })),
      ...COT_REASONING.slice(0, emitted).map(t => ({ t, k: "gen" })),
    ];
  }
  else if (step === "loop-think") {
    tokens = [
      ...PROMPT_TOKENS.map(t => ({ t, k: "prompt" })),
      ...COT_REASONING.map(t => ({ t, k: "gen" })),
    ];
  }
  else if (step === "settle") {
    tokens = [
      ...PROMPT_TOKENS.map(t => ({ t, k: "prompt" })),
      ...COT_REASONING.map(t => ({ t, k: "gen" })),
    ];
  }
  else if (step === "emit") {
    tokens = [
      ...PROMPT_TOKENS.map(t => ({ t, k: "prompt" })),
      ...COT_REASONING.map(t => ({ t, k: "gen" })),
      { t: ANSWER, k: "ans" }
    ];
  }
  else if (step === "ledger") {
    tokens = [];
  }

  if (step === "ledger") return <CoTLedger />;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 10 }}>
      <div style={{
        flex: 1, minHeight: 0, overflow: "auto", display: "flex", flexWrap: "wrap",
        gap: 4, alignContent: "flex-start", padding: 4,
      }}>
        {tokens.map((tk, i) => (
          <Tok key={i} t={tk.t} kind={tk.k} />
        ))}
        {step === "cot-think" && (
          <span style={{
            display: "inline-block", width: 6, height: 16, background: "var(--accent)",
            opacity: (Math.sin(subT * 12) + 1) / 2,
            marginTop: 2,
          }} />
        )}
      </div>

      {/* Mini residual / bottleneck viz */}
      <CoTBottleneck step={step} subT={subT} />
    </div>
  );
}

function CoTBottleneck({ step, subT }) {
  // Visualize: residual (~24 dims wide) → squeeze to vocab → sample 1 token → re-embed
  const show = step === "cot-think" || step === "loop-think" || step === "diverge";
  return (
    <div style={{
      border: "1px dashed var(--rule-strong)", borderRadius: 4,
      padding: "6px 8px", fontFamily: "var(--mono)", fontSize: 9.5,
      color: "var(--ink-muted)", letterSpacing: "0.04em",
    }}>
      <div style={{ marginBottom: 4 }}>per-step data flow:</div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <div title="residual stream (wide)" style={{ display: "flex", gap: 1 }}>
          {Array.from({ length: 18 }).map((_, i) => (
            <span key={i} style={{
              width: 3, height: 16, background: "var(--teal)",
              opacity: 0.3 + 0.6 * Math.abs(Math.sin(i * 1.2 + (step === "cot-think" ? subT * 6 : 0)))
            }} />
          ))}
        </div>
        <span style={{ color: "var(--ink-faint)" }}>→</span>
        <span style={{
          padding: "1px 5px", background: "var(--accent-soft)", color: "var(--accent)",
          border: "1px solid var(--accent-line)", borderRadius: 2, fontSize: 9,
        }}>vocab · 50k</span>
        <span style={{ color: "var(--ink-faint)" }}>→</span>
        <span style={{
          padding: "1px 5px", background: "var(--bg-tint)", border: "1px solid var(--rule-strong)",
          borderRadius: 2, fontSize: 9,
        }}>1 token (~16 bits)</span>
        <span style={{ color: "var(--ink-faint)" }}>→</span>
        <span style={{ color: "var(--ink-soft)", fontSize: 9 }}>re-embed</span>
      </div>
      <div style={{ marginTop: 4, color: show ? "var(--accent)" : "var(--ink-faint)" }}>
        bottleneck: ~4096d → 16 bits → ~4096d every step
      </div>
    </div>
  );
}

function CoTLedger() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
      <LedgerRow k="reasoning tokens" v="15" note="verbalized intermediate steps" />
      <LedgerRow k="bandwidth / step" v="~16 bits" note="vocab bottleneck" />
      <LedgerRow k="FLOPs / step" v="1× full forward" note="entire net per token" />
      <LedgerRow k="total cost" v="15× forward" note="one per reasoning token" />
      <LedgerRow k="trace visible" v="yes — readable" note="but can be post-hoc" dim />
      <LedgerRow k="faithfulness" v="often unfaithful" note="justifies, doesn't reason" warn />
    </div>
  );
}
function LedgerRow({ k, v, note, warn, dim }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr auto", gap: 6, alignItems: "baseline",
      padding: "6px 0", borderBottom: "1px solid var(--rule)",
    }}>
      <div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-faint)", letterSpacing: "0.04em", textTransform: "uppercase" }}>{k}</div>
        <div style={{ fontSize: 10.5, color: "var(--ink-muted)", marginTop: 1 }}>{note}</div>
      </div>
      <div style={{
        fontFamily: "var(--mono)", fontSize: 13, fontWeight: 500,
        color: warn ? "var(--accent)" : (dim ? "var(--ink-muted)" : "var(--ink)"),
      }}>{v}</div>
    </div>
  );
}

// ---- Loop pane renderings ----------------------------------------

function LoopPane({ step, subT }) {
  if (step === "ledger") return <LoopLedger />;

  // Show the prompt tokens always; highlight residual evolution
  const tokens = PROMPT_TOKENS.map(t => ({ t, k: "prompt" }));
  const showEmit = step === "emit";

  const loopActive = step === "loop-think" || step === "settle";
  const loopIdx = loopActive ? Math.min(7, Math.floor(subT * 8)) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 10 }}>
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 4, padding: 4, maxHeight: 80, overflow: "hidden",
      }}>
        {tokens.map((tk, i) => <Tok key={i} t={tk.t} kind={tk.k} />)}
        {showEmit && <Tok t={ANSWER} kind="ans" />}
      </div>

      {/* Loop animation: residual stream cycling through block */}
      <div style={{
        flex: 1, minHeight: 0, border: "1px dashed var(--rule-strong)",
        borderRadius: 4, padding: 8, position: "relative",
        background: loopActive ? "var(--accent-soft)" : "transparent",
        transition: "background .3s",
      }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 9.5, color: "var(--ink-muted)", letterSpacing: "0.04em", marginBottom: 6 }}>
          residual stream · 4096d (showing 32) · loop pass {loopActive ? loopIdx + 1 : "–"}/8
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(32, 1fr)", gap: 1, height: 42 }}>
          {Array.from({ length: 32 }).map((_, i) => {
            // each loop "stirs" the residual — simulate by shifting pattern
            const seed = Math.sin(i * 0.7 + loopIdx * 0.5) * 0.5 + Math.cos(i * 1.3 + loopIdx * 0.3) * 0.4;
            const mag = Math.abs(seed);
            const pos = seed >= 0;
            return (
              <div key={i} style={{
                background: pos ? "var(--accent)" : "var(--teal)",
                opacity: 0.25 + mag * 0.75,
                alignSelf: "end",
                height: `${30 + mag * 70}%`,
                borderRadius: 1,
                transition: "all .2s",
              }} />
            );
          })}
        </div>

        {/* Loop indicator */}
        {loopActive && (
          <div style={{ display: "flex", gap: 4, marginTop: 8, alignItems: "center" }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--accent)", letterSpacing: "0.04em" }}>loops:</span>
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} style={{
                width: 10, height: 10, borderRadius: 2,
                background: i <= loopIdx ? "var(--accent)" : "var(--paper)",
                border: "1px solid var(--accent-line)",
              }} />
            ))}
            <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-muted)", marginLeft: "auto" }}>
              {step === "settle" ? "converging to fixed point" : "reapplying shared block"}
            </span>
          </div>
        )}

        {step === "emit" && (
          <div style={{
            marginTop: 10, padding: "6px 8px", background: "var(--paper)",
            border: "1px solid var(--accent-line)", borderRadius: 4, fontSize: 11,
          }}>
            <span style={{ color: "var(--ink-muted)" }}>final unembed → </span>
            <span style={{ fontFamily: "var(--mono)", fontWeight: 500, color: "var(--accent)" }}>"{ANSWER}"</span>
            <span style={{ color: "var(--ink-faint)", fontSize: 10, marginLeft: 6 }}>one token, 8× compute behind it</span>
          </div>
        )}
      </div>

      {/* bandwidth chip */}
      <div style={{
        border: "1px dashed var(--rule-strong)", borderRadius: 4,
        padding: "6px 8px", fontFamily: "var(--mono)", fontSize: 9.5,
        color: "var(--ink-muted)", letterSpacing: "0.04em",
      }}>
        per-loop data flow:
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
          <span style={{ padding: "1px 5px", border: "1px solid var(--rule-strong)", background: "var(--bg-tint)", borderRadius: 2, fontSize: 9 }}>
            residual ~4096d
          </span>
          <span style={{ color: "var(--ink-faint)" }}>→</span>
          <span style={{ padding: "1px 5px", border: "1px solid var(--accent-line)", background: "var(--accent-soft)", color: "var(--accent)", borderRadius: 2, fontSize: 9 }}>
            SAME block
          </span>
          <span style={{ color: "var(--ink-faint)" }}>→</span>
          <span style={{ padding: "1px 5px", border: "1px solid var(--rule-strong)", background: "var(--bg-tint)", borderRadius: 2, fontSize: 9 }}>
            residual ~4096d
          </span>
        </div>
        <div style={{ marginTop: 4, color: "var(--accent)" }}>
          no bottleneck: ~65,000 bits of state carried forward each loop
        </div>
      </div>
    </div>
  );
}

function LoopLedger() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
      <LedgerRow k="loops" v="8" note="shared block reapplied" />
      <LedgerRow k="bandwidth / loop" v="~65,000 bits" note="full residual carried" />
      <LedgerRow k="FLOPs / loop" v="1× recurrent block" note="smaller than full net" />
      <LedgerRow k="total cost" v="8× block ≈ 2× forward" note="fewer FLOPs, more thought" />
      <LedgerRow k="trace visible" v="via logit lens / probes" note="readable IF you probe" dim />
      <LedgerRow k="faithfulness" v="structural" note="the trace IS the reason" warn />
    </div>
  );
}

// ---- Shared token chip -------------------------------------------

function Tok({ t, kind }) {
  const styles = {
    prompt: { bg: "var(--bg-tint)", br: "var(--rule-strong)", fg: "var(--ink-soft)" },
    gen:    { bg: "var(--teal-soft)", br: "var(--teal)", fg: "var(--teal)" },
    ans:    { bg: "var(--accent-soft)", br: "var(--accent)", fg: "var(--accent)" },
  }[kind] || {};
  return (
    <span style={{
      fontFamily: "var(--mono)", fontSize: 10.5, padding: "2px 5px",
      background: styles.bg, border: "1px solid " + styles.br, color: styles.fg,
      borderRadius: 2, lineHeight: 1.3, whiteSpace: "nowrap",
    }}>{t}</span>
  );
}

window.Fig6_CoTvsLoop = Fig6_CoTvsLoop;
