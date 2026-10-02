import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { App } from '../../App';
import { RETRY_DELAYS_MS } from '../../ai/useCapabilities';
import { env } from '../../env';

type Reply = { status?: number; body: unknown; headers?: Record<string, string> };
type Routes = Partial<Record<'capabilities' | 'search' | 'ask', Reply | 'network'>>;

const ASKED = {
  answer: 'Prospect Park has a lake.',
  citations: [{ parkId: 'prospect-park', chunkId: 'prospect-park#amenities', quote: 'lake' }],
  abstained: false,
  mode: 'hybrid',
  latencyMs: 9,
  usage: { inputTokens: 10, outputTokens: 5 },
};
const FOUND = {
  mode: 'hybrid',
  results: [
    { parkId: 'prospect-park', score: 1, field: 'amenities', matchedText: 'lake and trails' },
  ],
  abstained: false,
  latencyMs: 5,
};
const OK: Routes = {
  capabilities: { body: { ai: true } },
  search: { body: FOUND },
  ask: { body: ASKED },
};

function mockService(routes: Routes) {
  const fetchMock = jest.fn(async (url: string) => {
    const key = (['capabilities', 'search', 'ask'] as const).find((k) => url.endsWith(`/v1/${k}`))!;
    const reply = routes[key];
    if (!reply || reply === 'network') throw new TypeError('network down');
    // jsdom has no Response, so this is the small part of it the client uses.
    const status = reply.status ?? 200;
    return {
      ok: status < 400,
      status,
      headers: { get: (name: string) => reply.headers?.[name] ?? null },
      json: async () => reply.body,
    };
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

async function renderWithAi(routes: Routes = OK) {
  env.ragUrl = 'http://rag.test';
  const fetchMock = mockService(routes);
  const view = render(<App />);
  await screen.findByRole('radiogroup', { name: 'Search mode' }).catch(() => null);
  return { fetchMock, ...view };
}

async function ask(text = 'lake') {
  await userEvent.type(screen.getByRole('textbox', { name: 'Ask about the parks' }), text);
  await userEvent.click(screen.getByRole('button', { name: 'Ask' }));
}

// The directory starts collapsed on phone widths, so read the DOM instead of the accessibility tree.
function listNames() {
  return [...document.querySelectorAll('.park-list-item .park-list-name')].map(
    (el) => el.textContent,
  );
}

afterEach(() => {
  env.ragUrl = '';
  jest.useRealTimers();
});

describe('capability gating', () => {
  const aiControls =
    '[role=search][aria-label="AI search"], input[name=ai-query], fieldset.ai-modes';

  it('makes no request and renders no AI controls without a ragUrl', () => {
    const fetchMock = mockService(OK);
    const { container } = render(<App />);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(container.querySelector(aiControls)).toBeNull();
  });

  it('renders nothing AI when the service says ai:false', async () => {
    env.ragUrl = 'http://rag.test';
    const fetchMock = mockService({ capabilities: { body: { ai: false } } });
    const { container } = render(<App />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(container.querySelector('.ai-spacer')).toBeNull());
    expect(container.querySelector(aiControls)).toBeNull();
  });

  it('shows the controls and announces once on ai:true', async () => {
    jest.useFakeTimers();
    env.ragUrl = 'http://rag.test';
    mockService(OK);
    const { container } = render(<App />);
    expect(container.querySelector('.ai-spacer')).toHaveAttribute('aria-hidden', 'true');
    expect(await screen.findByRole('search', { name: 'AI search' })).toBeInTheDocument();
    expect(container.querySelector('.ai-spacer')).toBeNull();
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    expect(screen.getByRole('status')).toHaveTextContent('AI search is available.');
  });

  it('retries on a backoff, then gives up with no AI UI', async () => {
    jest.useFakeTimers();
    env.ragUrl = 'http://rag.test';
    const fetchMock = mockService({ capabilities: 'network' });
    const { container } = render(<App />);
    await act(async () => {});
    for (const delay of RETRY_DELAYS_MS) {
      await act(async () => {
        jest.advanceTimersByTime(delay);
      });
    }
    expect(fetchMock).toHaveBeenCalledTimes(1 + RETRY_DELAYS_MS.length);
    await act(async () => {
      jest.advanceTimersByTime(60000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1 + RETRY_DELAYS_MS.length);
    expect(container.querySelector(aiControls)).toBeNull();
    expect(container.querySelector('.ai-spacer')).toBeNull();
  });

  it('standard search works while capabilities is pending', async () => {
    env.ragUrl = 'http://rag.test';
    global.fetch = jest.fn(() => new Promise(() => {})) as unknown as typeof fetch;
    render(<App />);
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search parks' }), 'prospect');
    expect(listNames()).toEqual(['Prospect Park']);
  });
});

describe('modes', () => {
  it('defaults to Both and switches modes with the arrow keys', async () => {
    await renderWithAi();
    const both = await screen.findByRole('radio', { name: 'Both' });
    expect(both).toBeChecked();
    both.focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByRole('radio', { name: 'AI' })).toBeChecked();
    // AI only: the standard search is not in the DOM.
    expect(screen.queryByRole('search', { name: 'Search and filter parks' })).toBeNull();
    expect(screen.queryByRole('searchbox', { name: 'Search parks' })).toBeNull();
    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByRole('radio', { name: 'Filters' })).toBeChecked();
    expect(screen.getByRole('search', { name: 'Search and filter parks' })).toBeInTheDocument();
    expect(screen.queryByRole('search', { name: 'AI search' })).toBeNull();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });
    expect(screen.getByRole('status')).toHaveTextContent('Filters only');
  });
});

describe('asking', () => {
  it('filters the list, shows matchedText, answer and citation; announces without the answer text', async () => {
    await renderWithAi();
    await ask();
    await screen.findByRole('heading', { name: 'AI answer' });
    expect(listNames()).toEqual(['Prospect Park']);
    expect(screen.getByText('lake and trails')).toBeInTheDocument();
    const answer = screen.getByRole('region', { name: 'AI answer' });
    expect(within(answer).getByText('Prospect Park has a lake.')).toBeInTheDocument();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('AI found 1 park. Answer ready.');
    expect(status).not.toHaveTextContent('has a lake');
    expect(screen.getByRole('option', { name: 'Best match' })).toBeInTheDocument();
  });

  it('Both narrows AI results by the standard filters', async () => {
    await renderWithAi();
    await ask();
    await screen.findByRole('heading', { name: 'AI answer' });
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search parks' }), 'zzzz');
    expect(listNames()).toEqual([]);
  });

  it('a citation opens the details for that park', async () => {
    await renderWithAi();
    await ask();
    await userEvent.click(await screen.findByRole('button', { name: /Prospect Park: .*lake/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows the abstained text and no citations', async () => {
    await renderWithAi({
      ...OK,
      ask: {
        body: { answer: '', citations: [], abstained: true, mode: 'hybrid', latencyMs: 3 },
      },
    });
    await ask();
    expect(
      await screen.findByText("I don't have that information in the park data."),
    ).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Sources' })).toBeNull();
  });

  it('Reset clears the AI query, results and answer but keeps the mode', async () => {
    await renderWithAi();
    await ask();
    await screen.findByRole('heading', { name: 'AI answer' });
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.queryByRole('heading', { name: 'AI answer' })).toBeNull();
    expect(screen.getByRole('textbox', { name: 'Ask about the parks' })).toHaveValue('');
    expect(listNames()).toHaveLength(12);
    expect(screen.getByRole('radio', { name: 'Both' })).toBeChecked();
  });
});

describe('announcements and focus', () => {
  async function settle(ms: number) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, ms));
    });
  }

  it('the count announcement does not overwrite the AI message', async () => {
    await renderWithAi();
    await ask();
    await screen.findByRole('heading', { name: 'AI answer' });
    await settle(700);
    expect(screen.getByRole('status')).toHaveTextContent('AI found 1 park. Answer ready.');
  });

  it('the count announcement does not overwrite the mode message', async () => {
    await renderWithAi();
    await ask();
    await screen.findByRole('heading', { name: 'AI answer' });
    await userEvent.click(screen.getByRole('radio', { name: 'Filters' }));
    await settle(700);
    expect(screen.getByRole('status')).toHaveTextContent('Filters only');
  });

  it('Clear AI search moves focus to the query input', async () => {
    await renderWithAi();
    await ask();
    await screen.findByRole('heading', { name: 'AI answer' });
    await userEvent.click(screen.getByRole('button', { name: 'Clear AI search' }));
    expect(screen.getByRole('textbox', { name: 'Ask about the parks' })).toHaveFocus();
  });

  it('Ask is aria-disabled while loading and keeps focus', async () => {
    await renderWithAi();
    global.fetch = jest.fn(() => new Promise(() => {})) as unknown as typeof fetch;
    await ask();
    const button = screen.getByRole('button', { name: 'Ask' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveFocus();
    expect(screen.getByText('Searching…')).toBeInTheDocument();
  });

  it('shows the abstain text when no citation can be matched to a park', async () => {
    const citations = [{ parkId: 'nowhere', chunkId: 'nowhere#overview', quote: 'q' }];
    await renderWithAi({ ...OK, ask: { body: { ...ASKED, citations } } });
    await ask();
    expect(
      await screen.findByText("I don't have that information in the park data."),
    ).toBeVisible();
  });
});

describe('errors', () => {
  const unavailable = 'AI search is unavailable right now. Standard search still works.';

  it.each([
    [
      '503',
      { ...OK, search: { status: 503, body: { error: { code: 'ai_unavailable', message: 'x' } } } },
    ],
    ['network', { ...OK, search: 'network' as const }],
    [
      'timeout',
      { ...OK, search: { status: 504, body: { error: { code: 'timeout', message: 'x' } } } },
    ],
  ])('%s shows the unavailable message and keeps standard results', async (_name, routes) => {
    await renderWithAi(routes as Routes);
    await ask();
    expect(await screen.findByText(unavailable)).toBeInTheDocument();
    expect(listNames()).toHaveLength(12);
  });

  it('429 uses Retry-After', async () => {
    await renderWithAi({
      ...OK,
      search: {
        status: 429,
        headers: { 'Retry-After': '7' },
        body: { error: { code: 'rate_limited', message: 'x' } },
      },
    });
    await ask();
    expect(
      await screen.findByText('Too many AI searches. Try again in 7 seconds.'),
    ).toBeInTheDocument();
  });

  it('daily cap on ask still shows the search results', async () => {
    await renderWithAi({
      ...OK,
      ask: { status: 429, body: { error: { code: 'daily_cap_reached', message: 'x' } } },
    });
    await ask();
    expect(
      await screen.findByText("Today's AI answer limit is reached. Search results still shown."),
    ).toBeInTheDocument();
    expect(listNames()).toEqual(['Prospect Park']);
  });
});

describe('accessibility', () => {
  it('has no axe violations idle, with an answer, and with an error', async () => {
    const { container } = await renderWithAi();
    expect(await axe(container)).toHaveNoViolations();
    await ask();
    await screen.findByRole('heading', { name: 'AI answer' });
    expect(await axe(container)).toHaveNoViolations();
    await userEvent.click(screen.getByRole('radio', { name: 'AI' }));
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations while loading or after an abstained answer', async () => {
    const { container } = await renderWithAi();
    global.fetch = jest.fn(() => new Promise(() => {})) as unknown as typeof fetch;
    await ask();
    expect(screen.getByText('Searching…')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations for an abstained answer', async () => {
    const { container } = await renderWithAi({
      ...OK,
      ask: { body: { answer: '', citations: [], abstained: true, mode: 'hybrid', latencyMs: 3 } },
    });
    await ask();
    await screen.findByText("I don't have that information in the park data.");
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations in the error state', async () => {
    const { container } = await renderWithAi({ ...OK, search: 'network' });
    await ask();
    await screen.findByText(/unavailable right now/);
    expect(await axe(container)).toHaveNoViolations();
  });
});
