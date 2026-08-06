// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { RetailerStats } from '../RetailerStats';
import { STATUS_RULE } from '../../constants/statusRule';

afterEach(cleanup);

/**
 * The strip that replaced the banner.
 *
 * A message used to sit at the top of this screen saying suspend and document
 * checks were not built. Both worked. What belongs at the top of a directory is
 * its shape — how many shops, and how many are waiting on you.
 */
describe('RetailerStats', () => {
  const counts = { active: 12, pending: 3, suspended: 2, rejected: 1 };

  it('shows every status, including the ones at zero', () => {
    // A tile that appears only when its count is non-zero is a layout that
    // moves under the operator the first time a shop is suspended.
    render(
      <RetailerStats
        total={0}
        counts={{ active: 0, pending: 0, suspended: 0, rejected: 0 }}
        activeStatus=""
        onPick={() => {}}
      />,
    );
    for (const label of [/all shops/i, /awaiting approval/i, /^active$/i, /suspended/i, /rejected/i]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it('renders the counts it was given', () => {
    render(<RetailerStats total={18} counts={counts} activeStatus="" onPick={() => {}} />);
    expect(screen.getByText('18')).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('renders NOTHING when the server could not count', () => {
    /*
     * The server logs and serves the list without counts rather than failing —
     * the directory is the point. A strip of zeroes would look authoritative
     * and be wrong, which is worse than an absent strip.
     */
    const { container } = render(
      <RetailerStats total={18} counts={undefined} activeStatus="" onPick={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('each tile is the filter, not just a label next to one', () => {
    const picked: string[] = [];
    render(<RetailerStats total={18} counts={counts} activeStatus="" onPick={(s) => picked.push(s)} />);

    screen.getByRole('button', { name: /awaiting approval/i }).click();
    expect(picked).toEqual(['pending']);
  });

  it('marks the applied filter, so the strip is never a dead end', () => {
    render(<RetailerStats total={18} counts={counts} activeStatus="pending" onPick={() => {}} />);

    const pending = screen.getByRole('button', { name: /awaiting approval/i });
    expect(pending.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: /^all shops/i }).getAttribute('aria-pressed')).toBe('false');
  });
});

describe('the status colour is defined once', () => {
  it('covers every status a retailer can be', () => {
    // The strip, the table row and the detail header all read this map. Three
    // copies of "pending is amber" is how one of them ends up disagreeing.
    for (const status of ['active', 'pending', 'suspended', 'rejected']) {
      expect(STATUS_RULE[status]).toBeTruthy();
    }
  });

  it('gives suspended and rejected different colours', () => {
    // They are different facts: one traded and lost access, the other never
    // traded. Only one of them can be deleted permanently, so they must not
    // look the same at a glance.
    expect(STATUS_RULE.suspended).not.toBe(STATUS_RULE.rejected);
  });
});
