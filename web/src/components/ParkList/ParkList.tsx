import type { Park } from '../../../../shared/parks';
import { track } from '../../analytics';
import { PARKS } from '../../data/parks';
import { useAppState, useDispatch, useVisibleParks } from '../../state/AppState';
import './ParkList.css';

export function ParkList({ parks = PARKS }: { parks?: Park[] }) {
  const { directoryOpen } = useAppState();
  const dispatch = useDispatch();
  const visible = useVisibleParks(parks);

  return (
    <section aria-labelledby="directory-heading" className="directory">
      <h2 id="directory-heading" tabIndex={-1}>
        Park directory
      </h2>
      <button
        type="button"
        className="directory-toggle"
        aria-expanded={directoryOpen}
        aria-controls="park-list"
        onClick={() => {
          track({ name: 'directory_toggled', props: { open: !directoryOpen } });
          dispatch({ type: 'setDirectoryOpen', open: !directoryOpen });
        }}
      >
        {directoryOpen ? 'Hide park list' : 'Show park list'}
      </button>
      <ul id="park-list" className="park-list" hidden={!directoryOpen}>
        {visible.map((park) => (
          <li key={park.id}>
            <button
              type="button"
              id={`park-list-item-${park.id}`}
              className="park-list-item"
              onClick={() => {
                track({ name: 'park_selected', props: { park_id: park.id, source: 'list' } });
                dispatch({
                  type: 'selectPark',
                  id: park.id,
                  source: 'list',
                  returnFocusId: `park-list-item-${park.id}`,
                });
              }}
            >
              <span className="park-list-name">{park.name}</span>
              {!park.coords && <span className="park-list-note">Not shown on map</span>}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
