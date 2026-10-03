import { act, render, screen } from '@testing-library/react';
import { useContext } from 'react';
import { AnnounceContext, LiveRegionProvider, MIN_HOLD_MS } from './LiveRegion';

let announce: (text: string) => void = () => {};
function Grab() {
  announce = useContext(AnnounceContext);
  return null;
}

function setup() {
  return render(
    <LiveRegionProvider>
      <Grab />
    </LiveRegionProvider>,
  );
}
const tick = (ms: number) => act(() => void jest.advanceTimersByTime(ms));
const say = (text: string) => act(() => announce(text));
const status = () => screen.getByRole('status');

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('LiveRegionProvider', () => {
  it('shows a single message after 50 ms', () => {
    setup();
    say('One');
    expect(status()).toHaveTextContent('');
    tick(50);
    expect(status()).toHaveTextContent('One');
  });

  it('delays a second message until the hold ends', () => {
    setup();
    say('One');
    tick(50);
    say('Two');
    tick(MIN_HOLD_MS - 100);
    expect(status()).toHaveTextContent('One');
    tick(100 + 50);
    expect(status()).toHaveTextContent('Two');
  });

  it('drops the middle of three rapid messages', () => {
    setup();
    say('One');
    tick(50);
    say('Two');
    say('Three');
    expect(status()).toHaveTextContent('One');
    tick(MIN_HOLD_MS + 50);
    expect(status()).toHaveTextContent('Three');
    tick(MIN_HOLD_MS * 2);
    expect(status()).toHaveTextContent('Three');
  });

  it('shows a new message after the hold expired in 50 ms', () => {
    setup();
    say('One');
    tick(50 + MIN_HOLD_MS);
    say('Two');
    tick(50);
    expect(status()).toHaveTextContent('Two');
  });

  it('clears timers on unmount', () => {
    const { unmount } = setup();
    say('One');
    tick(50);
    say('Two');
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });
});
