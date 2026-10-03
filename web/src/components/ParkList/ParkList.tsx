import { Button } from 'antd';
import type { Park } from '../../../../shared/parks';
import { track } from '../../analytics';
import { PARKS } from '../../data/parks';
import { useAppState, useDispatch, useVisibleParks } from '../../state/AppState';
import './ParkList.css';

function Rating({ rating }: { rating?: number }) {
  if (rating === undefined)
    return (
      <>
        <span className="visually-hidden">, </span>
        <span className="park-list-rating park-list-rating--none">No rating</span>
      </>
    );
  return (
    <>
      <span className="visually-hidden">, rated {rating} out of 5</span>
      <span className="park-list-rating" aria-hidden="true">
        ★ {rating}
      </span>
    </>
  );
}

export function ParkList({ parks = PARKS }: { parks?: Park[] }) {
  const state = useAppState();
  const { directoryOpen } = state;
  const dispatch = useDispatch();
  const visible = useVisibleParks(parks);

  return (
    <section aria-labelledby="directory-heading" className="directory">
      <h2 id="directory-heading" tabIndex={-1}>
        Park directory
      </h2>
      <Button
        className="directory-toggle"
        aria-expanded={directoryOpen}
        aria-controls="park-list"
        onClick={() => {
          track({ name: 'directory_toggled', props: { open: !directoryOpen } });
          dispatch({ type: 'setDirectoryOpen', open: !directoryOpen });
        }}
      >
        {directoryOpen ? 'Hide park list' : 'Show park list'}
      </Button>
      <ul id="park-list" className="park-list" hidden={!directoryOpen}>
        {visible.map((park) => (
          <li key={park.id}>
            <Button
              block
              id={`park-list-item-${park.id}`}
              className={`park-list-item${state.selectedParkId === park.id ? ' park-list-item--selected' : ''}`}
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
              <span className="park-list-title">
                <span className="park-list-name">{park.name}</span>
                <Rating rating={park.rating} />
              </span>
              {!park.coords && <span className="park-list-note">Not shown on map</span>}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
