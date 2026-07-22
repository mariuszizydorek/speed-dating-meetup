# Credit Trading Terminal — Design System

A dark, dense, Bloomberg-style terminal for an institutional **credit / FX
swap trading desk**. The product is a multi-panel workstation where a
trader (e.g. a market-maker at Citadel, JPM, Barclays) manages priority
RFQs, prices live two-way quotes, monitors the trade blotter, and asks an
AI assistant for context — all on a single screen at once.

> **One frame, one product.** The Figma file contains a single
> 1024×600 schematic of the *Credit Trading View*; everything else in
> this repo is derived from that frame. Where the artboard uses
> half-scale type (6–11px), the design system promotes those sizes to
> the 12–22px range a real desktop terminal would ship.

---

## Sources

| | |
|---|---|
| **Figma file** | "Trial for Design System.fig" — single page, single top-level frame `/Page-1/Credit-Trading-View` (node `0:4`), 1024×600 |
| **Codebase** | Not provided |
| **Brand book** | Not provided |
| **Sample copy** | The Figma frame itself — instrument tickers, trader names, status labels, the AI placeholder string, the assistant intro copy |

The Figma file is mounted to my virtual filesystem; if you have access to
the same file the equivalent paths under `/Page-1/Credit-Trading-View/`
match 1:1 with the frame names.

---

## What's in this folder

```
.
├── README.md                  ← you are here
├── SKILL.md                   ← Agent-Skill-compatible front matter so this folder
│                                works as a Claude Code skill
├── colors_and_type.css        ← every design token: palette, type scale,
│                                spacing, radii, semantic classes
├── assets/
│   └── ai-sparkle.svg         ← the four-point sparkle for the Assistant header
├── preview/                   ← the swatch / specimen cards that populate
│                                the Design System tab
├── ui_kits/
│   └── credit_trading_view/   ← interactive recreation of the source frame,
│                                broken into reusable JSX components
└── fonts/                     ← (Lato is loaded from Google Fonts; this
                                  folder is reserved for licensed swaps)
```

---

## Content fundamentals

The product speaks in **terminal English**: dense, abbreviated, almost
no full sentences. The only place voice softens is the AI assistant.

| Surface | Voice |
|---|---|
| Panel titles | Two/three-word, title-case: *Priority RFQs*, *RFQ Inbox*, *Trade Blotter*, *Swap USD/HKD*, *Assistance* |
| Form labels | One word, sentence case: *Notional*, *Value date*, *Spot*, *CVA*, *Fwd*, *Margin* |
| Action labels | One word, capitalized: *Submit*, *Newest*, *Won*, *Lost*, *Live*, *OTW* |
| Tickers & values | Conventional abbrev, no decoration: `SIE 6.42 10/10/35`, `1.4m`, `7.2941`, `48,000` |
| Status | `Live` · `Won` · `Lost` · `OTW` (on-the-wire). Past-tense for outcome states, present-tense for in-flight |
| Trader names | First-name + last-name, no titles: `Ian Crew`, `Tiane Richards` |
| Counterparties | Common-name only: `Citadel Securities`, `JPM Investors Ch...` (truncated mid-word when needed) |
| Meta | Ultra-terse, colon-separated: `Sent to: 3`, `Hit rate: 52%`, `35% keen` |

**Casing.** Title-case for every panel header and chip. Sentence-case for
field labels and inline copy. SCREAMING-CAPS reserved for the SELL/BUY
side badge inside an RFQ card.

**I vs you.** The assistant addresses the trader as "you" and refers to
itself in first person: *"Hi, I'm your assistant. Ask me anything, or
pick a suggestion to get started."* Numeric copy elsewhere is voice-less.

**Emoji.** None. Iconography is Font Awesome 6 Sharp + Font Awesome 6 Pro
(see ICONOGRAPHY below).

**Numbers.** Tabular figures throughout (`font-variant-numeric:
tabular-nums`). Quantities show K/M suffix when ≥ 1,000 (`1.1m`, `1.2m`,
`48000` is kept long when precise). Prices to 3–5 decimals
(`99.875`, `7.2941`). Negative quantities render red and unsigned of
sign except for the minus (`-687`, `-55,000`).

---

## Visual foundations

### Substrate
* **App background is pure black** (`#000`), used as the inter-panel
  gutter. Every floating panel sits on the near-black surface
  `#0A0C0F` — 6% lighter than the gutter, just enough separation in
  daylight.
* **Inset cards** (e.g. the Spot/CVA/Fwd/Margin block) shift one step
  cooler to slate-blue `#2E3541` with a half-pixel `#505050` border.
* **No drop shadows under panels.** The depth cue is colour-on-colour,
  not blur.
* The **AI Assistance** panel is the *only* surface that uses a
  gradient — a tight radial vignette in cool slate blue
  (`radial-gradient(rgba(20,34,56,.7) 31%, rgba(4,4,4,.1) 100%)`)
  framed by a 1px `#3A3939` border. Treat it as a special-case
  treatment, not a reusable card.

### Colour vibe
* The neutrals lean **cool slate**, never warm grey, with one outlier:
  the SELL RFQ card outline (`#756B6B`) shifts the warmest in the file.
* **Two signal colours do nearly all the work**: mint
  (`#39E9A9` / `#2CFFAA`) for *Won*, *keen*, "up" and the AI brand
  itself; crimson (`#BD3333`) for *Lost* and short quantities.
* Blue is informational, not signal: the **Submit** CTA is
  `#19609F`; on-the-wire status uses the softer `#8CA7EC`.
* The AI sparkle is a vertical gradient from mint
  (`#2CFFAA`) at 0% to sky-blue (`#6A99FF`) at 75%, sitting on a
  22-px-radius mint pulse shadow.

### Type
* **One family, one tracking value.** Lato Regular with
  `letter-spacing: -0.02em` everywhere. There is no italic, no monospace,
  no display face. The artboard literally uses six weights of *nothing
  but Lato Regular* at 5/6/7/8/9/11/12 px — all promoted in
  `colors_and_type.css`.
* **Numbers are tabular** so columns of prices stay aligned in the RFQ
  inbox and trade blotter.

### Borders, dividers, radii
* **Hairlines are everywhere**, in four discrete greys
  (`#3D3D3D`, `#585858`, `#505050`, `#384253`). They separate panel
  header from body, table rows from each other, and inputs from their
  surface. They are always 1px, always full-bleed inside their panel.
* **Corner radius is conservative**: 2px on cards/inputs/dropdowns/RFQ
  tiles, 4px on the assistant composer. Panels themselves are
  **square-cornered**.
* **Inputs are flat borders, no fill**, ghosting on a slate-blue stroke
  (`#384253`).

### Backgrounds & imagery
* No photography, no illustration. The only graphical asset in the
  entire frame is `assets/ai-sparkle.svg` — a four-point sparkle
  rendered as a gradient `Union`.
* No repeating patterns, no textures, no grain.

### Layout rules
* The terminal is **panel-based**, hard-edged, with consistent 8-px
  outer gutters and 16-px panel padding.
* Panels are **sized to content**, never stretched. The four columns
  on the source frame are 120 / 305 / 278 / 289 px — not 25%/25%/25%/25%.
* The AI Assistance panel is the rightmost column, full-height. The
  Trade Blotter is the bottom row, spanning the three left panels.
* **Fixed elements**: the Submit CTA pins to the bottom of the swap
  detail panel; the composer pins to the bottom of the AI panel; panel
  titles pin to the top of each panel above their hairline divider.

### Motion
The source frame is static, so motion is *suggested* rather than
specified. The system below is the default the UI kit ships with — feel
free to override.
* **Default easing**: `cubic-bezier(0.2, 0, 0, 1)` ("emphasized
  decelerate") — snappy enough for trading UI.
* **Default duration**: 120ms for hovers, 180ms for state changes, 280ms
  for panel collapses.
* **Live-data flashes**: mint pulse on a row when its price updates
  (200ms in, 600ms hold, 400ms fade). Red pulse on bid-side ticks down.
* **No bounces, no spring.** Bouncy motion is wrong for a trading desk.

### States
* **Hover** raises the background one step toward `#191C21`. No outline
  change, no text colour change.
* **Press** drops the background back to surface and dims text to
  `#ADA9A9` for 60ms.
* **Selected / active**: 1px inner stroke in the relevant signal colour
  (mint for "in progress", blue for "informational").
* **Disabled**: 40% opacity on the whole element, no other change.

### Transparency & blur
Transparency is used **only** in the Assistance panel vignette and in
the mint-glow pulse beneath the sparkle. No backdrop-blur surfaces.

### Cards — anatomy in one line
> Square panel surface + hairline divider under the title + tabular-num
> body + a single accent only where a signal is being communicated.

---

## Iconography

The source frame uses **Font Awesome 6 Sharp** (Regular + Solid) for
in-panel chrome — the kebab menus, dropdown chevrons, filter funnel,
arrow markers — and **Font Awesome 6 Pro Light** (14px) for the larger
assistant-composer toolbar icons (attach, history, send). No icons are
inlined as SVG except for `assets/ai-sparkle.svg`.

There is no in-house icon font. There is **no emoji and no unicode
icons**.

**Substitution flagged to the user:** the source file references Font
Awesome 6 Sharp + Pro, which are commercial. The UI kit pulls the free
Font Awesome 6 CDN, which gives the same glyph shapes for the icons
actually used in the source (kebab, chevron-down, filter, paperclip,
list, paper-plane). If you ship to production, replace the CDN link
with your licensed Pro kit URL — the class names will match. The
sparkle is the actual original SVG from the file, not a substitute.

---

## Index of files

| Path | What it is |
|---|---|
| `colors_and_type.css` | All design tokens + semantic CSS classes (`.ctt-display`, `.ctt-panel-title`, `.ctt-cell`, …) |
| `assets/ai-sparkle.svg` | The four-point gradient sparkle used in the Assistance panel |
| `preview/*.html` | The swatch / specimen / component cards that populate the **Design System** tab |
| `ui_kits/credit_trading_view/index.html` | Click-through recreation of the source frame |
| `ui_kits/credit_trading_view/README.md` | Notes on the UI kit and its components |
| `SKILL.md` | Agent-Skill front matter — lets this folder be downloaded and used as a Claude Code skill |

---

## Caveats

* **Lato webfont** is loaded from Google Fonts. This is the same family
  the Figma file specifies, but if your team has a licensed/self-hosted
  copy (or a desktop variant with different hinting), drop it into
  `fonts/` and update the `@import` at the top of
  `colors_and_type.css`.
* **Font Awesome** is loaded from the free 6.5 CDN; replace with your
  Pro kit URL for production.
* **Spacing scale** is inferred from one frame. If a full system spec
  appears, real spacing tokens may diverge from the 4/8/12/16/24/32
  ladder used here.
* **Motion specs** are not present in the source file — the values in
  the "Motion" section above are sensible terminal defaults, not
  documented brand standards.
