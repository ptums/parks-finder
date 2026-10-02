import { track } from './analytics';

it('track is a safe no-op', () => {
  expect(() => track({ name: 'reset_clicked', props: {} })).not.toThrow();
});
