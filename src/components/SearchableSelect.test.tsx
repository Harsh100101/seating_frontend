import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SearchableSelect } from './SearchableSelect';

describe('SearchableSelect component', () => {
  const options = ['Hemins Kukadia', 'Piyush Bharda', 'Yogesh Gupta', 'Rajesh Patel'];

  it('renders trigger with placeholder when value is empty', () => {
    const html = renderToStaticMarkup(
      <SearchableSelect
        name="employee-reportingTo"
        value=""
        onChange={vi.fn()}
        options={options}
        placeholder="Select Reporting Manager (Optional)"
      />
    );
    expect(html).toContain('Select Reporting Manager (Optional)');
    expect(html).toContain('name="employee-reportingTo"');
    expect(html).toContain('Search name');
  });

  it('renders trigger with selected value', () => {
    const html = renderToStaticMarkup(
      <SearchableSelect
        name="employee-hod"
        value="Piyush Bharda"
        onChange={vi.fn()}
        options={options}
      />
    );
    expect(html).toContain('Piyush Bharda');
    expect(html).toContain('name="employee-hod"');
    expect(html).toContain('value="Piyush Bharda"');
    expect(html).toContain('Clear selection');
    expect(html).toContain('Search name');
  });

  it('renders error styling and aria-describedby when hasError is true', () => {
    const html = renderToStaticMarkup(
      <SearchableSelect
        name="employee-reportingTo"
        value=""
        onChange={vi.fn()}
        options={options}
        hasError={true}
        ariaDescribedBy="employee-reportingTo-error"
      />
    );
    expect(html).toContain('border-red-500');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="employee-reportingTo-error"');
  });

  it('renders disabled state properly', () => {
    const html = renderToStaticMarkup(
      <SearchableSelect
        value=""
        onChange={vi.fn()}
        options={options}
        disabled={true}
      />
    );
    expect(html).toContain('disabled=""');
    expect(html).toContain('cursor-not-allowed');
  });

  it('does not nest buttons or interactive controls inside the main trigger button', () => {
    const html = renderToStaticMarkup(
      <SearchableSelect
        id="test-select"
        name="employee-reportingTo"
        value="Hemins Kukadia"
        onChange={vi.fn()}
        options={options}
      />
    );
    // Verify no buttons or role="button" elements are nested inside another button
    const triggerMatch = html.match(/<button[^>]*id="test-select"[^>]*>([\s\S]*?)<\/button>/);
    expect(triggerMatch).not.toBeNull();
    expect(triggerMatch![1]).not.toContain('<button');
    expect(triggerMatch![1]).not.toContain('role="button"');
  });
});
