import { describe, expect, it, vi } from 'vitest';
import type { JsonRpcResponse } from '../transport.js';
import { UrlChannel, type UrlChannelOptions } from './urlChannel.js';

const URL_ = 'https://signer.example.com/icrc-167';
const CALLBACK = 'https://relying.example.com/signer-callback';
const STORAGE_KEY = 'icrc167:flow';

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

const createChannel = (
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
  const states = overrides.states ?? ['state-0', 'state-1', 'state-2'];
  let stateIndex = 0;
  const crypto = { randomUUID: () => states[stateIndex++] ?? 'state' } as Pick<
    Crypto,
    'randomUUID'
  >;
  const channel = new UrlChannel({
    url: URL_,
    callbackUrl: CALLBACK,
    storage,
    storageKey: STORAGE_KEY,
    location: location as UrlChannelOptions['location'],
    history,
    crypto,
  });
  return { channel, storage, location, history };
};

// Lets buffered microtask emissions run.
const microtask = () => new Promise<void>(resolve => queueMicrotask(resolve));
// Lets the deferred navigation flush (a macrotask) run.
const tick = () => new Promise<void>(resolve => setTimeout(resolve, 0));

const hashFor = (params: Record<string, string>) => `#${new URLSearchParams(params).toString()}`;

const response = (id: string | number, result: unknown): JsonRpcResponse => ({
  jsonrpc: '2.0',
  id,
  result,
});

// Reads the fragment params of the URL passed to the last `location.assign`.
const assignedFragment = (location: MockLocation): URLSearchParams => {
  const calls = location.assign.mock.calls;
  const [url] = calls[calls.length - 1];
  return new URLSearchParams(new URL(url).hash.slice(1));
};

const readStored = (storage: Storage): StoredFlowShape => {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) {
    throw new Error('no flow stored');
  }
  return JSON.parse(raw);
};

interface StoredFlowShape {
  results: Record<number, JsonRpcResponse>;
  pending?: { state: string; requests: { index: number; id: string | number | null }[] };
}

describe('UrlChannel', () => {
  describe('send', () => {
    it('navigates to the signer with request, callback and state in the fragment', async () => {
      const { channel, location, storage } = createChannel();
      const request = { jsonrpc: '2.0' as const, id: 1, method: 'icrc27_accounts' };

      await channel.send(request);
      await tick();

      expect(location.assign).toHaveBeenCalledOnce();
      const url = new URL(location.assign.mock.calls[0][0]);
      expect(`${url.origin}${url.pathname}`).toBe(URL_);
      const params = assignedFragment(location);
      expect(JSON.parse(params.get('message') ?? '')).toEqual(request);
      expect(params.get('callback')).toBe(CALLBACK);
      expect(params.get('state')).toBe('state-0');

      expect(readStored(storage).pending).toEqual({
        state: 'state-0',
        requests: [{ index: 0, id: 1 }],
      });
    });

    it('replays a completed call from storage without navigating', async () => {
      const cached = response('originally-different-id', { accounts: [] });
      const storage = createStorage({ [STORAGE_KEY]: JSON.stringify({ results: { 0: cached } }) });
      const { channel, location } = createChannel({ storage });
      const listener = vi.fn();
      channel.addEventListener('response', listener);

      await channel.send({ jsonrpc: '2.0', id: 7, method: 'icrc27_accounts' });
      await microtask();
      await tick();

      expect(location.assign).not.toHaveBeenCalled();
      // Response is re-stamped with the id used for THIS call.
      expect(listener).toHaveBeenCalledWith({ ...cached, id: 7 });
    });

    it('rejects when the channel is closed', async () => {
      const { channel } = createChannel();
      await channel.close();
      await expect(channel.send({ jsonrpc: '2.0', id: 1, method: 'x' })).rejects.toThrow();
    });
  });

  describe('batching concurrent requests', () => {
    it('coalesces requests issued before the redirect into one navigation', async () => {
      const { channel, location, storage } = createChannel({ states: ['batch-state'] });
      const reqA = { jsonrpc: '2.0' as const, id: 1, method: 'icrc34_delegation' };
      const reqB = { jsonrpc: '2.0' as const, id: 2, method: 'icrc27_accounts' };

      // Issued together (as with Promise.all) — both buffer before the flush.
      await channel.send(reqA);
      await channel.send(reqB);
      await tick();

      expect(location.assign).toHaveBeenCalledOnce();
      expect(JSON.parse(assignedFragment(location).get('message') ?? '')).toEqual([reqA, reqB]);
      expect(readStored(storage).pending).toEqual({
        state: 'batch-state',
        requests: [
          { index: 0, id: 1 },
          { index: 1, id: 2 },
        ],
      });
    });

    it('absorbs a batch return and replays each response by its id', async () => {
      const respA = response(1, { signerDelegation: ['chain'] });
      const respB = response(2, { accounts: ['acc'] });
      const storage = createStorage({
        [STORAGE_KEY]: JSON.stringify({
          results: {},
          pending: {
            state: 'batch-state',
            requests: [
              { index: 0, id: 1 },
              { index: 1, id: 2 },
            ],
          },
        }),
      });
      const location = createLocation(
        hashFor({ message: JSON.stringify([respA, respB]), state: 'batch-state' }),
      );
      const { channel, history } = createChannel({ storage, location });

      expect(history.replaceState).toHaveBeenCalledWith(null, '', '/signer-callback');
      expect(readStored(storage)).toEqual({ results: { 0: respA, 1: respB } });

      const responses: JsonRpcResponse[] = [];
      channel.addEventListener('response', r => responses.push(r));
      await channel.send({ jsonrpc: '2.0', id: 10, method: 'icrc34_delegation' }); // #0 cached
      await channel.send({ jsonrpc: '2.0', id: 11, method: 'icrc27_accounts' }); // #1 cached
      await microtask();

      expect(responses).toEqual([
        { ...respA, id: 10 },
        { ...respB, id: 11 },
      ]);
    });
  });

  describe('return absorption', () => {
    it('folds a matching signer return into results and strips the fragment', async () => {
      const resp = response('req-id', { accounts: ['a'] });
      const storage = createStorage({
        [STORAGE_KEY]: JSON.stringify({
          results: {},
          pending: { state: 'state-0', requests: [{ index: 0, id: 'req-id' }] },
        }),
      });
      const location = createLocation(hashFor({ message: JSON.stringify(resp), state: 'state-0' }));
      const { channel, history } = createChannel({ storage, location });

      expect(history.replaceState).toHaveBeenCalledWith(null, '', '/signer-callback');
      expect(readStored(storage)).toEqual({ results: { 0: resp } });

      const listener = vi.fn();
      channel.addEventListener('response', listener);
      await channel.send({ jsonrpc: '2.0', id: 42, method: 'icrc27_accounts' });
      await microtask();
      expect(listener).toHaveBeenCalledWith({ ...resp, id: 42 });
    });

    it('ignores a return whose state does not match the pending state', () => {
      const resp = response('req-id', { accounts: [] });
      const seeded = JSON.stringify({
        results: {},
        pending: { state: 'state-0', requests: [{ index: 0, id: 'req-id' }] },
      });
      const storage = createStorage({ [STORAGE_KEY]: seeded });
      const location = createLocation(hashFor({ message: JSON.stringify(resp), state: 'wrong' }));
      const { history } = createChannel({ storage, location });

      expect(history.replaceState).not.toHaveBeenCalled();
      expect(storage.getItem(STORAGE_KEY)).toBe(seeded);
    });
  });

  describe('close', () => {
    it('notifies close listeners', async () => {
      const { channel } = createChannel();
      const listener = vi.fn();
      channel.addEventListener('close', listener);
      await channel.close();
      expect(listener).toHaveBeenCalledOnce();
      expect(channel.closed).toBe(true);
    });
  });

  describe('sequential flow across redirects', () => {
    it('replays "const x = await a(); const y = await b(x)" to completion', async () => {
      const storage = createStorage();
      // The signer echoes the request id, so the response id matches the id of
      // the outbound request that triggered each redirect (1, then 11).
      const respA = response(1, { accounts: ['acc'] });
      const respB = response(11, { signerDelegation: ['chain'] });

      // Load 1 — fresh start: a() navigates.
      const location1 = createLocation();
      const { channel: channel1 } = createChannel({ storage, location: location1, states: ['S0'] });
      await channel1.send({ jsonrpc: '2.0', id: 1, method: 'icrc27_accounts' });
      await tick();
      expect(location1.assign).toHaveBeenCalledOnce();
      expect(assignedFragment(location1).get('state')).toBe('S0');

      // Load 2 — signer returns respA; a() replays, b() navigates.
      const location2 = createLocation(hashFor({ message: JSON.stringify(respA), state: 'S0' }));
      const { channel: channel2 } = createChannel({ storage, location: location2, states: ['S1'] });
      const responses2: JsonRpcResponse[] = [];
      channel2.addEventListener('response', r => responses2.push(r));
      await channel2.send({ jsonrpc: '2.0', id: 10, method: 'icrc27_accounts' }); // #0 cached
      await microtask();
      await channel2.send({ jsonrpc: '2.0', id: 11, method: 'icrc34_delegation' }); // #1 navigate
      await tick();
      expect(responses2).toEqual([{ ...respA, id: 10 }]);
      expect(location2.assign).toHaveBeenCalledOnce();
      const stateB = assignedFragment(location2).get('state');
      expect(stateB).toBe('S1');

      // Load 3 — signer returns respB; both calls replay, flow completes.
      const location3 = createLocation(
        hashFor({ message: JSON.stringify(respB), state: stateB ?? '' }),
      );
      const { channel: channel3 } = createChannel({ storage, location: location3 });
      const responses3: JsonRpcResponse[] = [];
      channel3.addEventListener('response', r => responses3.push(r));
      await channel3.send({ jsonrpc: '2.0', id: 20, method: 'icrc27_accounts' }); // #0 cached
      await microtask();
      await channel3.send({ jsonrpc: '2.0', id: 21, method: 'icrc34_delegation' }); // #1 cached
      await microtask();
      await tick();
      expect(location3.assign).not.toHaveBeenCalled();
      expect(responses3).toEqual([
        { ...respA, id: 20 },
        { ...respB, id: 21 },
      ]);
    });
  });
});
