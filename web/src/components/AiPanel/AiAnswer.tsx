import type { Park } from '../../../../shared/parks';
import type { AiAnswer as Answer } from '../../ai/types';
import { track } from '../../analytics';
import { useDispatch } from '../../state/AppState';

export const ABSTAINED_TEXT = "I don't have that information in the park data.";

/** The answer is plain text on screen; it is never put in the live region. */
export function AiAnswer({ answer, parks }: { answer: Answer; parks: Park[] }) {
  const dispatch = useDispatch();
  const citations = answer.abstained
    ? []
    : answer.citations.flatMap((citation) => {
        const park = parks.find((p) => p.id === citation.parkId);
        return park ? [{ citation, park }] : [];
      });

  return (
    <section aria-labelledby="ai-answer-heading" className="ai-answer">
      <h2 id="ai-answer-heading">AI answer</h2>
      <p>{answer.abstained ? ABSTAINED_TEXT : answer.answer}</p>
      {citations.length > 0 && (
        <>
          <h3 id="ai-sources-heading">Sources</h3>
          <ul aria-labelledby="ai-sources-heading" className="ai-citations">
            {citations.map(({ citation, park }, index) => {
              const id = `ai-citation-${index}`;
              return (
                <li key={`${citation.chunkId}-${index}`}>
                  <button
                    type="button"
                    id={id}
                    onClick={() => {
                      track({
                        name: 'park_selected',
                        props: { park_id: park.id, source: 'ai_citation' },
                      });
                      dispatch({
                        type: 'selectPark',
                        id: park.id,
                        source: 'ai_citation',
                        returnFocusId: id,
                      });
                    }}
                  >
                    {park.name}: “{citation.quote}”
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
