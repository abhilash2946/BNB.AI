import { render, screen } from '@testing-library/react';
import { GlassCard } from './GlassCard';
import { describe, it, expect } from 'vitest';
import React from 'react';

describe('GlassCard', () => {
  it('renders children', () => {
    render(<GlassCard>Hello World</GlassCard>);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });
});
