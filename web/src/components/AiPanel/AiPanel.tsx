import type { Park } from '../../../../shared/parks';
import { useCapabilities } from '../../ai/useCapabilities';
import { PARKS } from '../../data/parks';
import { effectiveMode } from '../../state/selectors';
import { useAppState } from '../../state/AppState';
import { AiAnswer } from './AiAnswer';
import { AiSearchForm } from './AiSearchForm';
import { ModeSwitch } from './ModeSwitch';
import './AiPanel.css';

/** Renders nothing at all unless the service has said ai:true. */
export function AiPanel({ parks = PARKS }: { parks?: Park[] }) {
  const pending = useCapabilities();
  const state = useAppState();

  if (!state.aiAvailable) {
    // Reserves height while we wait, to avoid a layout jump. No controls inside.
    return pending ? <div className="ai-spacer" aria-hidden="true" /> : null;
  }

  const showAi = effectiveMode(state) !== 'filters';
  const found = state.aiResults ? new Set(state.aiResults.map((r) => r.parkId)).size : null;
  return (
    <div className="ai-panel">
      <ModeSwitch />
      {showAi && (
        <>
          <AiSearchForm parks={parks} />
          <div aria-busy={state.aiStatus === 'loading'}>
            {state.aiStatus === 'loading' && <p>Searching…</p>}
            {found === 0 && <p>AI found no matching parks.</p>}
            {state.aiError && <p className="ai-error">{state.aiError}</p>}
            {state.aiAnswer && <AiAnswer answer={state.aiAnswer} parks={parks} />}
          </div>
        </>
      )}
    </div>
  );
}
