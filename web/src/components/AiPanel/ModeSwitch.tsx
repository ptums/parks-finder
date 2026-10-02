import { track } from '../../analytics';
import { useAnnounce } from '../../a11y/useAnnounce';
import { useAppState, useDispatch } from '../../state/AppState';
import type { SearchMode } from '../../state/types';

const OPTIONS: Array<{ mode: SearchMode; label: string; announcement: string }> = [
  { mode: 'filters', label: 'Filters', announcement: 'Filters only' },
  { mode: 'ai', label: 'AI', announcement: 'AI search only' },
  { mode: 'both', label: 'Both', announcement: 'AI and filters' },
];

/** Native radios in one group: Tab enters the group and the arrow keys change the choice. */
export function ModeSwitch() {
  const { mode } = useAppState();
  const dispatch = useDispatch();
  const announce = useAnnounce();

  return (
    <fieldset className="ai-modes">
      <legend>Search mode</legend>
      {OPTIONS.map((option) => (
        <label key={option.mode} htmlFor={`mode-${option.mode}`} className="ai-mode">
          <input
            id={`mode-${option.mode}`}
            aria-label={option.label}
            type="radio"
            name="search-mode"
            value={option.mode}
            checked={mode === option.mode}
            onChange={() => {
              track({ name: 'search_mode_changed', props: { mode: option.mode } });
              dispatch({ type: 'setMode', mode: option.mode });
              announce(option.announcement);
            }}
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}
