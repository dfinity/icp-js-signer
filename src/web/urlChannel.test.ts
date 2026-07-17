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

const flush = () => new Promise<void>(resolve => queueMicrotask(resolve));

const hashFor = (params: Record<string, string>) => `#${new URLSearchParams(params).toString()}`;

const response = (id: string | number, result: unknown): JsonRpcResponse => ({
  jsonrpc: '2.0',
  id,
  result,
});

// Reads a fragment parameter from the URL passed to the last `location.assign`.
const assignedParam = (location: MockLocation, name: string): string => {
  const [url] = location.assign.mock.calls[location.assign.mock.calls.length - 1];
  const value = new URLSearchParams(new URL(url).hash.slice(1)).get(name);
  if (value === null) {
    throw new Error(`assigned url has no "${name}" fragment param`);
  }
  return value;
};

const readStored = (
  storage: Storage,
): { results: Record<number, JsonRpcResponse>; pending?: unknown } => {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) {
    throw new Error('no flow stored');
  }
  return JSON.parse(raw);
};

describe('UrlChannel', () => {
  describe('send', () => {
    it('navigates to the signer with request, callback and state in the fragment', async () => {
      const { channel, location, storage } = createChannel();
      const request = { jsonrpc: '2.0' as const, id: 1, method: 'icrc27_accounts' };

      await channel.send(request);

      expect(location.assign).toHaveBeenCalledOnce();
      const [assigned] = location.assign.mock.calls[0];
      const url = new URL(assigned);
      expect(`${url.origin}${url.pathname}`).toBe(URL_);
      const params = new URLSearchParams(url.hash.slice(1));
      expect(JSON.parse(assignedParam(location, 'message'))).toEqual(request);
      expect(params.get('callback')).toBe(CALLBACK);
      expect(params.get('state')).toBe('state-0');

      expect(readStored(storage).pending).toEqual({ index: 0, state: 'state-0' });
    });

    it('replays a completed call from storage without navigating', async () => {
      const cached = response('originally-different-id', { accounts: [] });
      const storage = createStorage({ [STORAGE_KEY]: JSON.stringify({ results: { 0: cached } }) });
      const { channel, location } = createChannel({ storage });
      const listener = vi.fn();
      channel.addEventListener('response', listener);

      await channel.send({ jsonrpc: '2.0', id: 7, method: 'icrc27_accounts' });
      await flush();

      expect(location.assign).not.toHaveBeenCalled();
      // Response is re-stamped with the id used for THIS call.
      expect(listener).toHaveBeenCalledWith({ ...cached, id: 7 });
    });

    it('rejects when the channel is closed', async () => {
      const { channel } = createChannel();
      await channel.close();
      await expect(channel.send({ jsonrpc: '2.0', id: 1, method: 'x' })).rejects.toThrow();
    });

    it('does not navigate twice within one load', async () => {
      const { channel, location } = createChannel();
      await channel.send({ jsonrpc: '2.0', id: 1, method: 'a' });
      await channel.send({ jsonrpc: '2.0', id: 2, method: 'b' });
      expect(location.assign).toHaveBeenCalledOnce();
    });
  });

  describe('return absorption', () => {
    it('folds a matching signer return into results and strips the fragment', async () => {
      const resp = response('req-id', { accounts: ['a'] });
      const storage = createStorage({
        [STORAGE_KEY]: JSON.stringify({ results: {}, pending: { index: 0, state: 'state-0' } }),
      });
      const location = createLocation(hashFor({ message: JSON.stringify(resp), state: 'state-0' }));
      const { channel, history } = createChannel({ storage, location });

      expect(history.replaceState).toHaveBeenCalledWith(null, '', '/signer-callback');
      const stored = readStored(storage);
      expect(stored).toEqual({ results: { 0: resp } });
      expect(stored.pending).toBeUndefined();

      // The absorbed result now replays for call index 0.
      const listener = vi.fn();
      channel.addEventListener('response', listener);
      await channel.send({ jsonrpc: '2.0', id: 42, method: 'icrc27_accounts' });
      await flush();
      expect(listener).toHaveBeenCalledWith({ ...resp, id: 42 });
    });

    it('ignores a return whose state does not match the pending state', () => {
      const resp = response('req-id', { accounts: [] });
      const seeded = JSON.stringify({ results: {}, pending: { index: 0, state: 'state-0' } });
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
      const respA = response('a', { accounts: ['acc'] });
      const respB = response('b', { signerDelegation: ['chain'] });

      // Load 1 — fresh start: a() navigates.
      const location1 = createLocation();
      const { channel: channel1 } = createChannel({ storage, location: location1, states: ['S0'] });
      await channel1.send({ jsonrpc: '2.0', id: 1, method: 'icrc27_accounts' });
      expect(location1.assign).toHaveBeenCalledOnce();
      expect(assignedParam(location1, 'state')).toBe('S0');

      // Load 2 — signer returns respA; a() replays, b() navigates.
      const location2 = createLocation(hashFor({ message: JSON.stringify(respA), state: 'S0' }));
      const { channel: channel2 } = createChannel({ storage, location: location2, states: ['S1'] });
      const responses2: JsonRpcResponse[] = [];
      channel2.addEventListener('response', r => responses2.push(r));
      await channel2.send({ jsonrpc: '2.0', id: 10, method: 'icrc27_accounts' }); // #0 cached
      await flush();
      await channel2.send({ jsonrpc: '2.0', id: 11, method: 'icrc34_delegation' }); // #1 navigate
      await flush();
      expect(responses2).toEqual([{ ...respA, id: 10 }]);
      expect(location2.assign).toHaveBeenCalledOnce();
      const stateB = assignedParam(location2, 'state');
      expect(stateB).toBe('S1');

      // Load 3 — signer returns respB; both calls replay, flow completes.
      const location3 = createLocation(hashFor({ message: JSON.stringify(respB), state: stateB }));
      const { channel: channel3 } = createChannel({ storage, location: location3 });
      const responses3: JsonRpcResponse[] = [];
      channel3.addEventListener('response', r => responses3.push(r));
      await channel3.send({ jsonrpc: '2.0', id: 20, method: 'icrc27_accounts' }); // #0 cached
      await flush();
      await channel3.send({ jsonrpc: '2.0', id: 21, method: 'icrc34_delegation' }); // #1 cached
      await flush();
      expect(location3.assign).not.toHaveBeenCalled();
      expect(responses3).toEqual([
        { ...respA, id: 20 },
        { ...respB, id: 21 },
      ]);
    });
  });
});
