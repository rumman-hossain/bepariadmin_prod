// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, within } from '@testing-library/react';
import { supplierColumns } from '../pages/supplierColumns';
import type { Wholesaler } from '@/src/types/domain';

/**
 * THE COLUMNS, RENDERED WITH REAL DATA.
 *
 * These used to be source-level checks reading `ListPage.tsx` for strings like
 * `sortBy` and `—`. When the columns moved to their own file the checks failed
 * on a change that was CORRECT — which is precisely how a source-reading guard
 * teaches somebody to edit the test rather than the code.
 *
 * The interesting one is the paperwork quartet. It is the only cell that turns a
 * number into a shape, and the shape is the point: a supplier missing its VAT
 * certificate must be distinguishable at a glance from one missing nothing.
 */

afterEach(cleanup);

const SUPPLIER: Wholesaler = {
  id: 'w1',
  code: 'WHL-00009',
  companyName: 'Elegant Apparel Ltd',
  ownerName: 'Mohammad Ali',
  category: 'Gents Textile',
  location: 'Dhaka',
  status: 'Active',
  commissionRate: 9.5,
  documentsOnFile: 4,
  hasProducts: true,
  createdBy: 'ADMIN',
} as Wholesaler;

/** Renders one column's cell for a supplier. */
function cell(key: string, supplier: Partial<Wholesaler>) {
  const column = supplierColumns.find((c) => c.key === key);
  if (!column) throw new Error(`no column ${key}`);
  const { container } = render(<>{column.render({ ...SUPPLIER, ...supplier } as Wholesaler)}</>);
  return container;
}

describe('the supplier code', () => {
  it('is a column of its own, and sortable', () => {
    // A column you cannot sort is a subtitle in a wider box.
    const column = supplierColumns.find((c) => c.key === 'code');
    expect(column?.header).toBe('Code');
    expect(column?.sortBy).toBeTypeOf('function');
  });

  it('renders an em dash rather than an empty cell', () => {
    // A blank reads as a rendering fault. It never reads as "this supplier has
    // no code yet".
    expect(cell('code', { code: undefined }).textContent).toBe('—');
    expect(cell('code', { code: '   ' }).textContent).toBe('—');
  });

  it('renders the code in the identifier treatment', () => {
    const c = cell('code', {});
    expect(c.textContent).toBe('WHL-00009');
    expect(c.querySelector('.font-identifier')).not.toBeNull();
  });
});

describe('the paperwork quartet', () => {
  /*
   * Four marks in a fixed order — trade licence, TIN, VAT, NID. Filled means on
   * file. The count comes from the server; the marks fill left to right.
   */
  const marks = (container: HTMLElement) => Array.from(container.querySelectorAll('span[aria-hidden]'));

  it('draws one mark per required certificate, always', () => {
    // Always four, whatever the count. Drawing only the ones on file would make
    // a supplier with two look like a supplier who needs two.
    for (const onFile of [0, 1, 2, 3, 4]) {
      cleanup();
      expect(marks(cell('paperwork', { documentsOnFile: onFile })), `${onFile} on file`).toHaveLength(4);
    }
  });

  it('fills exactly as many as are on file', () => {
    const filled = (n: number) => {
      cleanup();
      return marks(cell('paperwork', { documentsOnFile: n })).filter((m) =>
        m.className.includes('bg-ok'),
      ).length;
    };
    expect(filled(4)).toBe(4);
    expect(filled(2)).toBe(2);
    expect(filled(0)).toBe(0);
  });

  it('gives a missing certificate a visible slot, not empty space', () => {
    /*
     * The mistake this catches. Drawn as a transparent outline the gaps
     * disappeared at real size, and a row with a hole simply looked like a row
     * with fewer marks — which is the one reading the fixed order exists to
     * prevent, because position is what names the certificate.
     */
    const gaps = marks(cell('paperwork', { documentsOnFile: 2 })).filter((m) =>
      m.className.includes('bg-warn-wash'),
    );
    expect(gaps, 'a missing certificate has no visible slot').toHaveLength(2);
  });

  it('says how many are missing, in words as well as in shape', () => {
    // The shape is for scanning a column. The words are for everyone else.
    expect(cell('paperwork', { documentsOnFile: 3 }).textContent).toContain('1 missing');
    expect(cell('paperwork', { documentsOnFile: 4 }).textContent).not.toContain('missing');
  });

  it('is announced to a screen reader as a count', () => {
    // The marks are decorative to assistive technology; the count is not.
    expect(cell('paperwork', { documentsOnFile: 3 }).textContent).toContain('3 of 4');
  });

  it('a removed supplier keeps its paperwork, and looks it', () => {
    // Soft delete keeps the documents. Drawing them as gaps would say the
    // opposite — that a removed supplier had no papers.
    const c = cell('paperwork', { documentsOnFile: 4, deletedAt: '2026-08-06T00:00:00Z' });
    expect(marks(c).every((m) => m.className.includes('bg-mute-wash'))).toBe(true);
    expect(c.textContent).not.toContain('missing');
  });

  it('a server that sends no count draws no false gaps', () => {
    /*
     * An older server omits the field. Rendering `undefined` as zero would
     * draw four empty slots — a supplier with complete paperwork shown as
     * having none, which is worse than showing nothing.
     */
    const c = cell('paperwork', { documentsOnFile: undefined });
    expect(marks(c)).toHaveLength(4);
    expect(c.textContent).toContain('0 of 4');
  });
});

describe('who added the supplier', () => {
  it('distinguishes an admin from a self-registration', () => {
    /*
     * A supplier who signed themselves up typed their own trade licence number;
     * one an operator created was transcribed from a phone call. Those two rows
     * deserve different amounts of trust and the screen could not tell them
     * apart.
     */
    expect(cell('registeredBy', { createdBy: 'ADMIN' }).textContent).toBe('Admin');
    expect(cell('registeredBy', { createdBy: 'SELF' }).textContent).toBe('Self');
  });

  it('reads as a stamp, not as a status badge', () => {
    // It answers "who put this here", which is a different question from "what
    // state is it in". It must not compete with the badge beside it.
    const c = cell('registeredBy', { createdBy: 'ADMIN' });
    expect(c.querySelector('.uppercase')).not.toBeNull();
  });
});

describe('a removed supplier', () => {
  it('is labelled Removed rather than by the status it still carries', () => {
    /*
     * The row keeps SUSPENDED in its status column after a soft delete. Showing
     * that would put a removed supplier in the Suspended bucket to the eye,
     * while the filter had put it somewhere else.
     */
    const c = cell('status', { status: 'Suspended', deletedAt: '2026-08-06T00:00:00Z' });
    expect(c.textContent).toContain('Removed');
    expect(c.textContent).not.toContain('Suspended');
  });

  it('says WHEN it was removed, in place of the owner', () => {
    const c = cell('company', { deletedAt: '2026-08-06T09:15:00Z' });
    expect(c.textContent).toContain('Removed 2026-08-06');
    expect(c.textContent).not.toContain('Mohammad Ali');
  });

  it('strikes the name through', () => {
    const c = cell('company', { deletedAt: '2026-08-06T00:00:00Z' });
    expect(within(c).getByText('Elegant Apparel Ltd').className).toContain('line-through');
  });

  it('a live supplier is not struck through and shows its owner', () => {
    // The other direction, so "everything is struck through" cannot pass.
    const c = cell('company', {});
    expect(within(c).getByText('Elegant Apparel Ltd').className).not.toContain('line-through');
    expect(c.textContent).toContain('Mohammad Ali');
  });
});
