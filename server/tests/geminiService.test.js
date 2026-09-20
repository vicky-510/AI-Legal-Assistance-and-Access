import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('geminiService.isRateLimitError', () => {
  it('detects a 429 status', async () => {
    const { isRateLimitError } = await import('../services/geminiService.js');
    expect(isRateLimitError({ status: 429 })).toBe(true);
  });

  it('detects RESOURCE_EXHAUSTED in the message', async () => {
    const { isRateLimitError } = await import('../services/geminiService.js');
    expect(isRateLimitError({ message: 'RESOURCE_EXHAUSTED: quota exceeded' })).toBe(true);
  });

  it('returns false for unrelated errors', async () => {
    const { isRateLimitError } = await import('../services/geminiService.js');
    expect(isRateLimitError({ status: 400, message: 'Bad request' })).toBe(false);
  });
});

describe('geminiService.callWithFallback', () => {
  let callWithFallback;
  let MODEL_FALLBACK_CHAIN;

  beforeEach(async () => {
    vi.resetModules();
    ({ callWithFallback, MODEL_FALLBACK_CHAIN } = await import('../services/geminiService.js'));
  });

  it('slides to the next model in the chain on a 429 and succeeds', async () => {
    const attempts = [];
    const callFn = vi.fn(async (model) => {
      attempts.push(model);
      if (model === MODEL_FALLBACK_CHAIN[0]) {
        const err = new Error('RESOURCE_EXHAUSTED');
        err.status = 429;
        throw err;
      }
      return { text: `ok from ${model}` };
    });

    const result = await callWithFallback(callFn);

    expect(attempts).toEqual([MODEL_FALLBACK_CHAIN[0], MODEL_FALLBACK_CHAIN[1]]);
    expect(result.text).toBe(`ok from ${MODEL_FALLBACK_CHAIN[1]}`);
  });

  it('falls through all three tiers before throwing if every model is rate limited', async () => {
    const callFn = vi.fn(async () => {
      const err = new Error('quota exceeded');
      err.status = 429;
      throw err;
    });

    await expect(callWithFallback(callFn)).rejects.toThrow('quota exceeded');
    expect(callFn).toHaveBeenCalledTimes(MODEL_FALLBACK_CHAIN.length);
  });

  it('does not fall back and throws immediately on a non-rate-limit error', async () => {
    const callFn = vi.fn(async () => {
      throw new Error('Invalid API key');
    });

    await expect(callWithFallback(callFn)).rejects.toThrow('Invalid API key');
    expect(callFn).toHaveBeenCalledTimes(1);
  });

  it('never throws a raw 500-shaped error to the caller for a fallback-recoverable failure', async () => {
    const callFn = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('429 Too Many Requests'), { status: 429 }))
      .mockRejectedValueOnce(Object.assign(new Error('429 Too Many Requests'), { status: 429 }))
      .mockResolvedValueOnce({ text: 'recovered on tier 3' });

    const result = await callWithFallback(callFn);
    expect(result.text).toBe('recovered on tier 3');
  });
});
