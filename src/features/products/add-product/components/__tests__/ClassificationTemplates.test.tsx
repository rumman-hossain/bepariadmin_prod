// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render as rtlRender, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { ClassificationTemplates } from '../ClassificationTemplates';
import { useAddProductStore } from '../../store/useAddProductStore';

/*
 * The component now offers an admin-only "Edit catalogue template" action, so
 * it reads the signed-in role and holds a mutation. Neither is what these tests
 * are about; they are stubbed so the description rules stay the subject.
 */
const updateClassificationTemplate = vi.fn();
vi.mock('@/src/api/products', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/src/api/products')>()),
  updateClassificationTemplate: (...a: unknown[]) => updateClassificationTemplate(...a),
}));

vi.mock('@/src/hooks/useAuth', () => ({
  useAuth: () => ({ user: { role: 'super_admin' } }),
}));

/** A client per render — the mutation hook needs one, and sharing leaks state. */
function render(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return rtlRender(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

/**
 * A TEMPLATE MAY FILL AN EMPTY DESCRIPTION. IT MAY NOT REPLACE ONE.
 *
 * The auto-select runs on MOUNT of step 2, so "pick a classification on step 1,
 * type a description, press Continue" silently replaced the operator's words
 * with catalogue boilerplate. Reproduced on dev before the fix: a typed English
 * sentence became the Bengali template between one step and the next, with
 * nothing said.
 *
 * It mattered little while the description reached no column. It persists now,
 * so the wrong text is durably stored.
 */

const store = () => useAddProductStore.getState();
const TEMPLATES = [
  { id: 'd1', name: 'Oversized Tee', details: 'Template boilerplate for an oversized tee.' },
  { id: 'd2', name: 'V-neck', details: 'Template boilerplate for a v-neck.' },
];

beforeEach(() => {
  store().reset();
  useAddProductStore.setState({ classificationDetails: TEMPLATES });
  updateClassificationTemplate.mockReset();
  updateClassificationTemplate.mockResolvedValue({ ok: true, status: 200, data: { data: {} } });
});
afterEach(cleanup);

describe('the classification template and the operator’s description', () => {
  it('seeds an empty description', () => {
    render(<ClassificationTemplates />);
    expect(store().description).toBe(TEMPLATES[0].details);
    // It still selects the detail — that part was never in question.
    expect(store().productDetailId).toBe('d1');
  });

  it('leaves a description the operator already typed', () => {
    useAddProductStore.setState({ description: 'Hand-stitched, pre-shrunk, colour-fast.' });
    render(<ClassificationTemplates />);

    expect(store().description).toBe('Hand-stitched, pre-shrunk, colour-fast.');
    // The classification is still applied; only the prose is left alone.
    expect(store().productDetailId).toBe('d1');
  });

  it('leaves it alone on an explicit pick too', () => {
    // Choosing a classification is not the same as asking for its prose.
    useAddProductStore.setState({ description: 'My own words.', productDetailId: 'd1' });
    render(<ClassificationTemplates />);

    fireEvent.click(screen.getByText('V-neck'));

    expect(store().productDetailId).toBe('d2');
    expect(store().description).toBe('My own words.');
  });

  it('fills from an explicit pick when the box is empty', () => {
    useAddProductStore.setState({ productDetailId: 'd1' });
    render(<ClassificationTemplates />);

    fireEvent.click(screen.getByText('V-neck'));
    expect(store().description).toBe(TEMPLATES[1].details);
  });
});

describe('the template text can be edited and added to', () => {
  /*
   * It was rendered inside the picker button, clamped to three lines, and there
   * was no control anywhere on step 2 that could change it. The words were
   * visible and unreachable — the operator had to go back to step 1, find the
   * Description box, and work out for themselves that it held the same text.
   */
  const box = () => screen.getByLabelText('Description') as HTMLTextAreaElement;

  it('shows the template text in an editable box', () => {
    render(<ClassificationTemplates />);
    expect(box().value).toBe(TEMPLATES[0].details);
  });

  it('lets the operator add to it', () => {
    render(<ClassificationTemplates />);
    fireEvent.change(box(), { target: { value: `${TEMPLATES[0].details}\n\nAlso: ships in 2 days.` } });
    expect(store().description).toBe(`${TEMPLATES[0].details}\n\nAlso: ships in 2 days.`);
  });

  it('offers no insert button while the template text is already there', () => {
    render(<ClassificationTemplates />);
    expect(screen.queryByRole('button', { name: /template text/i })).toBeNull();
  });

  it('offers to put the template text back once it has been cleared', () => {
    render(<ClassificationTemplates />);
    fireEvent.change(box(), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Use template text' }));
    expect(store().description).toBe(TEMPLATES[0].details);
  });

  it('APPENDS rather than overwriting what the operator wrote', () => {
    // The whole point of the button. Replacing here would reintroduce the bug
    // the tests above exist to prevent, only with a click behind it.
    useAddProductStore.setState({ description: 'My own words.', productDetailId: 'd1' });
    render(<ClassificationTemplates />);

    fireEvent.click(screen.getByRole('button', { name: 'Add template text' }));

    expect(store().description).toBe(`My own words.\n\n${TEMPLATES[0].details}`);
  });
});

describe('editing the SHARED catalogue template', () => {
  /*
   * A different act from editing the description above, and the two boxes look
   * alike — one changes this product, the other changes the wording every
   * future product of this classification is seeded with.
   *
   * The endpoint was there the whole time. `PATCH /catalog/edit/{id}` dispatches
   * on a `level` query parameter and `LevelDetail` maps to
   * catalog.product_details; the console had simply never called it, which is
   * why "make the templates editable" looked like it needed backend work.
   */
  const openEditor = () =>
    fireEvent.click(screen.getByRole('button', { name: /edit catalogue template/i }));

  it('sends the new wording to the catalogue endpoint', async () => {
    render(<ClassificationTemplates />);
    openEditor();
    fireEvent.change(screen.getByLabelText('Template text'), {
      target: { value: 'Rewritten catalogue wording.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save template' }));

    await waitFor(() => expect(updateClassificationTemplate).toHaveBeenCalled());
    expect(updateClassificationTemplate).toHaveBeenCalledWith('d1', {
      name: 'Oversized Tee',
      description: 'Rewritten catalogue wording.',
    });
  });

  it('warns that this is not the product being registered', () => {
    render(<ClassificationTemplates />);
    openEditor();
    expect(screen.getByText(/changes the catalogue for everyone/i)).toBeTruthy();
  });

  it('does NOT touch this product’s own description', async () => {
    useAddProductStore.setState({ description: 'My own words.', productDetailId: 'd1' });
    render(<ClassificationTemplates />);
    openEditor();
    fireEvent.change(screen.getByLabelText('Template text'), { target: { value: 'New shared text.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save template' }));

    await waitFor(() => expect(updateClassificationTemplate).toHaveBeenCalled());
    expect(store().description).toBe('My own words.');
  });

  it('shows the saved wording on the card, without a refetch to lean on', async () => {
    // `classificationDetails` is store state seeded once from /catalog/sku, not
    // a query. Without writing it back the card keeps the old text and the save
    // reads as having failed.
    render(<ClassificationTemplates />);
    openEditor();
    fireEvent.change(screen.getByLabelText('Template text'), { target: { value: 'Fresh wording.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save template' }));

    await waitFor(() =>
      expect((store().classificationDetails as Array<{ details?: string }>)[0].details).toBe(
        'Fresh wording.',
      ),
    );
  });

  it('reports a refusal instead of closing as though it saved', async () => {
    updateClassificationTemplate.mockResolvedValue({ ok: false, status: 403, data: null });
    render(<ClassificationTemplates />);
    openEditor();
    fireEvent.change(screen.getByLabelText('Template text'), { target: { value: 'Nope.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save template' }));

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByRole('alert').textContent).toMatch(/only an admin/i);
  });
});
