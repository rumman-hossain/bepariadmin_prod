import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * THE DEFECT THAT STARTED THIS, PINNED.
 *
 * The product list called `GET /api/v1/products` — the CATALOGUE route, shared
 * with retailers, which defaults to approved+public. So "All Statuses" silently
 * meant "approved only" and every product waiting for review was invisible. The
 * screen even carried a banner explaining this, pointing operators at
 * `PATCH /products/:id/status`, which answers 410 Gone.
 *
 * The back-office route exists precisely to answer the other question. Nothing
 * about the redesign works if the list drifts back to the catalogue, and the
 * drift would be invisible: the screen would render, the table would fill, and
 * the Pending tab would read zero forever.
 */

const requestMock = vi.fn();

vi.mock('@/src/api/client', () => ({
  request: (...args: unknown[]) => requestMock(...args),
}));

const okEnvelope = {
  ok: true,
  status: 200,
  data: {
    data: [],
    meta: { total: 0, page: 1, limit: 25, statusCounts: null },
  },
};

/** The path + parsed query of the single call made. */
async function callAndCapture(
  params: Parameters<
    typeof import('@/src/api/adminProducts')['listAdminProducts']
  >[0],
) {
  const { listAdminProducts } = await import('@/src/api/adminProducts');
  requestMock.mockResolvedValue(okEnvelope);
  await listAdminProducts(params);

  expect(requestMock).toHaveBeenCalledTimes(1);
  const [method, url] = requestMock.mock.calls[0] as [string, string];
  const [path, query] = url.split('?');
  return { method, path, query: new URLSearchParams(query ?? '') };
}

beforeEach(() => {
  requestMock.mockReset();
});

describe('the product list talks to the back-office route', () => {
  it('requests /api/v1/admin/products, not the shared catalogue', async () => {
    const { method, path } = await callAndCapture({ page: 1, limit: 25 });

    expect(method).toBe('GET');
    expect(path).toBe('/api/v1/admin/products');
    // Said explicitly: this is the exact regression, and `toBe` above would
    // also pass for a typo'd admin path, so name the wrong one too.
    expect(path).not.toBe('/api/v1/products');
  });

  it('sends the state filter, which is the whole point of the route', async () => {
    const { query } = await callAndCapture({ page: 1, limit: 25, state: 'PENDING' });
    expect(query.get('state')).toBe('PENDING');
  });

  /*
   * An absent state means EVERY state. The server refuses an unknown value with
   * a 400 rather than ignoring it, so sending `state=` would turn the "All" tab
   * into an error instead of an unfiltered list.
   */
  it('omits state entirely when no state is selected', async () => {
    const { query } = await callAndCapture({ page: 1, limit: 25 });
    expect(query.has('state')).toBe(false);
  });

  it('sends the filters the server can actually apply', async () => {
    const { query } = await callAndCapture({
      page: 2,
      limit: 50,
      search: 'jamdani',
      state: 'APPROVED',
      supplierId: 'sup-1',
      categoryId: 'cat-1',
      lowStock: true,
    });

    expect(query.get('page')).toBe('2');
    expect(query.get('limit')).toBe('50');
    expect(query.get('search')).toBe('jamdani');
    expect(query.get('supplierId')).toBe('sup-1');
    expect(query.get('categoryId')).toBe('cat-1');
    // Server-side now. This used to be applied in the browser over one
    // already-truncated page, so the visible row count and the pager's total
    // disagreed and nothing past the current page was ever considered.
    expect(query.get('lowStock')).toBe('true');
  });

  it('does not send lowStock when it is off', async () => {
    const { query } = await callAndCapture({ page: 1, limit: 25, lowStock: false });
    expect(query.has('lowStock')).toBe(false);
  });
});

describe('the list survives a response without counts', () => {
  /*
   * The server logs and serves the list when the count query fails — the list
   * is the point, the counts are a convenience. The console must degrade the
   * same way rather than blanking a screen over a missing number.
   */
  it('falls back to zeroed counts rather than throwing', async () => {
    const { listAdminProducts } = await import('@/src/api/adminProducts');
    requestMock.mockResolvedValue({
      ok: true,
      status: 200,
      data: { data: [{ id: 'p1' }], meta: { total: 1 } },
    });

    const res = await listAdminProducts({ page: 1, limit: 25 });

    expect(res.ok).toBe(true);
    expect(res.data.products).toHaveLength(1);
    expect(res.data.counts).toEqual({
      draft: 0,
      pending: 0,
      approved: 0,
      public: 0,
      rejected: 0,
      removed: 0,
    });
  });

  it('treats a null data array as an empty page, not a crash', async () => {
    const { listAdminProducts } = await import('@/src/api/adminProducts');
    requestMock.mockResolvedValue({ ok: true, status: 200, data: { data: null } });

    const res = await listAdminProducts({ page: 1, limit: 25 });
    expect(res.data.products).toEqual([]);
  });
});

describe('the lifecycle verbs replace the retired status route', () => {
  const cases: Array<[string, (m: typeof import('@/src/api/adminProducts')) => Promise<unknown>, string]> = [
    ['approve', (m) => m.approveProduct('p1'), '/api/v1/products/p1/approve'],
    ['reject', (m) => m.rejectProduct('p1', 'no label'), '/api/v1/products/p1/reject'],
    ['publish', (m) => m.publishProduct('p1'), '/api/v1/products/p1/publish'],
    ['take-down', (m) => m.takeDownProduct('p1', 'counterfeit'), '/api/v1/products/p1/take-down'],
  ];

  it.each(cases)('%s posts to its verb route', async (_name, call, expectedPath) => {
    const mod = await import('@/src/api/adminProducts');
    requestMock.mockResolvedValue({ ok: true, status: 200, data: { data: {} } });

    await call(mod);

    const [method, url] = requestMock.mock.calls[0] as [string, string];
    expect(method).toBe('POST');
    expect(url).toBe(expectedPath);
    // The route this replaced. A PATCH to it returns 410 Gone, so a caller that
    // drifts back would fail at runtime with nothing explaining why.
    expect(url).not.toContain('/status');
  });

  it('carries the reason for the two actions that require one', async () => {
    const { rejectProduct } = await import('@/src/api/adminProducts');
    requestMock.mockResolvedValue({ ok: true, status: 200, data: { data: {} } });

    await rejectProduct('p1', 'Fabric label missing from the images');

    const [, , opts] = requestMock.mock.calls[0] as [string, string, { body: unknown }];
    expect(opts.body).toEqual({ reason: 'Fabric label missing from the images' });
  });

  it('sends an empty body when there is no reason, so the machine decides', async () => {
    const { approveProduct } = await import('@/src/api/adminProducts');
    requestMock.mockResolvedValue({ ok: true, status: 200, data: { data: {} } });

    await approveProduct('p1');

    const [, , opts] = requestMock.mock.calls[0] as [string, string, { body: unknown }];
    expect(opts.body).toEqual({});
  });
});
