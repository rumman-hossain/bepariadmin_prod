import { useEffect, useState } from 'react';

/**
 * Returns `value` after it has stopped changing for `delayMs`.
 *
 * Written because the product list had none: `SearchFilterBar` fires
 * `onChange` per keystroke, which set a store filter, which an effect watched,
 * which issued a request. Typing "panjabi" produced seven `GET /products`
 * calls — and because the client only de-duplicates *identical in-flight*
 * requests, all seven went out.
 *
 * Debouncing alone is not sufficient: it reduces the number of racing requests
 * but does not order them. The store also carries a request-generation guard so
 * a slow earlier response cannot overwrite a newer one.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    // An identical value needs no timer — this also makes the first render a
    // no-op rather than scheduling work that resolves to what we already have.
    if (value === debounced) return;
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs, debounced]);

  return debounced;
}
