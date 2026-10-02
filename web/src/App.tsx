import { LiveRegionProvider } from './a11y/LiveRegion';
import { SkipLink } from './a11y/SkipLink';
import { ParkDetails } from './components/ParkDetails';
import { ParkList } from './components/ParkList';
import { ParkMap } from './components/ParkMap';
import { SearchBar } from './components/SearchBar';
import { StateProvider } from './state/AppState';

export function App() {
  return (
    <StateProvider>
      <LiveRegionProvider>
        <SkipLink href="#directory-heading">Skip to results</SkipLink>
        <header>
          <h1>Find a Park</h1>
          <p>NYC-area parks</p>
          <SearchBar />
        </header>
        <main>
          <ParkList />
          <SkipLink href="#after-map">Skip map</SkipLink>
          <ParkMap />
          <span id="after-map" tabIndex={-1} />
        </main>
        <footer>
          <p>Park information comes from the supplied sample data.</p>
          <p>Map data from OpenStreetMap contributors.</p>
        </footer>
        <ParkDetails />
      </LiveRegionProvider>
    </StateProvider>
  );
}
