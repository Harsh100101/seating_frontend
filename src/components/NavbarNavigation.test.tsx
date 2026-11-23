import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Navbar } from './Navbar';
import * as AuthContextModule from '../context/AuthContext';

describe('Navbar Role-Based Navigation Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the backend-authorized, unit-scoped Data Quality route for UNIT_ADMIN', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      adminUser: { id: 'u-1', email: 'unit1@shaktiman.com', name: 'Unit 1 Admin', role: 'UNIT_ADMIN' },
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshMe: vi.fn(),
    });

    const html = renderToStaticMarkup(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    // UNIT_ADMIN sees standard operational items
    expect(html).toContain('Dashboard');
    expect(html).toContain('Shakti Sankul');
    expect(html).toContain('Seating Arrangement');
    expect(html).toContain('Hierarchy &amp; Workstations');
    expect(html).toContain('Floor Plan');
    expect(html).toContain('Employees');

    // Data Quality is available, but the disabled reconciliation workflow is not.
    expect(html).toContain('/data-quality');
    expect(html).toContain('Data Quality');
    expect(html).toContain('Unit scope');
    expect(html).not.toContain('Employee Reconciliation');
  });

  it('keeps Data Quality visible but hides Employee Reconciliation for TECH_ADMIN', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      adminUser: { id: 't-1', email: 'techadmin@shaktiman.com', name: 'Tech Admin', role: 'TECH_ADMIN' },
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshMe: vi.fn(),
    });

    const html = renderToStaticMarkup(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    expect(html).toContain('/data-quality');
    expect(html).toContain('Data Quality');
    expect(html).not.toContain('/data-quality/reconciliation');
    expect(html).not.toContain('Employee Reconciliation');
  });

  it('keeps Data Quality visible but hides Employee Reconciliation for SUPER_ADMIN', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      adminUser: { id: 's-1', email: 'superadmin@shaktiman.com', name: 'Super Admin', role: 'SUPER_ADMIN' },
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshMe: vi.fn(),
    });

    const html = renderToStaticMarkup(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    expect(html).toContain('/data-quality');
    expect(html).toContain('Data Quality');
    expect(html).not.toContain('/data-quality/reconciliation');
    expect(html).not.toContain('Employee Reconciliation');
  });

  it('omits the More button in wide navigation for UNIT_ADMIN because all 8 items fit', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      adminUser: { id: 'u-1', email: 'unit1@shaktiman.com', name: 'Unit 1 Admin', role: 'UNIT_ADMIN' },
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshMe: vi.fn(),
    });

    const html = renderToStaticMarkup(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    const wideNavMatch = html.match(/class="[^"]*navbar-compact-nav-wide[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    expect(wideNavMatch).not.toBeNull();
    const wideNavContent = wideNavMatch![1];

    expect(wideNavContent).toContain('Facilities');
    expect(wideNavContent).toContain('Reports');
    expect(wideNavContent).not.toContain('navbar-more-trigger');
    expect(wideNavContent).not.toContain('>More</span>');
  });

  it('includes the More button in wide navigation for TECH_ADMIN where extra items exist', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      adminUser: { id: 't-1', email: 'techadmin@shaktiman.com', name: 'Tech Admin', role: 'TECH_ADMIN' },
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshMe: vi.fn(),
    });

    const html = renderToStaticMarkup(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    const wideNavMatch = html.match(/class="[^"]*navbar-compact-nav-wide[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    expect(wideNavMatch).not.toBeNull();
    const wideNavContent = wideNavMatch![1];

    expect(wideNavContent).toContain('navbar-more-trigger');
    expect(wideNavContent).toContain('>More</span>');
  });
});
