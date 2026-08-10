// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { ProductImage } from '../components/ProductImage';

/**
 * AN EMPTY BOX IS NOT A FAULT REPORT.
 *
 * Every product image in the console was a bare `<img>` with no `onError` —
 * only Avatar.tsx had one. So a product carrying
 *
 *     <img src="/api/v1/file/lscRDFAi-VrKND4ovAfDow">
 *
 * — a fifteen-minute media token that had been written to the database and
 * expired — rendered nothing at all, which reads as a styling glitch. It stayed
 * that way until somebody pasted the tag into a message and asked.
 */

afterEach(cleanup);

const show = (src = '/api/v1/file/dead-token') =>
  render(<ProductImage src={src} alt="ggg" className="h-10 w-10" />);

const img = () => document.querySelector('img') as HTMLImageElement;

describe('an image that loads', () => {
  it('renders the image and says nothing', () => {
    show();
    expect(img()).toBeTruthy();
    expect(screen.queryByText(/did not load/i)).toBeNull();
  });

  it('is lazy by default, because lists of them are long', () => {
    show();
    expect(img().getAttribute('loading')).toBe('lazy');
  });
});

describe('an image that does not load', () => {
  it('says so instead of leaving a blank space', () => {
    show();
    fireEvent.error(img());
    expect(screen.getByText(/did not load/i)).toBeTruthy();
  });

  it('keeps the alt text, so the row still names what is missing', () => {
    show();
    fireEvent.error(img());
    // role="img" with a label, not a bare div: a screen reader is otherwise
    // told nothing at all about a thing the sighted user can see is wrong.
    expect(screen.getByRole('img', { name: /ggg/i })).toBeTruthy();
  });

  it('points at the fix rather than just the symptom', () => {
    show();
    fireEvent.error(img());
    const el = screen.getByRole('img', { name: /ggg/i });
    expect(el.getAttribute('title')).toMatch(/re-upload/i);
  });

  it('clears the verdict when the source changes', () => {
    /*
     * Rows are reused. Without this, a product whose photograph was just
     * repaired inherits the previous row's failure and still shows as broken.
     */
    const { rerender } = show('/api/v1/file/dead');
    fireEvent.error(img());
    expect(screen.queryByText(/did not load/i)).not.toBeNull();

    rerender(<ProductImage src="/api/v1/file/fresh" alt="ggg" className="h-10 w-10" />);

    expect(screen.queryByText(/did not load/i)).toBeNull();
    expect(img()).toBeTruthy();
  });
});
