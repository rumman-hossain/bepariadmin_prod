// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { ClassificationTemplates } from '../ClassificationTemplates';
import { useAddProductStore } from '../../store/useAddProductStore';

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
