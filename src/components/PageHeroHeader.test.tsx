import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Activity } from 'lucide-react';
import { PageHeroHeader } from './PageHeroHeader';

describe('PageHeroHeader', () => {
  it('renders the shared dashboard-style hierarchy and responsive action region', () => {
    const html = renderToStaticMarkup(
      <PageHeroHeader
        id="test-page-title"
        eyebrow="Workspace management"
        title="Hierarchy & Workstations"
        description="Explore workstations across your authorized Unit scope."
        icon={Activity}
        actions={<button type="button">Refresh</button>}
      />,
    );

    expect(html).toContain('Workspace management');
    expect(html).toContain('Hierarchy &amp; Workstations');
    expect(html).toContain('Explore workstations across your authorized Unit scope.');
    expect(html).toContain('aria-labelledby="test-page-title"');
    expect(html).toContain('Refresh');
    expect(html).toContain('md:flex-row');
  });
});
