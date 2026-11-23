import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import * as AuthContextModule from '../context/AuthContext';
import { DataQualityPage } from './DataQualityPage';

describe('DataQualityPage Unit Admin scope', () => {
  it('renders the scoped report rather than a client-side access denial', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      adminUser: { id: 'unit-admin', email: 'unit@example.test', name: 'Unit Admin', role: 'UNIT_ADMIN', assignedUnitId: 'unit-1' },
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshMe: vi.fn(),
    });

    const html = renderToStaticMarkup(<MemoryRouter><DataQualityPage /></MemoryRouter>);
    expect(html).toContain('Data Quality &amp; Conflicts');
    expect(html).toContain('in your assigned Unit');
    expect(html).not.toContain('Access Denied');
  });
});
