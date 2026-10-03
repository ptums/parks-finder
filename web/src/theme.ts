import type { ThemeConfig } from 'antd';

/**
 * Park green. Contrast against white (computed with the WCAG formula):
 * normal 6.29:1, hover 4.92:1, pressed 8.7:1. All at least 4.5:1 in both directions
 * (green text on white, white text on green). antd's default blue is 3.49:1 and fails AA.
 */
export const PRIMARY = '#0b5d1e';
const PRIMARY_HOVER = '#14702a';
const PRIMARY_ACTIVE = '#084a18';

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** One theme for the whole app. With reduced motion, antd gets no transitions at all. */
export function createTheme(reducedMotion: boolean): ThemeConfig {
  return {
    token: {
      colorPrimary: PRIMARY,
      colorPrimaryHover: PRIMARY_HOVER,
      colorPrimaryActive: PRIMARY_ACTIVE,
      colorLink: PRIMARY,
      colorTextBase: '#1a1a1a',
      borderRadius: 8,
      fontSize: 16,
      controlHeight: 44, // keeps antd buttons at the 44px target size
      motion: !reducedMotion,
    },
  };
}
