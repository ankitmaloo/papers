/* global React */
const {
  useState,
  useEffect,
  useRef
} = React;
const {
  Fig1_LoopVsFF,
  Fig2_FixedPoints,
  Fig3_ArchZoo,
  Fig4_DepthBudget,
  Fig5_Stages,
  Fig6_CoTvsLoop,
  G,
  Eq,
  Cite,
  PaperCard,
  PAPERS
} = window;

/* ============================================================
   Section descriptors — used both for content + figure pinning
   ============================================================ */
const SECTIONS = [{
  id: "what",
  num: "01",
  title: "What is a looped transformer?",
  fig: 1
}, {
  id: "why",
  num: "02",
  title: "Why loop?",
  fig: 4
}, {
  id: "zoo",
  num: "03",
  title: "The architecture zoo",
  fig: 3,
  isNew: true
}, {
  id: "mech",
  num: "04",
  title: "Mechanism: fixed points & cyclic trajectories",
  fig: 2,
  isNew: true
}, {
  id: "stages",
  num: "05",
  title: "Stages of inference, repeated",
  fig: 5
}, {
  id: "stability",
  num: "06",
  title: "Training stability & scaling laws",
  fig: 4,
  isNew: true
}, {
  id: "ttc",
  num: "07",
  title: "Test-time compute scaling",
  fig: 2
}, {
  id: "vs-cot",
  num: "08",
  title: "Latent reasoning vs chain-of-thought",
  fig: 6,
  isNew: true
}, {
  id: "open",
  num: "09",
  title: "Open questions",
  fig: null
}, {
  id: "implications",
  num: "10",
  title: "Implications",
  fig: null
}, {
  id: "glossary",
  num: "11",
  title: "Glossary",
  fig: null
}, {
  id: "papers",
  num: "12",
  title: "Papers cited",
  fig: null
}, {
  id: "changelog",
  num: "13",
  title: "Changelog",
  fig: null
}];
const FIGS = {
  1: {
    num: "Fig 1",
    title: "Computation graph: feedforward vs looped",
    Comp: Fig1_LoopVsFF
  },
  2: {
    num: "Fig 2",
    title: "Recurrence dynamics: fixed points & TTC",
    Comp: Fig2_FixedPoints
  },
  3: {
    num: "Fig 3",
    title: "Architecture zoo",
    Comp: Fig3_ArchZoo
  },
  4: {
    num: "Fig 4",
    title: "Depth-budget allocator",
    Comp: Fig4_DepthBudget
  },
  5: {
    num: "Fig 5",
    title: "Stages of inference",
    Comp: Fig5_Stages
  },
  6: {
    num: "Fig 6",
    title: "What happens to the token? · CoT vs Looped",
    Comp: Fig6_CoTvsLoop
  }
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
      const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) {
        const id = visible[0].target.id;
        setActiveSec(id);
        const sec = SECTIONS.find(s => s.id === id);
        if (sec && sec.fig) setActiveFig(sec.fig);
      }
    }, {
      rootMargin: "-30% 0px -55% 0px",
      threshold: 0
    });
    SECTIONS.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) {
        sectionRefs.current[s.id] = el;
        obs.observe(el);
      }
    });
    return () => obs.disconnect();
  }, []);
  const goto = id => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({
      top: el.getBoundingClientRect().top + window.scrollY - 70,
      behavior: "smooth"
    });
  };
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "topbar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "brand"
  }, /*#__PURE__*/React.createElement("span", {
    className: "brand-mark"
  }), /*#__PURE__*/React.createElement("span", {
    className: "brand-title"
  }, "Looped Transformers"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--ink-faint)",
      marginLeft: 6
    }
  }, "\xB7 a live doc")), /*#__PURE__*/React.createElement("div", {
    className: "meta"
  }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), "live \xB7 updated 24 Apr 2026"), /*#__PURE__*/React.createElement("span", {
    className: "pill"
  }, "5 papers \xB7 13 sections"), /*#__PURE__*/React.createElement("span", {
    className: "pill ver"
  }, "v 0.4"))), /*#__PURE__*/React.createElement("div", {
    className: "shell"
  }, /*#__PURE__*/React.createElement("aside", {
    className: "rail"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rail-section"
  }, /*#__PURE__*/React.createElement("h4", null, "Contents"), /*#__PURE__*/React.createElement("ul", {
    className: "rail-toc"
  }, SECTIONS.map(s => /*#__PURE__*/React.createElement("li", {
    key: s.id,
    className: activeSec === s.id ? "active" : "",
    onClick: () => goto(s.id)
  }, /*#__PURE__*/React.createElement("span", {
    className: "num"
  }, s.num), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, s.title), s.isNew && /*#__PURE__*/React.createElement("span", {
    className: "new"
  }, "new"))))), /*#__PURE__*/React.createElement("div", {
    className: "rail-section"
  }, /*#__PURE__*/React.createElement("h4", null, "Research feed"), /*#__PURE__*/React.createElement("a", {
    className: "rail-feed-item",
    href: "#paper-hyperloop"
  }, /*#__PURE__*/React.createElement("div", {
    className: "feed-meta"
  }, /*#__PURE__*/React.createElement("span", null, "2026 \xB7 MIT"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--accent)"
    }
  }, "NEW")), /*#__PURE__*/React.createElement("div", {
    className: "feed-title"
  }, "Hyperloop Transformers \u2014 matrix residuals + looping")), /*#__PURE__*/React.createElement("a", {
    className: "rail-feed-item",
    href: "#paper-parcae"
  }, /*#__PURE__*/React.createElement("div", {
    className: "feed-meta"
  }, /*#__PURE__*/React.createElement("span", null, "2026 \xB7 UCSD"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--accent)"
    }
  }, "NEW")), /*#__PURE__*/React.createElement("div", {
    className: "feed-title"
  }, "Parcae \u2014 stable looping & scaling laws")), /*#__PURE__*/React.createElement("a", {
    className: "rail-feed-item",
    href: "#paper-mech"
  }, /*#__PURE__*/React.createElement("div", {
    className: "feed-meta"
  }, /*#__PURE__*/React.createElement("span", null, "2025 \xB7 Oxford")), /*#__PURE__*/React.createElement("div", {
    className: "feed-title"
  }, "Mechanistic analysis of looped reasoning")), /*#__PURE__*/React.createElement("a", {
    className: "rail-feed-item",
    href: "#paper-ouro"
  }, /*#__PURE__*/React.createElement("div", {
    className: "feed-meta"
  }, /*#__PURE__*/React.createElement("span", null, "2025 \xB7 ByteDance")), /*#__PURE__*/React.createElement("div", {
    className: "feed-title"
  }, "Ouro \u2014 Looped LMs, learned exits, 7.7T tokens")), /*#__PURE__*/React.createElement("a", {
    className: "rail-feed-item",
    href: "#paper-huginn"
  }, /*#__PURE__*/React.createElement("div", {
    className: "feed-meta"
  }, /*#__PURE__*/React.createElement("span", null, "2025 \xB7 UMD")), /*#__PURE__*/React.createElement("div", {
    className: "feed-title"
  }, "Huginn \u2014 recurrent depth, latent reasoning"))), /*#__PURE__*/React.createElement("div", {
    className: "rail-section",
    style: {
      fontSize: 11.5,
      color: "var(--ink-faint)",
      lineHeight: 1.5
    }
  }, /*#__PURE__*/React.createElement("h4", null, "About this doc"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12,
      color: "var(--ink-muted)",
      margin: 0,
      lineHeight: 1.5
    }
  }, "A living explainer on looped transformers, written progressively. ", /*#__PURE__*/React.createElement("i", null, "Spine"), " = intuition. Click any ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--mono)",
      color: "var(--accent)"
    }
  }, "+"), " panel to go deeper."))), /*#__PURE__*/React.createElement("main", {
    className: "narrative"
  }, /*#__PURE__*/React.createElement(Hero, {
    goto: goto
  }), /*#__PURE__*/React.createElement(Sections, null)), /*#__PURE__*/React.createElement(FigurePane, {
    activeFig: activeFig
  })));
}
function Hero({
  goto
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "hero"
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, /*#__PURE__*/React.createElement("span", null, "Living explainer"), /*#__PURE__*/React.createElement("span", {
    className: "sep"
  }), /*#__PURE__*/React.createElement("span", null, "v 0.4 \xB7 2026-04-24"), /*#__PURE__*/React.createElement("span", {
    className: "sep"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--accent)"
    }
  }, "5 source papers")), /*#__PURE__*/React.createElement("h1", {
    className: "title"
  }, "What if a transformer\xA0", /*#__PURE__*/React.createElement("em", null, "kept thinking"), /*#__PURE__*/React.createElement("br", null), "before it spoke?"), /*#__PURE__*/React.createElement("p", {
    className: "hero-deck"
  }, "Looped transformers re-apply the same block of layers many times before producing a token. It's a way to spend more ", /*#__PURE__*/React.createElement("em", null, "compute"), " without spending more ", /*#__PURE__*/React.createElement("em", null, "parameters"), " \u2014 and a way to reason in latent space rather than out loud. This document tracks the field as it forms."), /*#__PURE__*/React.createElement("div", {
    className: "hero-meta"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, "Reading time"), "~22 min \xB7 spine only"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, "Audience"), "knows transformers \xB7 curious-to-expert"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, "Updates"), "every new paper, dated below"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, "Format"), "two-pane \xB7 click ", /*#__PURE__*/React.createElement("code", null, "+"), " panels for depth")), /*#__PURE__*/React.createElement("div", {
    className: "concept-map"
  }, /*#__PURE__*/React.createElement("h5", null, /*#__PURE__*/React.createElement("span", null, "The spine"), /*#__PURE__*/React.createElement("span", null, "13 sections")), /*#__PURE__*/React.createElement("div", {
    className: "concept-spine"
  }, [{
    n: "01",
    l: "What"
  }, {
    n: "02",
    l: "Why"
  }, {
    n: "03",
    l: "Zoo"
  }, {
    n: "04",
    l: "Mechanism"
  }, {
    n: "05",
    l: "Stages"
  }, {
    n: "06",
    l: "Stability"
  }, {
    n: "07",
    l: "TTC"
  }, {
    n: "08",
    l: "vs CoT"
  }, {
    n: "09",
    l: "Open"
  }, {
    n: "10",
    l: "Implications"
  }].map(c => /*#__PURE__*/React.createElement("div", {
    key: c.n,
    className: "concept-node",
    onClick: () => goto(SECTIONS.find(s => s.num === c.n)?.id)
  }, /*#__PURE__*/React.createElement("span", {
    className: "num"
  }, c.n), /*#__PURE__*/React.createElement("span", {
    className: "lbl"
  }, c.l))))));
}
function FigurePane({
  activeFig
}) {
  return /*#__PURE__*/React.createElement("aside", {
    className: "figure-pane"
  }, /*#__PURE__*/React.createElement("div", {
    className: "figure-progress"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: `${activeFig / 6 * 100}%`
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "figure-frame"
  }, Object.entries(FIGS).map(([k, f]) => {
    const Comp = f.Comp;
    const active = +k === activeFig;
    return /*#__PURE__*/React.createElement("div", {
      key: k,
      className: "figure-slot" + (active ? " active" : "")
    }, /*#__PURE__*/React.createElement("div", {
      className: "figure-head"
    }, /*#__PURE__*/React.createElement("span", {
      className: "figure-num"
    }, f.num), /*#__PURE__*/React.createElement("span", {
      className: "figure-title"
    }, f.title), /*#__PURE__*/React.createElement("span", {
      className: "figure-spacer"
    }), /*#__PURE__*/React.createElement("span", {
      className: "figure-controls"
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--ink-faint)"
      }
    }, "pinned \xB7 scroll-driven"))), /*#__PURE__*/React.createElement("div", {
      className: "figure-body"
    }, active && /*#__PURE__*/React.createElement(Comp, null)));
  })));
}
window.App = App;