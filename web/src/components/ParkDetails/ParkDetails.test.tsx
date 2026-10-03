import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Park } from '../../../../shared/parks';
import { StateProvider, useDispatch } from '../../state/AppState';
import { ParkDetails } from './ParkDetails';

const full: Park = {
  id: 'full',
  name: 'Full Park',
  description: 'A big park.',
  address: '1 Park Road',
  coords: { lat: 1, lng: 2 },
  amenities: ['trails', 'wifi'],
  hours: 'Dawn to 1am; closed Mondays (see sign)',
  images: ['https://example.invalid/a.jpg'],
  acreage: 526,
  rating: 4.7,
};
const twoPhotos: Park = {
  id: 'two',
  name: 'Two Photo Park',
  amenities: [],
  images: ['https://example.invalid/1.jpg', 'https://example.invalid/2.jpg'],
};
const sparse: Park = { id: 'sparse', name: 'Sparse Park', amenities: [], images: [] };

function Opener({ id, returnFocusId }: { id: string; returnFocusId: string }) {
  const dispatch = useDispatch();
  return (
    <button
      id="trigger"
      onClick={() => dispatch({ type: 'selectPark', id, source: 'list', returnFocusId })}
    >
      Open {id}
    </button>
  );
}

// jsdom does not turn the Esc key into a cancel event, so fire the event itself.
// The real Esc key is covered by the Playwright test.
function pressEscape() {
  fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
}

function setup(park: Park, returnFocusId = 'trigger') {
  return render(
    <StateProvider>
      <h2 id="directory-heading" tabIndex={-1}>
        Park directory
      </h2>
      <Opener id={park.id} returnFocusId={returnFocusId} />
      <ParkDetails parks={[park]} />
    </StateProvider>,
  );
}

async function open(park: Park) {
  await userEvent.click(screen.getByRole('button', { name: `Open ${park.id}` }));
}

describe('ParkDetails', () => {
  it('shows every field that exists, with hours verbatim', async () => {
    setup(full);
    await open(full);
    const dialog = screen.getByRole('dialog', { name: 'Full Park' });
    expect(dialog).toHaveTextContent('A big park.');
    expect(screen.getByText('Trails')).toBeInTheDocument();
    expect(screen.getByText('Wi-Fi')).toBeInTheDocument();
    expect(screen.getByText('1 Park Road')).toBeInTheDocument();
    expect(screen.getByText('Dawn to 1am; closed Mondays (see sign)')).toBeInTheDocument();
    expect(screen.getByText('526 acres')).toBeInTheDocument();
    expect(screen.getByText('Rated 4.7 out of 5')).toBeInTheDocument();
    expect(screen.getByText('Contact information not listed')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Photo of Full Park' })).toBeInTheDocument();
  });

  it('focuses the heading on open and Close is the next Tab stop', async () => {
    setup(full);
    await open(full);
    const heading = screen.getByRole('heading', { level: 2, name: 'Full Park' });
    expect(heading).toHaveFocus();
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', heading.id);
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  });

  it('gives the Close button a 44px minimum height in CSS', () => {
    const css = readFileSync(join(__dirname, 'ParkDetails.css'), 'utf8');
    expect(css).toMatch(/\.park-details-close\s*{[^}]*min-height:\s*44px/);
  });

  it('closes with Esc, the Close button and a backdrop click, returning focus', async () => {
    const user = userEvent.setup();
    setup(full);

    await open(full);
    pressEscape();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open full' })).toHaveFocus();

    await open(full);
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open full' })).toHaveFocus();

    await open(full);
    const dialog = screen.getByRole('dialog');
    // jsdom has no layout, so give the dialog a box and click outside it (the backdrop).
    dialog.getBoundingClientRect = () => new DOMRect(100, 0, 400, 800);
    fireEvent.click(dialog, { clientX: 10, clientY: 10 });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open full' })).toHaveFocus();
  });

  it('does not close when blank space inside the dialog is clicked', async () => {
    setup(full);
    await open(full);
    const dialog = screen.getByRole('dialog');
    dialog.getBoundingClientRect = () => new DOMRect(100, 0, 400, 800);
    fireEvent.click(dialog, { clientX: 200, clientY: 700 });
    expect(dialog).toBeInTheDocument();
  });

  it('syncs state when the browser closes the dialog itself', async () => {
    setup(full);
    await open(full);
    fireEvent(screen.getByRole('dialog'), new Event('close'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not close when the content is clicked', async () => {
    setup(full);
    await open(full);
    await userEvent.click(screen.getByText('A big park.'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('falls back to the directory heading when the trigger is gone', async () => {
    setup(full, 'does-not-exist');
    await open(full);
    pressEscape();
    expect(document.getElementById('directory-heading')).toHaveFocus();
  });

  it('renders a park with every optional field missing', async () => {
    setup(sparse);
    await open(sparse);
    const dialog = screen.getByRole('dialog', { name: 'Sparse Park' });
    expect(screen.getAllByText('Not listed')).toHaveLength(4);
    expect(screen.getByText('Photos not listed')).toBeInTheDocument();
    expect(screen.getByText('Contact information not listed')).toBeInTheDocument();
    expect(dialog.querySelectorAll('p')).toHaveLength(6); // 4 Not listed + photos + contact
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(5);
  });

  it('swaps a failed image for a labeled placeholder', async () => {
    const { container } = setup(full);
    await open(full);
    fireEvent.error(screen.getByRole('img', { name: 'Photo of Full Park' }));
    const placeholder = screen.getByRole('img', { name: 'Photo of Full Park unavailable' });
    expect(placeholder).toHaveTextContent('Image unavailable');
    expect(container.ownerDocument.querySelector('img')).toBeNull();
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it('has no axe violations for a full and a sparse park', async () => {
    const first = setup(full);
    await open(full);
    expect(await axe(document.body)).toHaveNoViolations();
    first.unmount();
    setup(sparse);
    await open(sparse);
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it('shows one labeled image for one photo and a "Photos not listed" note for none', async () => {
    setup(full);
    await open(full);
    expect(screen.getAllByRole('img')).toHaveLength(1);
    expect(screen.queryByText('Photos not listed')).toBeNull();
  });

  it('renders every image in order with numbered alt text', async () => {
    setup(twoPhotos);
    await open(twoPhotos);
    const images = screen.getAllByRole('img');
    expect(images.map((img) => img.getAttribute('alt'))).toEqual([
      'Photo 1 of 2: Two Photo Park',
      'Photo 2 of 2: Two Photo Park',
    ]);
    expect(screen.getByRole('list', { name: 'Photos' }).children).toHaveLength(2);
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it('fails each image independently with its own placeholder', async () => {
    setup(twoPhotos);
    await open(twoPhotos);
    fireEvent.error(screen.getByRole('img', { name: 'Photo 1 of 2: Two Photo Park' }));
    expect(
      screen.getByRole('img', { name: 'Photo 1 of 2 of Two Photo Park unavailable' }),
    ).toHaveTextContent('Image unavailable');
    expect(screen.getByRole('img', { name: 'Photo 2 of 2: Two Photo Park' })).toBeInTheDocument();
    fireEvent.error(screen.getByRole('img', { name: 'Photo 2 of 2: Two Photo Park' }));
    expect(
      screen.getByRole('img', { name: 'Photo 2 of 2 of Two Photo Park unavailable' }),
    ).toHaveTextContent('Image unavailable');
    expect(screen.getAllByText('Image unavailable')).toHaveLength(2);
    expect(await axe(document.body)).toHaveNoViolations();
  });
});
