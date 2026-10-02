import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Park } from '../../../shared/parks';
import {
  StateProvider,
  useAppState,
  useDispatch,
  useSelectedPark,
  useVisibleParks,
} from './AppState';

const parks: Park[] = [{ id: 'a', name: 'Alpha', amenities: [], images: [] }];

function Probe() {
  const state = useAppState();
  const dispatch = useDispatch();
  const visible = useVisibleParks(parks);
  const selected = useSelectedPark(parks);
  return (
    <div>
      <p>open: {String(state.directoryOpen)}</p>
      <p>visible: {visible.length}</p>
      <p>selected: {selected?.name ?? 'none'}</p>
      <button
        onClick={() =>
          dispatch({ type: 'selectPark', id: 'a', source: 'list', returnFocusId: 'x' })
        }
      >
        Pick
      </button>
    </div>
  );
}

describe('StateProvider', () => {
  it('provides state and dispatch to hooks', async () => {
    render(
      <StateProvider>
        <Probe />
      </StateProvider>,
    );
    expect(screen.getByText('open: false')).toBeInTheDocument(); // matchMedia mock says phone
    expect(screen.getByText('visible: 1')).toBeInTheDocument();
    expect(screen.getByText('selected: none')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Pick' }));
    expect(screen.getByText('selected: Alpha')).toBeInTheDocument();
  });

  it('throws a clear error outside the provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow('StateProvider');
    jest.restoreAllMocks();
  });
});
