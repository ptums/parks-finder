import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import type { Park } from '../../../../shared/parks';
import { track } from '../../analytics';
import { LiveRegionProvider, MIN_HOLD_MS } from '../../a11y/LiveRegion';
import { StateProvider } from '../../state/AppState';
import { ParkList } from '../ParkList';
import { SearchBar } from './SearchBar';

jest.mock('../../analytics', () => ({ track: jest.fn() }));

const parks: Park[] = [
  {
    id: 'a',
    name: 'Alpha Park',
    amenities: ['dog-run', 'restrooms'],
    images: [],
    rating: 3,
    coords: { lat: 41, lng: -73 },
  },
  {
    id: 'b',
    name: 'Beta Green',
    amenities: ['dog-run'],
    images: [],
    rating: 5,
    coords: { lat: 40, lng: -73 },
  },
  { id: 'c', name: 'Gamma Field', amenities: ['wifi'], images: [] },
];

function setup() {
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  const view = render(
    <StateProvider>
      <LiveRegionProvider>
        <SearchBar parks={parks} />
        <ParkList parks={parks} />
      </LiveRegionProvider>
    </StateProvider>,
  );
  return { user, ...view };
}

function settle(ms = 600) {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
}

// The test setup's matchMedia says "phone", so the list starts collapsed; hidden items are
// still in the DOM, so queryAllByRole needs hidden: true.
function visibleNames() {
  return Array.from(document.querySelectorAll('.park-list-name')).map((el) => el.textContent);
}

function mockGeolocation(result: 'success' | 'denied' | 'unsupported') {
  const getCurrentPosition = jest.fn((ok: PositionCallback, fail: PositionErrorCallback) => {
    if (result === 'success')
      ok({ coords: { latitude: 40, longitude: -73 } } as GeolocationPosition);
    else fail({ code: 1, message: 'denied' } as GeolocationPositionError);
  });
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: result === 'unsupported' ? undefined : { getCurrentPosition },
  });
  return getCurrentPosition;
}

function mockDeferredGeolocation() {
  let succeed: () => void = () => {};
  const getCurrentPosition = jest.fn((ok: PositionCallback) => {
    succeed = () => ok({ coords: { latitude: 40, longitude: -73 } } as GeolocationPosition);
  });
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition },
  });
  return { getCurrentPosition, succeed: () => succeed() };
}

describe('SearchBar', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('has labeled controls and no announcement at first', () => {
    setup();
    expect(screen.getByRole('search', { name: 'Search and filter parks' })).toBeInTheDocument();
    expect(screen.getByLabelText('Search parks')).toHaveValue('');
    expect(screen.getByLabelText('Sort by')).toHaveValue('name');
    expect(screen.getByRole('group', { name: /all of these/ })).toBeInTheDocument();
    expect(screen.getByText('Amenities (0 selected)')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('lists amenities from the data alphabetically with friendly labels', () => {
    setup();
    const labels = screen.getAllByRole('checkbox').map((box) => box.parentElement?.textContent);
    expect(labels).toEqual(['Dog run', 'Restrooms', 'Wi-Fi']);
  });

  it('filters as you type and announces the count once after 500 ms', async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText('Search parks'), 'beta');
    expect(visibleNames()).toEqual(['Beta Green']);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    settle();
    expect(screen.getByRole('status')).toHaveTextContent('1 park shown');
  });

  it('shows and announces the empty state', async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText('Search parks'), 'zzz');
    settle();
    expect(screen.getByRole('status')).toHaveTextContent('No parks match. Try removing a filter.');
    expect(screen.getAllByText('No parks match. Try removing a filter.')).toHaveLength(2);
  });

  it('toggles amenities with AND semantics and updates the summary', async () => {
    const { user } = setup();
    await user.click(screen.getByLabelText('Dog run'));
    expect(visibleNames()).toEqual(['Alpha Park', 'Beta Green']);
    await user.click(screen.getByLabelText('Restrooms'));
    expect(visibleNames()).toEqual(['Alpha Park']);
    expect(screen.getByText('Amenities (2 selected)')).toBeInTheDocument();
    settle();
    expect(screen.getByRole('status')).toHaveTextContent('1 park shown');
  });

  it('toggles a checkbox with the Space key', async () => {
    const { user } = setup();
    screen.getByLabelText('Wi-Fi').focus();
    await user.keyboard(' ');
    expect(screen.getByLabelText('Wi-Fi')).toBeChecked();
    expect(visibleNames()).toEqual(['Gamma Field']);
  });

  it('changes the sort', async () => {
    const { user } = setup();
    await user.selectOptions(screen.getByLabelText('Sort by'), 'rating');
    expect(visibleNames()).toEqual(['Beta Green', 'Alpha Park', 'Gamma Field']);
  });

  it('does not offer distance or best match', () => {
    setup();
    expect(screen.queryByRole('option', { name: /distance|best match/i })).toBeNull();
  });

  it('Reset clears everything, announces, and keeps focus on the button', async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText('Search parks'), 'beta');
    await user.click(screen.getByLabelText('Dog run'));
    const reset = screen.getByRole('button', { name: 'Reset' });
    await user.click(reset);
    expect(screen.getByLabelText('Search parks')).toHaveValue('');
    expect(screen.getByLabelText('Dog run')).not.toBeChecked();
    expect(visibleNames()).toHaveLength(3);
    expect(reset).toHaveFocus();
    settle();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Search and filters cleared. 3 parks shown.',
    );
  });

  it('Enter in the search box does not submit the page', async () => {
    const { user } = setup();
    const input = screen.getByLabelText('Search parks');
    await user.type(input, 'a');
    // fireEvent returns false when a handler called preventDefault.
    expect(fireEvent.submit(input.closest('form') as HTMLFormElement)).toBe(false);
    expect(input).toHaveValue('a');
  });

  afterEach(() => Reflect.deleteProperty(navigator, 'geolocation'));

  describe('use my location', () => {
    it('ignores a second press while waiting and announces once', async () => {
      const { getCurrentPosition, succeed } = mockDeferredGeolocation();
      const { user } = setup();
      const button = screen.getByRole('button', { name: 'Use my location' });
      await user.click(button);
      await user.click(button);
      expect(getCurrentPosition).toHaveBeenCalledTimes(1);
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(screen.getByText('Finding your location…')).toBeInTheDocument();
      act(() => succeed());
      await screen.findByRole('button', { name: 'Stop using my location' });
      expect(screen.queryByText('Finding your location…')).toBeNull();
      settle();
      expect(screen.getByRole('status')).toHaveTextContent(
        'Sorted by distance from your location.',
      );
    });

    it('drops the result when Reset is pressed while waiting', async () => {
      const { succeed } = mockDeferredGeolocation();
      const { user } = setup();
      await user.click(screen.getByRole('button', { name: 'Use my location' }));
      await user.click(screen.getByRole('button', { name: 'Reset' }));
      act(() => succeed());
      expect(screen.getByRole('button', { name: 'Use my location' })).toBeInTheDocument();
      expect(screen.getByLabelText('Sort by')).toHaveValue('name');
      expect(screen.queryByText('Finding your location…')).toBeNull();
    });

    it('words messages by the sort in use (rating)', async () => {
      mockGeolocation('success');
      const { user } = setup();
      await user.click(screen.getByRole('button', { name: 'Use my location' }));
      await screen.findByRole('button', { name: 'Stop using my location' });
      await user.selectOptions(screen.getByLabelText('Sort by'), 'rating');
      settle(); // let the count announcement for the sort change pass
      await user.click(await screen.findByRole('button', { name: 'Stop using my location' }));
      expect(screen.getByLabelText('Sort by')).toHaveValue('rating');
      settle(MIN_HOLD_MS + 100); // earlier messages are held first
      expect(screen.getByRole('status')).toHaveTextContent('Parks are listed by rating.');
    });

    it('does not offer a location message about name when sorting by rating', async () => {
      mockGeolocation('denied');
      const { user } = setup();
      await user.selectOptions(screen.getByLabelText('Sort by'), 'rating');
      await user.click(screen.getByRole('button', { name: 'Use my location' }));
      expect(await screen.findByText(/still listed by rating/, { selector: 'p' })).toBeVisible();
    });

    it('does not ask for the location until the button is pressed', () => {
      const getCurrentPosition = mockGeolocation('success');
      setup();
      expect(getCurrentPosition).not.toHaveBeenCalled();
      expect(screen.queryByRole('option', { name: 'Distance' })).toBeNull();
    });

    it('sorts by distance, offers the Distance option and announces', async () => {
      const getCurrentPosition = mockGeolocation('success');
      const { user } = setup();
      await user.click(screen.getByRole('button', { name: 'Use my location' }));
      expect(getCurrentPosition).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), {
        timeout: 10000,
        maximumAge: 300000,
      });
      await screen.findByRole('button', { name: 'Stop using my location' });
      expect(screen.getByLabelText('Sort by')).toHaveValue('distance');
      expect(screen.getByRole('option', { name: 'Distance' })).toBeInTheDocument();
      expect(visibleNames()).toEqual(['Beta Green', 'Alpha Park', 'Gamma Field']);
      settle();
      expect(screen.getByRole('status')).toHaveTextContent(
        'Sorted by distance from your location.',
      );
    });

    it('stops using the location: back to name, announces, keeps focus', async () => {
      mockGeolocation('success');
      const { user } = setup();
      await user.click(screen.getByRole('button', { name: 'Use my location' }));
      const stop = await screen.findByRole('button', { name: 'Stop using my location' });
      expect(stop).toHaveFocus();
      await user.click(stop);
      expect(screen.getByLabelText('Sort by')).toHaveValue('name');
      expect(screen.queryByRole('option', { name: 'Distance' })).toBeNull();
      expect(visibleNames()).toEqual(['Alpha Park', 'Beta Green', 'Gamma Field']);
      settle(MIN_HOLD_MS + 100); // the "Sorted by distance" message is held first
      expect(screen.getByRole('status')).toHaveTextContent('Stopped using your location');
      expect(screen.getByRole('button', { name: 'Use my location' })).toBeInTheDocument();
    });

    it.each(['denied', 'unsupported'] as const)(
      'shows and announces a message when location is %s',
      async (result) => {
        mockGeolocation(result);
        const { user } = setup();
        await user.click(screen.getByRole('button', { name: 'Use my location' }));
        expect(
          await screen.findByText('Location unavailable. Parks are still listed by name.', {
            selector: 'p',
          }),
        ).toBeVisible();
        settle();
        expect(screen.getByRole('status')).toHaveTextContent('Location unavailable');
        expect(screen.getByLabelText('Sort by')).toHaveValue('name');
        expect(visibleNames()).toHaveLength(3);
      },
    );
  });

  describe('accessibility', () => {
    beforeEach(() => jest.useRealTimers());

    it('has no axe violations by default', async () => {
      const { container } = setup();
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations with amenities expanded and selected', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <StateProvider>
          <LiveRegionProvider>
            <SearchBar parks={parks} />
          </LiveRegionProvider>
        </StateProvider>,
      );
      await user.click(screen.getByText(/Amenities/));
      expect(container.querySelector('details')).toHaveAttribute('open');
      await user.click(screen.getByLabelText('Dog run'));
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations with no results', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <StateProvider>
          <LiveRegionProvider>
            <SearchBar parks={parks} />
          </LiveRegionProvider>
        </StateProvider>,
      );
      await user.type(screen.getByLabelText('Search parks'), 'zzz');
      expect(await axe(container)).toHaveNoViolations();
    });

    it.each(['success', 'denied'] as const)(
      'has no axe violations after location %s',
      async (r) => {
        mockGeolocation(r);
        const user = userEvent.setup();
        const { container } = render(
          <StateProvider>
            <LiveRegionProvider>
              <SearchBar parks={parks} />
            </LiveRegionProvider>
          </StateProvider>,
        );
        await user.click(screen.getByRole('button', { name: 'Use my location' }));
        // Wait for the state after the location answer before checking it.
        await screen.findByText(
          r === 'success' ? 'Stop using my location' : /Location unavailable/,
        );
        expect(await axe(container)).toHaveNoViolations();
      },
    );
  });
});

describe('SearchBar analytics', () => {
  it('typing sends filter_applied text/changed and never the typed text', async () => {
    (track as jest.Mock).mockClear();
    setup();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search parks' }), 'secret');
    expect(track).toHaveBeenCalledWith({
      name: 'filter_applied',
      props: { filter: 'text', value: 'changed' },
    });
    expect(JSON.stringify((track as jest.Mock).mock.calls)).not.toMatch(/secret/);
  });
});
