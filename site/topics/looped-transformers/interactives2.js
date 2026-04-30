/* global React */
const {
  useState,
  useEffect,
  useRef
} = React;

/* ============================================================
   FIGURE 4 — Depth-budget allocator: params vs loops
   ============================================================ */
function Fig4_DepthBudget() {
  const [params, setParams] = useState(50); // % of compute spent on params (vs loops)
  const [budget, setBudget] = useState(8); // total FLOPs budget index 1..16

  // Toy model: quality = a * log(params) + b * log(loops) - c * (params - opt)^2 + interaction
  // where loops scale = budget * (1 - params/100). Just for intuition.
  const loops = Math.max(1, Math.round(budget * (100 - params) / 12));
  const paramScale = Math.round(50 + params * 5); // M params
  const logFlop = Math.log2(budget) + 5;
  const baseQ = 60 + 6 * Math.log2(paramScale / 50) + 4.5 * Math.log2(loops);
  // Small penalty if extreme imbalance
  const balance = 1 - 0.0006 * Math.pow(params - 55, 2);
  const quality = baseQ * balance;
  const matchedFF = paramScale * loops; // "materialized" FLOPs analog

  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      height: "100%",
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 18,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--mono)",
      fontSize: 10,
      color: "var(--ink-faint)",
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      marginBottom: 6
    }
  }, "FLOPs budget"), /*#__PURE__*/React.createElement("input", {
    className: "range",
    type: "range",
    min: "2",
    max: "16",
    value: budget,
    onChange: e => setBudget(+e.target.value)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--mono)",
      fontSize: 11,
      color: "var(--ink-muted)",
      marginTop: 4
    }
  }, "~", logFlop.toFixed(1), " log\u2082 FLOPs")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--mono)",
      fontSize: 10,
      color: "var(--ink-faint)",
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      marginBottom: 6
    }
  }, "split: params \u2194 loops"), /*#__PURE__*/React.createElement("input", {
    className: "range",
    type: "range",
    min: "0",
    max: "100",
    value: params,
    onChange: e => setParams(+e.target.value)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      fontFamily: "var(--mono)",
      fontSize: 10.5,
      color: "var(--ink-muted)",
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("span", null, "\u2190 all-loop"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--accent)"
    }
  }, params, "% params \xB7 ", 100 - params, "% loops"), /*#__PURE__*/React.createElement("span", null, "all-param \u2192")))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      border: "1px solid var(--rule)",
      borderRadius: 8,
      padding: 16,
      background: "var(--paper)",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 18
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--mono)",
      fontSize: 10,
      color: "var(--ink-faint)",
      letterSpacing: "0.06em",
      textTransform: "uppercase"
    }
  }, "chosen configuration"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 28,
      fontWeight: 500,
      letterSpacing: "-0.02em",
      margin: "8px 0 4px"
    }
  }, paramScale, "M \xD7 ", loops, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--ink-faint)",
      fontSize: 18
    }
  }, " loops")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--ink-muted)",
      lineHeight: 1.5
    }
  }, "Acts like a feedforward model with ", /*#__PURE__*/React.createElement("b", {
    style: {
      color: "var(--accent)"
    }
  }, (matchedFF / 1000).toFixed(1), "B"), " materialized FLOPs at inference, while only paying memory for ", paramScale, "M parameters."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--mono)",
      fontSize: 10,
      color: "var(--ink-faint)",
      textTransform: "uppercase",
      letterSpacing: "0.06em"
    }
  }, "predicted quality (toy)"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 36,
      fontWeight: 500,
      color: "var(--accent)",
      letterSpacing: "-0.02em",
      marginTop: 4
    }
  }, quality.toFixed(1)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--ink-muted)"
    }
  }, "arbitrary CORE-style score"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--mono)",
      fontSize: 10,
      color: "var(--ink-faint)",
      textTransform: "uppercase",
      letterSpacing: "0.06em"
    }
  }, "memory vs compute"), /*#__PURE__*/React.createElement(Bar, {
    label: "memory footprint",
    value: paramScale / 600,
    color: "var(--ink-soft)",
    hint: `${paramScale}M params`
  }), /*#__PURE__*/React.createElement(Bar, {
    label: "compute @ inference",
    value: matchedFF / 16000,
    color: "var(--accent)",
    hint: `${(matchedFF / 1000).toFixed(1)}B effective`
  }), /*#__PURE__*/React.createElement(Bar, {
    label: "latency (token)",
    value: loops * paramScale / 16000,
    color: "var(--teal)",
    hint: `${loops}× block`
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      fontSize: 11.5,
      color: "var(--ink-muted)",
      lineHeight: 1.5
    }
  }, /*#__PURE__*/React.createElement("b", {
    style: {
      color: "var(--ink)"
    }
  }, "Heuristic from Parcae:"), " at fixed FLOPs, jointly increase loops ", /*#__PURE__*/React.createElement("i", null, "and"), " data; loop count scales sub-linearly. Pure all-param wins memorization; pure all-loop wins reasoning."))), /*#__PURE__*/React.createElement("div", {
    className: "figure-caption"
  }, /*#__PURE__*/React.createElement("b", null, "Figure 4 \xB7 Depth-budget allocator"), "Drag the split. A looped model trades memory for inference compute: the same FLOPs come from re-applying a smaller block. Intuitions only \u2014 real scaling laws (Parcae) are predictable but task-dependent."));
}
function Bar({
  label,
  value,
  color,
  hint
}) {
  const v = Math.max(0.04, Math.min(1, value));
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      fontFamily: "var(--mono)",
      fontSize: 10.5,
      color: "var(--ink-muted)"
    }
  }, /*#__PURE__*/React.createElement("span", null, label), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--ink-soft)"
    }
  }, hint)), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--bg-tint)",
      border: "1px solid var(--rule)",
      borderRadius: 3,
      height: 10,
      marginTop: 4,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: color,
      height: "100%",
      width: `${v * 100}%`,
      transition: "width .25s"
    }
  })));
}

/* ============================================================
   FIGURE 5 — Stages of inference (looped vs feedforward)
   ============================================================ */
function Fig5_Stages() {
  const stages = [{
    name: "Detokenization",
    color: "var(--ink-faint)"
  }, {
    name: "Feature build-up",
    color: "var(--teal)"
  }, {
    name: "Reasoning",
    color: "var(--accent)"
  }, {
    name: "Token prediction",
    color: "var(--ink-soft)"
  }];
  // Feedforward: 12 layers, stages occur once
  // Looped: 4-layer block × 3, each pass mirrors the same stages

  const ff = [[0, 0, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3]];
  const lp = [[0, 1, 2, 3], [0, 1, 2, 3], [0, 1, 2, 3]];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      height: "100%",
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      display: "grid",
      gridTemplateRows: "1fr 1fr",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Track, {
    title: "Feedforward \xB7 12 distinct layers",
    rows: ff,
    stages: stages,
    loop: false
  }), /*#__PURE__*/React.createElement(Track, {
    title: "Looped \xB7 4-layer block \xD7 3 passes",
    rows: lp,
    stages: stages,
    loop: true
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      marginTop: 10,
      flexWrap: "wrap"
    }
  }, stages.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.name,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      fontFamily: "var(--mono)",
      fontSize: 10.5,
      color: "var(--ink-muted)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 10,
      background: s.color,
      borderRadius: 2,
      display: "inline-block"
    }
  }), s.name))), /*#__PURE__*/React.createElement("div", {
    className: "figure-caption"
  }, /*#__PURE__*/React.createElement("b", null, "Figure 5 \xB7 Stages of inference"), "Lad et al. decomposed feedforward LLMs into four stages. Blayney et al. find looped models ", /*#__PURE__*/React.createElement("i", null, "repeat"), " these stages once per recurrence \u2014 the recurrent block learns to be a miniature FF transformer that runs in cycles."));
}
function Track({
  title,
  rows,
  stages,
  loop
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--mono)",
      fontSize: 10.5,
      color: "var(--ink-muted)",
      letterSpacing: "0.04em",
      textTransform: "uppercase",
      marginBottom: 8
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flex: 1,
      gap: loop ? 6 : 2,
      alignItems: "stretch"
    }
  }, rows.map((row, ri) => /*#__PURE__*/React.createElement("div", {
    key: ri,
    style: {
      flex: 1,
      display: "flex",
      gap: 2,
      position: "relative",
      border: loop ? "1px dashed var(--accent-line)" : "none",
      borderRadius: 4,
      padding: loop ? 4 : 0
    }
  }, loop && /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: -8,
      left: 6,
      background: "var(--bg)",
      fontFamily: "var(--mono)",
      fontSize: 9,
      color: "var(--accent)",
      padding: "0 4px"
    }
  }, "pass ", ri + 1), row.map((stageIdx, ci) => /*#__PURE__*/React.createElement("div", {
    key: ci,
    title: stages[stageIdx].name,
    style: {
      flex: 1,
      background: stages[stageIdx].color,
      opacity: 0.85,
      borderRadius: 2,
      minHeight: 28
    }
  }))))));
}
window.Fig4_DepthBudget = Fig4_DepthBudget;
window.Fig5_Stages = Fig5_Stages;