/* global React */
const { G, Eq, Cite, PaperCard, PAPERS } = window;

function Sections() {
  return (
    <>
      {/* ====================================================== */}
      <section id="what" className="section">
        <div className="sec-head">
          <span className="sec-num">01</span>
          <h2>What is a looped transformer?</h2>
          <span className="sec-tag gray">Intuition</span>
        </div>

        <div className="tldr">tldr</div>
        <div className="tldr-body">
          A normal transformer stacks <i>K</i> distinct blocks of layers; the residual stream passes
          through each block exactly once. A <b>looped transformer</b> applies a single shared block <i>R</i> times.
          Same parameters, more compute. The residual stream re-enters the same weights again and again.
        </div>

        <p className="lede">
          Picture the transformer as a tall building. In the ordinary version, every floor has its own
          interior — its own attention heads, its own MLP — and the elevator (the <G k="residual stream">residual
          stream</G>) rides up once and exits at the top. A looped transformer is a much shorter building, but
          the elevator goes up, down, and back up the same few floors several times before the doors open.
          Same architecture; <i>different schedule</i>.
        </p>

        <p>
          Concretely, a looped model has three stretches of layers: a short <b>prelude</b> that maps embeddings
          into the working space, a <b>recurrent block</b> whose weights are <i>shared</i> across iterations, and
          a short <b>coda</b> that decodes the final residual into a next-token distribution<Cite p="huginn"/><Cite p="hyperloop"/>.
          The recurrence count <i>R</i> can be fixed (Hyperloop pins it to 3), stochastic (Huginn samples
          per-sequence), or learned per token (Ouro's <G k="ponder gate">Ponder gate</G>)<Cite p="ouro"/>.
        </p>

        <details className="deeper">
          <summary>Go deeper · the recurrence as a map<span className="deeper-tag">math · 2 min</span></summary>
          <div className="deeper-body">
            <p>Write the recurrent block as a function <code>f<sub>θ</sub></code> that maps the current residual
            and the original embedding to the next residual:</p>
            <Eq
              label="Recurrent residual update"
              expr="h<sub>t+1</sub> &nbsp;=&nbsp; f<sub>θ</sub>(h<sub>t</sub>, e) &nbsp;=&nbsp; A·h<sub>t</sub> &nbsp;+&nbsp; B·e &nbsp;+&nbsp; R(h<sub>t</sub>, e)"
              anno={[
                ["h", "the residual stream at recurrence t"],
                ["e", "the prelude output (input embedding) — re-injected at every step"],
                ["A,B", "linear projections; their spectral norms decide stability"],
                ["R", "the non-linear part: attention + MLP with shared weights θ"],
              ]}
            />
            <p>The model produces output via a coda <code>C(h<sub>R</sub>)</code> projected through the unembed.
            Every choice in the field — Parcae's diagonal <code>A</code>, Hyperloop's matrix-valued residual,
            Huginn's random <i>R</i> — is a different way of taming this map's behavior under iteration.</p>
          </div>
        </details>

        <h3>Three things to keep in your head</h3>
        <ol>
          <li><b>Parameters and compute decouple.</b> One shared block × R iterations = R<sub>×</sub> the FLOPs of a single block, but only 1× the memory.</li>
          <li><b>The residual stream is a state.</b> Looping turns the transformer into a discrete dynamical system over that state.</li>
          <li><b>R is a knob.</b> You can crank it at training time, at test time, or both — and that knob is what makes loops interesting.</li>
        </ol>
      </section>

      {/* ====================================================== */}
      <section id="why" className="section">
        <div className="sec-head">
          <span className="sec-num">02</span>
          <h2>Why loop?</h2>
          <span className="sec-tag gray">Motivation</span>
        </div>

        <div className="tldr">tldr</div>
        <div className="tldr-body">
          Three independent reasons converge on the same architecture: <b>parameter efficiency</b> (run a small
          model on a phone), <b>latent reasoning</b> (think without speaking), and <b>elastic test-time compute</b>
          (decide how hard to think, per query).
        </div>

        <h3>1 · Parameter efficiency</h3>
        <p>
          Edge devices have 8–16GB of RAM. Frontier-quality models don't fit. Looping lets you build a model
          whose <i>quality</i> tracks its <i>materialized</i> FLOPs while its <i>memory</i> tracks the
          single-block parameter count. Hyperloop hits the FLOPs of a depth-matched feedforward transformer
          using <b>~50% fewer parameters</b><Cite p="hyperloop"/>.
        </p>

        <h3>2 · Latent reasoning</h3>
        <p>
          Chain-of-thought turns the residual stream into text and back, which is wasteful — every "thought"
          must pass through the bottleneck of the unembedding. A looped model can keep iterating in the
          continuous latent space, capturing reasoning <i>not easily expressed in words</i><Cite p="huginn"/>.
          Ouro shows this can be baked into <b>pretraining</b>, not bolted on afterwards<Cite p="ouro"/>.
        </p>

        <h3>3 · Elastic test-time compute</h3>
        <p>
          With a learned exit, the model can spend more loops on hard tokens and fewer on easy ones — adaptive
          compute on the per-token level<Cite p="ouro"/>. Huginn shows that even <i>without</i> a learned exit,
          a simple KL-divergence threshold across loops works zero-shot<Cite p="huginn"/>.
        </p>

        <div className="callout">
          <span className="glyph">↻</span>
          <div><b>The unifying insight.</b> Each motivation pushes toward a different knob — but they all want
          the same thing: a model whose <i>depth at inference</i> is decoupled from its <i>parameter count</i>.</div>
        </div>
      </section>

      {/* ====================================================== */}
      <section id="zoo" className="section">
        <div className="sec-head">
          <span className="sec-num">03</span>
          <h2>The architecture zoo</h2>
          <span className="sec-tag">Updated 2026-04</span>
        </div>

        <div className="tldr">tldr</div>
        <div className="tldr-body">
          Six architectures covering a decade of the idea. They differ in <i>what</i> is shared, <i>how</i> R
          is chosen, and <i>how</i> instability is tamed.
        </div>

        <p>
          Use the comparator on the right to flip between them. The vocabulary is consistent: every modern
          looped model has a prelude, a shared recurrent block, and a coda. The interesting design decisions live
          in three places.
        </p>

        <table className="tbl">
          <thead>
            <tr><th>What</th><th>Choices in the wild</th><th>Trade-off</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><span className="arch">Parameter sharing</span></td>
              <td>full block (Universal, Ouro) · middle only (Huginn, Parcae, Hyperloop)</td>
              <td>tighter sharing → smaller memory; looser sharing → easier optimization</td>
            </tr>
            <tr>
              <td><span className="arch">Recurrence count R</span></td>
              <td>fixed (Hyperloop=3) · stochastic (Huginn 1..32) · learned per-token (Ouro)</td>
              <td>fixed = simple but rigid; stochastic = test-time scalable; learned = adaptive but extra training</td>
            </tr>
            <tr>
              <td><span className="arch">Stability mechanism</span></td>
              <td><G k="input injection">input injection</G> · <G k="hyper-connection">hyper-connections</G> · spectral-norm bounds (Parcae)</td>
              <td>without one of these, the residual norm explodes after a few loops</td>
            </tr>
          </tbody>
        </table>

        <details className="deeper">
          <summary>Go deeper · what changed in 2026<span className="deeper-tag">paper notes · 3 min</span></summary>
          <div className="deeper-body">
            <p><b>Parcae<Cite p="parcae"/></b> reframes looping as a non-linear time-variant dynamical system over the
            residual stream. By linearizing, they show instability comes from <i>large spectral norms</i> in the
            injection parameters. Their fix: discretize a negative-diagonal parameterization for <code>A</code>.
            Loss spikes disappear; scaling laws become predictable.</p>
            <p><b>Hyperloop<Cite p="hyperloop"/></b> notes that ordinary loops force every iteration through a single residual stream.
            Borrowing hyper-connections (Xie '26), they expand the residual into multiple parallel streams and
            mix them only at loop boundaries — extra expressivity at near-zero parameter cost.</p>
          </div>
        </details>
      </section>

      {/* ====================================================== */}
      <section id="mech" className="section">
        <div className="sec-head">
          <span className="sec-num">04</span>
          <h2>Mechanism: fixed points & cyclic trajectories</h2>
          <span className="sec-tag">New finding</span>
        </div>

        <div className="tldr">tldr</div>
        <div className="tldr-body">
          When a looped model trains <i>well</i>, each layer inside the recurrent block converges to its <i>own</i>
          <G k="fixed point">fixed point</G>. The block as a whole traces a stable cycle in latent space — and
          that cycle is what lets the model extrapolate past its training depth.
        </div>

        <p className="lede">
          This is the most intuition-shifting result in the field. <Cite p="mech"/> took recurrent models
          (Huginn, Ouro, retrofitted Llama) and watched the residual stream evolve recurrence by recurrence.
          What they saw, plotted in PCA, looks like the figure pinned on the right: each of the four layers in
          the cycle drifts toward a distinct attractor.
        </p>

        <p>
          Why does this matter? Because once each layer is at its fixed point, the <i>attention pattern</i>
          stabilizes. The model is no longer doing fresh work — it is sustaining the same computation in a
          stable orbit. From there, you can iterate <i>arbitrarily long</i> without breaking anything.
        </p>

        <div className="pull">
          "For many of the studied models each layer in the cycle converges to a distinct fixed point;
          consequently, the recurrent block follows a consistent cyclic trajectory in the latent space."
          <cite>— Blayney et al. 2025</cite>
        </div>

        <h3>Three regimes seen in practice</h3>
        <ul>
          <li><b>Fixed point.</b> Layer states stop moving. Most stable; best extrapolation. Huginn's typical regime.</li>
          <li><b>Orbit.</b> States cycle through a closed loop. Multi-scale cycles can occur — orbits within the block, orbits between recurrences.</li>
          <li><b>Slider.</b> The state drifts monotonically along a direction in latent space — a kind of "counter".</li>
        </ul>
        <p>
          Ouro 1.4B exhibits non-fixed-point behavior, and accordingly its quality degrades when test-time R
          exceeds training R<Cite p="ouro"/>. Huginn's quality stays flat past training depth — the difference
          tracks the existence of a stable fixed point<Cite p="mech"/>.
        </p>

        <details className="deeper">
          <summary>Go deeper · what makes the fixed point form?<span className="deeper-tag">mechanism · 4 min</span></summary>
          <div className="deeper-body">
            <p>Three architectural levers reliably encourage convergence:</p>
            <ol>
              <li><b>Input injection.</b> Re-add the prelude output at every step, so the recurrence is
              <code>h<sub>t+1</sub> = f(h<sub>t</sub>, e)</code> not <code>f(h<sub>t</sub>)</code>. Without it,
              the prompt is "forgotten" and the dynamics diverge.</li>
              <li><b>Recurrent block size.</b> The block must be deep enough to fit the four
              <G k="stages of inference">stages of inference</G>. Too few layers and the cycle can't carry the work.</li>
              <li><b>Normalization placement.</b> Pre-norm on each sub-layer with an extra norm at block exit
              keeps norms bounded across iterations.</li>
            </ol>
            <p>Parcae adds a fourth: a discretized negative-diagonal parameterization of the linear injection
            map, which directly bounds the spectral norm and eliminates the residual-explosion failure mode
            observed in earlier recipes<Cite p="parcae"/>.</p>
          </div>
        </details>
      </section>

      {/* ====================================================== */}
      <section id="stages" className="section">
        <div className="sec-head">
          <span className="sec-num">05</span>
          <h2>Stages of inference, repeated</h2>
        </div>

        <div className="tldr">tldr</div>
        <div className="tldr-body">
          Feedforward transformers organize computation into four stages: detokenization → feature build-up →
          reasoning → token prediction. Looped transformers learn to <i>repeat</i> all four stages once per
          recurrence — the recurrent block is itself a tiny feedforward transformer.
        </div>

        <p>
          Lad et al. (2024) characterized standard transformers as proceeding through four functionally distinct
          phases. The natural question for looped models: do they compress these stages into a single iteration,
          or do they repeat them? The answer turns out to be the latter.
        </p>

        <p>
          By measuring <i>ColSum concentration</i> (a proxy for attention sink behavior) and <i>mixing scores</i>
          across layers, <Cite p="mech"/> show that retrofitted Llama, Huginn, and small from-scratch looped models
          all exhibit <b>recurrent-block-wise stages</b>: each pass through the block looks like the four stages
          of a normal transformer, repeated.
        </p>

        <p>
          This has a clean interpretation. The model isn't doing <i>different</i> work per loop — it is doing
          <i>the same kind</i> of work, on a refined input. Each pass takes the previous pass's output, treats
          it as a fresh "prompt-like" representation, and runs another miniature inference cycle. Reasoning
          becomes iteration on a shared mental scratchpad.
        </p>

        <div className="callout">
          <span className="glyph">★</span>
          <div><b>Why this changes interpretability.</b> If the same stage-of-inference structure repeats per loop, then
          mech-interp tools developed for feedforward transformers — circuits, probes, <G k="logit lens">logit lens</G> —
          transfer almost directly to looped models. You just apply them per-iteration.</div>
        </div>
      </section>

      {/* ====================================================== */}
      <section id="stability" className="section">
        <div className="sec-head">
          <span className="sec-num">06</span>
          <h2>Training stability & scaling laws</h2>
          <span className="sec-tag">Updated 2026-04</span>
        </div>

        <div className="tldr">tldr</div>
        <div className="tldr-body">
          The classical failure mode is <b>residual explosion</b>: norms grow geometrically across loops.
          Parcae diagnoses this as a <G k="spectral norm">spectral-norm</G> problem and fixes it by parameterization.
          With stable training, FLOPs ↔ loops follows a predictable power law.
        </div>

        <p>
          Early looped recipes trained unstably. Loss spikes in the middle of training, recurrent-state norms
          swinging across many orders of magnitude. Prairie et al. trace this to the linearized recurrence:
          when the spectral norm of the injection matrix exceeds 1, repeated application is geometric divergence.
          They fix it structurally: parameterize <code>A</code> as a <i>negative diagonal</i>, then discretize it
          (zero-order hold), and the norm is bounded by construction<Cite p="parcae"/>.
        </p>

        <details className="deeper">
          <summary>Go deeper · the per-sequence sampling trick<span className="deeper-tag">training · 2 min</span></summary>
          <div className="deeper-body">
            <p>To train a model that can run at any R at test time, you train with random R per example.
            Naive per-batch sampling causes loss spikes — large recurrent residual jumps at the final
            recurrence destabilize the gradient.</p>
            <p>Parcae's fix: <i>per-sequence</i> sampling. Sample R<sub>i</sub> for each sequence in the batch;
            pad to the max R in the batch but let shorter sequences hold their state. The training objective
            becomes a better estimate of the steady-state fixed point and loss spikes vanish.</p>
          </div>
        </details>

        <h3>Scaling laws (so far)</h3>
        <p>
          With training stable, two laws emerge<Cite p="parcae"/>:
        </p>
        <ul>
          <li><b>FLOPs scaling.</b> At fixed parameter count, validation loss decreases as a predictable power
          law in loops × tokens — but loops and data must be increased <i>in tandem</i>, similar to the original
          Chinchilla relationship between parameters and tokens.</li>
          <li><b>Test-time scaling.</b> At inference, accuracy gains from extra loops follow a saturating exponential.
          Each task has a characteristic compute appetite; reasoning-heavy tasks have larger appetites.</li>
        </ul>

        <p>
          These laws are the reason the field is taking looping seriously now. Until 2026, looped training was
          a craft; now it has a recipe and a forecast.
        </p>
      </section>

      {/* ====================================================== */}
      <section id="ttc" className="section">
        <div className="sec-head">
          <span className="sec-num">07</span>
          <h2>Test-time compute scaling</h2>
        </div>

        <div className="tldr">tldr</div>
        <div className="tldr-body">
          A trained looped model can be run at <i>any</i> R at test time. Quality climbs along a saturating
          exponential. Huginn, trained to R=32, behaves at R=64 like a feedforward model with ~50B parameters.
        </div>

        <p>
          The scrubber on the right shows the canonical curves<Cite p="huginn"/>. ARC-Challenge saturates fast;
          OBQA saturates faster (it tests memorized facts, not reasoning); GSM8K keeps climbing well past R=32.
          The model has, in effect, an internal "thinking time" budget that pays off most on the tasks that
          need it.
        </p>

        <p>
          Two practical consequences:
        </p>
        <ul>
          <li><b>Zero-shot adaptive compute.</b> Compute the KL divergence between residuals at successive loops;
          stop when it falls below a threshold. No special training needed<Cite p="huginn"/>. Easy queries
          terminate in 4–8 loops; hard ones use 30+.</li>
          <li><b>Per-token early exit.</b> A learned exit head (Ouro's Ponder gate) gives even better quality at
          a given average loop count<Cite p="ouro"/>.</li>
        </ul>

        <details className="deeper">
          <summary>Go deeper · KV cache during multi-loop decoding<span className="deeper-tag">inference · 1 min</span></summary>
          <div className="deeper-body">
            <p>Naively, every loop maintains its own KV cache, blowing up memory by R×. Ouro finds that during
            <i>decoding</i> (but not prefill), <b>last-step-only</b> caching loses essentially nothing:
            78.92 → 78.85 on GSM8K with a 4× memory reduction<Cite p="ouro"/>. <i>Averaged</i> caching works too;
            <i>first-step-only</i> collapses (78.92 → 18.73). The final loop is where the action is.</p>
          </div>
        </details>
      </section>

      {/* ====================================================== */}
      <section id="vs-cot" className="section">
        <div className="sec-head">
          <span className="sec-num">08</span>
          <h2>Latent reasoning vs chain-of-thought</h2>
          <span className="sec-tag">Walkthrough</span>
        </div>

        <div className="tldr">tldr</div>
        <div className="tldr-body">
          Both models end up producing one token. The difference is <i>what happens between</i> the prompt and
          that token — and how much information survives the trip.
        </div>

        <p className="lede">
          The cleanest way to see this is to watch it happen. The figure on the right is a seven-step
          walkthrough: same question, same prompt, same final token, but two radically different paths
          through the interior of the model. Scrub through it before reading on.
        </p>

        <h3>The key asymmetry: bandwidth</h3>
        <p>
          A CoT model's "thinking" must pass through the vocabulary every step. A residual vector of ~4096
          continuous dimensions (roughly 65,000 bits of nuance) gets collapsed into a single token drawn from
          ~50,000 options — ~16 bits. Every reasoning step, the model throws away 99.97% of its internal state
          and reconstructs it from one word<Cite p="ouro"/>.
        </p>
        <p>
          A looped model's "thinking" never leaves the residual stream. Every loop is a full attention + MLP
          pass over the same wide vector. Eight loops = eight full passes of <i>uncompressed</i> reasoning.
          The final unembed happens <i>once</i>, at the end.
        </p>

        <div className="pull">
          "Yes, one token post latent space — but the state feeding the unembed carries orders of magnitude
          more worked-through thought than a CoT trace of the same compute."
          <cite>— the essential asymmetry</cite>
        </div>

        <h3>So why is looped more powerful for reasoning?</h3>
        <ol>
          <li>
            <b>No bottleneck tax.</b> Each CoT reasoning token costs one <i>full</i> forward pass AND loses
            almost all internal state; a looped iteration costs only the <i>middle block</i> (smaller) and
            preserves the full state<Cite p="huginn"/><Cite p="hyperloop"/>.
          </li>
          <li>
            <b>Parallel thoughts per loop.</b> A CoT step commits to one word. A loop can hold a superposition of
            partial deductions in different dimensions of the residual and integrate them. This is why loops
            capture reasoning "not easily expressed in words"<Cite p="huginn"/>.
          </li>
          <li>
            <b>Structural faithfulness.</b> If you probe a CoT model, it may justify post-hoc; the trace isn't
            necessarily the cause. In a looped model, the cause <i>is</i> the residual trajectory — there's no
            other channel for reasoning to live in<Cite p="ouro"/>.
          </li>
          <li>
            <b>Elastic compute per query.</b> CoT spends compute in fixed-size units (a token). Loops spend it
            continuously — stop when converged<Cite p="huginn"/>.
          </li>
        </ol>

        <h3>But both end with one token — what's different?</h3>
        <p>
          You asked exactly the right question. Both models produce a single next token. What changes is the
          <i>information content</i> of the residual that feeds the unembedding layer. The CoT model's final
          residual was built by re-embedding 15 of its own tokens — a noisy, lossy process. The looped model's
          final residual was built by 8× of uncompressed deliberation on the same 4096 dimensions.
        </p>
        <p>
          On GSM8K, this gap is visible: Huginn at R=32 matches a feedforward model of ~50B parameters despite
          having 3.5B<Cite p="huginn"/>. Ouro 1.4B matches Qwen3-4B on reasoning benchmarks<Cite p="ouro"/>. The
          one token at the end is the same; the <i>quality</i> of that token is higher because the hidden
          state beneath it is more worked-through.
        </p>

        <table className="tbl">
          <thead><tr><th>Axis</th><th>Chain-of-thought</th><th>Latent looping</th></tr></thead>
          <tbody>
            <tr><td>Medium</td><td>discrete tokens</td><td>continuous vectors</td></tr>
            <tr><td>Bandwidth / step</td><td>~16 bits</td><td>~65,000 bits</td></tr>
            <tr><td>Cost / step</td><td>1× full forward</td><td>1× middle block only</td></tr>
            <tr><td>Inspectability</td><td>readable</td><td>probe-able</td></tr>
            <tr><td>Faithfulness</td><td>often post-hoc</td><td>structural</td></tr>
            <tr><td>Train data</td><td>needs reasoning corpora</td><td>none required<Cite p="huginn"/></td></tr>
            <tr><td>Compute knob</td><td>length of generation</td><td>R (continuous)</td></tr>
          </tbody>
        </table>

        <p>
          The two are complementary, not opposed. The clearest path for frontier models likely combines both:
          latent loops for dense deliberation between tokens, CoT for the moments when externalizing genuinely
          helps. Think for a bit, jot a note, think again.
        </p>
      </section>

      {/* ====================================================== */}
      <section id="open" className="section">
        <div className="sec-head">
          <span className="sec-num">09</span>
          <h2>Open questions</h2>
        </div>

        <div className="tldr">tldr</div>
        <div className="tldr-body">
          Five questions the field has <i>not</i> answered yet — each one a paper waiting to happen.
        </div>

        <ol>
          <li>
            <b>Does the 50%-fewer-params win persist past 10B?</b> Hyperloop's experiments cap below 1B.
            The crossover with mixture-of-experts hasn't been mapped<Cite p="hyperloop"/>.
          </li>
          <li>
            <b>What determines per-task compute appetite?</b> Why does GSM8K saturate at R≈48 but OBQA at R≈8?
            Is it task length, knowledge density, branching factor, or something else? No theory yet.
          </li>
          <li>
            <b>Can looped models compose with sparse activation?</b> MoE-UT (Csordás '24) hints yes; large-scale
            evidence is missing. A looped model that loops a routed sub-block could be the next architectural step.
          </li>
          <li>
            <b>Is the fixed point the right mental model?</b> Some Huginn examples exhibit orbits or sliders
            <i>without</i> performance loss<Cite p="mech"/>. Maybe certain tasks <i>want</i> a counter, not a fixed point.
          </li>
          <li>
            <b>Alignment implications.</b> If reasoning happens in latent space, faithful interpretability requires
            probes. We don't yet have probes that scale to frontier-size loops.
          </li>
        </ol>
      </section>

      {/* ====================================================== */}
      <section id="implications" className="section">
        <div className="sec-head">
          <span className="sec-num">10</span>
          <h2>Implications</h2>
        </div>

        <h3>For deployment</h3>
        <p>
          A 1.4B looped model with R=4 acts like a 5B+ feedforward at inference, but fits in phone RAM.
          Combine with INT4 quantization (Hyperloop survives it) and you get edge-deployed reasoning that
          previously required server-side calls<Cite p="hyperloop"/>.
        </p>

        <h3>For reasoning</h3>
        <p>
          Reasoning becomes a <i>continuous</i> dial. Today's APIs charge by token; tomorrow's may charge by
          loop. Per-query difficulty estimation becomes a first-class deployment concern — and the model can do
          it itself via the Ponder gate or the KL threshold.
        </p>

        <h3>For interpretability and alignment</h3>
        <p>
          Cyclic fixed points are a gift to mech-interp: a stable steady-state is exactly the regime where probes
          and circuits are most informative. If looped models become the dominant reasoning architecture,
          interpretability may get <i>easier</i>, not harder<Cite p="mech"/>.
        </p>

        <h3>For research</h3>
        <p>
          Three frontiers worth watching: (a) looped + MoE, (b) per-token learned exits at scale, (c) stable
          looping recipes for non-language modalities (vision, code). Each is one good paper away.
        </p>
      </section>

      {/* ====================================================== */}
      <section id="glossary" className="section">
        <div className="sec-head">
          <span className="sec-num">11</span>
          <h2>Glossary</h2>
        </div>
        <p style={{ color: "var(--ink-muted)", fontSize: 14 }}>
          Terms with a dotted underline in the text show their definition on hover. The full list:
        </p>
        <table className="tbl">
          <tbody>
            {Object.values(window.GLOSSARY_LIST || []).map(g => null)}
            {Object.entries({
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
              "ACT": "Adaptive Computation Time — Graves '16 mechanism for learned per-token halting.",
            }).map(([k, v]) => (
              <tr key={k}>
                <td style={{ width: 180, fontWeight: 500 }}>{k}</td>
                <td style={{ color: "var(--ink-soft)" }}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ====================================================== */}
      <section id="papers" className="section">
        <div className="sec-head">
          <span className="sec-num">12</span>
          <h2>Papers cited</h2>
        </div>
        <p style={{ color: "var(--ink-muted)", fontSize: 14 }}>
          The five papers grounding this v0.4. Hover any <span className="cite">cite</span> in the text to jump here.
        </p>
        {["huginn", "ouro", "mech", "parcae", "hyperloop"].map(id => <PaperCard key={id} id={id} />)}
      </section>

      {/* ====================================================== */}
      <section id="changelog" className="section">
        <div className="sec-head">
          <span className="sec-num">13</span>
          <h2>Changelog</h2>
          <span className="sec-tag gray">Live doc</span>
        </div>

        <div className="changelog-row">
          <div className="when">2026-04-24<span className="ver">v 0.4</span></div>
          <div className="what">
            <b>Added Hyperloop & Parcae.</b>
            New "stability & scaling laws" section. Architecture zoo now includes hyper-connections and
            negative-diagonal injection. Updated the depth-budget allocator with Parcae's predicted laws.
          </div>
        </div>
        <div className="changelog-row">
          <div className="when">2025-12-02<span className="ver">v 0.3</span></div>
          <div className="what">
            <b>Mechanistic analysis section.</b>
            Folded Blayney et al.'s fixed-point / orbit / slider taxonomy into the mechanism story.
            New PCA scrubber on the figure pane.
          </div>
        </div>
        <div className="changelog-row">
          <div className="when">2025-10-30<span className="ver">v 0.2</span></div>
          <div className="what">
            <b>Ouro added; latent-vs-CoT section.</b>
            Reframed test-time compute around per-token learned exits.
          </div>
        </div>
        <div className="changelog-row">
          <div className="when">2025-02-10<span className="ver">v 0.1</span></div>
          <div className="what">
            <b>Initial draft.</b>
            Skeleton + Huginn (recurrent depth) walkthrough. Two-pane layout shipped.
          </div>
        </div>
      </section>

      <hr className="rule" />
      <p style={{ fontSize: 12, color: "var(--ink-faint)", fontFamily: "var(--mono)", letterSpacing: "0.04em" }}>
        END · v 0.4 · 2026-04-24 · next update when the next looping paper drops
      </p>
    </>
  );
}

window.Sections = Sections;
