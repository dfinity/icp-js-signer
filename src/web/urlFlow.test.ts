import { describe, expect, it, vi } from 'vitest';
import type { JsonRpcResponse } from '../transport.js';
import { UrlFlow, type UrlFlowOptions } from './urlFlow.js';

const URL_ = 'https://signer.example.com/icrc-167';
const CALLBACK = 'https://relying.example.com/signer-callback';
const KEY = 'icrc167:flow';

const createStorage = (seed: Record<string, string> = {}) => {
  const map = new Map<string, string>(Object.entries(seed));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
    clear: () => map.clear(),
    key: (index: number) => [...map.keys()][index] ?? null,
    get length() {
      return map.size;
    },
  } as Storage;
};

const createLocation = (hash = '') => ({
  assign: vi.fn<(url: string) => void>(),
  hash,
  pathname: '/signer-callback',
  search: '',
});

type MockLocation = ReturnType<typeof createLocation>;

const createFlow = (
  overrides: {
    storage?: Storage;
    location?: MockLocation;
    history?: { replaceState: ReturnType<typeof vi.fn> };
    states?: string[];
  } = {},
) => {
  const storage = overrides.storage ?? createStorage();
  const location = overrides.location ?? createLocation();
  const history = overrides.history ?? { replaceState: vi.fn() };
  const states = overrides.states ?? ['S0', 'S1'];
  let stateIndex = 0;
  const crypto = { randomUUID: () => states[stateIndex++] ?? 'S' } as Pick<Crypto, 'randomUUID'>;
  const flow = new UrlFlow({
    url: URL_,
    callbackUrl: CALLBACK,
    storage,
    storageKey: KEY,
    location: location as UrlFlowOptions['location'],
    history,
    crypto,
  });
  return { flow, storage, location, history };
};

const response = (id: string | number, result: unknown): JsonRpcResponse => ({
  jsonrpc: '2.0',
  id,
  result,
});

const hashFor = (params: Record<string, string>) => `#${new URLSearchParams(params).toString()}`;
const readStored = (storage: Storage) => JSON.parse(storage.getItem(KEY) ?? 'null');
const assignedFragment = (location: MockLocation) =>
  new URLSearchParams(new URL(location.assign.mock.calls[0][0]).hash.slice(1));

describe('UrlFlow', () => {
  it('hands out sequential call-order slots', () => {
    const { flow } = createFlow();
    expect(flow.next()).toBe(0);
    expect(flow.next()).toBe(1);
    expect(flow.next()).toBe(2);
  });

  it('records a value and persists it', () => {
    const { flow, storage } = createFlow();
    flow.record(flow.next(), 'nonce');
    expect(flow.get(0)).toBe('nonce');
    expect(readStored(storage)).toEqual({ results: { 0: 'nonce' } });
  });

  it('navigates a single request with message, callback and state', () => {
    const { flow, location, storage } = createFlow({ states: ['S'] });
    const request = { jsonrpc: '2.0' as const, id: 1, method: 'icrc27_accounts' };
    flow.navigate([{ index: 0, request }]);

    expect(location.assign).toHaveBeenCalledOnce();
    const params = assignedFragment(location);
    expect(JSON.parse(params.get('message') ?? '')).toEqual(request);
    expect(params.get('callback')).toBe(CALLBACK);
    expect(params.get('state')).toBe('S');
    expect(readStored(storage).pending).toEqual({ state: 'S', requests: [{ index: 0, id: 1 }] });
  });

  it('navigates concurrent requests as one JSON-RPC batch', () => {
    const { flow, location } = createFlow({ states: ['S'] });
    const a = { jsonrpc: '2.0' as const, id: 1, method: 'a' };
    const b = { jsonrpc: '2.0' as const, id: 2, method: 'b' };
    flow.navigate([
      { index: 0, request: a },
      { index: 1, request: b },
    ]);
    expect(JSON.parse(assignedFragment(location).get('message') ?? '')).toEqual([a, b]);
  });

  it('navigates at most once', () => {
    const { flow, location } = createFlow({ states: ['S', 'S2'] });
    flow.navigate([{ index: 0, request: { jsonrpc: '2.0', id: 1, method: 'a' } }]);
    flow.navigate([{ index: 1, request: { jsonrpc: '2.0', id: 2, method: 'b' } }]);
    expect(location.assign).toHaveBeenCalledOnce();
    expect(flow.navigated).toBe(true);
  });

  it('absorbs a batch return by id and strips the fragment', () => {
    const respA = response(1, { a: 1 });
    const respB = response(2, { b: 2 });
    const storage = createStorage({
      [KEY]: JSON.stringify({
        results: {},
        pending: {
          state: 'S',
          requests: [
            { index: 0, id: 1 },
            { index: 1, id: 2 },
          ],
        },
      }),
    });
    const location = createLocation(
      hashFor({ message: JSON.stringify([respA, respB]), state: 'S' }),
    );
    const { flow, history } = createFlow({ storage, location });

    expect(flow.get(0)).toEqual(respA);
    expect(flow.get(1)).toEqual(respB);
    expect(history.replaceState).toHaveBeenCalledWith(null, '', '/signer-callback');
    expect(readStored(storage)).toEqual({ results: { 0: respA, 1: respB } });
  });

  it('ignores a return whose state does not match', () => {
    const seeded = JSON.stringify({
      results: {},
      pending: { state: 'S', requests: [{ index: 0, id: 1 }] },
    });
    const storage = createStorage({ [KEY]: seeded });
    const location = createLocation(
      hashFor({ message: JSON.stringify(response(1, {})), state: 'nope' }),
    );
    const { flow, history } = createFlow({ storage, location });

    expect(flow.get(0)).toBeUndefined();
    expect(history.replaceState).not.toHaveBeenCalled();
    expect(storage.getItem(KEY)).toBe(seeded);
  });

  it('memoize runs the producer once and replays its journaled value', async () => {
    const { flow, storage } = createFlow();
    const produce = vi.fn().mockResolvedValue('nonce');

    expect(await flow.memoize(produce)).toBe('nonce'); // slot 0, runs
    expect(produce).toHaveBeenCalledOnce();
    expect(readStored(storage)).toEqual({ results: { 0: 'nonce' } });

    // A fresh flow over the same storage replays the value without producing.
    const replay = createFlow({ storage });
    const produceAgain = vi.fn();
    expect(await replay.flow.memoize(produceAgain)).toBe('nonce');
    expect(produceAgain).not.toHaveBeenCalled();
  });

  it('preserves memoized results when absorbing a signer return', () => {
    // Slot 0 is a memoized value; slot 1 is the request awaiting this return.
    const resp = response(9, { ok: true });
    const storage = createStorage({
      [KEY]: JSON.stringify({
        results: { 0: 'nonce' },
        pending: { state: 'S', requests: [{ index: 1, id: 9 }] },
      }),
    });
    const location = createLocation(hashFor({ message: JSON.stringify(resp), state: 'S' }));
    const { flow } = createFlow({ storage, location });

    expect(flow.get(0)).toBe('nonce');
    expect(flow.get(1)).toEqual(resp);
    expect(readStored(storage)).toEqual({ results: { 0: 'nonce', 1: resp } });
  });
});
