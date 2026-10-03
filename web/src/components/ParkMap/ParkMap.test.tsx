import type L from 'leaflet';
import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import type { Park } from '../../../../shared/parks';
import { StateProvider, useAppState, useDispatch } from '../../state/AppState';
import { MAP_LABEL, MARKER_SELECTED_CLASS, motionOptions, parksWithCoords } from './mapHelpers';
import { ParkMap } from './ParkMap';
import { parkIcon } from './icons';
import { recenter } from './RecenterControl';

const park = (id: string, name: string, coords?: Park['coords']): Park => ({
  id,
  name,
  coords,
  amenities: [],
  images: [],
});
const parks = [
  park('a', 'Alpha Park', { lat: 40.7, lng: -74 }),
  park('b', 'Beta Park', { lat: 40.8, lng: -73.9 }),
  park('c', 'No Coords Park'),
];

function State() {
  const state = useAppState();
  const dispatch = useDispatch();
  return (
    <>
      <p data-testid="state">
        {state.selectedParkId}|{state.selectSource}|{state.returnFocusId}
      </p>
      <button
        onClick={() =>
          dispatch({ type: 'selectPark', id: 'b', source: 'list', returnFocusId: 'x' })
        }
      >
        select b
      </button>
    </>
  );
}

function renderMap(list: Park[] = parks) {
  return render(
    <StateProvider>
      <ParkMap parks={list} />
      <State />
    </StateProvider>,
  );
}

const marker = (name: string) => screen.getByRole('button', { name });

describe('ParkMap', () => {
  it('has a hidden heading, a labelled map and the OpenStreetMap attribution', () => {
    const { container } = renderMap();
    expect(screen.getByRole('heading', { level: 2, name: 'Map of parks' })).toBeInTheDocument();
    expect(screen.getByLabelText(MAP_LABEL)).toBeInTheDocument();
    expect(screen.getByText('OpenStreetMap')).toBeInTheDocument();
    expect(container.querySelector('.leaflet-marker-icon')).not.toBeNull();
  });

  it('renders a marker per park with coordinates and none without', () => {
    renderMap();
    expect(document.querySelectorAll('.leaflet-marker-icon')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'No Coords Park' })).toBeNull();
  });

  it('gives markers an id, button role, name and keyboard focus', () => {
    renderMap();
    const alpha = marker('Alpha Park');
    expect(alpha.id).toBe('park-marker-a');
    expect(alpha).toHaveAttribute('role', 'button');
    expect(alpha).toHaveAttribute('tabindex', '0');
  });

  it('selects a park on click', () => {
    renderMap();
    fireEvent.click(marker('Alpha Park'));
    expect(screen.getByTestId('state')).toHaveTextContent('a|map|park-marker-a');
  });

  it('selects a park on Enter', () => {
    renderMap();
    fireEvent.keyDown(marker('Beta Park'), { key: 'Enter' });
    expect(screen.getByTestId('state')).toHaveTextContent('b|map|park-marker-b');
  });

  it('selects a park on Space and stops the page from scrolling', () => {
    renderMap();
    const notCancelled = fireEvent.keyDown(marker('Alpha Park'), { key: ' ' });
    expect(notCancelled).toBe(false); // false means preventDefault was called
    expect(screen.getByTestId('state')).toHaveTextContent('a|map|park-marker-a');
  });

  it('ignores other keys', () => {
    renderMap();
    fireEvent.keyDown(marker('Alpha Park'), { key: 'a' });
    expect(screen.getByTestId('state')).toHaveTextContent('||');
  });

  it('marks the selected marker with a class, not just color', () => {
    renderMap();
    expect(marker('Alpha Park')).not.toHaveClass(MARKER_SELECTED_CLASS);
    fireEvent.click(screen.getByRole('button', { name: 'select b' }));
    expect(marker('Beta Park')).toHaveClass(MARKER_SELECTED_CLASS);
    expect(marker('Alpha Park')).not.toHaveClass(MARKER_SELECTED_CLASS);
  });

  it('does not throw when no park has coordinates', () => {
    renderMap([park('c', 'No Coords Park')]);
    expect(document.querySelectorAll('.leaflet-marker-icon')).toHaveLength(0);
    expect(screen.getByRole('heading', { name: 'Map of parks' })).toBeInTheDocument();
  });

  it('turns off all map animations when reduced motion is requested', () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) =>
      ({ matches: true, media: query }) as MediaQueryList) as typeof window.matchMedia;
    const mapRef = createRef<L.Map>();
    try {
      render(
        <StateProvider>
          <ParkMap parks={parks} mapRef={mapRef} />
        </StateProvider>,
      );
      expect(mapRef.current?.options).toMatchObject({
        zoomAnimation: false,
        fadeAnimation: false,
        markerZoomAnimation: false,
      });
    } finally {
      window.matchMedia = original;
    }
  });

  it('uses explicit icon URLs without a doubled path', () => {
    const { iconUrl, shadowUrl } = parkIcon.options;
    expect(iconUrl).toBeTruthy();
    expect(`${iconUrl}${shadowUrl}`).not.toMatch(/images\/+.*(@fs|http|\/\/)/);
    renderMap();
    const src = document.querySelector('img.leaflet-marker-icon')?.getAttribute('src');
    expect(src).toBe(iconUrl);
  });

  describe('Recenter control', () => {
    const renderWithMap = () => {
      const mapRef = createRef<L.Map>();
      render(
        <StateProvider>
          <ParkMap parks={parks} mapRef={mapRef} />
        </StateProvider>,
      );
      return mapRef;
    };

    it('is a labelled button that fits the initial bounds with animation', () => {
      const mapRef = renderWithMap();
      const fit = jest.spyOn(mapRef.current!, 'fitBounds');
      const button = screen.getByRole('button', { name: /recenter/i });
      expect(button.tagName).toBe('BUTTON');
      fireEvent.click(button);
      expect(fit).toHaveBeenCalledTimes(1);
      const [bounds, options] = fit.mock.calls[0]!;
      expect((bounds as L.LatLngBounds).contains([40.7, -74])).toBe(true);
      expect((bounds as L.LatLngBounds).contains([40.8, -73.9])).toBe(true);
      expect(options).toMatchObject({ animate: true });
    });

    it('does not animate under reduced motion', () => {
      const fit = jest.fn();
      recenter({ fitBounds: fit } as unknown as L.Map, {} as L.LatLngBounds, true);
      expect(fit).toHaveBeenCalledWith({}, { animate: false });
    });

    it('does not move focus', () => {
      renderWithMap();
      const button = screen.getByRole('button', { name: /recenter/i });
      button.focus();
      fireEvent.click(button);
      expect(button).toHaveFocus();
    });
  });

  describe('accessibility', () => {
    it('has no axe violations by default', async () => {
      const { container } = renderMap();
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations with a selection', async () => {
      const { container } = renderMap();
      fireEvent.click(screen.getByRole('button', { name: 'select b' }));
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations when no park has coordinates', async () => {
      const { container } = renderMap([park('c', 'No Coords Park')]);
      expect(await axe(container)).toHaveNoViolations();
    });
  });
});

describe('map helpers', () => {
  it('parksWithCoords keeps only parks with coordinates', () => {
    expect(parksWithCoords(parks).map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('motionOptions switches all three animations together', () => {
    expect(motionOptions(true)).toEqual({
      zoomAnimation: false,
      fadeAnimation: false,
      markerZoomAnimation: false,
    });
    expect(motionOptions(false)).toEqual({
      zoomAnimation: true,
      fadeAnimation: true,
      markerZoomAnimation: true,
    });
  });
});
