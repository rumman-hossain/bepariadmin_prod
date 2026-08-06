// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { ErrorState, EmptyState, SkeletonPage, SkeletonTable, SkeletonStatGrid } from '../States';
import { Dialog, ConfirmDialog } from '../Dialog';
import { Progress } from '../Progress';
import { Form, FormActions, FormErrorSummary } from '@/src/components/forms/Form';

afterEach(cleanup);

// ─── States ──────────────────────────────────────────────

describe('ErrorState', () => {
  it('announces itself', () => {
    render(<ErrorState message="Could not reach the server." />);
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('offers retry only when there is something to retry', () => {
    render(<ErrorState />);
    expect(screen.queryByRole('button')).toBeNull();
    cleanup();

    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('keeps a fixed minimum height so a state swap does not jump the page', () => {
    // The five copies this replaces used min-h-[40vh], min-h-[50vh] and h-64,
    // so moving between screens shifted the layout.
    const { container } = render(<ErrorState />);
    expect(container.firstElementChild!.className).toContain('min-h-56');
  });
});

describe('EmptyState', () => {
  it('distinguishes "nothing found" from "not running"', () => {
    /*
     * The reason this has three variants. A fraud screen showing zero flags
     * reads as "no fraud detected" when the truth is "detection is not
     * running" — worse than an empty state, because it looks like a negative
     * result rather than no result.
     */
    const empty = render(<EmptyState variant="empty" />).container;
    expect(empty.querySelector('.text-warn')).toBeNull();
    cleanup();

    const inert = render(<EmptyState variant="not-running" />).container;
    expect(inert.querySelector('.text-warn')).not.toBeNull();
  });

  it('is not an alert — nothing has gone wrong', () => {
    render(<EmptyState />);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('SkeletonPage', () => {
  it('announces that it is busy', () => {
    render(<SkeletonPage />);
    const status = screen.getByRole('status');
    expect(status.getAttribute('aria-busy')).toBe('true');
  });

  it.each(['list', 'detail', 'dashboard'] as const)('renders the %s shape', (shape) => {
    // Matching the real screen's shape is the point; a generic block makes the
    // swap to real content a jolt.
    const { container } = render(<SkeletonPage shape={shape} />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(2);
  });

  it.each(['list', 'dashboard'] as const)(
    'announces the %s shape exactly once, not once per nested composite',
    (shape) => {
      /*
       * `SkeletonPage` composes `SkeletonTable` and `SkeletonStatGrid`, both of
       * which announce on their own. Nested live regions make a screen reader
       * read the same load twice, so the page passes `label={null}` down and
       * keeps the announcement at the top.
       */
      render(<SkeletonPage shape={shape} />);
      expect(screen.getAllByRole('status')).toHaveLength(1);
    },
  );
});

describe('region-level skeletons', () => {
  it.each([
    ['table', <SkeletonTable key="t" />, /loading table/i],
    ['stat grid', <SkeletonStatGrid key="s" />, /loading summary/i],
  ])('announces a loading %s', (_name, element, label) => {
    /*
     * Every `Skeleton` bar is `aria-hidden`, correctly — a grey rectangle is
     * not information. But that left these composites announcing nothing at
     * all: a screen-reader user waiting on a slow table heard silence and had
     * no way to distinguish it from an empty one. Surfaced by the Orders
     * screen, which is the first to use them on their own.
     */
    render(element as React.ReactElement);
    expect(screen.getByRole('status', { name: label })).toBeTruthy();
  });

  it('stays silent when told an ancestor is already announcing', () => {
    render(<SkeletonTable label={null} />);
    expect(screen.queryByRole('status')).toBeNull();
  });
});

// ─── Dialog ──────────────────────────────────────────────

describe('Dialog', () => {
  it('portals to the body, above a clipping ancestor', () => {
    const { getByTestId } = render(
      <div style={{ overflow: 'hidden' }} data-testid="clipper">
        <Dialog open onClose={vi.fn()} title="T">
          body
        </Dialog>
      </div>,
    );
    const dialog = screen.getByRole('dialog');
    expect(getByTestId('clipper').contains(dialog)).toBe(false);
  });

  it('sits on the modal step of the z-scale, not a hardcoded 50', () => {
    const { baseElement } = render(
      <Dialog open onClose={vi.fn()} title="T">
        body
      </Dialog>,
    );
    expect(baseElement.querySelector('.z-\\(--z-modal\\)')).not.toBeNull();
  });

  it('closes on Escape wherever focus is', () => {
    // Bound to the document, not the panel — clicking the backdrop then
    // pressing Escape used to do nothing.
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose} title="T">
        body
      </Dialog>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('labels itself from the title', () => {
    render(
      <Dialog open onClose={vi.fn()} title="Approve supplier">
        body
      </Dialog>,
    );
    expect(screen.getByRole('dialog', { name: 'Approve supplier' })).toBeTruthy();
  });

  it('renders nothing when closed', () => {
    render(
      <Dialog open={false} onClose={vi.fn()} title="T">
        body
      </Dialog>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('ConfirmDialog', () => {
  const setup = (props = {}) => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(
      <ConfirmDialog
        open
        onClose={onClose}
        onConfirm={onConfirm}
        title="Suspend supplier?"
        message="They will stop receiving orders."
        confirmLabel="Suspend"
        {...props}
      />,
    );
    return { onConfirm, onClose };
  };

  it('puts cancel before confirm', () => {
    /*
     * Two of the seven hand-rolled copies put the destructive action first.
     * The dialog exists precisely when the other option is expensive.
     */
    setup();
    const buttons = screen.getAllByRole('button').map((b) => b.textContent);
    expect(buttons.indexOf('Cancel')).toBeLessThan(buttons.indexOf('Suspend'));
  });

  it('does not dismiss on a backdrop click', () => {
    // A confirmation must be answered, not lost to a stray click.
    const { onClose } = setup();
    const backdrop = document.querySelector('[aria-hidden="true"]')!;
    fireEvent.click(backdrop);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('accepts rich message content, not just a string', () => {
    setup({ message: <strong data-testid="rich">৳4,82,150</strong> });
    expect(screen.getByTestId('rich')).toBeTruthy();
  });

  it('disables cancel while the action is in flight', () => {
    setup({ loading: true });
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveProperty('disabled', true);
  });
});

// ─── Progress ────────────────────────────────────────────

describe('Progress', () => {
  it('exposes the value to assistive tech', () => {
    render(<Progress value={42} label="Uploading" />);
    const bar = screen.getByRole('progressbar', { name: 'Uploading' });
    expect(bar.getAttribute('aria-valuenow')).toBe('42');
  });

  it('clamps out-of-range values rather than overflowing the track', () => {
    // An upload reporting 104% would otherwise render wider than its own track.
    render(<Progress value={140} label="x" />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100');
    cleanup();
    render(<Progress value={-20} label="x" />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0');
  });

  it('survives NaN', () => {
    render(<Progress value={NaN} label="x" />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0');
  });

  it('prefers a human detail over the bare number', () => {
    // "3 of 6 documents" beats "50".
    render(<Progress value={50} label="Documents" detail="3 of 6" />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuetext')).toBe('3 of 6');
  });
});

// ─── Form ────────────────────────────────────────────────

describe('Form', () => {
  it('prevents the default submit, so the page does not reload', () => {
    // Every caller wrote preventDefault by hand and one forgot — producing a
    // full page reload that looked like a crash.
    const onSubmit = vi.fn();
    render(
      <Form onSubmit={onSubmit}>
        <button type="submit">Save</button>
      </Form>,
    );
    const submitEvent = fireEvent.click(screen.getByRole('button'));
    expect(onSubmit).toHaveBeenCalled();
    expect(submitEvent).toBe(true);
  });

  it('disables the browser’s own validation bubbles', () => {
    const { container } = render(<Form onSubmit={vi.fn()}>x</Form>);
    expect(container.querySelector('form')!.hasAttribute('novalidate')).toBe(true);
  });
});

describe('FormErrorSummary', () => {
  it('renders nothing when there are no errors', () => {
    const { container } = render(<FormErrorSummary errors={{}} />);
    expect(container.firstChild).toBeNull();
  });

  it('ignores empty messages', () => {
    const { container } = render(<FormErrorSummary errors={{ a: '', b: '' }} />);
    expect(container.firstChild).toBeNull();
  });

  it('announces and lists every error', () => {
    render(<FormErrorSummary errors={{ name: 'Name is required', tin: 'TIN is invalid' }} />);
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});

describe('FormActions', () => {
  it('keeps the primary action last', () => {
    // Two of the four hand-rolled recipes put it first.
    render(
      <FormActions aside={<span>Draft saved</span>}>
        <button>Cancel</button>
        <button>Save</button>
      </FormActions>,
    );
    const buttons = screen.getAllByRole('button').map((b) => b.textContent);
    expect(buttons).toEqual(['Cancel', 'Save']);
  });
});
