import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { EmployeeReconciliationPage } from './EmployeeReconciliationPage';
import * as AuthContextModule from '../context/AuthContext';
import * as ReconciliationApiModule from '../api/reconciliation';

describe('EmployeeReconciliationPage RBAC & View Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(ReconciliationApiModule, 'fetchReconciliationSummary').mockResolvedValue({
      totalExcelEmployees: 10,
      matchedEmployees: 8,
      openMismatches: 2,
      resolvedMismatches: 0,
      needsReview: 0,
      excelStale: 0,
      systemCorrectionRequired: 2,
      formattingOnly: 0,
      blockedAmbiguous: 0,
    });
    vi.spyOn(ReconciliationApiModule, 'fetchReconciliationCases').mockResolvedValue({
      cases: [],
      total: 0,
      page: 1,
      limit: 15,
      totalPages: 1,
    });
  });

  it('renders Access Denied screen for UNIT_ADMIN and hides all tables and metrics', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      adminUser: { id: 'u-1', email: 'unit1@shaktiman.com', name: 'Unit 1 Admin', role: 'UNIT_ADMIN' },
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshMe: vi.fn(),
    });

    const html = renderToStaticMarkup(
      <MemoryRouter>
        <EmployeeReconciliationPage />
      </MemoryRouter>
    );

    expect(html).toContain('reconciliation-access-denied');
    expect(html).toContain('Access Denied');
    expect(html).toContain('You do not have permission to access Data Quality');
    expect(html).toContain('This module is restricted to Super Admin and Technical Admin');
    expect(html).not.toContain('reconciliation-page');
    expect(html).not.toContain('Reconciliation Cases');
  });

  it('renders prominent READ-ONLY banner and badge for TECH_ADMIN', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      adminUser: { id: 't-1', email: 'techadmin@shaktiman.com', name: 'Tech Admin', role: 'TECH_ADMIN' },
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshMe: vi.fn(),
    });

    const html = renderToStaticMarkup(
      <MemoryRouter>
        <EmployeeReconciliationPage />
      </MemoryRouter>
    );

    expect(html).toContain('reconciliation-page');
    expect(html).toContain('header-tech-admin-readonly-badge');
    expect(html).toContain('READ ONLY');
    expect(html).toContain('prominent-tech-admin-banner');
    expect(html).toContain('READ ONLY MODE — Technical Administrator');
    expect(html).toContain('All live mutation actions (Keep Current, Correct System, Formatting Only, Needs Review, Apply Correction, Resolve, Reopen) are hidden or disabled');
  });

  it('renders SUPER_ADMIN view without read-only restrictions', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      adminUser: { id: 's-1', email: 'superadmin@shaktiman.com', name: 'Super Admin', role: 'SUPER_ADMIN' },
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshMe: vi.fn(),
    });

    const html = renderToStaticMarkup(
      <MemoryRouter>
        <EmployeeReconciliationPage />
      </MemoryRouter>
    );

    expect(html).toContain('reconciliation-page');
    expect(html).toContain('header-super-admin-badge');
    expect(html).toContain('SUPER ADMIN');
    expect(html).not.toContain('header-tech-admin-readonly-badge');
    expect(html).not.toContain('prominent-tech-admin-banner');
  });
});
