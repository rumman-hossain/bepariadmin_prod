// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { SettingsPage } from '../pages/SettingsPage';

/**
 * The two rails, as the screen presents them.
 *
 * The server enforces both and would refuse either way — these assertions are
 * about not OFFERING an action that will be refused, and about saying why.
 * A control that silently fails teaches people the console is unreliable; one
 * that is absent with a reason teaches them the rule.
 */

const getStaff = vi.fn();
const getPlatformMargin = vi.fn();

vi.mock('../api/settingsApi', async () => {
  const actual = await vi.importActual<typeof import('../api/settingsApi')>('../api/settingsApi');
  return {
    ...actual,
    getStaff: () => getStaff(),
    getPlatformMargin: () => getPlatformMargin(),
    setStaffRole: vi.fn(),
    setStaffStatus: vi.fn(),
    setPlatformMargin: vi.fn(),
  };
});

let role = 'super_admin';
const ME = 'me-0000';
vi.mock('@/src/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: ME, role } }),
}));

const account = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'sa-1',
  name: 'Nadia',
  email: 'nadia@example.test',
  role: 'admin',
  status: 'active',
  createdAt: '2026-01-05T00:00:00Z',
  updatedAt: '2026-01-05T00:00:00Z',
  ...over,
});

function renderPage(search = '') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/settings${search}`]}>
        <SettingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** The table row for a person, so assertions are scoped to them. */
function rowFor(name: string) {
  const cell = screen.getByText(name);
  const row = cell.closest('tr');
  if (!row) throw new Error(`no row for ${name}`);
  return row;
}

beforeEach(() => {
  role = 'super_admin';
  getPlatformMargin.mockResolvedValue(9.5);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('the last active super admin', () => {
  beforeEach(() => {
    getStaff.mockResolvedValue([
      account({ id: 'sup-1', name: 'Only Super', role: 'super_admin', status: 'active' }),
      account({ id: 'a-1', name: 'Nadia', role: 'admin', status: 'active' }),
      // Inactive super admins are not cover — they cannot sign in, so they
      // cannot create staff either.
      account({ id: 'sup-2', name: 'Dormant Super', role: 'super_admin', status: 'inactive' }),
    ]);
  });

  it('cannot have their access revoked', async () => {
    renderPage();
    await screen.findByText('Only Super');
    expect(within(rowFor('Only Super')).queryByRole('button', { name: /revoke/i })).toBeNull();
  });

  it('cannot have their role changed', async () => {
    renderPage();
    await screen.findByText('Only Super');
    expect(within(rowFor('Only Super')).queryByRole('combobox')).toBeNull();
  });

  it('says why, rather than leaving the absence unexplained', async () => {
    renderPage();
    await screen.findByText('Only Super');
    expect(within(rowFor('Only Super')).getByText(/last super admin/i)).toBeTruthy();
  });

  it('does not restrict everyone else', async () => {
    // The rail must not degrade into "nothing can be changed".
    renderPage();
    await screen.findByText('Nadia');
    expect(within(rowFor('Nadia')).getByRole('button', { name: /revoke/i })).toBeTruthy();
    expect(within(rowFor('Nadia')).getByRole('combobox')).toBeTruthy();
  });
});

describe('when a second super admin is active', () => {
  it('the first one can be changed again', async () => {
    getStaff.mockResolvedValue([
      account({ id: 'sup-1', name: 'Only Super', role: 'super_admin', status: 'active' }),
      account({ id: 'sup-2', name: 'Second Super', role: 'super_admin', status: 'active' }),
    ]);
    renderPage();
    await screen.findByText('Only Super');
    expect(within(rowFor('Only Super')).getByRole('button', { name: /revoke/i })).toBeTruthy();
  });
});

describe('your own account', () => {
  beforeEach(() => {
    getStaff.mockResolvedValue([
      account({ id: ME, name: 'You', role: 'super_admin', status: 'active' }),
      account({ id: 'sup-2', name: 'Second Super', role: 'super_admin', status: 'active' }),
    ]);
  });

  it('cannot be revoked or demoted by you', async () => {
    // Two super admins exist, so the last-super-admin rail is not what is doing
    // the work here — this is specifically the self rule.
    renderPage();
    await screen.findByText('You');
    expect(within(rowFor('You')).queryByRole('button', { name: /revoke/i })).toBeNull();
    expect(within(rowFor('You')).queryByRole('combobox')).toBeNull();
    expect(within(rowFor('You')).getByText(/your own account/i)).toBeTruthy();
  });
});

describe('a revoked account', () => {
  it('stays listed, and can be restored', async () => {
    getStaff.mockResolvedValue([
      account({ id: 'gone', name: 'Departed', role: 'operations', status: 'inactive' }),
      account({ id: 'sup-1', name: 'Only Super', role: 'super_admin', status: 'active' }),
    ]);
    renderPage();
    await screen.findByText('Departed');
    expect(within(rowFor('Departed')).getByRole('button', { name: /restore access/i })).toBeTruthy();
  });
});

describe('a role that cannot change access', () => {
  beforeEach(() => {
    role = 'operations';
    getStaff.mockResolvedValue([account({ id: 'a-1', name: 'Nadia', role: 'admin', status: 'active' })]);
  });

  it('is shown the list without any controls, and told why', async () => {
    renderPage();
    await screen.findByText('Nadia');
    expect(within(rowFor('Nadia')).queryByRole('button', { name: /revoke/i })).toBeNull();
    expect(within(rowFor('Nadia')).queryByRole('combobox')).toBeNull();
    expect(screen.getByText(/restricted to super admins/i)).toBeTruthy();
  });
});

describe('the platform margin', () => {
  beforeEach(() => {
    getStaff.mockResolvedValue([account()]);
  });

  it('says a change does not re-price what is already sold', async () => {
    // The expectation most likely to be wrong, and the most expensive to be
    // wrong about — orders capture their own commission rate at sale.
    renderPage('?tab=commercial');
    expect(await screen.findByText(/does not re-price anything already sold/i)).toBeTruthy();
  });

  it('shows the current value', async () => {
    renderPage('?tab=commercial');
    expect(await screen.findByText('9.5%')).toBeTruthy();
  });
});
