import React, { createContext, useContext, useId, useRef } from 'react';
import { cn } from '@/src/design-system/utils/cn';

export interface TabItem {
  id: string;
  label: string;
  /** Renders as a count pill — pending KYC, unresolved flags, open orders. */
  count?: number;
  disabled?: boolean;
}

interface TabsContextValue {
  baseId: string;
  value: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  /** Panels. Use `Tabs.Panel`; they read the id wiring from context. */
  children?: React.ReactNode;
  className?: string;
}

/**
 * Horizontal tabs.
 *
 * Rebuilt because the previous version's ARIA contract could not be satisfied:
 * `Tabs` generated `baseId` internally with `useId()` and never exposed it,
 * while `TabPanel` *required* `baseId` as a prop. There was no value a caller
 * could pass, so `aria-controls` and `aria-labelledby` could never point at
 * anything real. It had zero call sites, which is not a coincidence.
 *
 * The id now travels through context, so the pairing is automatic and cannot
 * be got wrong. Everything else about the original was right and is kept:
 * arrow keys move between tabs, Home/End jump to the ends, and only the
 * selected tab is in the page tab order so Tab moves out to the panel rather
 * than through every tab in turn.
 */
export function Tabs({ items, value, onChange, children, className }: TabsProps) {
  const baseId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const enabled = items.map((t, i) => (t.disabled ? -1 : i)).filter((i) => i >= 0);

  function onKeyDown(e: React.KeyboardEvent) {
    // Every tab disabled is a degenerate but reachable state — a filtered tab
    // set can empty out. Bail rather than dividing by zero.
    if (enabled.length === 0) return;

    const currentIndex = items.findIndex((t) => t.id === value);
    const pos = enabled.indexOf(currentIndex);
    let nextPos: number;

    switch (e.key) {
      case 'ArrowRight':
        // pos === -1 when the selected tab is itself disabled; starting from 0
        // lands on the first enabled tab, which is the sensible recovery.
        nextPos = pos < 0 ? 0 : (pos + 1) % enabled.length;
        break;
      case 'ArrowLeft':
        nextPos = pos < 0 ? enabled.length - 1 : (pos - 1 + enabled.length) % enabled.length;
        break;
      case 'Home':
        nextPos = 0;
        break;
      case 'End':
        nextPos = enabled.length - 1;
        break;
      default:
        return;
    }

    e.preventDefault();
    const target = enabled[nextPos]!;
    onChange(items[target]!.id);
    refs.current[target]?.focus();
  }

  return (
    <TabsContext.Provider value={{ baseId, value }}>
      <div
        role="tablist"
        onKeyDown={onKeyDown}
        className={cn('flex items-center gap-1 border-b border-rule', className)}
      >
        {items.map((tab, i) => {
          const selected = tab.id === value;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              disabled={tab.disabled}
              onClick={() => onChange(tab.id)}
              className={cn(
                'relative -mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2',
                'text-base font-medium transition-colors',
                'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-rule-focus',
                selected
                  ? 'border-brass text-ink'
                  : 'border-transparent text-ink-3 hover:border-rule-strong hover:text-ink',
                tab.disabled && 'pointer-events-none opacity-disabled',
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-2xs font-semibold tabular-nums',
                    selected ? 'bg-brass-wash text-brass' : 'bg-sheet-2 text-ink-3',
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {children}
    </TabsContext.Provider>
  );
}

export interface TabPanelProps {
  /** Matches the TabItem id. The rest of the wiring comes from context. */
  id: string;
  children: React.ReactNode;
  className?: string;
}

function Panel({ id, children, className }: TabPanelProps) {
  const ctx = useContext(TabsContext);

  if (!ctx) {
    throw new Error('Tabs.Panel must be rendered inside <Tabs>.');
  }
  if (ctx.value !== id) return null;

  return (
    <div
      role="tabpanel"
      id={`${ctx.baseId}-panel-${id}`}
      aria-labelledby={`${ctx.baseId}-tab-${id}`}
      // Focusable so Tab out of the tablist lands on the panel content, per
      // the WAI-ARIA pattern.
      tabIndex={0}
      className={cn('pt-4 focus-visible:outline-2 focus-visible:outline-rule-focus', className)}
    >
      {children}
    </div>
  );
}

Tabs.Panel = Panel;
