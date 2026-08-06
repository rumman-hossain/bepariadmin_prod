import { describe, it, expect } from 'vitest';
import {
  LOCATION_RANKING,
  MONTHLY_SALE,
  SHOP_TYPE,
  SHOP_DECOR,
  assessmentLabel,
  ASSESSMENT_CODES,
} from './assessment';

/**
 * The shop assessment: codes stored, labels rendered.
 *
 * The prototype puts the display string in the value —
 * `<option value="Main Goli (5 star)">`. Storing that makes every wording change
 * a data migration, makes sorting alphabetical nonsense, and makes a Bengali
 * translation impossible without rewriting rows. The database stores
 * `main_goli`; this map is the only place the English wording lives.
 */

describe('assessment options', () => {
  it('stores codes, never display text', () => {
    for (const group of [LOCATION_RANKING, MONTHLY_SALE, SHOP_TYPE, SHOP_DECOR]) {
      for (const opt of group) {
        expect(opt.value, `"${opt.value}" is display text, not a code`).toMatch(/^[a-z][a-z_]*$/);
        // A code that has drifted into a sentence has stopped being a code.
        expect(opt.value).not.toContain(' ');
        expect(opt.value.length).toBeLessThan(24);
      }
    }
  });

  it('gives every option a distinct code and a non-empty label', () => {
    for (const group of [LOCATION_RANKING, MONTHLY_SALE, SHOP_TYPE, SHOP_DECOR]) {
      const codes = group.map((o) => o.value);
      expect(new Set(codes).size, `duplicate code in ${codes.join(',')}`).toBe(codes.length);
      for (const opt of group) expect(opt.label.trim()).not.toBe('');
    }
  });

  it('keeps the ranking in a meaningful order, best first', () => {
    // These are ordered by how prime the position is, not alphabetically. An
    // operator scanning the dropdown reads it as a scale.
    expect(LOCATION_RANKING.map((o) => o.value)).toEqual([
      'main_goli',
      'near_main_goli',
      'far_from_main_goli',
    ]);
  });

  it('renders a stored code as its label', () => {
    expect(assessmentLabel(LOCATION_RANKING, 'main_goli')).toBe('Main goli — prime position');
    expect(assessmentLabel(SHOP_TYPE, 'big')).toBe('Big');
  });

  it('shows an unrecognised code as itself rather than blank', () => {
    /*
     * The server is ahead of the console more often than the reverse. A code
     * this build has never heard of must render as the code — visibly odd, and
     * a reason to look — not as an empty cell that reads as "not assessed".
     */
    expect(assessmentLabel(SHOP_TYPE, 'enormous')).toBe('enormous');
  });

  it('renders nothing for an absent value, so it can be shown as unassessed', () => {
    expect(assessmentLabel(SHOP_TYPE, null)).toBe('');
    expect(assessmentLabel(SHOP_TYPE, undefined)).toBe('');
  });

  it('exports the exact code set the database CHECK constraints allow', () => {
    // The one place the two halves are written down together. If a migration
    // widens a CHECK, this list is what has to change with it.
    expect(ASSESSMENT_CODES.locationRanking).toEqual([
      'main_goli', 'near_main_goli', 'far_from_main_goli',
    ]);
    expect(ASSESSMENT_CODES.estimatedMonthlySale).toEqual(['excellent', 'high', 'medium', 'low']);
    expect(ASSESSMENT_CODES.shopType).toEqual(['big', 'medium', 'small']);
    expect(ASSESSMENT_CODES.shopDecorType).toEqual(['very_nice', 'nice', 'less_nice']);
  });
});
