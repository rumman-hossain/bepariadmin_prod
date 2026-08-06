cd /Volumes/code/BapariVault/bepariadmin_prod
F=src/components/data/Money.tsx
ANCHOR="'font-mono tabular-nums whitespace-nowrap',"
cp $F /tmp/guard-selftest.bak

check() { # label, replacement
  python3 -c "
import pathlib,sys
p=pathlib.Path('$F'); s=p.read_text()
a=\"\"\"$ANCHOR\"\"\"
assert a in s, 'anchor missing'
p.write_text(s.replace(a, '''$2'''))"
  if npm run guard >/dev/null 2>&1; then echo "  ✗ $1 — NOT CAUGHT"; else echo "  ✓ $1 — caught"; fi
  cp /tmp/guard-selftest.bak $F
}

echo "Guard self-test — each plants a violation and expects a failure:"
check "raw hex"        "'font-mono text-[#FF0000]',"
check "arbitrary"      "'font-mono text-[13px]',"
check "raw palette"    "'font-mono bg-emerald-50',"
check "legacy token"   "'font-mono text-text-primary',"
echo
# Money guard needs a .tsx JSX context; use the product table columns.
#
# The anchor is asserted, not assumed. This test pointed at ProductListPage
# until the columns were extracted out of it, at which point the replacement
# silently matched nothing and the test reported NOT CAUGHT for a guard that
# was in fact working. A self-test that can no-op is not a self-test.
P=src/features/products/pages/productColumns.tsx
cp $P /tmp/guard-selftest2.bak
python3 -c "
import pathlib
p=pathlib.Path('$P'); s=p.read_text()
a='<Money amount={row.basePrice} />'
assert a in s, 'money anchor missing from $P — fix this test, not the guard'
p.write_text(s.replace(a,'<span>৳{row.basePrice}</span>'))"
if npm run guard >/dev/null 2>&1; then echo "  ✗ inline money — NOT CAUGHT"; else echo "  ✓ inline money — caught"; fi
cp /tmp/guard-selftest2.bak $P

# The doc guard: name a token that was deleted two directions ago.
D=src/design-system/DESIGN_SYSTEM.md
cp $D /tmp/guard-selftest3.bak
printf '\nStale: `--color-surface-glass`.\n' >> $D
if npm run guard >/dev/null 2>&1; then echo "  ✗ stale docs — NOT CAUGHT"; else echo "  ✓ stale docs — caught"; fi
cp /tmp/guard-selftest3.bak $D

# The web-storage guard: the exact line that would silently undo the XSS defence.
W=src/auth/memoryTokenStore.ts
cp $W /tmp/guard-selftest4.bak
printf '\nexport function leak(t: string) { localStorage.setItem("access_token", t); }\n' >> $W
if npm run guard >/dev/null 2>&1; then echo "  ✗ web storage — NOT CAUGHT"; else echo "  ✓ web storage — caught"; fi
cp /tmp/guard-selftest4.bak $W

# The label guard: a 20th spelling of the uppercase micro-label.
L=src/features/dashboard/pages/DashboardPage.tsx
cp $L /tmp/guard-selftest5.bak
perl -pi -e 's{<Page>}{<Page><span className="text-xs font-bold text-ink-3 uppercase tracking-wider">Drift</span>}' $L
if npm run guard >/dev/null 2>&1; then echo "  ✗ label spelling — NOT CAUGHT"; else echo "  ✓ label spelling — caught"; fi
cp /tmp/guard-selftest5.bak $L

# The second money formatter, reintroduced.
M=src/utils/constants.ts
cp $M /tmp/guard-selftest6.bak
printf '\nexport const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "BDT" }).format(n);\n' >> $M
if npm run guard >/dev/null 2>&1; then echo "  ✗ second money formatter — NOT CAUGHT"; else echo "  ✓ second money formatter — caught"; fi
cp /tmp/guard-selftest6.bak $M

# A colour class in one of our namespaces that resolves to nothing.
U=src/components/controls/Switch.tsx
cp $U /tmp/guard-selftest7.bak
perl -pi -e "s/rounded-full bg-rule-input/rounded-full bg-indigo-lightest/" $U
if npm run guard >/dev/null 2>&1; then echo "  ✗ undefined token — NOT CAUGHT"; else echo "  ✓ undefined token — caught"; fi
cp /tmp/guard-selftest7.bak $U


# ─── The three guards added with the components/ui/ removal ───────────

# Reaching back into the folder that was deleted.
I=src/features/products/pages/ProductListPage.tsx
cp $I /tmp/guard-selftest8.bak
printf "\nimport { Card } from '@/src/components/ui/Card';\n" >> $I
if npm run guard >/dev/null 2>&1; then echo "  ✗ legacy ui import — NOT CAUGHT"; else echo "  ✓ legacy ui import — caught"; fi
cp /tmp/guard-selftest8.bak $I

# A seventh hand-rolled date formatter. This one is not hypothetical: adding the
# guard caught a live `toLocaleTimeString()` on the dashboard that the manual
# sweep of six sites had missed.
T=src/components/data/Timeline.tsx
cp $T /tmp/guard-selftest9.bak
printf "\nexport const when = (d: Date) => d.toLocaleDateString('en-US');\n" >> $T
if npm run guard >/dev/null 2>&1; then echo "  ✗ bare date format — NOT CAUGHT"; else echo "  ✓ bare date format — caught"; fi
cp /tmp/guard-selftest9.bak $T

# A second ConfirmDialog — the one that does not set closeOnBackdrop={false}.
C=src/components/shared/DocumentList.tsx
cp $C /tmp/guard-selftest10.bak
printf "\nexport function ConfirmDialog() { return null; }\n" >> $C
if npm run guard >/dev/null 2>&1; then echo "  ✗ duplicate ConfirmDialog — NOT CAUGHT"; else echo "  ✓ duplicate ConfirmDialog — caught"; fi
cp /tmp/guard-selftest10.bak $C

# A hardcoded colour back in the published preview.
V=src/design-system/preview/foundations.html
cp $V /tmp/guard-selftest11.bak
python3 -c "
import pathlib
p=pathlib.Path('$V'); s=p.read_text()
a='background:var(--brass)'
assert a in s, 'brass chip anchor missing from $V'
p.write_text(s.replace(a,'background:#825E1E',1))"
if npm run guard >/dev/null 2>&1; then echo "  ✗ hex in preview — NOT CAUGHT"; else echo "  ✓ hex in preview — caught"; fi
cp /tmp/guard-selftest11.bak $V

# G12 — the exact expression from the prototype's Payments screen, which is
# what made two finance screens disagree about money.
M2=src/features/orders/pages/OrdersPage.tsx
cp $M2 /tmp/guard-selftest12.bak
printf "\n// const dueAmount = order.amount - advancePaid;\nconst dueAmount = (o: {amount: number}) => o.amount - Math.round(o.amount * 0.1);\n" >> $M2
if npm run guard >/dev/null 2>&1; then echo "  ✗ money math in component — NOT CAUGHT"; else echo "  ✓ money math in component — caught"; fi
cp /tmp/guard-selftest12.bak $M2

# G12b — quantity x price, where the money word is only on the RIGHT.
#
# This shape slipped past G12 for its whole existence: the pattern required a
# money word on the left, and a count multiplied by a unit price has one on
# neither. It was found by a planted mutant on the Manufacturing screen, not by
# review, and it is the commonest way a component invents a money figure.
cp $M2 /tmp/guard-selftest12b.bak
printf "\nconst lineTotal = (l: {quantity: number; unitPrice: number}) => l.quantity * l.unitPrice;\n" >> $M2
if npm run guard >/dev/null 2>&1; then echo "  ✗ quantity x price — NOT CAUGHT"; else echo "  ✓ quantity x price — caught"; fi
cp /tmp/guard-selftest12b.bak $M2

# G6 — Money relying on inheritance it does not get inside a <p>.
M3=src/components/data/Money.tsx
cp $M3 /tmp/guard-selftest13.bak
python3 -c "
import pathlib
p=pathlib.Path('$M3'); s=p.read_text()
a=\"'tabular-nums whitespace-nowrap',\"
assert a in s, 'tabular anchor missing from $M3'
p.write_text(s.replace(a, \"'whitespace-nowrap',\").replace('tabular-nums','tab-nums'))"
if npm run guard >/dev/null 2>&1; then echo "  ✗ figures declare tabular — NOT CAUGHT"; else echo "  ✓ figures declare tabular — caught"; fi
cp /tmp/guard-selftest13.bak $M3

echo
npm run guard 2>&1 | tail -1
