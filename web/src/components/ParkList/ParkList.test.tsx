import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import type { Park } from '../../../../shared/parks';
import { StateProvider } from '../../state/AppState';
import { ParkDetails } from '../ParkDetails';
import { ParkList } from './ParkList';

const parks: Park[] = [
  { id: 'a', name: 'Alpha Park', amenities: [], images: [], coords: { lat: 1, lng: 2 } },
  { id: 'b', name: 'Beta Park', amenities: [], images: [] },
];

function setup() {
  return render(
    <StateProvider>
      <ParkList parks={parks} />
      <ParkDetails parks={parks} />
    </StateProvider>,
  );
}

// The test setup's matchMedia says "phone", so the directory starts collapsed.
async function openDirectory() {
  await userEvent.click(screen.getByRole('button', { name: 'Show park list' }));
}

describe('ParkList', () => {
  it('renders one button per park inside a list', async () => {
    setup();
    await openDirectory();
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(screen.getByRole('button', { name: /Alpha Park/ })).toBeInTheDocument();
  });

  it('notes parks that are not on the map', async () => {
    setup();
    await openDirectory();
    expect(screen.getByRole('button', { name: /Beta Park/ })).toHaveTextContent('Not shown on map');
    expect(screen.getByRole('button', { name: /Alpha Park/ })).not.toHaveTextContent(
      'Not shown on map',
    );
  });

  it('opens details on click, Enter and Space', async () => {
    const user = userEvent.setup();
    setup();
    await openDirectory();
    const alpha = screen.getByRole('button', { name: /Alpha Park/ });

    await user.click(alpha);
    expect(screen.getByRole('dialog', { name: 'Alpha Park' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    alpha.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('dialog', { name: 'Alpha Park' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close' }));

    alpha.focus();
    await user.keyboard(' ');
    expect(screen.getByRole('dialog', { name: 'Alpha Park' })).toBeInTheDocument();
  });

  it('toggles the directory with aria-expanded and announces nothing', async () => {
    setup();
    const toggle = screen.getByRole('button', { name: 'Show park list' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(toggle);
    expect(screen.getByRole('button', { name: 'Hide park list' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('has no axe violations (default and collapsed)', async () => {
    const { container } = setup();
    expect(await axe(container)).toHaveNoViolations(); // collapsed
    await openDirectory();
    expect(await axe(container)).toHaveNoViolations(); // open
  });

  it('shows the rating next to the name, with a screen reader name', async () => {
    const rated: Park[] = [{ id: 'a', name: 'Alpha Park', amenities: [], images: [], rating: 4.7 }];
    render(
      <StateProvider>
        <ParkList parks={rated} />
      </StateProvider>,
    );
    await openDirectory();
    const button = screen.getByRole('button', { name: /^Alpha Park ?, rated 4\.7 out of 5/ });
    expect(button).toHaveTextContent('★ 4.7');
    expect(button.querySelector('[aria-hidden="true"]')).toHaveTextContent('★');
  });

  it('shows "No rating" for a park without one, and is axe clean', async () => {
    const { container } = setup();
    await openDirectory();
    expect(screen.getByRole('button', { name: /Beta Park/ })).toHaveTextContent('No rating');
    expect(screen.getByRole('button', { name: /Alpha Park/ })).toHaveTextContent('No rating');
    expect(await axe(container)).toHaveNoViolations();
  });
});
