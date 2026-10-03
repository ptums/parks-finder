import L from 'leaflet';
import { useEffect, useMemo, useRef, type Ref } from 'react';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import type { Park } from '../../../../shared/parks';
import { track } from '../../analytics';
import { PARKS } from '../../data/parks';
import { useAppState, useDispatch, useVisibleParks } from '../../state/AppState';
import { parkIcon } from './icons';
import { RecenterControl } from './RecenterControl';
import {
  MAP_LABEL,
  MARKER_SELECTED_CLASS,
  motionOptions,
  parksWithCoords,
  prefersReducedMotion,
  type ParkWithCoords,
} from './mapHelpers';
import './ParkMap.css';

const FALLBACK_CENTER: L.LatLngTuple = [40.75, -73.98];

/** Labels the map container and keeps the selected park in view. */
function MapSetup({ selected, reduced }: { selected?: ParkWithCoords; reduced: boolean }) {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    container.setAttribute('role', 'group');
    container.setAttribute('aria-label', MAP_LABEL);
  }, [map]);
  useEffect(() => {
    if (selected)
      map.setView([selected.coords.lat, selected.coords.lng], map.getZoom(), {
        animate: !reduced,
      });
  }, [map, selected, reduced]);
  return null;
}

function ParkMarker({ park, selected }: { park: ParkWithCoords; selected: boolean }) {
  const dispatch = useDispatch();
  const markerRef = useRef<L.Marker>(null);
  const markerId = `park-marker-${park.id}`;

  useEffect(() => {
    const icon = markerRef.current?.getElement();
    if (!icon) return;
    const select = () => {
      track({ name: 'park_selected', props: { park_id: park.id, source: 'map' } });
      dispatch({ type: 'selectPark', id: park.id, source: 'map', returnFocusId: markerId });
    };
    // Leaflet fires click on Enter only; Space needs our own handler (and stops page scroll).
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      select();
    };
    icon.id = markerId;
    icon.setAttribute('role', 'button');
    icon.setAttribute('aria-label', park.name);
    icon.addEventListener('keydown', onKeyDown);
    return () => icon.removeEventListener('keydown', onKeyDown);
  }, [dispatch, park.id, park.name, markerId]);

  useEffect(() => {
    const icon = markerRef.current?.getElement();
    if (!icon) return;
    icon.classList.toggle(MARKER_SELECTED_CLASS, selected);
  }, [selected]);

  return (
    <Marker
      ref={markerRef}
      position={[park.coords.lat, park.coords.lng]}
      icon={parkIcon}
      keyboard
      zIndexOffset={selected ? 1000 : 0}
      eventHandlers={{
        click: () => {
          track({ name: 'park_selected', props: { park_id: park.id, source: 'map' } });
          dispatch({ type: 'selectPark', id: park.id, source: 'map', returnFocusId: markerId });
        },
      }}
    />
  );
}

/** `mapRef` lets tests inspect the real Leaflet map. */
export function ParkMap({ parks = PARKS, mapRef }: { parks?: Park[]; mapRef?: Ref<L.Map> }) {
  const state = useAppState();
  const visible = useVisibleParks(parks);
  const withCoords = parksWithCoords(visible);
  const selected = withCoords.find((park) => park.id === state.selectedParkId);
  const reduced = useMemo(prefersReducedMotion, []);
  // Fit to all parks once, so filtering never re-zooms the map.
  const bounds = useMemo(() => {
    const points = parksWithCoords(parks).map((p): L.LatLngTuple => [p.coords.lat, p.coords.lng]);
    return points.length > 0 ? L.latLngBounds(points).pad(0.1) : undefined;
  }, [parks]);

  return (
    <section aria-labelledby="map-heading" className="map">
      <h2 id="map-heading" className="visually-hidden">
        Map of parks
      </h2>
      <MapContainer
        ref={mapRef}
        className="map-canvas"
        {...(bounds ? { bounds } : { center: FALLBACK_CENTER, zoom: 10 })}
        {...motionOptions(reduced)}
      >
        <MapSetup selected={selected} reduced={reduced} />
        <RecenterControl bounds={bounds} reduced={reduced} />
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {withCoords.map((park) => (
          <ParkMarker key={park.id} park={park} selected={park.id === state.selectedParkId} />
        ))}
      </MapContainer>
    </section>
  );
}
