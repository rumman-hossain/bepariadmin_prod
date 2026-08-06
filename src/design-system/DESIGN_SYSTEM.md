# BepariBD Admin — Design System

**Khata (খাতা) — a trader's ledger.** Brass is the only accent, the ground is
cool ruled paper, and money states carry a shape as well as a colour.

The direction is grounded in the subject rather than in dashboard convention. A
khata is the cloth-bound ledger South Asian traders have kept for centuries, and
this console is one. That is not decoration: the most serious defect found in
the prototype was a ledger that did *not* balance — the Payments screen and the
Accounting screen reported different amounts owed on the same order, because
each computed "advance" its own way in a React render path. A system whose
organising idea is *the columns must agree* makes that class of bug visible
instead of hiding it.

The palette comes from the objects in the room a bepari works in: brass tola
weights on a balance scale, cool ruled paper, verdigris on old brass, lac from
the binding thread.

Three constraints it is built around, in order. Operators look at this for eight
hours, so comfort at density beats impact — nothing glows or gradients. It is
other people's money in lakh and crore, so ambiguity about a number is the
expensive failure and ugliness is not. And red/green cannot be the primary
carrier of money state, because ~8% of men cannot separate them and here red
means *owed*.

Replaces Indigo & Jute. `guard:no-legacy-tokens` fails the build if an
`indigo-*` or `jute-*` name returns.

> This document is generated from the code, not from memory. `index.css` is the
> single source of truth for tokens; `npm run guard` fails the build if this
> file names a token that no longer exists.

---

## Rules

1. **Never hardcode a colour, radius, shadow or z-index.** Use the tokens.
   `guard:no-raw-color`, `guard:no-arbitrary` and `guard:no-raw-palette` fail
   the build on `#hex`, `bg-[…]` and `bg-red-50` respectively.
2. **Import from a barrel**, not a file path:
   `@/src/components/{layout/primitives,data,controls,feedback,forms}`.
3. **Compose from named parts.** If a screen needs a `<div>` with layout
   classes, that is a gap in the kit — close it here, do not work around it.
   The two Orders screens are the proof: 435 lines, zero `<div>`s, zero
   `className` attributes.
4. **Money goes through `<Money>` / `formatMoney`.** There is one grouping and
   one symbol. `guard:inline-money` fails on `৳{…}`; `guard:one-money-formatter`
   fails on a second `Intl` currency formatter — because a `formatCurrency`
   helper emitting `BDT 482,150.00` survived the first guard for months, on the
   product detail page and on the wizard step where prices are confirmed before
   publishing.
5. **Type roles come from `<Text>`.** `guard:label-spelling` fails on a
   hand-spelled uppercase micro-label. It had nineteen spellings across three
   sizes, three weights and three tracking values.

---

## Colour

Every ratio below is measured against `--color-paper` (`#FBFAF7`) and asserted
numerically in `src/components/layout/primitives/__tests__/tokens.test.ts` —
computed from `index.css` at test time, not copied from this table.

### Ink — text

| Token | Hex | On paper | Use |
|---|---|---|---|
| `--color-ink` | `#1A1A22` | 16.6:1 | primary text |
| `--color-ink-2` | `#3A3A48` | 10.7:1 | secondary text |
| `--color-ink-3` | `#5A5A6B` | 6.5:1 | tertiary, labels |
| `--color-ink-4` | `#6E6E80` | 4.8:1 | placeholder — the AA floor |
| `--color-ink-inverse` | `#FBFAF7` | — | text on dark fills |

### Indigo — structure

| Token | Hex | Use |
|---|---|---|
| `--color-brass` | `#2A2E6E` | primary action, active nav (11.7:1) |
| `--color-brass-hover` / `-active` | `#232760` / `#1C204F` | pressed states |
| `--color-brass-lift` | `#4B50A8` | hover, links (6.7:1) |
| `--color-brass-wash` | `#ECEDF7` | selected rows, subtle fills |
| `--color-brass-content` | `#FFFFFF` | text on brass (12.3:1) |
| `--color-brass-ring` | `#4B50A8` | focus outline |

### Jute — attention

The split is forced by measurement, not taste. `#A6641A` is **4.51:1** — too
close to the line to carry text safely, so it is a fill colour only and text
uses `warn`.

| Token | Hex | Use |
|---|---|---|
| `--color-warn` | `#A6641A` | **fills only** |
| `--color-warn` | `#8A5214` | attention *text* and icons (6.1:1) |
| `--color-warn-wash` / `-border` | `#FAF0E2` / `#E0BC86` | attention surfaces |

### Ground and rules

`--color-paper` `#FBFAF7` (app) · `--color-sheet` `#FFFFFF` (cards) ·
`--color-sheet-2` `#F6F4EF` · `--color-sheet-hover` · `--color-sheet-selected` ·
`--color-sheet-inverse`

`--color-rule-subtle` → `--color-rule` → `--color-rule-strong` →
`--color-rule-input` `#8B8B9C` (3.2:1, meets **SC 1.4.11** for control borders) →
`--color-rule-focus`

### Status

Four families, each with a text colour, a `-wash` and a `-border`:
`ok` `#1F6B4D` (6.2:1) · `warn` `#8A5214` (6.1:1) · `bad` `#A32B1E` (6.9:1) ·
`note` `#2A5CA8` (6.3:1) · plus neutral `mute`.

Charts get a **five**-step ramp (`--color-chart-1` … `--color-chart-5`) plus
`--color-chart-grid`, spread across **luminance** as well as hue so adjacent
series stay separable in greyscale — printed, photocopied, or by the ~8% of men
who cannot separate red from green. Adjacent rungs differ by at least 1.35×.

Five, not six, and the count is the design decision. Spreading six rungs far
enough to stay separable pushes the lightest below 3:1 against the sheet, where
a thin line stops being visible at all (measured at 2.10:1). A chart that
genuinely needs six series is a chart that should be a table.

Dark mode overrides every one of these in `.dark`, on a warm `#16151A` ground.

---

## Typography

**Inter Tight** (UI) + **IBM Plex Mono** (figures, identifiers) + **Noto Sans Bengali**
(৳ and future Bengali). Inter Tight and IBM Plex Mono are both Omnibus-Type, so they
pair by design rather than by accident. Inter Tight holds up at 13px in dense
tables; IBM Plex Mono is engineered and slightly wide, which suits Taka amounts
and SKUs — the two things operators scan for.

Ten steps, each with its own line height, from `--text-2xs` (11px, uppercase
micro-labels) through `--text-base` (14px, the body default) to `--text-4xl`
(44px). Note `--text-base` is **0.875rem**, not Tailwind's 1rem: this is a dense
data console, and the whole scale is shifted down one step from the web default.

Four weights. `bold` is deliberately absent — at 13–14px on a dense screen it
reads as noise, and `semibold` already carries the emphasis. `--font-weight-heavy`
exists for display figures only.

Tracking: `--tracking-tight` for headings, `--tracking-wide` and
`--tracking-caps` for uppercase runs — at 11px, letter-spacing is what makes
uppercase legible, not extra weight.

**Use `<Text>` rather than class strings.** Six named roles — `body`,
`secondary`, `caption`, `label`, `strong`, `error` — because the same intent was
being spelled ~40 ways, including two different spellings of the uppercase
micro-label.

---

## Space, size, depth

`--spacing-*` is a 4px base (`0, px, 1–6, 8, 10, 12, 16`). Use the `Stack` /
`Row` / `Grid` `gap` props rather than margin classes.

`--radius-xs` 3px → `--radius-2xl` 18px, plus `--radius-full`.

Three shadows only: `--shadow-raised` (cards), `--shadow-overlay` (popovers),
`--shadow-modal` (dialogs). More steps than that and nothing reads as elevated.

Containers: `--container-form` 46rem · `--container-prose` 42rem ·
`--container-wide` 90rem. Plus `--table-viewport` 70vh, which bounds a
`stickyHeader` table so its header has a scroll container to stick against.

### Stacking

```
base 0 → raised 10 → sticky 20 → nav 30 → overlay 40 → modal 50 → dropdown 60 → toast 70
```

**Dropdown sits above modal deliberately.** A combobox opened inside a dialog
must render over it, and a page-level dropdown can never collide with an open
modal because a modal traps focus behind a backdrop.

Two hard-won rules, both from bugs that shipped:

- A step is a **page-level** rank. Applying one inside an already-elevated
  container makes it rank against its own siblings instead — that is how the
  dialog backdrop (`--z-overlay`, 40) ended up painting over its own panel
  (`z-index: auto`) and made every confirm dialog in the app unclickable.
- `position: sticky` resolves against the **nearest scrolling ancestor**. An
  unbounded `overflow-auto` wrapper never scrolls, so a sticky header inside one
  does nothing at all.

### Motion

`--default-transition-duration` 150ms with `--ease-smooth` in, `--ease-exit`
out. Four named animations (`--animate-fade-in`, `-scale-in`, `-slide-up`,
`-shimmer`). All suppressed under `prefers-reduced-motion` by a global rule.

> There is no `--duration-*` namespace in Tailwind v4 — only
> `--default-transition-duration`. Anything declared under `--duration-*`
> compiles to nothing and silently does nothing. Do not add them.

---

## The kit

Import from the barrel. Every component carries its full props table in its own
docstring; this is the map, not the reference.

### Layout — `@/src/components/layout/primitives`

`Page` · `PageHeader` · `Section` · `Toolbar` · `Separator` · `Stack` · `Row` ·
`Grid` · `Columns` · `Panel`

The composition layer, and the reason building a screen used to mean writing
`div`s. Replaced 9 page roots across 5 rhythms, 33 grids in ~14 recipes, and 35
ad-hoc flex rows.

`Columns` takes `aside` as a prop, not a second child — the four hand-written
copies put the aside on different sides.

### Data — `@/src/components/data`

`Money` · `Text` · `Identifier` · `Badge` · `EmptyValue` · `DescriptionList` ·
`StatTile` · `StatGrid` · `Timeline` · `DataTable` · `formatMoney`

**`Money`** is the fix for money rendering two ways. Grouping is South Asian
2-2-3 via `en-IN` — `৳4,82,150`, not `৳482,150` — with the sign placed outside
the symbol, because prefixing `৳` to signed output gives `৳-5,000`, which puts
the minus where a digit belongs.

Pass `decimals` wherever figures are summed **on screen**: in a line-items table
a unit price of 4,821.50 rounds to 4,822, and 100 of those appear to make
482,200 against a stated subtotal of 482,150 — arithmetic that visibly does not
work, on the screen where a supplier dispute gets settled.

**`DataTable`** prefers `rowHref` over `onRowClick`: it renders a real link, so
rows get keyboard focus, Enter, middle-click and open-in-new-tab. Operators
working a queue use all four. Loading, error and empty are deliberately *not*
built in — they are `Skeleton`, `ErrorState` and `EmptyState`, because a table
that renders its own disagrees with the rest of the screen.

### Controls — `@/src/components/controls`

`Button` · `IconButton` · `Spinner` · `Input` · `Textarea` · `Select` ·
`Combobox` · `SegmentedControl` · `RadioGroup` · `Radio` · `Tabs` · `Popover` ·
`FileDrop` · `Stepper`

### Feedback — `@/src/components/feedback`

`Alert` · `Dialog` · `ConfirmDialog` · `Progress` · `ErrorState` · `EmptyState` ·
`Skeleton` · `SkeletonText` · `SkeletonStat` · `SkeletonStatGrid` ·
`SkeletonTable` · `SkeletonPage`

`EmptyState` has three variants because they mean different things: a fraud
screen showing zero flags reads as "no fraud detected" when the truth is
"detection is not running".

Region-level skeletons announce themselves (`role="status"`); the atomic
`Skeleton` bar is `aria-hidden`, because a grey rectangle is not information.
Pass `label={null}` when nesting one inside another — two live regions announce
the same load twice.

`ErrorState` never renders raw server text.

### Forms — `@/src/components/forms`

`Form` · `FormRow` · `FormActions` · `FormErrorSummary` · `FormField` ·
`FormSection`

---

## Adding a component

1. It belongs in one of the five barrels. If it does not fit any, question it.
2. Tokens only — the guards will catch you.
3. Props table in the docstring, plus **why it exists**: what it consolidates,
   or what was wrong with its predecessor.
4. Tests assert **DOM relationships**, not class strings. That is the shape that
   caught the peer-selector bug; a class snapshot would have passed.
5. It ships with a call site. A component with no consumer is dead code on
   arrival — 718 lines of the previous kit were exactly that.

---

## Writing

Name things by what the operator controls, not by how the system is built. Keep
one verb per action all the way through a flow — the button that says *Publish*
produces a toast that says *Published*.

Errors say what happened and what is still true (*"It is still processing"*),
never apologise, and never show the server's own words. Empty states say what to
do next. Distinguish *"there are none"* from *"none match this filter"* — they
are different facts and only one of them means something is wrong.

---

## Verifying

```bash
npm run verify   # typecheck → lint → tests → design-system guards
```

Nine guards, all in `scripts/guard.sh` rather than `package.json` — JSON
escaping silently broke three of them once, and a guard that matches nothing
passes. Every one is mutation-tested by `scripts/guard-selftest.sh`, which plants
a violation and confirms the guard fires.

That self-test is not ceremony. `guard:one-money-formatter` was written, ran
green against the real tree, and did **nothing** — its pattern matched only
single-quoted `currency: 'BDT'` while the planted violation used double quotes.
A guard is not a guard until you have watched it fail.

**What tests cannot see.** jsdom has no stylesheet, no stacking contexts and no
hit testing. Three real bugs — the unclickable dialog, the no-op sticky header,
and sortable headers rendering in a different case from plain ones — all passed
a green suite and needed `elementFromPoint` in a real browser. Walk a new screen
before calling it done.
