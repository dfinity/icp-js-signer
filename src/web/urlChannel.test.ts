import { describe, expect, it, vi } from 'vitest';
import type { JsonRpcResponse } from '../transport.js';
import { UrlChannel } from './urlChannel.js';
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

const createChannel = (
  overrides: { storage?: Storage; location?: MockLocation; states?: string[] } = {},
) => {
  const storage = overrides.storage ?? createStorage();
  const location = overrides.location ?? createLocation();
  const states = overrides.states ?? ['S0', 'S1'];
  let stateIndex = 0;
  const crypto = { randomUUID: () => states[stateIndex++] ?? 'S' } as Pick<Crypto, 'randomUUID'>;
  const flow = new UrlFlow({
    url: URL_,
    callbackUrl: CALLBACK,
    storage,
    storageKey: KEY,
    flowTimeout: 1_000_000,
    location: location as UrlFlowOptions['location'],
    history: { replaceState: vi.fn() },
    crypto,
    now: () => 1000,
  });
  return { channel: new UrlChannel(flow), flow, storage, location };
};

const microtask = () => new Promise<void>(resolve => queueMicrotask(resolve));
const tick = () => new Promise<void>(resolve => setTimeout(resolve, 0));

const response = (id: string | number, result: unknown): JsonRpcResponse => ({
  jsonrpc: '2.0',
  id,
  result,
});

const assignedFragment = (location: MockLocation) =>
  new URLSearchParams(new URL(location.assign.mock.calls[0][0]).hash.slice(1));

describe('UrlChannel', () => {
  it('buffers a fresh call and navigates on the next macrotask', async () => {
    const { channel, location } = createChannel({ states: ['S'] });
    const request = { jsonrpc: '2.0' as const, id: 1, method: 'icrc27_accounts' };

    await channel.send(request);
    expect(location.assign).not.toHaveBeenCalled(); // deferred
    await tick();

    expect(location.assign).toHaveBeenCalledOnce();
    expect(JSON.parse(assignedFragment(location).get('message') ?? '')).toEqual(request);
  });

  it('coalesces concurrently issued calls into one navigation', async () => {
    const { channel, location } = createChannel({ states: ['S'] });
    const a = { jsonrpc: '2.0' as const, id: 1, method: 'icrc34_delegation' };
    const b = { jsonrpc: '2.0' as const, id: 2, method: 'icrc27_accounts' };

    await channel.send(a);
    await channel.send(b);
    await tick();

    expect(location.assign).toHaveBeenCalledOnce();
    expect(JSON.parse(assignedFragment(location).get('message') ?? '')).toEqual([a, b]);
  });

  it('replays a call from the journal on a return, re-stamping the id', async () => {
    // A return load: the response for the pending request is in the URL.
    const returned = response('req', { accounts: [] });
    const storage = createStorage({
      [KEY]: JSON.stringify({
        createdAt: 1000,
        results: {},
        // The fingerprint the first load recorded at slot 0.
        requestKeys: { 0: JSON.stringify({ method: 'icrc27_accounts', params: null }) },
        pending: { state: 'S', requests: [{ index: 0, id: 'req' }] },
      }),
    });
    const location = createLocation(
      `#${new URLSearchParams({ message: JSON.stringify(returned), state: 'S' }).toString()}`,
    );
    const { channel } = createChannel({ storage, location });
    const listener = vi.fn();
    channel.addEventListener('response', listener);

    await channel.send({ jsonrpc: '2.0', id: 7, method: 'icrc27_accounts' });
    await microtask();

    expect(location.assign).not.toHaveBeenCalled();
    expect(listener).toHaveBeenCalledWith({ ...returned, id: 7 }); // re-stamped with this call's id
  });

  it('gives two identical no-nonce calls their own responses by call order', async () => {
    const key = JSON.stringify({ method: 'icrc27_accounts', params: null });
    const r1 = response(1, { accounts: ['a'] });
    const r2 = response(2, { accounts: ['b'] });
    const storage = createStorage({
      [KEY]: JSON.stringify({
        createdAt: 1000,
        results: {},
        requestKeys: { 0: key, 1: key },
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
      `#${new URLSearchParams({ message: JSON.stringify([r1, r2]), state: 'S' }).toString()}`,
    );
    const { channel } = createChannel({ storage, location });
    const seen: JsonRpcResponse[] = [];
    channel.addEventListener('response', r => seen.push(r));

    await channel.send({ jsonrpc: '2.0', id: 1, method: 'icrc27_accounts' });
    await channel.send({ jsonrpc: '2.0', id: 2, method: 'icrc27_accounts' });
    await microtask();

    expect(seen).toEqual([r1, r2]);
  });

  it('rejects a replay whose request diverges from the one journaled at its slot', async () => {
    const returned = response('req', { accounts: [] });
    const storage = createStorage({
      [KEY]: JSON.stringify({
        createdAt: 1000,
        results: {},
        requestKeys: { 0: JSON.stringify({ method: 'icrc27_accounts', params: null }) },
        pending: { state: 'S', requests: [{ index: 0, id: 'req' }] },
      }),
    });
    const location = createLocation(
      `#${new URLSearchParams({ message: JSON.stringify(returned), state: 'S' }).toString()}`,
    );
    const { channel } = createChannel({ storage, location });

    await expect(
      channel.send({ jsonrpc: '2.0', id: 9, method: 'icrc34_delegation' }),
    ).rejects.toThrow(/diverged/);
  });

  it('starts fresh on a bare load, not replaying a leftover journal', async () => {
    const stale = response('old', { accounts: [] });
    const storage = createStorage({
      [KEY]: JSON.stringify({ createdAt: 1000, results: { 0: stale } }), // completed, no message
    });
    const { channel, location } = createChannel({ storage, states: ['S'] });
    const listener = vi.fn();
    channel.addEventListener('response', listener);

    await channel.send({ jsonrpc: '2.0', id: 7, method: 'icrc27_accounts' });
    await microtask();
    await tick();

    expect(listener).not.toHaveBeenCalled(); // did not replay the stale result
    expect(location.assign).toHaveBeenCalledOnce(); // navigated fresh instead
  });

  it('rejects send when the channel is closed', async () => {
    const { channel } = createChannel();
    await channel.close();
    await expect(channel.send({ jsonrpc: '2.0', id: 1, method: 'x' })).rejects.toThrow();
  });

  it('rejects a request without an id (notifications would redirect-loop)', async () => {
    const { channel, location } = createChannel();
    await expect(channel.send({ jsonrpc: '2.0', method: 'x' })).rejects.toThrow();
    await tick();
    expect(location.assign).not.toHaveBeenCalled(); // never navigates for an unanswerable request
  });

  it('notifies close listeners', async () => {
    const { channel } = createChannel();
    const listener = vi.fn();
    channel.addEventListener('close', listener);
    await channel.close();
    expect(listener).toHaveBeenCalledOnce();
    expect(channel.closed).toBe(true);
  });
});
