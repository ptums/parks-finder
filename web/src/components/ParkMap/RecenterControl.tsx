import L from 'leaflet';
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

/** Fits the map back to the initial bounds. Jumps instead of animating for reduced motion. */
export function recenter(map: L.Map, bounds: L.LatLngBounds, reduced: boolean) {
  map.fitBounds(bounds, { animate: !reduced });
}

/** A real button in Leaflet's top-left control corner (below zoom). It never takes focus. */
export function RecenterControl({
  bounds,
  reduced,
}: {
  bounds?: L.LatLngBounds;
  reduced: boolean;
}) {
  const map = useMap();
  useEffect(() => {
    if (!bounds) return;
    const control = new L.Control({ position: 'topleft' });
    control.onAdd = () => {
      const container = L.DomUtil.create('div', 'leaflet-bar recenter-control');
      const button = L.DomUtil.create('button', 'recenter-button', container);
      button.type = 'button';
      button.textContent = 'Recenter map';
      L.DomEvent.disableClickPropagation(container);
      button.addEventListener('click', () => recenter(map, bounds, reduced));
      return container;
    };
    control.addTo(map);
    return () => {
      control.remove();
    };
  }, [map, bounds, reduced]);
  return null;
}
