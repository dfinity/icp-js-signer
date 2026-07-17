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
  it('buffers a fresh call and navigates on flush', async () => {
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

  it('replays a completed call from the journal, re-stamping the id', async () => {
    const cached = response('originally-different-id', { accounts: [] });
    const storage = createStorage({ [KEY]: JSON.stringify({ results: { 0: cached } }) });
    const { channel, location } = createChannel({ storage });
    const listener = vi.fn();
    channel.addEventListener('response', listener);

    await channel.send({ jsonrpc: '2.0', id: 7, method: 'icrc27_accounts' });
    await microtask();
    await tick();

    expect(location.assign).not.toHaveBeenCalled();
    expect(listener).toHaveBeenCalledWith({ ...cached, id: 7 });
  });

  it('rejects send when the channel is closed', async () => {
    const { channel } = createChannel();
    await channel.close();
    await expect(channel.send({ jsonrpc: '2.0', id: 1, method: 'x' })).rejects.toThrow();
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
