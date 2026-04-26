# Skill: Interactive Research Explainer

You are building an interactive, long-form research explainer — a single-page web document that explains a technical topic in depth, grounded in source papers. The output is a static HTML/CSS/JS bundle (no build step, no framework). The design is inspired by Reuters Graphics, NYT Upshot, and FT Visual Storytelling.

## Output

Three files in a folder named `{topic-slug}_files/`:

| File | Purpose |
|------|---------|
| `index.html` | Three-pane layout: sidebar TOC + narrative + pinned figure pane |
| `style.css` | Design system (copy the reference below, then adapt the accent color) |
| `script.js` | Scroll-driven figure switching + walkthrough logic |
| `figures.js` | Interactive SVG figures (one `initFigN(el)` function per figure) |

---

## 1 · Design System

### Color palette (light mode, warm neutral)

```css
:root {
  --bg:          #f7f6f4;   /* page background */
  --bg-tint:     #f0efec;   /* recessed surface */
  --paper:       #fdfcfa;   /* card / elevated surface */
  --rule:        #e2e0dc;   /* hairline borders */
  --rule-strong: #ccc9c4;   /* heavier borders */
  --ink:         #1a1817;   /* primary text */
  --ink-soft:    #46423d;   /* secondary text */
  --ink-muted:   #7a756e;   /* tertiary text */
  --ink-faint:   #a39e96;   /* labels, captions */

  --accent:      #9b4a3a;   /* warm oxblood — CHANGE per topic */
  --accent-soft: #f3ece8;   /* accent tint for backgrounds */
  --accent-line: #c9a698;   /* accent for borders */

  --teal:        #4a7a7a;   /* secondary color (diagrams only) */
  --teal-soft:   #e8f0f0;

  --serif: 'Source Serif 4', Georgia, serif;
  --sans:  'Inter Tight', 'Inter', -apple-system, sans-serif;
  --mono:  'JetBrains Mono', Menlo, monospace;
}
```

### Typography rules

| Role | Font | Size | Weight |
|------|------|------|--------|
| Hero title | `--sans` | 48px | 500, with `<em>` in `--serif` italic + accent color |
| Section title (h2) | `--sans` | 26px | 500 |
| TLDR body | `--serif` | 18px | 400, with left border accent |
| Body text (p) | `--sans` | 16px | 400 |
| Labels, captions, figure nums | `--mono` | 9–11px | uppercase, letter-spacing .06em |
| Pull quotes | `--serif` | 21px | italic, left border accent |

### Key rules

- **Never use blue.** The accent is always a warm tone (oxblood, amber, olive, etc.).
- Monospace is for chrome, labels, numbers. Serif is for emphasis, TLDRs, quotes. Sans is for everything else.
- Every interactive control uses the `.btn`, `.seg`, or `input[type="range"]` classes.
- All transitions are 0.12–0.35s ease. No jarring jumps.

---

## 2 · Three-Pane Layout

```
┌──────────────────────────────────────────────────────────────┐
│ .topbar  (sticky, blur backdrop, brand + meta pills)        │
├────────┬──────────────────────┬──────────────────────────────┤
│ .rail  │  .narrative          │  .figure-pane                │
│ 240px  │  max-width 620px     │  flex: ~1.05fr               │
│ sticky │  scrolls normally    │  sticky, full viewport height│
│ TOC    │  sections, TLDRs,    │  .figure-slot (abs positioned│
│ items  │  prose, foldouts     │   one per figure, swap via   │
│        │                      │   IntersectionObserver)      │
└────────┴──────────────────────┴──────────────────────────────┘
```

### HTML skeleton

```html
<div class="topbar">
  <div class="brand"><span class="brand-mark"></span><span class="brand-title">TOPIC</span></div>
  <div class="meta"><span class="dot"></span>live · DATE<span class="pill">N papers</span></div>
</div>

<div class="shell">
  <aside class="rail">
    <h4>Contents</h4>
    <ul class="rail-toc">
      <li data-sec="SECTION_ID"><span class="num">01</span>Section title</li>
      <!-- ... -->
    </ul>
  </aside>

  <main class="narrative">
    <div class="hero">
      <div class="eyebrow">...</div>
      <h1 class="title">Question framing with <em>serif emphasis</em></h1>
      <p class="hero-deck">One-paragraph summary.</p>
    </div>

    <section class="sec" id="SECTION_ID">
      <div class="sec-head">
        <span class="sec-num">01</span>
        <h2>Section title</h2>
        <span class="sec-tag">TAG</span>
      </div>
      <div class="tldr-label">tldr</div>
      <div class="tldr-body">Serif summary paragraph.</div>
      <p>Body text...</p>
    </section>
    <!-- more sections -->
  </main>

  <aside class="figure-pane">
    <div class="figure-progress"><span></span></div>
    <div class="figure-frame">
      <div class="figure-slot" data-fig="1">
        <div class="figure-head">
          <span class="figure-num">Fig 1</span>
          <span class="figure-title">Title</span>
          <span class="figure-spacer"></span>
          <span class="figure-controls">pinned · scroll-driven</span>
        </div>
        <div class="figure-body"></div> <!-- JS populates this -->
      </div>
      <!-- more figure-slots -->
    </div>
  </aside>
</div>
```

---

## 3 · Scroll-Driven Figure Switching (script.js)

Each `<section class="sec" id="X">` maps to a figure number. An `IntersectionObserver` watches which section is in view and activates the matching `figure-slot`.

```js
document.addEventListener('DOMContentLoaded', () => {
  const sections = document.querySelectorAll('section.sec');
  const tocLinks = document.querySelectorAll('.rail-toc li');
  const figSlots = document.querySelectorAll('.figure-slot');
  const figProgress = document.querySelector('.figure-progress > span');

  // MAP: section id → figure number
  const FIGS = { 'intro': 1, 'mechanism': 2, 'comparison': 3 /* ... */ };

  const io = new IntersectionObserver(entries => {
    const vis = entries.filter(e => e.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
    if (!vis[0]) return;
    const id = vis[0].target.id;
    // Highlight active TOC item
    tocLinks.forEach(li => li.classList.toggle('active', li.dataset.sec === id));
    // Switch figure
    const fig = FIGS[id];
    if (fig) {
      figSlots.forEach(s => s.classList.toggle('active', +s.dataset.fig === fig));
      if (figProgress) {
        const total = Object.keys(FIGS).length;
        figProgress.style.width = (fig / total * 100) + '%';
      }
    }
  }, { rootMargin: '-30% 0px -55% 0px', threshold: 0 });

  sections.forEach(s => io.observe(s));

  // TOC click → smooth scroll
  tocLinks.forEach(li => {
    li.addEventListener('click', () => {
      const el = document.getElementById(li.dataset.sec);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
});
```

---

## 4 · Interactive Figures (figures.js)

Each figure is a function `initFigN(el)` that receives the `.figure-body` div and fills it with controls + SVG.

### Pattern: Init on DOMContentLoaded

```js
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.figure-slot').forEach(slot => {
    const fig = +slot.dataset.fig, body = slot.querySelector('.figure-body');
    if (!body) return;
    if (fig === 1) initFig1(body);
    if (fig === 2) initFig2(body);
    // ...
  });
});
```

### Figure types you should use

Pick from these patterns based on what the topic needs:

#### A · Animated SVG diagram (e.g. computation graph, architecture)

- Toggle buttons (`.seg`) to switch between modes (e.g. "Feedforward" vs "Looped")
- Play/Pause + range slider for animation scrubbing
- SVG rendered via `el.innerHTML` with template literals
- `requestAnimationFrame` loop for animation
- Sidebar with residual-bar visualizations or key-value stats

#### B · Interactive chart (e.g. scaling curves, PCA trajectories)

- Segmented toggle to switch chart views
- Range slider to control a parameter (e.g. R, temperature)
- SVG axes + paths rendered from data arrays
- Active data point highlighted with a circle + label
- Caption that updates with the current view

#### C · Comparator card grid (e.g. architecture zoo)

- Grid of clickable `.btn` cards
- Selected card expands into a detail panel with key-value traits
- No SVG needed — pure HTML

#### D · Step-through walkthrough (e.g. CoT vs Loop)

- Row of numbered `.step-btn` buttons
- Two side-by-side `.pane-box` containers (dual-fig)
- Each step renders different content into both panes
- Token chips (`.tok.prompt`, `.tok.gen`, `.tok.ans`)
- Animated residual bars (`.resid-bar` with `.dim` children)
- Loop progress dots (`.loop-dots` with `.ld` children)
- Bandwidth chip (`.bw-chip`) showing data flow
- Final ledger comparison (`.ledger` with `.ledger-row`)
- Keyboard nav (← →)
- Step caption (`.step-caption`)

#### E · Static comparison (e.g. inference stages)

- Two labeled tracks showing colored blocks
- Legend row below
- No interactivity needed — just well-structured HTML

---

A figure is not decoration. It should show a state transition, comparison, scaling behavior, failure mode, or mechanism that prose alone would make slower to understand.


## 5 · Narrative Components

### Section structure

Every section follows this skeleton:

```html
<section class="sec" id="SLUG">
  <div class="sec-head">
    <span class="sec-num">NN</span>
    <h2>Title</h2>
    <span class="sec-tag">TAG</span>  <!-- or sec-tag gray -->
  </div>
  <div class="tldr-label">tldr</div>
  <div class="tldr-body">One-paragraph serif summary.</div>
  <p class="lede">Opening paragraph (slightly larger).</p>
  <p>Body text...</p>
</section>
```

### Available narrative elements

| Element | Class | When to use |
|---------|-------|-------------|
| TLDR | `.tldr-label` + `.tldr-body` | Top of every section. Serif, accent border. |
| Pull quote | `.pull` + `<cite>` | Key insight from a paper. Serif italic. |
| Callout box | `.callout` with `.glyph` | Important insight that crosses sections. |
| Go deeper | `<details class="deeper">` | Math, proofs, implementation details. |
| Comparison table | `<table class="tbl">` | Side-by-side trait comparison. |
| Paper card | `.paper-card` with `.yr` | Reference list at the end. |

### Prose guidelines

1. **Start with the question, not the answer.** The hero title should be a provocative "What if..." or "Why does..." framing.
2. **Every section opens with a TLDR** in serif. A reader who only reads TLDRs should get the full story.
3. **Body text builds intuition first, then precision.** Analogy → mechanism → equation (in a "Go deeper" foldout). Body text should move from concrete observation to mechanism to evidence. Use analogies only when they are precise and necessary.

4. **Use pull quotes** for the single most surprising finding from each paper.
5. **The figure pane does the heavy lifting** for visual/interactive content. The narrative text should reference "the figure on the right" and tell the reader what to do ("drag the slider", "step through the walkthrough").
6. **Depth is layered**: skim the TLDRs (2 min) → read the prose (15 min) → open the foldouts (30 min) → play with every figure (1 hr).

---

## 6 · Walkthrough Pattern (the signature interactive)

Every explainer should have ONE signature walkthrough — a step-by-step comparison or demonstration that is the core "aha" of the topic. This goes in the figure pane.

### Structure

```
┌─────────────────────────────────────────────┐
│ Fig N · Title                    pinned     │
├─────────────────────────────────────────────┤
│ [01] [02] [03] [04] [05]     ← → to nav    │
├─────────────────────────────────────────────┤
│ "Question or example prompt"                │
├─────────────────────────────────────────────┤
│ STEP N · STEP TITLE                         │
├───────────────────┬─────────────────────────┤
│ ● Method A        │ ● Method B              │
│   thinks in X     │   thinks in Y           │
├───────────────────┼─────────────────────────┤
│                   │                         │
│  [content that    │  [content that          │
│   changes per     │   changes per           │
│   step]           │   step]                 │
│                   │                         │
├───────────────────┴─────────────────────────┤
│ What's happening: step explanation          │
└─────────────────────────────────────────────┘
```

### Implementation checklist

- [ ] Define a `STEPS` array: `[{ k: 'step-key', title: '...', cap: '...' }, ...]`
- [ ] `showStep(n)` renders both panes and updates the caption
- [ ] Step buttons highlight active (`.active`) and visited (`.done`)
- [ ] Keyboard arrows navigate steps
- [ ] At least one step should have animation (e.g. loop dots filling, residual bars morphing)
- [ ] Final step should be a "ledger" — a side-by-side numeric comparison

---

## 7 · Checklist Before Shipping

- [ ] All sections have: sec-head, TLDR, body text
- [ ] All figure slots have a matching `initFigN` in `figures.js`
- [ ] `FIGS` map in `script.js` connects every section to a figure
- [ ] TOC `data-sec` attributes match section `id` attributes
- [ ] At least one "Go deeper" foldout per topic
- [ ] At least one pull quote from a source paper
- [ ] The signature walkthrough has 5–8 steps
- [ ] Keyboard nav (← →) works on the walkthrough
- [ ] The hero title uses `<em>` for the serif-italic accent word
- [ ] No blue anywhere. Accent is warm.
- [ ] Works on `file://` (no CORS, no external fetches except Google Fonts)
- [ ] Responsive: on narrow screens, sidebar and figure pane hide gracefully

---

## 8 · Adapting for a New Topic

1. **Choose an accent color.** Pick a warm hue that fits the topic's mood. Update `--accent`, `--accent-soft`, `--accent-line` in `:root`.
2. **Outline 8–12 sections.** Start with "What is X?", "Why does X matter?", then the specific mechanisms/findings, then "Open questions" and "Papers cited".
3. **Map sections to figures.** Each section should ideally have a companion figure. Some figures can be shared across 2–3 sections.
4. **Design the walkthrough.** What is the ONE comparison or process that, if animated step-by-step, would give the reader the deepest "aha"? That becomes your Fig N walkthrough.
5. **Write TLDRs first.** If you read only the TLDRs top to bottom, the full story should be clear.
6. **Fill in body text.** Analogy → intuition → mechanism → "Go deeper" for math.
7. **Build figures.** Start with the walkthrough, then add charts and diagrams.
8. **Test scroll behavior.** Make sure IntersectionObserver triggers figure switches at the right scroll positions.

---

## Reference Implementation

See `/data/topics/looped-transformers_files/` for a complete working example:
- `index.html` — 10 sections, 6 figures, full three-pane layout
- `style.css` — Complete design system (copy this as your starting point)
- `script.js` — Scroll-driven switching + 8-step CoT vs Loop walkthrough
- `figures.js` — 5 interactive SVG figures (computation graph, PCA trajectories, architecture zoo, depth-budget allocator, inference stages)
