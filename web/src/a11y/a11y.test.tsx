import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { LiveRegionProvider } from './LiveRegion';
import { SkipLink } from './SkipLink';
import { focusById, focusFirstAvailable } from './focus';
import { useAnnounce } from './useAnnounce';

function Announcer({ text }: { text: string }) {
  const announce = useAnnounce();
  return <button onClick={() => announce(text)}>Speak</button>;
}

describe('live region', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('renders one polite status region and announces after a short delay', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(
      <LiveRegionProvider>
        <Announcer text="5 parks shown" />
      </LiveRegionProvider>,
    );
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toBeEmptyDOMElement();
    await user.click(screen.getByRole('button', { name: 'Speak' }));
    act(() => {
      jest.advanceTimersByTime(60);
    });
    expect(status).toHaveTextContent('5 parks shown');
  });

  it('useAnnounce is a safe no-op without a provider', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<Announcer text="x" />);
    await user.click(screen.getByRole('button'));
  });

  it('has no axe violations', async () => {
    jest.useRealTimers();
    const { container } = render(
      <LiveRegionProvider>
        <SkipLink href="#x">Skip to x</SkipLink>
        <main id="x">content</main>
      </LiveRegionProvider>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('focus helpers', () => {
  it('focusById focuses an existing element and reports missing ones', () => {
    render(<button id="b">B</button>);
    expect(focusById('b')).toBe(true);
    expect(screen.getByRole('button')).toHaveFocus();
    expect(focusById('nope')).toBe(false);
    expect(focusById(null)).toBe(false);
  });

  it('focusFirstAvailable skips missing ids', () => {
    render(<button id="b">B</button>);
    expect(focusFirstAvailable(['missing', null, 'b'])).toBe(true);
    expect(focusFirstAvailable(['missing'])).toBe(false);
  });
});
