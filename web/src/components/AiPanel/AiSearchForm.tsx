import { Button } from 'antd';
import { useEffect, useRef } from 'react';
import type { Park } from '../../../../shared/parks';
import { AiError, askParks, failureMessage, searchParks } from '../../ai/client';
import { track } from '../../analytics';
import { useAnnounce } from '../../a11y/useAnnounce';
import { useAppState, useDispatch } from '../../state/AppState';

function plural(count: number): string {
  return `${count} ${count === 1 ? 'park' : 'parks'}`;
}

function reasonFor(error: unknown) {
  if (error instanceof AiError && error.kind === 'rate_limited') return 'rate_limited' as const;
  if (error instanceof AiError && error.kind === 'daily_cap') return 'daily_cap' as const;
  return 'ai_unavailable' as const;
}

export function AiSearchForm({ parks }: { parks: Park[] }) {
  const { aiQuery, aiStatus, aiResults, aiError } = useAppState();
  const dispatch = useDispatch();
  const announce = useAnnounce();
  const status = useRef(aiStatus);
  useEffect(() => {
    status.current = aiStatus;
  }, [aiStatus]);
  const input = useRef<HTMLInputElement>(null);
  const loading = aiStatus === 'loading';

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const query = aiQuery.trim();
    if (!query || loading) return;
    dispatch({ type: 'aiSearchStarted' });
    status.current = 'loading';
    // Search gives the list; ask gives the answer. A failed ask must not hide the search results.
    const [search, ask] = await Promise.allSettled([searchParks(query), askParks(query)]);
    if (status.current !== 'loading') return; // Cleared or reset while waiting.

    const results = search.status === 'fulfilled' ? search.value.results : null;
    const answer = ask.status === 'fulfilled' ? ask.value : null;
    const failure =
      search.status === 'rejected' ? search.reason : ask.status === 'rejected' ? ask.reason : null;
    const error = failure ? failureMessage(failure) : null;
    dispatch({ type: 'aiSearchFinished', results, answer, error });

    if (failure) track({ name: 'ai_unavailable', props: { reason: reasonFor(failure) } });
    if (answer) {
      const count = answer.abstained
        ? 0
        : answer.citations.filter((c) => parks.some((p) => p.id === c.parkId)).length;
      track({
        name: 'ai_answer_shown',
        props: { abstained: answer.abstained, citation_count: count },
      });
    }
    const found = results
      ? [`AI found ${plural(new Set(results.map((r) => r.parkId)).size)}.`]
      : [];
    const answerNote = answer
      ? [answer.abstained ? 'No answer found in the park data.' : 'Answer ready.']
      : [];
    announce([...found, ...answerNote, ...(error ? [error] : [])].join(' '));
  }

  return (
    <form role="search" className="search-form" aria-label="AI search" onSubmit={submit}>
      <div className="search-field">
        <label htmlFor="ai-query" className="ai-label">
          Ask about the parks
          <input
            id="ai-query"
            ref={input}
            name="ai-query"
            aria-label="Ask about the parks" // same as the visible label; jsx-a11y needs it
            aria-describedby={aiError ? 'ai-error' : undefined}
            type="text"
            maxLength={200}
            value={aiQuery}
            onChange={(e) => dispatch({ type: 'setAiQuery', query: e.target.value })}
          />
        </label>
        {/* Announced once through the live region in submit(); no role=alert here. */}
        {aiError && (
          <p id="ai-error" className="ai-error">
            {aiError}
          </p>
        )}
      </div>
      <Button type="primary" htmlType="submit" className="search-button" aria-disabled={loading}>
        Ask
      </Button>
      {(aiQuery || aiResults) && (
        <Button
          className="search-reset"
          onClick={() => {
            dispatch({ type: 'aiCleared' });
            input.current?.focus(); // this button disappears, so focus must not fall to the body
          }}
        >
          Clear AI search
        </Button>
      )}
    </form>
  );
}
