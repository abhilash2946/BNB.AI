import { render, screen } from '@testing-library/react';
import { KpiRibbon } from './KpiRibbon';
import { TrendingUp } from 'lucide-react';
import { describe, it, expect } from 'vitest';
import React from 'react';

describe('KpiRibbon', () => {
  it('renders KPI items correctly', () => {
    const items = [
      { label: 'Traffic', value: '1,234', change: '+12%', icon: TrendingUp },
      { label: 'Leads', value: '56', change: '-3%', icon: TrendingUp },
    ];
    render(<KpiRibbon items={items} />);
    expect(screen.getByText('Traffic')).toBeInTheDocument();
    expect(screen.getByText('1,234')).toBeInTheDocument();
    expect(screen.getByText('+12%')).toBeInTheDocument();
    expect(screen.getByText('Leads')).toBeInTheDocument();
    expect(screen.getByText('-3%')).toBeInTheDocument();
  });
});
