import React from 'react';
import { describe, expect, it } from 'vitest';
import { Navigate } from 'react-router-dom';
import { FeatureRoute } from './App';

describe('FeatureRoute', () => {
  it('redirects a disabled feature before mounting its protected content', () => {
    const child = React.createElement('div', { 'data-testid': 'reconciliation-secret' });
    const result = FeatureRoute({ enabled: false, fallbackPath: '/dashboard', children: child }) as React.ReactElement;

    expect(result.type).toBe(Navigate);
    expect(result.props.to).toBe('/dashboard');
    expect(result.props.replace).toBe(true);
  });

  it('preserves the module when the controlled flag is explicitly enabled', () => {
    const child = React.createElement('div', { 'data-testid': 'reconciliation-secret' });
    const result = FeatureRoute({ enabled: true, children: child }) as React.ReactElement;

    expect(result.type).toBe(React.Fragment);
    expect(result.props.children).toBe(child);
  });
});
