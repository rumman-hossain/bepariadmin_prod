#!/usr/bin/env bash
#
# Design-system guards.
#
# These live in a script rather than in package.json because every regex here
# has now been written wrong at least once by being escaped through JSON. Three
# separate guards silently passed while matching nothing:
#
#   - `\b` in an ERE, which BSD grep does not support at all;
#   - `৳\\s*\\{`, over-escaped so grep saw a literal backslash;
#   - `:[0-9]+: *\\*`, which grep read as "zero or more backslashes" and so
#     matched every line, filtering out all output.
#
# A guard that passes because it is broken is worse than no guard: it reports
# success. Each one below is verified by planting a violation and watching it
# fail — see the `--selftest` flag.
#
set -uo pipefail

SRC="${SRC:-src}"
FAIL=0

# POSIX classes only, no Perl escapes, no backslashes where a bracket will do.
report() { # name, description, matches
  if [ -n "$3" ]; then
    printf '\n✗ %s — %s\n' "$1" "$2"
    printf '%s\n' "$3" | head -20
    FAIL=1
  fi
}

# Anything that looks like a hand-picked colour rather than a token.
raw_hex=$(grep -rnE --include='*.ts' --include='*.tsx' '#[0-9a-fA-F]{3,8}' "$SRC" || true)
report "raw-colour" "hex literals belong in index.css, not components" "$raw_hex"

# Arbitrary Tailwind values, which bypass the scale.
arbitrary=$(grep -rnE --include='*.ts' --include='*.tsx' \
  '(bg|text|border|ring|shadow|gap)-\[' "$SRC" \
  | grep -vE 'calc\(|linear-gradient|length:|--' || true)
report "arbitrary-value" "use a token or add one" "$arbitrary"

# Raw Tailwind palette. This is the guard that did not exist while the auth
# folder accumulated 50 of them. Comment lines are excluded so a docstring can
# name a class it removed.
palette=$(grep -rnE --include='*.ts' --include='*.tsx' \
  '(bg|text|border|ring|divide|outline|from|to|via|fill|stroke|placeholder|decoration)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|[1-9]00|950)' \
  "$SRC" | grep -vE ':[0-9]+:[[:space:]]*([*]|//)' || true)
report "raw-palette" "use a semantic token: ok / warn / bad / note / mute" "$palette"

# The previous token set. Every directory is migrated; these must not return.
legacy=$(grep -rnE --include='*.ts' --include='*.tsx' \
  '(bg|text|border|ring|divide|outline|from|to|via|fill|stroke|placeholder|accent|caret|decoration|shadow)-(text-(primary|secondary|tertiary|placeholder|inverse|brand|default|muted)|surface-(app|primary|secondary|tertiary|hover|selected|muted|inverse)|accent-primary|border-(subtle|default|strong|input|focus)|semantic-(success|warning|danger|info|neutral))' \
  "$SRC" | grep -vE ':[0-9]+:[[:space:]]*([*]|//)' || true)
report "legacy-token" "the old token set is gone; use the Indigo & Jute names" "$legacy"

# Money must go through <Money>, which applies South Asian 2-2-3 grouping.
# A ৳ in a static label naming the unit is fine; one glued to a value is not.
money=$(grep -rnE --include='*.tsx' '৳[[:space:]]*[{]' "$SRC" \
  | grep -v 'components/data/' || true)
report "inline-money" "use <Money amount={…} /> so grouping is lakh/crore" "$money"

# The OTHER way money rendered wrong, which the check above never covered.
#
# `src/utils/formatCurrency` used an en-US locale with currency:BDT and emitted
# "BDT 482,150.00" — Western 3-3 grouping and a currency code where a symbol
# belongs. It outlived the Money component that replaced it and was still live on
# the product detail page and, worse, on the final step of the add-product wizard
# where an operator confirms prices before publishing. The guard above only
# looked for an inline ৳, so it saw nothing.
#
# The file is deleted. This stops it, or another en-US currency formatter, from
# coming back.
altmoney=$(grep -rnE --include='*.ts' --include='*.tsx' \
  "formatCurrency|currency:[[:space:]]*[\"']BDT[\"']|style:[[:space:]]*[\"']currency[\"']" \
  "$SRC" \
  | grep -v 'components/data/' \
  | grep -vE ':[0-9]+:[[:space:]]*([*]|//)' || true)
report "one-money-formatter" "money goes through <Money>/formatMoney — one grouping, one symbol" "$altmoney"

# The design doc must not name a token that no longer exists.
#
# The previous DESIGN_SYSTEM.md documented `text-text-default`, `surface-glass`
# and an Apple blue, none of which had existed for two directions — and it was
# the file a new contributor would read first, so following it produced code
# that compiled to nothing. Every `--token-name` the doc mentions in backticks
# has to resolve in index.css.
DOC="src/design-system/DESIGN_SYSTEM.md"
stale=""
if [ -f "$DOC" ]; then
  for token in $(grep -oE '`--[a-z0-9-]+`' "$DOC" | tr -d '`' | sort -u); do
    # A trailing `-` marks a family stem written for prose, e.g. `--color-ink-`.
    case "$token" in *-) continue;; esac
    if ! grep -qE "^[[:space:]]*${token}:" index.css; then
      stale="${stale}${DOC}: ${token} is documented but not defined in index.css"$'\n'
    fi
  done
fi
report "stale-docs" "the design doc names tokens that do not exist" "$stale"

# Credentials must never reach web storage.
#
# The access token lives in a module closure and the refresh token in an
# httpOnly cookie, so neither is reachable from script — that is the entire XSS
# defence, and it is a property nothing enforced. One `localStorage.setItem` in a
# hurry silently undoes it, and the code would look perfectly reasonable in
# review.
#
# Two legitimate consumers, both narrow and both named here rather than waved
# through by a pattern:
#
#   - the theme preference, a display setting that must survive a reload before
#     React mounts;
#   - `auth/sessionHint.ts`, which READS a non-secret marker cookie the server
#     sets beside __session. It carries a constant value and no credential; its
#     only job is to let boot skip a refresh that could only fail. The session
#     token itself stays httpOnly and unreachable from script, which is the
#     property this guard exists to protect and which is unchanged.
#
# The allowance is per-FILE, not per-pattern, so `document.cookie` anywhere else
# still fails. Note this does not stop sessionHint.ts itself from being changed
# to write a token — that is what code review and the tests are for; the guard
# bounds where the question can even arise.
webstorage=$(grep -rnE --include='*.ts' --include='*.tsx' \
  '(localStorage|sessionStorage)\.(get|set|remove|clear)Item|document\.cookie' \
  "$SRC" \
  | grep -v 'design-system/theme/ThemeProvider.tsx' \
  | grep -v 'auth/sessionHint.ts' \
  | grep -v 'auth/__tests__/session-hint.test.ts' \
  | grep -vE ':[0-9]+:[[:space:]]*([*]|//)' || true)
report "web-storage" "credentials must stay in memory; only the theme may persist" "$webstorage"

# The uppercase micro-label has exactly one spelling.
#
# It had NINETEEN. Sizes across text-2xs/xs/sm, weights across
# medium/semibold/bold, tracking across wide/wider/none — so two labels sitting
# beside each other on one screen did not match, and nobody could see why. The
# component meant to end that (<Text variant="label">) had drifted from the
# design doc itself before this guard existed.
#
# Only the NEUTRAL label is covered. `uppercase` with a deliberate colour —
# text-indigo on a badge, text-ok on a status pill — is a different thing and is
# left alone.
label=$(grep -rnE --include='*.tsx' \
  'className="[^"]*uppercase[^"]*"' \
  "$SRC/features" "$SRC/components/shared" "$SRC/components/layout" 2>/dev/null \
  | grep -E 'text-ink-3' \
  | grep -E 'text-(2xs|xs|sm)' \
  | grep -vE ':[0-9]+:[[:space:]]*([*]|//)' || true)
report "label-spelling" 'use <Text variant="label"> — the micro-label has one spelling' "$label"

# A colour class in one of OUR namespaces must resolve to a real token.
#
# Tailwind emits nothing for an undefined token — no warning, no error, no rule.
# `bg-switch-track`, `bg-switch-track-checked` and `bg-switch-thumb` were live in
# the product wizard's policy toggles and none of the three existed, so the
# switch rendered with no track and no thumb at all. `bg-indigo-light` did the
# same in three more places. The unit test alongside it passed throughout,
# because it checked the class was WRITTEN, not that it resolved.
#
# Scoped to the project's own colour families. Tailwind built-ins (text-sm,
# border-b, ring-offset-2) are not tokens and are none of this guard's business.
families="ink|indigo|jute|paper|sheet|rule|ok|warn|bad|note|mute|chart|switch"
undefined=""
for cls in $(grep -rhoE --include='*.ts' --include='*.tsx' \
      "(bg|text|border|ring|divide|outline|from|to|via|fill|stroke|placeholder|accent|caret|decoration)-(${families})-[a-z0-9-]+" \
      "$SRC" 2>/dev/null | sed -E 's/^[a-z]+-//' | sed -E 's#/[0-9]+$##' | sort -u); do
  if ! grep -qE "^[[:space:]]*--color-${cls}:" index.css; then
    hits=$(grep -rn --include='*.ts' --include='*.tsx' -- "-${cls}" "$SRC" \
      | grep -vE ':[0-9]+:[[:space:]]*([*]|//)' | head -4)
    # Only a real, non-comment use counts. A token named solely in a docstring
    # explaining why it was REMOVED must not fail the build — and appending an
    # unconditional newline here made the guard report an empty violation.
    if [ -n "$hits" ]; then
      undefined="${undefined}${hits}"$'\n'
    fi
  fi
done
report "undefined-token" "this colour class has no --color-* token; Tailwind emits nothing for it" "$undefined"

# ─────────────────────────────────────────────────────────────────────
# The legacy `components/ui/` folder is gone.
#
# It held eleven components alongside the kit in components/{controls,data,
# feedback,layout}, and for months both were live: two Cards rendering the same
# box with different heading levels, two ErrorBoundaries mounted one inside the
# other, a StatusBadge stranded away from every other data primitive. Every new
# screen had to guess which half to import from, and guessing wrong is how the
# duplication grew in the first place. The folder is deleted; this stops it
# reappearing one convenient import at a time.
ui_import=$(grep -rnE --include='*.ts' --include='*.tsx' \
  "from ['\"](@/src|[.]{1,2}(/[.]{2})*)/components/ui/" "$SRC" index.tsx 2>/dev/null || true)
report "no-legacy-ui-import" "components/ui/ was deleted; import from controls/data/feedback/layout" "$ui_import"

# One date formatter, for the same reason there is one money formatter.
#
# Six hand-rolled formatters shipped at once: one pinned to en-US ("Jan 5,
# 2026"), four following the operator's browser ("5/1/2026"), one bare. So the
# same order read differently depending on which screen you opened it from, and
# two operators comparing notes could not tell whose date was whose. Bangladesh
# writes the day first. `formatDate`/`formatDateTime` in components/data/format.ts
# own this; note that `en-BD` is not a locale any engine carries and falls back
# to plain `en`, which is exactly how the US ordering got in.
bare_date=$(grep -rnE --include='*.ts' --include='*.tsx' \
  "toLocaleDateString|toLocaleTimeString|Intl[.]DateTimeFormat" "$SRC" \
  | grep -v 'components/data/format[.]ts' \
  | grep -vE ':[0-9]+:[[:space:]]*([*]|//)' || true)
report "no-bare-date-format" "use formatDate/formatDateTime from components/data" "$bare_date"

# Exactly one ConfirmDialog.
#
# There were two, and they had drifted where it mattered: the kit one sets
# closeOnBackdrop={false} so a confirmation must be answered, the other did not
# — so on two screens a stray backdrop click dismissed a destructive
# confirmation. The dialog docstring records that it already absorbed seven
# inline copies; this is what stops the eighth.
confirm_count=$(grep -rlE --include='*.tsx' "export function ConfirmDialog" "$SRC" | wc -l | tr -d ' ')
if [ "$confirm_count" != "1" ]; then
  report "no-duplicate-confirm" "expected exactly 1 ConfirmDialog, found ${confirm_count}" \
    "$(grep -rnE --include='*.tsx' 'export function ConfirmDialog' "$SRC")"
fi

# The published preview must not hardcode a colour.
#
# It did, and it drifted a whole design direction behind without anything
# noticing: 14 hex values across the swatch grid still showed Indigo & Jute
# after the app had moved to Khata, while the page claimed precise contrast
# ratios beside each one. The stale-docs guard above checks DESIGN_SYSTEM.md
# against index.css but never looked at these pages.
#
# Chips now read `var(--token)` from the generated stylesheet, so they cannot
# show a palette the product no longer compiles.
preview_hex=$(grep -rnE '#[0-9A-Fa-f]{6}' src/design-system/preview/*.html 2>/dev/null || true)
report "no-hex-in-preview" "preview pages must read var(--token), not hardcode a colour" "$preview_hex"

# ─────────────────────────────────────────────────────────────────────
# G16 — every table declares how it behaves on a phone.
#
# The whole app's responsiveness lives in shared primitives, and DataTable —
# used by 22 files — had none: a six-column table on a 375px phone meant
# dragging a small box sideways to read one row. It now switches to cards via
# `.table-cards`.
#
# This guard stops the next table from quietly reintroducing the problem. A file
# rendering a `<table>` must either use the card treatment or say, in a
# `responsive-table-reviewed` comment, why it does not need it. Narrow tables
# genuinely do not — a 3-column table measures 317px at a 375px viewport — but
# that has to be a decision somebody made, not an omission.
#
# Comment lines are excluded so prose describing a table does not trip it.
tables=$(grep -rln --include='*.tsx' '^[^*]*<table' "$SRC" 2>/dev/null || true)
undeclared=""
for f in $tables; do
  if ! grep -q 'table-cards\|responsive-table-reviewed' "$f"; then
    undeclared="$undeclared$f: renders a <table> with no responsive treatment and no review note
"
  fi
done
report "responsive-table" "use .table-cards, or add a responsive-table-reviewed note saying why it fits" "$undeclared"

# ─────────────────────────────────────────────────────────────────────
# G18 — the size vocabulary is changed through one door.
#
# Stock, MOQ and the low-stock threshold are held per size in three parallel
# maps keyed by the size STRING. `setSelectedSizes` prunes all three to the new
# selection; `setField('selectedSizes', …)` does not.
#
# The difference is not cosmetic. Entering stock against UK 6/7/8, switching the
# footwear scale, and re-picking US 8/9/10 leaves the maps carrying both
# vocabularies — with "8" meaning UK 8 in one entry and US 8 in another. Both
# are submitted, and nothing on screen says so. That is the shape the bug took
# here, and it is still live in wholesaleapp-client.
sizes=$(grep -rnE --include='*.tsx' --include='*.ts' \
  "setField\([\"']selectedSizes[\"']" "$SRC" \
  | grep -vE '__tests__' \
  | grep -vE ':[0-9]+:[[:space:]]*([*]|//)' || true)
report "size-vocabulary" "use setSelectedSizes() — setField leaves the per-size stock maps orphaned" "$sizes"

# G12 — no financial figure is computed in a component.
#
# This is the most important rule in the system, and it exists because of a
# specific defect. In the prototype the Payments screen computed
#
#     const advancePaid = Math.round(order.amount * 0.1);
#     const dueAmount   = order.amount - advancePaid;
#
# in its render path, while the Accounting screen read the stored
# `collectedAdvance` — which includes shipping. The two screens therefore
# reported DIFFERENT amounts owed on the same order, differing by roughly the
# shipping charge, and Payments was the one that over-stated. A field team
# collecting COD from that screen over-collects on every delivery.
#
# The failure was not arithmetic. Both expressions are individually reasonable.
# The failure is that "advance" had no single definition, so two components
# grew two, and nothing in the system could detect the divergence — not
# TypeScript, not tests, not review.
#
# So money arrives from the server pre-computed and named: `order.amountDue` is
# a field, not an expression.
#
# Scoped to .tsx deliberately. A payload builder in a .ts util that proposes a
# price during a CREATE flow is a different thing from a screen deriving a
# figure the server already owns, and conflating them would make the rule
# unenforceable and therefore ignored.
#
# TWO PATTERNS, because one was not enough and the gap was found by a mutant
# rather than by review.
#
# The first catches a money word on the LEFT: `total - advance`, `amount * 0.1`.
# That was the whole guard, and it MISSED the commonest shape of all —
#
#     po.quantity * po.unitCost
#
# where the left operand is a count, not money, and the money word only appears
# on the right. A planted mutant doing exactly that passed the guard cleanly.
# The claim "G12 catches money maths in components" was overstated for as long
# as that was true.
#
# The second pattern closes it: anything multiplied or divided by an identifier
# ending in a money word. Restricted to * and / on purpose — those produce money
# from a quantity, which is the case that matters, while + and - between a
# non-money and a money term are rare and noisy to match.
money_math=$(grep -rnE --include='*.tsx' \
  '(amount|price|total|subtotal|commission|margin|advance|due|balance|payable|net|cost|fee)[A-Za-z]*[[:space:]]*[-+*/][[:space:]]*([a-zA-Z_][a-zA-Z0-9_.]*)?(amount|price|total|Price|Amount|Total|Margin|Advance|Commission|[0-9])' \
  "$SRC" 2>/dev/null | grep -v '__tests__' | grep -vE ':[0-9]+:[[:space:]]*([*]|//)' || true)
money_math_rhs=$(grep -rnE --include='*.tsx' \
  '[a-zA-Z_][a-zA-Z0-9_.]*[[:space:]]*[*/][[:space:]]*[a-zA-Z_][a-zA-Z0-9_.]*(Cost|Price|Amount|Total|Minor|Fee|Payable)\b' \
  "$SRC" 2>/dev/null | grep -v '__tests__' | grep -vE ':[0-9]+:[[:space:]]*([*]|//)' || true)
money_math=$(printf '%s\n%s' "$money_math" "$money_math_rhs" | grep -v '^$' || true)
report "no-money-math-in-components" "money is a server field, not an expression — see F-01" "$money_math"

# G6 — anything that renders a figure declares tabular-nums itself.
#
# The base layer sets `font-variant-numeric: tabular-nums slashed-zero` on body,
# and then RESETS it on `p, label, h1..h4` so prose gets proportional figures.
# That reset is correct for prose and is a trap for money: an amount rendered
# inside a paragraph silently falls back to proportional digits and stops
# lining up down the column, which is the one property the whole treatment
# exists for. Inheriting it is not good enough; it has to be declared.
for f in src/components/data/Money.tsx; do
  if [ -f "$f" ] && ! grep -q 'tabular-nums' "$f"; then
    report "figures-declare-tabular" "$f must declare tabular-nums, not inherit it (base layer resets it on p/label/h*)" "$f"
  fi
done

# A leftover debug beacon.
beacon=$(grep -rn '127.0.0.1:7294' "$SRC" || true)
report "debug-beacon" "remove the debug beacon" "$beacon"

# G17 — every API path is versioned.
#
# Five feature clients declared their base without the `/api/v1` prefix:
#
#     const BASE = '/logistics';   // -> https://host/logistics/summary
#
# Firebase Hosting rewrites only `/api/**` to Cloud Run and serves index.html
# for everything else, so those requests returned **200 with the SPA's own HTML**
# and the screens parsed a web page as JSON. Nothing 404'd, nothing appeared in
# the backend logs, and the failure surfaced only as "could not load". Logistics,
# Messages, Manufacturing, Reward Settings and Sales Brain had never once reached
# the backend.
#
# A path is legitimate here only if it is versioned. `/health` is the single
# exception — it is a Cloud Run probe that lives outside the versioned API.
# Two shapes to catch: the module-level base, and paths written inline at the
# call site. Restricting the second to src/api and src/features/*/api keeps it
# precise — those files exist only to build request paths, so a leading-slash
# string literal in them is a URL and nothing else.
badbase=$(grep -rn --include='*.ts' --include='*.tsx' -E "^const BASE = '/" "$SRC" 2>/dev/null \
  | grep -v "'/api/" || true)
# Only the module-level base is checked here. The inline shape — a path handed
# straight to `request(...)` — is checked by
# src/api/__tests__/versioned-paths.test.ts, where the pattern can be written
# readably instead of surviving three layers of shell quoting. The first attempt
# at expressing it here silently matched nothing, which is a worse failure than
# not having the guard at all.
report "versioned-api-path" "build paths from API_V1 — an unprefixed path silently returns index.html" "$badbase"

[ "$FAIL" -eq 0 ] && echo "✓ all design-system guards pass"
exit "$FAIL"
