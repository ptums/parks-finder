import {
  ABSTAIN_ANSWER,
  normalise,
  parseModelJson,
  unsupportedFacts,
  verifyAnswer,
} from '../src/rag/verifyCitations';
import { testChunks } from './fixtures';

// testChunks include "Oak Park. Shady meadows with a duck pond." (oak-park#overview)
// and "Ramp Yard. Concrete bowls and rails for skateboarding." (skate#overview).
const POND = { chunkId: 'oak-park#overview', quote: 'Shady meadows with a duck pond' };

const reply = (
  citations: { chunkId: string; quote: string }[],
  answer = 'Oak Park has a duck pond.',
) => JSON.stringify({ answer, citations });

const abstained = (reason: string, details = {}) => ({
  answer: ABSTAIN_ANSWER,
  citations: [],
  abstained: true,
  reason,
  ...details,
});

describe('verifyAnswer', () => {
  it('(a) keeps a valid chunkId with an exact quote and derives parkId from the chunk', () => {
    expect(verifyAnswer(reply([POND]), testChunks)).toEqual({
      answer: 'Oak Park has a duck pond.',
      citations: [{ parkId: 'oak-park', ...POND }],
      abstained: false,
    });
  });

  it('(b) keeps a quote that differs only in case and whitespace', () => {
    const result = verifyAnswer(
      reply([{ chunkId: 'oak-park#overview', quote: '  SHADY   meadows\nwith a DUCK ' }]),
      testChunks,
    );
    expect(result.abstained).toBe(false);
    expect(result.citations[0]?.quote).toBe('SHADY   meadows\nwith a DUCK');
  });

  it('(c) abstains when any one citation has an unknown chunkId, even if others are valid', () => {
    const result = verifyAnswer(
      reply([POND, { chunkId: 'made-up#overview', quote: POND.quote }]),
      testChunks,
    );
    expect(result).toEqual(
      abstained('citation_failed', {
        rejected: [
          { chunkId: 'made-up#overview', quote: POND.quote, problem: 'chunk_not_retrieved' },
        ],
      }),
    );
  });

  it('(d) abstains on a quote that is not in that chunk (even if it is in another chunk)', () => {
    const result = verifyAnswer(reply([{ ...POND, chunkId: 'oak-park#hours' }]), testChunks);
    expect(result).toMatchObject(abstained('citation_failed'));
    expect(result.rejected?.[0]?.problem).toBe('quote_not_in_chunk');
  });

  it('(e) abstains with the fixed sentence when the quote is invented', () => {
    const result = verifyAnswer(
      reply([{ chunkId: 'oak-park#overview', quote: 'built in the year 1867' }], 'Built in 1867.'),
      testChunks,
    );
    expect(result.answer).toBe(ABSTAIN_ANSWER);
    expect(result.answer).not.toContain('1867');
    expect(result.reason).toBe('citation_failed');
  });

  it('abstains on a name-only quote: "Oak Park has a zoo built in 1901" citing "Oak Park"', () => {
    const result = verifyAnswer(
      reply(
        [{ chunkId: 'oak-park#overview', quote: 'Oak Park' }],
        'Oak Park has a zoo built in 1901.',
      ),
      testChunks,
    );
    expect(result).toMatchObject(abstained('citation_failed'));
    expect(result.rejected?.[0]?.problem).toBe('quote_is_only_park_name');
  });

  it('abstains on a quote of 6+ characters that is only the park name plus punctuation', () => {
    const chunks = [{ ...testChunks[0]!, text: 'Cedar Hill Nature Preserve. Trails.' }];
    const quote = { chunkId: chunks[0]!.chunkId, quote: 'Cedar Hill Nature Preserve.' };
    expect(verifyAnswer(reply([quote], 'Trails.'), chunks).reason).toBe('citation_failed');
  });

  it('rejects quotes shorter than 6 characters', () => {
    const result = verifyAnswer(
      reply([{ chunkId: 'oak-park#overview', quote: 'pond' }]),
      testChunks,
    );
    expect(result.reason).toBe('citation_failed');
    expect(result.rejected?.[0]?.problem).toBe('quote_too_short');
  });

  it('accepts a 7-character amenity label quote ("Dog run")', () => {
    const dogRun = { chunkId: 'oak-park#amenities', quote: 'Dog run' };
    const result = verifyAnswer(reply([dogRun], 'Oak Park has a dog run.'), testChunks);
    expect(result).toEqual({
      answer: 'Oak Park has a dog run.',
      citations: [{ parkId: 'oak-park', ...dogRun }],
      abstained: false,
    });
  });

  it('still rejects a short quote that is only the park name ("Oak Park", 8 characters)', () => {
    const result = verifyAnswer(
      reply([{ chunkId: 'oak-park#amenities', quote: 'Oak Park' }], 'Oak Park has a dog run.'),
      testChunks,
    );
    expect(result.rejected?.[0]?.problem).toBe('quote_is_only_park_name');
  });

  it('abstains when one citation of several fails (partial failure), listing only the bad one', () => {
    const bad = { chunkId: 'oak-park#overview', quote: 'a zoo and a carousel' };
    const result = verifyAnswer(reply([POND, bad]), testChunks);
    expect(result).toEqual(
      abstained('citation_failed', { rejected: [{ ...bad, problem: 'quote_not_in_chunk' }] }),
    );
  });

  it('abstains when the answer has a number that no cited chunk contains', () => {
    const result = verifyAnswer(
      reply([POND], 'Oak Park has a duck pond and 3 benches.'),
      testChunks,
    );
    expect(result).toEqual(abstained('unsupported_fact', { unsupported: ['3'] }));
  });

  it('abstains when the answer names something no cited chunk contains', () => {
    const result = verifyAnswer(
      reply([POND], 'Oak Park has a duck pond near the Boathouse.'),
      testChunks,
    );
    expect(result.reason).toBe('unsupported_fact');
  });

  it('accepts a number that is in the cited chunk', () => {
    const size = { chunkId: 'oak-park#size', quote: '12 acres. Rated 4.5' };
    const result = verifyAnswer(reply([size], 'Oak Park is 12 acres and rated 4.5.'), testChunks);
    expect(result.abstained).toBe(false);
  });

  it('abstains when the model gives no citations at all', () => {
    expect(verifyAnswer(reply([]), testChunks)).toEqual(abstained('no_citations'));
  });

  it.each([
    ['(f) malformed JSON', '{"answer": "Oak Park", "citations": ['],
    ['plain prose', 'Oak Park has a duck pond.'],
    ['a wrong shape', '{"answer": 5, "citations": "none"}'],
    ['an empty answer', '{"answer": "  ", "citations": []}'],
  ])('abstains on %s', (_name, text) => {
    expect(verifyAnswer(text, testChunks)).toEqual(abstained('unparseable'));
  });

  it.each([
    ['bare', '{"abstain": true}'],
    ['compact', '{"abstain":true}'],
    ['with a trailing note', '{"abstain": true}\n\nThe park data does not say.'],
  ])("labels the model's own abstain (%s) as model_abstained, not unparseable", (_name, text) => {
    expect(verifyAnswer(text, testChunks)).toEqual(abstained('model_abstained'));
  });

  it('does not treat {"abstain": false} as an abstain', () => {
    expect(verifyAnswer('{"abstain": false}', testChunks).reason).toBe('unparseable');
  });

  it('uses only the JSON object when the model adds prose around it', () => {
    const text = 'Here you go:\n' + reply([POND]) + '\nHope that helps.';
    expect(verifyAnswer(text, testChunks)).toMatchObject({
      abstained: false,
      answer: 'Oak Park has a duck pond.',
    });
  });

  it('accepts JSON wrapped in a ```json code fence', () => {
    const quote = { chunkId: 'skate#overview', quote: 'Concrete bowls and rails' };
    const fenced = '```json\n' + reply([quote], 'Ramp Yard has concrete bowls.') + '\n```';
    expect(verifyAnswer(fenced, testChunks).citations).toEqual([{ parkId: 'skate', ...quote }]);
  });

  it('only trusts chunks that were retrieved for this question', () => {
    const onlySkate = testChunks.filter((chunk) => chunk.parkId === 'skate');
    expect(verifyAnswer(reply([POND]), onlySkate).reason).toBe('citation_failed');
  });
});

describe('unsupportedFacts', () => {
  const cited = ['Oak Park. Shady meadows with a duck pond.'];

  it('ignores the first word of each sentence and "I"/"The"', () => {
    expect(
      unsupportedFacts('Yes. The pond is at Oak Park. Sadly I cannot say more.', cited),
    ).toEqual([]);
  });

  it('accepts a possessive of a cited word ("Park\'s") but not an uncited name', () => {
    expect(unsupportedFacts("Yes, Oak Park's pond is shady.", cited)).toEqual([]);
    expect(unsupportedFacts("Yes, Brooklyn's pond is shady.", cited)).toEqual(["Brooklyn's"]);
  });

  it('matches capitalised words regardless of case in the chunk ("Lighting" vs "lighting")', () => {
    expect(
      unsupportedFacts('Yes, it has Lighting.', ['Ramp Yard. Lit at night, lighting.']),
    ).toEqual([]);
  });

  it('lists capitalised words and numbers that are not in the cited text', () => {
    expect(unsupportedFacts('Oak Park opened in 1901 near Brooklyn.', cited)).toEqual([
      '1901',
      'Brooklyn',
    ]);
  });
});

describe('helpers', () => {
  it('normalise lowercases and collapses whitespace', () => {
    expect(normalise('  Dog\t\n Run ')).toBe('dog run');
  });

  it('parseModelJson handles fences without a language and returns undefined on junk', () => {
    expect(parseModelJson('```\n{"abstain": true}\n```')).toEqual({ abstain: true });
    expect(parseModelJson('not json')).toBeUndefined();
  });
});
