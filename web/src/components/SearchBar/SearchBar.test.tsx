import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import type { Park } from '../../../../shared/parks';
import { LiveRegionProvider } from '../../a11y/LiveRegion';
import { StateProvider } from '../../state/AppState';
import { ParkList } from '../ParkList';
import { SearchBar } from './SearchBar';

const parks: Park[] = [
  { id: 'a', name: 'Alpha Park', amenities: ['dog-run', 'restrooms'], images: [], rating: 3 },
  { id: 'b', name: 'Beta Green', amenities: ['dog-run'], images: [], rating: 5 },
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
    const submit = jest.fn((e: Event) => e.preventDefault());
    document.addEventListener('submit', submit);
    await user.type(screen.getByLabelText('Search parks'), 'a{Enter}');
    expect(screen.getByLabelText('Search parks')).toHaveValue('a');
    document.removeEventListener('submit', submit);
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
  });
});
