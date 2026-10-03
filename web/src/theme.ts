import type { ThemeConfig } from 'antd';

/**
 * Park green. Contrast against white (computed with the WCAG formula):
 * normal 8.08:1, hover 6.21:1, pressed 10.48:1. All at least 4.5:1 in both directions
 * (green text on white, white text on green). antd's default blue is 4.10:1 and fails AA.
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
      colorBorder: '#767676', // 4.54:1 on white, so button edges pass the 3:1 non-text rule
      borderRadius: 8,
      fontSize: 16,
      controlHeight: 44, // keeps antd buttons at the 44px target size
      motion: !reducedMotion,
    },
  };
}
