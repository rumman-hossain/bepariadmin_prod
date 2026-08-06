import { describe, it, expect } from 'vitest';
import { parseTakaToPaisa, toTaka } from '../accountingApi';

/*
 * parseTakaToPaisa is the ONLY money arithmetic in the admin frontend. Every
 * other figure arrives from the server already computed (guard G12). This one
 * exists because a person types taka and the API takes paisa, and that
 * conversion has to happen somewhere.
 *
 * Being the only one, it is also the only place a frontend rounding error can
 * enter the cash book — and once an expense posts, the entry is append-only.
 * There is no correcting it later except by a visible adjustment. So it is
 * pinned harder than its size suggests.
 */

describe('parseTakaToPaisa', () => {
  it('converts whole taka', () => {
    expect(parseTakaToPaisa('1')).toBe(100);
    expect(parseTakaToPaisa('25000')).toBe(2_500_000);
  });

  it('converts one and two decimal places', () => {
    // "48.2" is forty-eight taka twenty paisa, not forty-eight taka two paisa.
    // A naive Number(frac) would give 4802 here.
    expect(parseTakaToPaisa('48.2')).toBe(4820);
    expect(parseTakaToPaisa('48.21')).toBe(4821);
    expect(parseTakaToPaisa('0.05')).toBe(5);
  });

  it('is exact where multiply-then-round is a coin toss', () => {
    /*
     * These are the values that discriminate. Every one of them has a product
     * that is not exactly representable:
     *
     *   0.29  * 100 = 28.999999999999996
     *   1.13  * 100 = 112.99999999999999
     *   2.01  * 100 = 200.99999999999997
     *   8.11  * 100 = 810.9999999999999
     *
     * `Math.round` happens to rescue all four. `Math.trunc` or a bare `| 0`
     * would silently lose a paisa on each — which is exactly the kind of error
     * that survives review because the expression looks right.
     */
    expect(parseTakaToPaisa('0.29')).toBe(29);
    expect(parseTakaToPaisa('1.13')).toBe(113);
    expect(parseTakaToPaisa('2.01')).toBe(201);
    expect(parseTakaToPaisa('8.11')).toBe(811);
    expect(parseTakaToPaisa('1234567.89')).toBe(123_456_789);
  });

  it('accepts surrounding whitespace, since paste carries it', () => {
    expect(parseTakaToPaisa('  1200.50 ')).toBe(120_050);
  });

  it('refuses more than two decimal places rather than rounding them away', () => {
    // Silently turning 10.005 into 1000 or 1001 is a decision the operator did
    // not make. Refusing tells them the amount is not one the book can hold.
    expect(parseTakaToPaisa('10.005')).toBeNull();
    expect(parseTakaToPaisa('0.999')).toBeNull();
  });

  it('refuses a sign', () => {
    // An expense is an amount; "out" is the direction, held separately. A
    // negative amount here would post the entry backwards and the ledger's
    // amount_minor > 0 constraint would reject it as a 500 rather than a
    // legible refusal.
    expect(parseTakaToPaisa('-50')).toBeNull();
    expect(parseTakaToPaisa('+50')).toBeNull();
  });

  it('refuses what is not a plain amount', () => {
    expect(parseTakaToPaisa('')).toBeNull();
    expect(parseTakaToPaisa('   ')).toBeNull();
    expect(parseTakaToPaisa('abc')).toBeNull();
    expect(parseTakaToPaisa('1,200')).toBeNull(); // grouped input, not a number
    expect(parseTakaToPaisa('৳500')).toBeNull();
    expect(parseTakaToPaisa('1e3')).toBeNull(); // Number() would take this
    expect(parseTakaToPaisa('.5')).toBeNull(); // ambiguous; ask for 0.5
    expect(parseTakaToPaisa('5.')).toBeNull();
    expect(parseTakaToPaisa('Infinity')).toBeNull();
    expect(parseTakaToPaisa('NaN')).toBeNull();
  });

  it('refuses amounts past exact integer range', () => {
    // ~90 trillion taka. Not a real expense — but past this the paisa figure
    // stops being exact, and an inexact amount is worse than a refused one.
    expect(parseTakaToPaisa('999999999999999999')).toBeNull();
  });

  it('round-trips through toTaka', () => {
    for (const s of ['0.01', '48.21', '1200.50', '25000', '1234567.89']) {
      const paisa = parseTakaToPaisa(s);
      expect(paisa).not.toBeNull();
      expect(toTaka(paisa as number)).toBeCloseTo(Number(s), 10);
    }
  });
});
