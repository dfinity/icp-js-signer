import { describe, expect, it, vi } from 'vitest';
import { readSignerInitiation } from './initiation.js';

const createLocation = (hash: string) => ({ hash, pathname: '/signer-callback', search: '' });

describe('readSignerInitiation', () => {
  it('returns undefined when the load is not signer-initiated', () => {
    const history = { replaceState: vi.fn() };
    const result = readSignerInitiation({
      location: createLocation('#message=%7B%7D&state=x'),
      history,
    });
    expect(result).toBeUndefined();
    expect(history.replaceState).not.toHaveBeenCalled();
  });

  it('reads the hint and signer, and strips the fragment', () => {
    const history = { replaceState: vi.fn() };
    const location = createLocation(
      `#${new URLSearchParams({ init: 'icrc34_delegation', signer: 'https://id.ai' }).toString()}`,
    );
    const result = readSignerInitiation({ location, history });
    expect(result).toEqual({ hint: 'icrc34_delegation', signer: 'https://id.ai' });
    expect(history.replaceState).toHaveBeenCalledWith(null, '', '/signer-callback');
  });

  it('reports a null signer when no hint is provided', () => {
    const history = { replaceState: vi.fn() };
    const result = readSignerInitiation({ location: createLocation('#init='), history });
    expect(result).toEqual({ hint: '', signer: null });
  });
});
