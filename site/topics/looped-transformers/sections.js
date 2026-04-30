/* global React */
const {
  G,
  Eq,
  Cite,
  PaperCard,
  PAPERS
} = window;
function Sections() {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("section", {
    id: "what",
    className: "section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sec-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "sec-num"
  }, "01"), /*#__PURE__*/React.createElement("h2", null, "What is a looped transformer?"), /*#__PURE__*/React.createElement("span", {
    className: "sec-tag gray"
  }, "Intuition")), /*#__PURE__*/React.createElement("div", {
    className: "tldr"
  }, "tldr"), /*#__PURE__*/React.createElement("div", {
    className: "tldr-body"
  }, "A normal transformer stacks ", /*#__PURE__*/React.createElement("i", null, "K"), " distinct blocks of layers; the residual stream passes through each block exactly once. A ", /*#__PURE__*/React.createElement("b", null, "looped transformer"), " applies a single shared block ", /*#__PURE__*/React.createElement("i", null, "R"), " times. Same parameters, more compute. The residual stream re-enters the same weights again and again."), /*#__PURE__*/React.createElement("p", {
    className: "lede"
  }, "Picture the transformer as a tall building. In the ordinary version, every floor has its own interior \u2014 its own attention heads, its own MLP \u2014 and the elevator (the ", /*#__PURE__*/React.createElement(G, {
    k: "residual stream"
  }, "residual stream"), ") rides up once and exits at the top. A looped transformer is a much shorter building, but the elevator goes up, down, and back up the same few floors several times before the doors open. Same architecture; ", /*#__PURE__*/React.createElement("i", null, "different schedule"), "."), /*#__PURE__*/React.createElement("p", null, "Concretely, a looped model has three stretches of layers: a short ", /*#__PURE__*/React.createElement("b", null, "prelude"), " that maps embeddings into the working space, a ", /*#__PURE__*/React.createElement("b", null, "recurrent block"), " whose weights are ", /*#__PURE__*/React.createElement("i", null, "shared"), " across iterations, and a short ", /*#__PURE__*/React.createElement("b", null, "coda"), " that decodes the final residual into a next-token distribution", /*#__PURE__*/React.createElement(Cite, {
    p: "huginn"
  }), /*#__PURE__*/React.createElement(Cite, {
    p: "hyperloop"
  }), ". The recurrence count ", /*#__PURE__*/React.createElement("i", null, "R"), " can be fixed (Hyperloop pins it to 3), stochastic (Huginn samples per-sequence), or learned per token (Ouro's ", /*#__PURE__*/React.createElement(G, {
    k: "ponder gate"
  }, "Ponder gate"), ")", /*#__PURE__*/React.createElement(Cite, {
    p: "ouro"
  }), "."), /*#__PURE__*/React.createElement("details", {
    className: "deeper"
  }, /*#__PURE__*/React.createElement("summary", null, "Go deeper \xB7 the recurrence as a map", /*#__PURE__*/React.createElement("span", {
    className: "deeper-tag"
  }, "math \xB7 2 min")), /*#__PURE__*/React.createElement("div", {
    className: "deeper-body"
  }, /*#__PURE__*/React.createElement("p", null, "Write the recurrent block as a function ", /*#__PURE__*/React.createElement("code", null, "f", /*#__PURE__*/React.createElement("sub", null, "\u03B8")), " that maps the current residual and the original embedding to the next residual:"), /*#__PURE__*/React.createElement(Eq, {
    label: "Recurrent residual update",
    expr: "h<sub>t+1</sub> \xA0=\xA0 f<sub>\u03B8</sub>(h<sub>t</sub>, e) \xA0=\xA0 A\xB7h<sub>t</sub> \xA0+\xA0 B\xB7e \xA0+\xA0 R(h<sub>t</sub>, e)",
    anno: [["h", "the residual stream at recurrence t"], ["e", "the prelude output (input embedding) — re-injected at every step"], ["A,B", "linear projections; their spectral norms decide stability"], ["R", "the non-linear part: attention + MLP with shared weights θ"]]
  }), /*#__PURE__*/React.createElement("p", null, "The model produces output via a coda ", /*#__PURE__*/React.createElement("code", null, "C(h", /*#__PURE__*/React.createElement("sub", null, "R"), ")"), " projected through the unembed. Every choice in the field \u2014 Parcae's diagonal ", /*#__PURE__*/React.createElement("code", null, "A"), ", Hyperloop's matrix-valued residual, Huginn's random ", /*#__PURE__*/React.createElement("i", null, "R"), " \u2014 is a different way of taming this map's behavior under iteration."))), /*#__PURE__*/React.createElement("h3", null, "Three things to keep in your head"), /*#__PURE__*/React.createElement("ol", null, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("b", null, "Parameters and compute decouple."), " One shared block \xD7 R iterations = R", /*#__PURE__*/React.createElement("sub", null, "\xD7"), " the FLOPs of a single block, but only 1\xD7 the memory."), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("b", null, "The residual stream is a state."), " Looping turns the transformer into a discrete dynamical system over that state."), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("b", null, "R is a knob."), " You can crank it at training time, at test time, or both \u2014 and that knob is what makes loops interesting."))), /*#__PURE__*/React.createElement("section", {
    id: "why",
    className: "section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sec-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "sec-num"
  }, "02"), /*#__PURE__*/React.createElement("h2", null, "Why loop?"), /*#__PURE__*/React.createElement("span", {
    className: "sec-tag gray"
  }, "Motivation")), /*#__PURE__*/React.createElement("div", {
    className: "tldr"
  }, "tldr"), /*#__PURE__*/React.createElement("div", {
    className: "tldr-body"
  }, "Three independent reasons converge on the same architecture: ", /*#__PURE__*/React.createElement("b", null, "parameter efficiency"), " (run a small model on a phone), ", /*#__PURE__*/React.createElement("b", null, "latent reasoning"), " (think without speaking), and ", /*#__PURE__*/React.createElement("b", null, "elastic test-time compute"), "(decide how hard to think, per query)."), /*#__PURE__*/React.createElement("h3", null, "1 \xB7 Parameter efficiency"), /*#__PURE__*/React.createElement("p", null, "Edge devices have 8\u201316GB of RAM. Frontier-quality models don't fit. Looping lets you build a model whose ", /*#__PURE__*/React.createElement("i", null, "quality"), " tracks its ", /*#__PURE__*/React.createElement("i", null, "materialized"), " FLOPs while its ", /*#__PURE__*/React.createElement("i", null, "memory"), " tracks the single-block parameter count. Hyperloop hits the FLOPs of a depth-matched feedforward transformer using ", /*#__PURE__*/React.createElement("b", null, "~50% fewer parameters"), /*#__PURE__*/React.createElement(Cite, {
    p: "hyperloop"
  }), "."), /*#__PURE__*/React.createElement("h3", null, "2 \xB7 Latent reasoning"), /*#__PURE__*/React.createElement("p", null, "Chain-of-thought turns the residual stream into text and back, which is wasteful \u2014 every \"thought\" must pass through the bottleneck of the unembedding. A looped model can keep iterating in the continuous latent space, capturing reasoning ", /*#__PURE__*/React.createElement("i", null, "not easily expressed in words"), /*#__PURE__*/React.createElement(Cite, {
    p: "huginn"
  }), ". Ouro shows this can be baked into ", /*#__PURE__*/React.createElement("b", null, "pretraining"), ", not bolted on afterwards", /*#__PURE__*/React.createElement(Cite, {
    p: "ouro"
  }), "."), /*#__PURE__*/React.createElement("h3", null, "3 \xB7 Elastic test-time compute"), /*#__PURE__*/React.createElement("p", null, "With a learned exit, the model can spend more loops on hard tokens and fewer on easy ones \u2014 adaptive compute on the per-token level", /*#__PURE__*/React.createElement(Cite, {
    p: "ouro"
  }), ". Huginn shows that even ", /*#__PURE__*/React.createElement("i", null, "without"), " a learned exit, a simple KL-divergence threshold across loops works zero-shot", /*#__PURE__*/React.createElement(Cite, {
    p: "huginn"
  }), "."), /*#__PURE__*/React.createElement("div", {
    className: "callout"
  }, /*#__PURE__*/React.createElement("span", {
    className: "glyph"
  }, "\u21BB"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, "The unifying insight."), " Each motivation pushes toward a different knob \u2014 but they all want the same thing: a model whose ", /*#__PURE__*/React.createElement("i", null, "depth at inference"), " is decoupled from its ", /*#__PURE__*/React.createElement("i", null, "parameter count"), "."))), /*#__PURE__*/React.createElement("section", {
    id: "zoo",
    className: "section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sec-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "sec-num"
  }, "03"), /*#__PURE__*/React.createElement("h2", null, "The architecture zoo"), /*#__PURE__*/React.createElement("span", {
    className: "sec-tag"
  }, "Updated 2026-04")), /*#__PURE__*/React.createElement("div", {
    className: "tldr"
  }, "tldr"), /*#__PURE__*/React.createElement("div", {
    className: "tldr-body"
  }, "Six architectures covering a decade of the idea. They differ in ", /*#__PURE__*/React.createElement("i", null, "what"), " is shared, ", /*#__PURE__*/React.createElement("i", null, "how"), " R is chosen, and ", /*#__PURE__*/React.createElement("i", null, "how"), " instability is tamed."), /*#__PURE__*/React.createElement("p", null, "Use the comparator on the right to flip between them. The vocabulary is consistent: every modern looped model has a prelude, a shared recurrent block, and a coda. The interesting design decisions live in three places."), /*#__PURE__*/React.createElement("table", {
    className: "tbl"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "What"), /*#__PURE__*/React.createElement("th", null, "Choices in the wild"), /*#__PURE__*/React.createElement("th", null, "Trade-off"))), /*#__PURE__*/React.createElement("tbody", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
    className: "arch"
  }, "Parameter sharing")), /*#__PURE__*/React.createElement("td", null, "full block (Universal, Ouro) \xB7 middle only (Huginn, Parcae, Hyperloop)"), /*#__PURE__*/React.createElement("td", null, "tighter sharing \u2192 smaller memory; looser sharing \u2192 easier optimization")), /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
    className: "arch"
  }, "Recurrence count R")), /*#__PURE__*/React.createElement("td", null, "fixed (Hyperloop=3) \xB7 stochastic (Huginn 1..32) \xB7 learned per-token (Ouro)"), /*#__PURE__*/React.createElement("td", null, "fixed = simple but rigid; stochastic = test-time scalable; learned = adaptive but extra training")), /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
    className: "arch"
  }, "Stability mechanism")), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(G, {
    k: "input injection"
  }, "input injection"), " \xB7 ", /*#__PURE__*/React.createElement(G, {
    k: "hyper-connection"
  }, "hyper-connections"), " \xB7 spectral-norm bounds (Parcae)"), /*#__PURE__*/React.createElement("td", null, "without one of these, the residual norm explodes after a few loops")))), /*#__PURE__*/React.createElement("details", {
    className: "deeper"
  }, /*#__PURE__*/React.createElement("summary", null, "Go deeper \xB7 what changed in 2026", /*#__PURE__*/React.createElement("span", {
    className: "deeper-tag"
  }, "paper notes \xB7 3 min")), /*#__PURE__*/React.createElement("div", {
    className: "deeper-body"
  }, /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("b", null, "Parcae", /*#__PURE__*/React.createElement(Cite, {
    p: "parcae"
  })), " reframes looping as a non-linear time-variant dynamical system over the residual stream. By linearizing, they show instability comes from ", /*#__PURE__*/React.createElement("i", null, "large spectral norms"), " in the injection parameters. Their fix: discretize a negative-diagonal parameterization for ", /*#__PURE__*/React.createElement("code", null, "A"), ". Loss spikes disappear; scaling laws become predictable."), /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("b", null, "Hyperloop", /*#__PURE__*/React.createElement(Cite, {
    p: "hyperloop"
  })), " notes that ordinary loops force every iteration through a single residual stream. Borrowing hyper-connections (Xie '26), they expand the residual into multiple parallel streams and mix them only at loop boundaries \u2014 extra expressivity at near-zero parameter cost.")))), /*#__PURE__*/React.createElement("section", {
    id: "mech",
    className: "section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sec-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "sec-num"
  }, "04"), /*#__PURE__*/React.createElement("h2", null, "Mechanism: fixed points & cyclic trajectories"), /*#__PURE__*/React.createElement("span", {
    className: "sec-tag"
  }, "New finding")), /*#__PURE__*/React.createElement("div", {
    className: "tldr"
  }, "tldr"), /*#__PURE__*/React.createElement("div", {
    className: "tldr-body"
  }, "When a looped model trains ", /*#__PURE__*/React.createElement("i", null, "well"), ", each layer inside the recurrent block converges to its ", /*#__PURE__*/React.createElement("i", null, "own"), /*#__PURE__*/React.createElement(G, {
    k: "fixed point"
  }, "fixed point"), ". The block as a whole traces a stable cycle in latent space \u2014 and that cycle is what lets the model extrapolate past its training depth."), /*#__PURE__*/React.createElement("p", {
    className: "lede"
  }, "This is the most intuition-shifting result in the field. ", /*#__PURE__*/React.createElement(Cite, {
    p: "mech"
  }), " took recurrent models (Huginn, Ouro, retrofitted Llama) and watched the residual stream evolve recurrence by recurrence. What they saw, plotted in PCA, looks like the figure pinned on the right: each of the four layers in the cycle drifts toward a distinct attractor."), /*#__PURE__*/React.createElement("p", null, "Why does this matter? Because once each layer is at its fixed point, the ", /*#__PURE__*/React.createElement("i", null, "attention pattern"), "stabilizes. The model is no longer doing fresh work \u2014 it is sustaining the same computation in a stable orbit. From there, you can iterate ", /*#__PURE__*/React.createElement("i", null, "arbitrarily long"), " without breaking anything."), /*#__PURE__*/React.createElement("div", {
    className: "pull"
  }, "\"For many of the studied models each layer in the cycle converges to a distinct fixed point; consequently, the recurrent block follows a consistent cyclic trajectory in the latent space.\"", /*#__PURE__*/React.createElement("cite", null, "\u2014 Blayney et al. 2025")), /*#__PURE__*/React.createElement("h3", null, "Three regimes seen in practice"), /*#__PURE__*/React.createElement("ul", null, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("b", null, "Fixed point."), " Layer states stop moving. Most stable; best extrapolation. Huginn's typical regime."), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("b", null, "Orbit."), " States cycle through a closed loop. Multi-scale cycles can occur \u2014 orbits within the block, orbits between recurrences."), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("b", null, "Slider."), " The state drifts monotonically along a direction in latent space \u2014 a kind of \"counter\".")), /*#__PURE__*/React.createElement("p", null, "Ouro 1.4B exhibits non-fixed-point behavior, and accordingly its quality degrades when test-time R exceeds training R", /*#__PURE__*/React.createElement(Cite, {
    p: "ouro"
  }), ". Huginn's quality stays flat past training depth \u2014 the difference tracks the existence of a stable fixed point", /*#__PURE__*/React.createElement(Cite, {
    p: "mech"
  }), "."), /*#__PURE__*/React.createElement("details", {
    className: "deeper"
  }, /*#__PURE__*/React.createElement("summary", null, "Go deeper \xB7 what makes the fixed point form?", /*#__PURE__*/React.createElement("span", {
    className: "deeper-tag"
  }, "mechanism \xB7 4 min")), /*#__PURE__*/React.createElement("div", {
    className: "deeper-body"
  }, /*#__PURE__*/React.createElement("p", null, "Three architectural levers reliably encourage convergence:"), /*#__PURE__*/React.createElement("ol", null, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("b", null, "Input injection."), " Re-add the prelude output at every step, so the recurrence is", /*#__PURE__*/React.createElement("code", null, "h", /*#__PURE__*/React.createElement("sub", null, "t+1"), " = f(h", /*#__PURE__*/React.createElement("sub", null, "t"), ", e)"), " not ", /*#__PURE__*/React.createElement("code", null, "f(h", /*#__PURE__*/React.createElement("sub", null, "t"), ")"), ". Without it, the prompt is \"forgotten\" and the dynamics diverge."), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("b", null, "Recurrent block size."), " The block must be deep enough to fit the four", /*#__PURE__*/React.createElement(G, {
    k: "stages of inference"
  }, "stages of inference"), ". Too few layers and the cycle can't carry the work."), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("b", null, "Normalization placement."), " Pre-norm on each sub-layer with an extra norm at block exit keeps norms bounded across iterations.")), /*#__PURE__*/React.createElement("p", null, "Parcae adds a fourth: a discretized negative-diagonal parameterization of the linear injection map, which directly bounds the spectral norm and eliminates the residual-explosion failure mode observed in earlier recipes", /*#__PURE__*/React.createElement(Cite, {
    p: "parcae"
  }), ".")))), /*#__PURE__*/React.createElement("section", {
    id: "stages",
    className: "section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sec-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "sec-num"
  }, "05"), /*#__PURE__*/React.createElement("h2", null, "Stages of inference, repeated")), /*#__PURE__*/React.createElement("div", {
    className: "tldr"
  }, "tldr"), /*#__PURE__*/React.createElement("div", {
    className: "tldr-body"
  }, "Feedforward transformers organize computation into four stages: detokenization \u2192 feature build-up \u2192 reasoning \u2192 token prediction. Looped transformers learn to ", /*#__PURE__*/React.createElement("i", null, "repeat"), " all four stages once per recurrence \u2014 the recurrent block is itself a tiny feedforward transformer."), /*#__PURE__*/React.createElement("p", null, "Lad et al. (2024) characterized standard transformers as proceeding through four functionally distinct phases. The natural question for looped models: do they compress these stages into a single iteration, or do they repeat them? The answer turns out to be the latter."), /*#__PURE__*/React.createElement("p", null, "By measuring ", /*#__PURE__*/React.createElement("i", null, "ColSum concentration"), " (a proxy for attention sink behavior) and ", /*#__PURE__*/React.createElement("i", null, "mixing scores"), "across layers, ", /*#__PURE__*/React.createElement(Cite, {
    p: "mech"
  }), " show that retrofitted Llama, Huginn, and small from-scratch looped models all exhibit ", /*#__PURE__*/React.createElement("b", null, "recurrent-block-wise stages"), ": each pass through the block looks like the four stages of a normal transformer, repeated."), /*#__PURE__*/React.createElement("p", null, "This has a clean interpretation. The model isn't doing ", /*#__PURE__*/React.createElement("i", null, "different"), " work per loop \u2014 it is doing", /*#__PURE__*/React.createElement("i", null, "the same kind"), " of work, on a refined input. Each pass takes the previous pass's output, treats it as a fresh \"prompt-like\" representation, and runs another miniature inference cycle. Reasoning becomes iteration on a shared mental scratchpad."), /*#__PURE__*/React.createElement("div", {
    className: "callout"
  }, /*#__PURE__*/React.createElement("span", {
    className: "glyph"
  }, "\u2605"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, "Why this changes interpretability."), " If the same stage-of-inference structure repeats per loop, then mech-interp tools developed for feedforward transformers \u2014 circuits, probes, ", /*#__PURE__*/React.createElement(G, {
    k: "logit lens"
  }, "logit lens"), " \u2014 transfer almost directly to looped models. You just apply them per-iteration."))), /*#__PURE__*/React.createElement("section", {
    id: "stability",
    className: "section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sec-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "sec-num"
  }, "06"), /*#__PURE__*/React.createElement("h2", null, "Training stability & scaling laws"), /*#__PURE__*/React.createElement("span", {
    className: "sec-tag"
  }, "Updated 2026-04")), /*#__PURE__*/React.createElement("div", {
    className: "tldr"
  }, "tldr"), /*#__PURE__*/React.createElement("div", {
    className: "tldr-body"
  }, "The classical failure mode is ", /*#__PURE__*/React.createElement("b", null, "residual explosion"), ": norms grow geometrically across loops. Parcae diagnoses this as a ", /*#__PURE__*/React.createElement(G, {
    k: "spectral norm"
  }, "spectral-norm"), " problem and fixes it by parameterization. With stable training, FLOPs \u2194 loops follows a predictable power law."), /*#__PURE__*/React.createElement("p", null, "Early looped recipes trained unstably. Loss spikes in the middle of training, recurrent-state norms swinging across many orders of magnitude. Prairie et al. trace this to the linearized recurrence: when the spectral norm of the injection matrix exceeds 1, repeated application is geometric divergence. They fix it structurally: parameterize ", /*#__PURE__*/React.createElement("code", null, "A"), " as a ", /*#__PURE__*/React.createElement("i", null, "negative diagonal"), ", then discretize it (zero-order hold), and the norm is bounded by construction", /*#__PURE__*/React.createElement(Cite, {
    p: "parcae"
  }), "."), /*#__PURE__*/React.createElement("details", {
    className: "deeper"
  }, /*#__PURE__*/React.createElement("summary", null, "Go deeper \xB7 the per-sequence sampling trick", /*#__PURE__*/React.createElement("span", {
    className: "deeper-tag"
  }, "training \xB7 2 min")), /*#__PURE__*/React.createElement("div", {
    className: "deeper-body"
  }, /*#__PURE__*/React.createElement("p", null, "To train a model that can run at any R at test time, you train with random R per example. Naive per-batch sampling causes loss spikes \u2014 large recurrent residual jumps at the final recurrence destabilize the gradient."), /*#__PURE__*/React.createElement("p", null, "Parcae's fix: ", /*#__PURE__*/React.createElement("i", null, "per-sequence"), " sampling. Sample R", /*#__PURE__*/React.createElement("sub", null, "i"), " for each sequence in the batch; pad to the max R in the batch but let shorter sequences hold their state. The training objective becomes a better estimate of the steady-state fixed point and loss spikes vanish."))), /*#__PURE__*/React.createElement("h3", null, "Scaling laws (so far)"), /*#__PURE__*/React.createElement("p", null, "With training stable, two laws emerge", /*#__PURE__*/React.createElement(Cite, {
    p: "parcae"
  }), ":"), /*#__PURE__*/React.createElement("ul", null, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("b", null, "FLOPs scaling."), " At fixed parameter count, validation loss decreases as a predictable power law in loops \xD7 tokens \u2014 but loops and data must be increased ", /*#__PURE__*/React.createElement("i", null, "in tandem"), ", similar to the original Chinchilla relationship between parameters and tokens."), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("b", null, "Test-time scaling."), " At inference, accuracy gains from extra loops follow a saturating exponential. Each task has a characteristic compute appetite; reasoning-heavy tasks have larger appetites.")), /*#__PURE__*/React.createElement("p", null, "These laws are the reason the field is taking looping seriously now. Until 2026, looped training was a craft; now it has a recipe and a forecast.")), /*#__PURE__*/React.createElement("section", {
    id: "ttc",
    className: "section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sec-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "sec-num"
  }, "07"), /*#__PURE__*/React.createElement("h2", null, "Test-time compute scaling")), /*#__PURE__*/React.createElement("div", {
    className: "tldr"
  }, "tldr"), /*#__PURE__*/React.createElement("div", {
    className: "tldr-body"
  }, "A trained looped model can be run at ", /*#__PURE__*/React.createElement("i", null, "any"), " R at test time. Quality climbs along a saturating exponential. Huginn, trained to R=32, behaves at R=64 like a feedforward model with ~50B parameters."), /*#__PURE__*/React.createElement("p", null, "The scrubber on the right shows the canonical curves", /*#__PURE__*/React.createElement(Cite, {
    p: "huginn"
  }), ". ARC-Challenge saturates fast; OBQA saturates faster (it tests memorized facts, not reasoning); GSM8K keeps climbing well past R=32. The model has, in effect, an internal \"thinking time\" budget that pays off most on the tasks that need it."), /*#__PURE__*/React.createElement("p", null, "Two practical consequences:"), /*#__PURE__*/React.createElement("ul", null, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("b", null, "Zero-shot adaptive compute."), " Compute the KL divergence between residuals at successive loops; stop when it falls below a threshold. No special training needed", /*#__PURE__*/React.createElement(Cite, {
    p: "huginn"
  }), ". Easy queries terminate in 4\u20138 loops; hard ones use 30+."), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("b", null, "Per-token early exit."), " A learned exit head (Ouro's Ponder gate) gives even better quality at a given average loop count", /*#__PURE__*/React.createElement(Cite, {
    p: "ouro"
  }), ".")), /*#__PURE__*/React.createElement("details", {
    className: "deeper"
  }, /*#__PURE__*/React.createElement("summary", null, "Go deeper \xB7 KV cache during multi-loop decoding", /*#__PURE__*/React.createElement("span", {
    className: "deeper-tag"
  }, "inference \xB7 1 min")), /*#__PURE__*/React.createElement("div", {
    className: "deeper-body"
  }, /*#__PURE__*/React.createElement("p", null, "Naively, every loop maintains its own KV cache, blowing up memory by R\xD7. Ouro finds that during", /*#__PURE__*/React.createElement("i", null, "decoding"), " (but not prefill), ", /*#__PURE__*/React.createElement("b", null, "last-step-only"), " caching loses essentially nothing: 78.92 \u2192 78.85 on GSM8K with a 4\xD7 memory reduction", /*#__PURE__*/React.createElement(Cite, {
    p: "ouro"
  }), ". ", /*#__PURE__*/React.createElement("i", null, "Averaged"), " caching works too;", /*#__PURE__*/React.createElement("i", null, "first-step-only"), " collapses (78.92 \u2192 18.73). The final loop is where the action is.")))), /*#__PURE__*/React.createElement("section", {
    id: "vs-cot",
    className: "section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sec-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "sec-num"
  }, "08"), /*#__PURE__*/React.createElement("h2", null, "Latent reasoning vs chain-of-thought"), /*#__PURE__*/React.createElement("span", {
    className: "sec-tag"
  }, "Walkthrough")), /*#__PURE__*/React.createElement("div", {
    className: "tldr"
  }, "tldr"), /*#__PURE__*/React.createElement("div", {
    className: "tldr-body"
  }, "Both models end up producing one token. The difference is ", /*#__PURE__*/React.createElement("i", null, "what happens between"), " the prompt and that token \u2014 and how much information survives the trip."), /*#__PURE__*/React.createElement("p", {
    className: "lede"
  }, "The cleanest way to see this is to watch it happen. The figure on the right is a seven-step walkthrough: same question, same prompt, same final token, but two radically different paths through the interior of the model. Scrub through it before reading on."), /*#__PURE__*/React.createElement("h3", null, "The key asymmetry: bandwidth"), /*#__PURE__*/React.createElement("p", null, "A CoT model's \"thinking\" must pass through the vocabulary every step. A residual vector of ~4096 continuous dimensions (roughly 65,000 bits of nuance) gets collapsed into a single token drawn from ~50,000 options \u2014 ~16 bits. Every reasoning step, the model throws away 99.97% of its internal state and reconstructs it from one word", /*#__PURE__*/React.createElement(Cite, {
    p: "ouro"
  }), "."), /*#__PURE__*/React.createElement("p", null, "A looped model's \"thinking\" never leaves the residual stream. Every loop is a full attention + MLP pass over the same wide vector. Eight loops = eight full passes of ", /*#__PURE__*/React.createElement("i", null, "uncompressed"), " reasoning. The final unembed happens ", /*#__PURE__*/React.createElement("i", null, "once"), ", at the end."), /*#__PURE__*/React.createElement("div", {
    className: "pull"
  }, "\"Yes, one token post latent space \u2014 but the state feeding the unembed carries orders of magnitude more worked-through thought than a CoT trace of the same compute.\"", /*#__PURE__*/React.createElement("cite", null, "\u2014 the essential asymmetry")), /*#__PURE__*/React.createElement("h3", null, "So why is looped more powerful for reasoning?"), /*#__PURE__*/React.createElement("ol", null, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("b", null, "No bottleneck tax."), " Each CoT reasoning token costs one ", /*#__PURE__*/React.createElement("i", null, "full"), " forward pass AND loses almost all internal state; a looped iteration costs only the ", /*#__PURE__*/React.createElement("i", null, "middle block"), " (smaller) and preserves the full state", /*#__PURE__*/React.createElement(Cite, {
    p: "huginn"
  }), /*#__PURE__*/React.createElement(Cite, {
    p: "hyperloop"
  }), "."), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("b", null, "Parallel thoughts per loop."), " A CoT step commits to one word. A loop can hold a superposition of partial deductions in different dimensions of the residual and integrate them. This is why loops capture reasoning \"not easily expressed in words\"", /*#__PURE__*/React.createElement(Cite, {
    p: "huginn"
  }), "."), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("b", null, "Structural faithfulness."), " If you probe a CoT model, it may justify post-hoc; the trace isn't necessarily the cause. In a looped model, the cause ", /*#__PURE__*/React.createElement("i", null, "is"), " the residual trajectory \u2014 there's no other channel for reasoning to live in", /*#__PURE__*/React.createElement(Cite, {
    p: "ouro"
  }), "."), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("b", null, "Elastic compute per query."), " CoT spends compute in fixed-size units (a token). Loops spend it continuously \u2014 stop when converged", /*#__PURE__*/React.createElement(Cite, {
    p: "huginn"
  }), ".")), /*#__PURE__*/React.createElement("h3", null, "But both end with one token \u2014 what's different?"), /*#__PURE__*/React.createElement("p", null, "You asked exactly the right question. Both models produce a single next token. What changes is the", /*#__PURE__*/React.createElement("i", null, "information content"), " of the residual that feeds the unembedding layer. The CoT model's final residual was built by re-embedding 15 of its own tokens \u2014 a noisy, lossy process. The looped model's final residual was built by 8\xD7 of uncompressed deliberation on the same 4096 dimensions."), /*#__PURE__*/React.createElement("p", null, "On GSM8K, this gap is visible: Huginn at R=32 matches a feedforward model of ~50B parameters despite having 3.5B", /*#__PURE__*/React.createElement(Cite, {
    p: "huginn"
  }), ". Ouro 1.4B matches Qwen3-4B on reasoning benchmarks", /*#__PURE__*/React.createElement(Cite, {
    p: "ouro"
  }), ". The one token at the end is the same; the ", /*#__PURE__*/React.createElement("i", null, "quality"), " of that token is higher because the hidden state beneath it is more worked-through."), /*#__PURE__*/React.createElement("table", {
    className: "tbl"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Axis"), /*#__PURE__*/React.createElement("th", null, "Chain-of-thought"), /*#__PURE__*/React.createElement("th", null, "Latent looping"))), /*#__PURE__*/React.createElement("tbody", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", null, "Medium"), /*#__PURE__*/React.createElement("td", null, "discrete tokens"), /*#__PURE__*/React.createElement("td", null, "continuous vectors")), /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", null, "Bandwidth / step"), /*#__PURE__*/React.createElement("td", null, "~16 bits"), /*#__PURE__*/React.createElement("td", null, "~65,000 bits")), /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", null, "Cost / step"), /*#__PURE__*/React.createElement("td", null, "1\xD7 full forward"), /*#__PURE__*/React.createElement("td", null, "1\xD7 middle block only")), /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", null, "Inspectability"), /*#__PURE__*/React.createElement("td", null, "readable"), /*#__PURE__*/React.createElement("td", null, "probe-able")), /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", null, "Faithfulness"), /*#__PURE__*/React.createElement("td", null, "often post-hoc"), /*#__PURE__*/React.createElement("td", null, "structural")), /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", null, "Train data"), /*#__PURE__*/React.createElement("td", null, "needs reasoning corpora"), /*#__PURE__*/React.createElement("td", null, "none required", /*#__PURE__*/React.createElement(Cite, {
    p: "huginn"
  }))), /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", null, "Compute knob"), /*#__PURE__*/React.createElement("td", null, "length of generation"), /*#__PURE__*/React.createElement("td", null, "R (continuous)")))), /*#__PURE__*/React.createElement("p", null, "The two are complementary, not opposed. The clearest path for frontier models likely combines both: latent loops for dense deliberation between tokens, CoT for the moments when externalizing genuinely helps. Think for a bit, jot a note, think again.")), /*#__PURE__*/React.createElement("section", {
    id: "open",
    className: "section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sec-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "sec-num"
  }, "09"), /*#__PURE__*/React.createElement("h2", null, "Open questions")), /*#__PURE__*/React.createElement("div", {
    className: "tldr"
  }, "tldr"), /*#__PURE__*/React.createElement("div", {
    className: "tldr-body"
  }, "Five questions the field has ", /*#__PURE__*/React.createElement("i", null, "not"), " answered yet \u2014 each one a paper waiting to happen."), /*#__PURE__*/React.createElement("ol", null, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("b", null, "Does the 50%-fewer-params win persist past 10B?"), " Hyperloop's experiments cap below 1B. The crossover with mixture-of-experts hasn't been mapped", /*#__PURE__*/React.createElement(Cite, {
    p: "hyperloop"
  }), "."), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("b", null, "What determines per-task compute appetite?"), " Why does GSM8K saturate at R\u224848 but OBQA at R\u22488? Is it task length, knowledge density, branching factor, or something else? No theory yet."), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("b", null, "Can looped models compose with sparse activation?"), " MoE-UT (Csord\xE1s '24) hints yes; large-scale evidence is missing. A looped model that loops a routed sub-block could be the next architectural step."), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("b", null, "Is the fixed point the right mental model?"), " Some Huginn examples exhibit orbits or sliders", /*#__PURE__*/React.createElement("i", null, "without"), " performance loss", /*#__PURE__*/React.createElement(Cite, {
    p: "mech"
  }), ". Maybe certain tasks ", /*#__PURE__*/React.createElement("i", null, "want"), " a counter, not a fixed point."), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("b", null, "Alignment implications."), " If reasoning happens in latent space, faithful interpretability requires probes. We don't yet have probes that scale to frontier-size loops."))), /*#__PURE__*/React.createElement("section", {
    id: "implications",
    className: "section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sec-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "sec-num"
  }, "10"), /*#__PURE__*/React.createElement("h2", null, "Implications")), /*#__PURE__*/React.createElement("h3", null, "For deployment"), /*#__PURE__*/React.createElement("p", null, "A 1.4B looped model with R=4 acts like a 5B+ feedforward at inference, but fits in phone RAM. Combine with INT4 quantization (Hyperloop survives it) and you get edge-deployed reasoning that previously required server-side calls", /*#__PURE__*/React.createElement(Cite, {
    p: "hyperloop"
  }), "."), /*#__PURE__*/React.createElement("h3", null, "For reasoning"), /*#__PURE__*/React.createElement("p", null, "Reasoning becomes a ", /*#__PURE__*/React.createElement("i", null, "continuous"), " dial. Today's APIs charge by token; tomorrow's may charge by loop. Per-query difficulty estimation becomes a first-class deployment concern \u2014 and the model can do it itself via the Ponder gate or the KL threshold."), /*#__PURE__*/React.createElement("h3", null, "For interpretability and alignment"), /*#__PURE__*/React.createElement("p", null, "Cyclic fixed points are a gift to mech-interp: a stable steady-state is exactly the regime where probes and circuits are most informative. If looped models become the dominant reasoning architecture, interpretability may get ", /*#__PURE__*/React.createElement("i", null, "easier"), ", not harder", /*#__PURE__*/React.createElement(Cite, {
    p: "mech"
  }), "."), /*#__PURE__*/React.createElement("h3", null, "For research"), /*#__PURE__*/React.createElement("p", null, "Three frontiers worth watching: (a) looped + MoE, (b) per-token learned exits at scale, (c) stable looping recipes for non-language modalities (vision, code). Each is one good paper away.")), /*#__PURE__*/React.createElement("section", {
    id: "glossary",
    className: "section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sec-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "sec-num"
  }, "11"), /*#__PURE__*/React.createElement("h2", null, "Glossary")), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "var(--ink-muted)",
      fontSize: 14
    }
  }, "Terms with a dotted underline in the text show their definition on hover. The full list:"), /*#__PURE__*/React.createElement("table", {
    className: "tbl"
  }, /*#__PURE__*/React.createElement("tbody", null, Object.values(window.GLOSSARY_LIST || []).map(g => null), Object.entries({
    "Looped Transformer": "A transformer that re-applies the same block of layers multiple times. Same parameters, more compute.",
    "Residual stream": "The running vector each block reads from and writes to.",
    "Recurrence (R)": "Number of times the shared block is applied. R=1 is feedforward.",
    "Fixed point": "A state x* with f(x*) = x*. Looped layers can converge to one.",
    "Input injection": "Adding the original embedding back at every recurrence so the prompt is never forgotten.",
    "Stages of inference": "Lad et al.'s four-phase view: detokenize → features → reasoning → predict.",
    "Test-time compute (TTC)": "Compute spent at inference. Loops are a way to spend it without verbalizing.",
    "Spectral norm": "Largest singular value. >1 in a recurrence → exponential divergence.",
    "Hyper-connection": "Matrix-valued residual that lets parallel residual streams mix between blocks.",
    "Ponder gate": "Ouro's learned exit head — outputs a stop probability per loop.",
    "Logit lens": "Project intermediate residuals through the unembed to read intermediate predictions.",
    "Early exit": "Stopping computation when a confidence proxy says 'good enough'.",
    "ACT": "Adaptive Computation Time — Graves '16 mechanism for learned per-token halting."
  }).map(([k, v]) => /*#__PURE__*/React.createElement("tr", {
    key: k
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      width: 180,
      fontWeight: 500
    }
  }, k), /*#__PURE__*/React.createElement("td", {
    style: {
      color: "var(--ink-soft)"
    }
  }, v)))))), /*#__PURE__*/React.createElement("section", {
    id: "papers",
    className: "section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sec-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "sec-num"
  }, "12"), /*#__PURE__*/React.createElement("h2", null, "Papers cited")), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "var(--ink-muted)",
      fontSize: 14
    }
  }, "The five papers grounding this v0.4. Hover any ", /*#__PURE__*/React.createElement("span", {
    className: "cite"
  }, "cite"), " in the text to jump here."), ["huginn", "ouro", "mech", "parcae", "hyperloop"].map(id => /*#__PURE__*/React.createElement(PaperCard, {
    key: id,
    id: id
  }))), /*#__PURE__*/React.createElement("section", {
    id: "changelog",
    className: "section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sec-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "sec-num"
  }, "13"), /*#__PURE__*/React.createElement("h2", null, "Changelog"), /*#__PURE__*/React.createElement("span", {
    className: "sec-tag gray"
  }, "Live doc")), /*#__PURE__*/React.createElement("div", {
    className: "changelog-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "when"
  }, "2026-04-24", /*#__PURE__*/React.createElement("span", {
    className: "ver"
  }, "v 0.4")), /*#__PURE__*/React.createElement("div", {
    className: "what"
  }, /*#__PURE__*/React.createElement("b", null, "Added Hyperloop & Parcae."), "New \"stability & scaling laws\" section. Architecture zoo now includes hyper-connections and negative-diagonal injection. Updated the depth-budget allocator with Parcae's predicted laws.")), /*#__PURE__*/React.createElement("div", {
    className: "changelog-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "when"
  }, "2025-12-02", /*#__PURE__*/React.createElement("span", {
    className: "ver"
  }, "v 0.3")), /*#__PURE__*/React.createElement("div", {
    className: "what"
  }, /*#__PURE__*/React.createElement("b", null, "Mechanistic analysis section."), "Folded Blayney et al.'s fixed-point / orbit / slider taxonomy into the mechanism story. New PCA scrubber on the figure pane.")), /*#__PURE__*/React.createElement("div", {
    className: "changelog-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "when"
  }, "2025-10-30", /*#__PURE__*/React.createElement("span", {
    className: "ver"
  }, "v 0.2")), /*#__PURE__*/React.createElement("div", {
    className: "what"
  }, /*#__PURE__*/React.createElement("b", null, "Ouro added; latent-vs-CoT section."), "Reframed test-time compute around per-token learned exits.")), /*#__PURE__*/React.createElement("div", {
    className: "changelog-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "when"
  }, "2025-02-10", /*#__PURE__*/React.createElement("span", {
    className: "ver"
  }, "v 0.1")), /*#__PURE__*/React.createElement("div", {
    className: "what"
  }, /*#__PURE__*/React.createElement("b", null, "Initial draft."), "Skeleton + Huginn (recurrent depth) walkthrough. Two-pane layout shipped."))), /*#__PURE__*/React.createElement("hr", {
    className: "rule"
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12,
      color: "var(--ink-faint)",
      fontFamily: "var(--mono)",
      letterSpacing: "0.04em"
    }
  }, "END \xB7 v 0.4 \xB7 2026-04-24 \xB7 next update when the next looping paper drops"));
}
window.Sections = Sections;