import {
  ABSTAIN_ANSWER,
  normalise,
  parseModelJson,
  verifyAnswer,
} from '../src/rag/verifyCitations';
import { testChunks } from './fixtures';

const reply = (
  citations: { chunkId: string; quote: string }[],
  answer = 'Oak Park has a duck pond.',
) => JSON.stringify({ answer, citations });

describe('verifyAnswer', () => {
  it('(a) keeps a valid chunkId with an exact quote and derives parkId from the chunk', () => {
    const result = verifyAnswer(
      reply([{ chunkId: 'oak-park#overview', quote: 'a duck pond' }]),
      testChunks,
    );
    expect(result).toEqual({
      answer: 'Oak Park has a duck pond.',
      citations: [{ parkId: 'oak-park', chunkId: 'oak-park#overview', quote: 'a duck pond' }],
      abstained: false,
      dropped: 0,
    });
  });

  it('(b) keeps a quote that differs only in case and whitespace', () => {
    const result = verifyAnswer(
      reply([{ chunkId: 'oak-park#overview', quote: '  SHADY   meadows\nwith ' }]),
      testChunks,
    );
    expect(result.abstained).toBe(false);
    expect(result.citations[0]?.quote).toBe('SHADY   meadows\nwith');
  });

  it('(c) drops an unknown chunkId but keeps the valid ones', () => {
    const result = verifyAnswer(
      reply([
        { chunkId: 'oak-park#overview', quote: 'duck pond' },
        { chunkId: 'made-up#overview', quote: 'duck pond' },
      ]),
      testChunks,
    );
    expect(result.citations).toHaveLength(1);
    expect(result.dropped).toBe(1);
  });

  it('(d) drops a quote that is not in that chunk (even if it is in another chunk)', () => {
    const result = verifyAnswer(
      reply([{ chunkId: 'oak-park#hours', quote: 'duck pond' }]),
      testChunks,
    );
    expect(result).toMatchObject({ abstained: true, citations: [], dropped: 1 });
  });

  it('(e) abstains with the fixed sentence when every citation is invalid', () => {
    const result = verifyAnswer(
      reply([{ chunkId: 'oak-park#overview', quote: 'built in 1867' }], 'It was built in 1867.'),
      testChunks,
    );
    expect(result.answer).toBe(ABSTAIN_ANSWER);
    expect(result.answer).not.toContain('1867');
  });

  it('abstains when the model gives no citations at all', () => {
    expect(verifyAnswer(reply([]), testChunks).abstained).toBe(true);
  });

  it('rejects empty and too-short quotes (an empty quote would match any chunk)', () => {
    const result = verifyAnswer(
      reply([
        { chunkId: 'oak-park#overview', quote: '' },
        { chunkId: 'oak-park#overview', quote: ' a ' },
      ]),
      testChunks,
    );
    expect(result.abstained).toBe(true);
  });

  it.each([
    ['(f) malformed JSON', '{"answer": "Oak Park", "citations": ['],
    ['plain prose', 'Oak Park has a duck pond.'],
    ['an explicit abstain', '{"abstain": true}'],
    ['a wrong shape', '{"answer": 5, "citations": "none"}'],
    ['an empty answer', '{"answer": "  ", "citations": []}'],
  ])('abstains on %s', (_name, text) => {
    expect(verifyAnswer(text, testChunks)).toEqual({
      answer: ABSTAIN_ANSWER,
      citations: [],
      abstained: true,
      dropped: 0,
    });
  });

  it('accepts JSON wrapped in a ```json code fence', () => {
    const fenced =
      '```json\n' + reply([{ chunkId: 'skate#overview', quote: 'Concrete bowls' }]) + '\n```';
    const result = verifyAnswer(fenced, testChunks);
    expect(result.citations).toEqual([
      { parkId: 'skate', chunkId: 'skate#overview', quote: 'Concrete bowls' },
    ]);
  });

  it('only trusts chunks that were retrieved for this question', () => {
    const onlySkate = testChunks.filter((chunk) => chunk.parkId === 'skate');
    const result = verifyAnswer(
      reply([{ chunkId: 'oak-park#overview', quote: 'duck pond' }]),
      onlySkate,
    );
    expect(result.abstained).toBe(true);
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
