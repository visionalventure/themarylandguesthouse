'use client';

import { useTheme } from 'next-themes';

/**
 * Recharts sets fill/stroke/stopColor as raw SVG attributes (not through the CSS
 * cascade), so `hsl(var(--primary))` doesn't reliably resolve there the way it does
 * in stylesheets/className usage. Resolve theme-aware literal hex colors in JS instead.
 */
const LIGHT = {
  primary:     '#B8860B',
  chart1:      '#B8860B',
  chart2:      '#2E8B57',
  chart3:      '#D4A017',
  chart4:      '#D9534F',
  chart5:      '#8B6914',
  destructive: '#D9534F',
  muted:       '#9ca3af',
  border:      '#e5e7eb',
};

const DARK = {
  primary:     '#D4AF37',
  chart1:      '#D4AF37',
  chart2:      '#45B97C',
  chart3:      '#F4B942',
  chart4:      '#D9534F',
  chart5:      '#534E4A',
  destructive: '#D9534F',
  muted:       '#534E4A',
  border:      'rgba(255,255,255,0.08)',
};

export function useChartColors() {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === 'dark' ? DARK : LIGHT;
}
