import { describe, expect, it, vi } from 'vitest';
import type { JsonRpcResponse } from '../transport.js';
import { UrlFlow, type UrlFlowOptions } from './urlFlow.js';

const URL_ = 'https://signer.example.com/icrc-167';
const CALLBACK = 'https://relying.example.com/signer-callback';
const KEY = 'icrc167:flow';
const NOW = 1000;

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
    now?: () => number;
    flowTimeout?: number;
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
    flowTimeout: overrides.flowTimeout ?? 1_000_000,
    location: location as UrlFlowOptions['location'],
    history,
    crypto,
    now: overrides.now ?? (() => NOW),
  });
  return { flow, storage, location, history };
};

const tick = () => new Promise<void>(resolve => setTimeout(resolve, 0));
const response = (id: string | number, result: unknown): JsonRpcResponse => ({
  jsonrpc: '2.0',
  id,
  result,
});
const hashFor = (params: Record<string, string>) => `#${new URLSearchParams(params).toString()}`;
const readStored = (storage: Storage) => JSON.parse(storage.getItem(KEY) ?? 'null');
const assignedFragment = (location: MockLocation) =>
  new URLSearchParams(new URL(location.assign.mock.calls[0][0]).hash.slice(1));
const request = (id: number, method: string) => ({ jsonrpc: '2.0' as const, id, method });

describe('UrlFlow', () => {
  it('hands out sequential call-order slots', () => {
    const { flow } = createFlow();
    expect(flow.next()).toBe(0);
    expect(flow.next()).toBe(1);
  });

  it('navigates a single buffered request after flushing', async () => {
    const { flow, location, storage } = createFlow({ states: ['S'] });
    flow.request(flow.next(), request(1, 'icrc27_accounts'));
    expect(location.assign).not.toHaveBeenCalled(); // deferred to the flush macrotask
    await tick();

    expect(location.assign).toHaveBeenCalledOnce();
    const params = assignedFragment(location);
    expect(JSON.parse(params.get('message') ?? '')).toEqual(request(1, 'icrc27_accounts'));
    expect(params.get('callback')).toBe(CALLBACK);
    expect(params.get('state')).toBe('S');
    expect(readStored(storage).pending).toEqual({ state: 'S', requests: [{ index: 0, id: 1 }] });
  });

  it('coalesces concurrently buffered requests into one batch navigation', async () => {
    const { flow, location } = createFlow({ states: ['S'] });
    const a = request(1, 'icrc34_delegation');
    const b = request(2, 'icrc27_accounts');
    flow.request(flow.next(), a);
    flow.request(flow.next(), b);
    await tick();

    expect(location.assign).toHaveBeenCalledOnce();
    expect(JSON.parse(assignedFragment(location).get('message') ?? '')).toEqual([a, b]);
  });

  it('navigates at most once per load', async () => {
    const { flow, location } = createFlow({ states: ['S', 'S2'] });
    flow.request(flow.next(), request(1, 'a'));
    await tick();
    flow.request(flow.next(), request(2, 'b'));
    await tick();
    expect(location.assign).toHaveBeenCalledOnce();
  });

  it('starts fresh on a bare load, ignoring a leftover completed journal', async () => {
    const cached = response(1, { accounts: [] });
    const storage = createStorage({
      [KEY]: JSON.stringify({ createdAt: NOW, results: { 0: cached } }), // completed, no pending
    });
    const { flow, location } = createFlow({ storage, states: ['S2'] }); // no message in the URL

    expect(flow.get(0)).toBeUndefined(); // leftover results ignored, not replayed
    flow.request(flow.next(), request(9, 'icrc27_accounts')); // slot 0 of the fresh flow
    await tick();

    expect(location.assign).toHaveBeenCalledOnce(); // navigates fresh
    expect(readStored(storage).results).toEqual({}); // stale journal overwritten
    expect(readStored(storage).pending).toEqual({ state: 'S2', requests: [{ index: 0, id: 9 }] });
  });

  it('starts fresh when a leftover pending has no matching return', () => {
    const storage = createStorage({
      [KEY]: JSON.stringify({
        createdAt: NOW,
        results: {},
        pending: { state: 'S', requests: [{ index: 0, id: 1 }] },
      }),
    });
    const { flow, location } = createFlow({ storage }); // abandoned pending, no message

    expect(flow.get(0)).toBeUndefined();
    expect(location.assign).not.toHaveBeenCalled(); // does not auto-re-navigate the stale pending
  });

  it('holds off navigation until an in-flight memoize is recorded', async () => {
    const { flow, location, storage } = createFlow({ states: ['S'] });
    let resolveNonce!: (value: string) => void;
    const nonceDone = flow.memoize(() => new Promise<string>(r => (resolveNonce = r))); // slot 0
    flow.request(flow.next(), request(1, 'icrc34_delegation')); // slot 1, buffered

    await tick();
    expect(location.assign).not.toHaveBeenCalled(); // held off by the in-flight memoize

    resolveNonce('nonce');
    await nonceDone;
    await tick();

    expect(location.assign).toHaveBeenCalledOnce();
    const stored = readStored(storage);
    expect(stored.results).toEqual({ 0: 'nonce' }); // recorded before the redirect
    expect(stored.pending.requests).toEqual([{ index: 1, id: 1 }]);
  });

  it('replays a journaled memoized value across a redirect return', async () => {
    const storage = createStorage();
    const produce = vi.fn().mockResolvedValue('nonce');

    // Load 1: memoize the nonce, then a request that navigates.
    const first = createFlow({ storage, states: ['S'] });
    expect(await first.flow.memoize(produce)).toBe('nonce'); // slot 0
    first.flow.request(first.flow.next(), request(1, 'icrc34_delegation')); // slot 1
    await tick();
    expect(produce).toHaveBeenCalledOnce();

    // Load 2: signer return → memoize (slot 0) replays without re-running.
    const resp = response(1, { ok: true });
    const location = createLocation(hashFor({ message: JSON.stringify(resp), state: 'S' }));
    const { flow } = createFlow({ storage, location });
    const produceAgain = vi.fn();
    expect(await flow.memoize(produceAgain)).toBe('nonce'); // slot 0 replays from the journal
    expect(produceAgain).not.toHaveBeenCalled();
    expect(flow.get(1)).toEqual(resp); // slot 1 absorbed from the return
  });

  it('absorbs a batch return by id and strips the fragment', () => {
    const respA = response(1, { a: 1 });
    const respB = response(2, { b: 2 });
    const storage = createStorage({
      [KEY]: JSON.stringify({
        createdAt: NOW,
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
    expect(readStored(storage).results).toEqual({ 0: respA, 1: respB });
    expect(readStored(storage).pending).toBeUndefined();
  });

  it('strips the fragment but does not absorb when the state does not match', () => {
    const seeded = JSON.stringify({
      createdAt: NOW,
      results: {},
      pending: { state: 'S', requests: [{ index: 0, id: 1 }] },
    });
    const storage = createStorage({ [KEY]: seeded });
    const location = createLocation(
      hashFor({ message: JSON.stringify(response(1, {})), state: 'nope' }),
    );
    const { flow, history } = createFlow({ storage, location });

    expect(flow.get(0)).toBeUndefined(); // not absorbed — state mismatch starts fresh
    // Still stripped, so a stray response can't leak via history/referrer.
    expect(history.replaceState).toHaveBeenCalledWith(null, '', '/signer-callback');
    expect(storage.getItem(KEY)).toBe(seeded); // not persisted over
  });

  it('preserves memoized results when absorbing a signer return', () => {
    const resp = response(9, { ok: true });
    const storage = createStorage({
      [KEY]: JSON.stringify({
        createdAt: NOW,
        results: { 0: 'nonce' },
        pending: { state: 'S', requests: [{ index: 1, id: 9 }] },
      }),
    });
    const location = createLocation(hashFor({ message: JSON.stringify(resp), state: 'S' }));
    const { flow } = createFlow({ storage, location });

    expect(flow.get(0)).toBe('nonce');
    expect(flow.get(1)).toEqual(resp);
    expect(readStored(storage).results).toEqual({ 0: 'nonce', 1: resp });
  });

  it('ignores and clears an expired flow', () => {
    const storage = createStorage({
      [KEY]: JSON.stringify({
        createdAt: NOW,
        results: { 0: 'nonce' },
        pending: { state: 'S', requests: [{ index: 1, id: 9 }] },
      }),
    });
    const { flow } = createFlow({ storage, now: () => NOW + 700_000, flowTimeout: 600_000 });

    expect(flow.get(0)).toBeUndefined();
    expect(storage.getItem(KEY)).toBeNull();
  });
});
