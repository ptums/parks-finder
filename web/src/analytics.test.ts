const init = jest.fn();
const captureMock = jest.fn();
let importShouldFail = false;
let importCount = 0;

jest.mock('posthog-js', () => {
  importCount++;
  if (importShouldFail) throw new Error('blocked');
  return { __esModule: true, default: { init, capture: captureMock } };
});

let a: typeof import('./analytics');
let env: typeof import('./env').env;

beforeEach(async () => {
  jest.resetModules();
  init.mockReset();
  captureMock.mockReset();
  importShouldFail = false;
  importCount = 0;
  ({ env } = await import('./env'));
  env.posthogKey = '';
  env.posthogHost = 'https://eu.i.posthog.com';
  a = await import('./analytics');
});

const reset = { name: 'reset_clicked', props: {} } as const;

it('without a key: init and track do nothing and posthog-js is never loaded', async () => {
  await a.initAnalytics();
  a.track(reset);
  expect(importCount).toBe(0);
  expect(init).not.toHaveBeenCalled();
  expect(captureMock).not.toHaveBeenCalled();
});

it('with a key: init gets exactly the privacy options', async () => {
  env.posthogKey = 'phc_test';
  await a.initAnalytics();
  expect(init).toHaveBeenCalledTimes(1);
  expect(init).toHaveBeenCalledWith('phc_test', {
    api_host: 'https://eu.i.posthog.com',
    persistence: 'memory',
    person_profiles: 'identified_only',
    respect_dnt: true,
    disable_session_recording: true,
    capture_pageview: true,
    capture_pageleave: false,
    ip: false,
    autocapture: { dom_event_allowlist: ['click'], element_allowlist: ['button', 'a'] },
  });
});

it('track before init is a no-op', () => {
  a.track(reset);
  expect(captureMock).not.toHaveBeenCalled();
});

it('track sends the event after init', async () => {
  env.posthogKey = 'phc_test';
  await a.initAnalytics();
  a.track({ name: 'directory_toggled', props: { open: true } });
  expect(captureMock).toHaveBeenCalledWith('directory_toggled', { open: true });
});

it('track swallows capture errors', async () => {
  env.posthogKey = 'phc_test';
  await a.initAnalytics();
  captureMock.mockImplementation(() => {
    throw new Error('boom');
  });
  expect(() => a.track(reset)).not.toThrow();
});

it('a blocked import does not throw and leaves track as a no-op', async () => {
  env.posthogKey = 'phc_test';
  importShouldFail = true;
  await expect(a.initAnalytics()).resolves.toBeUndefined();
  expect(() => a.track(reset)).not.toThrow();
  expect(captureMock).not.toHaveBeenCalled();
});

it('location_requested carries only the granted flag, never coordinates', async () => {
  env.posthogKey = 'phc_test';
  await a.initAnalytics();
  a.track({ name: 'location_requested', props: { granted: true } });
  const props = captureMock.mock.calls[0][1];
  expect(Object.keys(props)).toEqual(['granted']);
});

it('disclosure says no cookies and no personal data', () => {
  expect(a.ANALYTICS_DISCLOSURE).toMatch(/no cookies/i);
  expect(a.ANALYTICS_DISCLOSURE).toMatch(/no personal data/i);
});
