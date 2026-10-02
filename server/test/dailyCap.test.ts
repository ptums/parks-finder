import { createDailyCap } from '../src/dailyCap';

describe('createDailyCap', () => {
  it('allows `limit` requests a day, then reports seconds to UTC midnight, then resets', () => {
    let now = new Date('2026-10-02T23:59:00Z');
    const cap = createDailyCap(2, () => now);
    expect(cap.take()).toBeNull();
    expect(cap.take()).toBeNull();
    expect(cap.take()).toBe(60);
    now = new Date('2026-10-03T00:00:01Z');
    expect(cap.take()).toBeNull();
  });

  it('never limits when the cap is 0', () => {
    const cap = createDailyCap(0);
    for (let i = 0; i < 1000; i++) expect(cap.take()).toBeNull();
  });
});
