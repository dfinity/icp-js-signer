import { describe, expect, it, vi } from 'vitest';
import type { JsonRpcResponse } from '../transport.js';
import { UrlChannel } from './urlChannel.js';
import { UrlTransport, UrlTransportError, type UrlTransportOptions } from './urlTransport.js';

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

const options = (overrides: Partial<UrlTransportOptions> = {}): UrlTransportOptions => ({
  url: URL_,
  callbackUrl: CALLBACK,
  storage: createStorage(),
  location: createLocation() as UrlTransportOptions['location'],
  history: { replaceState: vi.fn() },
  crypto: { randomUUID: () => 'S' } as Pick<Crypto, 'randomUUID'>,
  ...overrides,
});

const microtask = () => new Promise<void>(resolve => queueMicrotask(resolve));
const tick = () => new Promise<void>(resolve => setTimeout(resolve, 0));

const response = (id: string | number, result: unknown): JsonRpcResponse => ({
  jsonrpc: '2.0',
  id,
  result,
});

const hashFor = (params: Record<string, string>) => `#${new URLSearchParams(params).toString()}`;

describe('UrlTransport', () => {
  describe('constructor', () => {
    it('accepts https, localhost and 127.0.0.1 signer urls', () => {
      for (const url of [
        'https://signer.example.com/icrc-167',
        'https://app.localhost/icrc-167',
        'http://127.0.0.1:8080/icrc-167',
      ]) {
        expect(() => new UrlTransport(options({ url }))).not.toThrow();
      }
    });

    it('rejects insecure signer urls', () => {
      expect(
        () => new UrlTransport(options({ url: 'http://signer.example.com/icrc-167' })),
      ).toThrow(UrlTransportError);
    });

    it('rejects a callback url containing a fragment', () => {
      expect(() => new UrlTransport(options({ callbackUrl: `${CALLBACK}#x` }))).toThrow(
        UrlTransportError,
      );
    });

    it('rejects an invalid callback url', () => {
      expect(() => new UrlTransport(options({ callbackUrl: 'not a url' }))).toThrow(
        UrlTransportError,
      );
    });
  });

  describe('establishChannel', () => {
    it('returns a UrlChannel', async () => {
      const transport = new UrlTransport(options());
      expect(await transport.establishChannel()).toBeInstanceOf(UrlChannel);
    });
  });

  describe('flow lifecycle', () => {
    it('reports and clears pending flow state', () => {
      const storage = createStorage({ [KEY]: JSON.stringify({ results: {} }) });
      const transport = new UrlTransport(options({ storage }));

      expect(transport.hasPendingFlow()).toBe(true);
      transport.clearFlow();
      expect(transport.hasPendingFlow()).toBe(false);
    });
  });

  describe('memoize', () => {
    it('runs the callback once and journals the result', async () => {
      const storage = createStorage();
      const transport = new UrlTransport(options({ storage }));
      const produce = vi.fn().mockResolvedValue('nonce');

      expect(await transport.memoize(produce)).toBe('nonce');
      expect(produce).toHaveBeenCalledOnce();
      expect(JSON.parse(storage.getItem(KEY) ?? 'null')).toEqual({ results: { 0: 'nonce' } });
    });

    it('replays a journaled result without re-running the callback', async () => {
      const storage = createStorage({ [KEY]: JSON.stringify({ results: { 0: 'nonce' } }) });
      const transport = new UrlTransport(options({ storage }));
      const produce = vi.fn();

      expect(await transport.memoize(produce)).toBe('nonce');
      expect(produce).not.toHaveBeenCalled();
    });

    it('shares one call-order counter with channel sends', async () => {
      const storage = createStorage();
      const location = createLocation();
      const transport = new UrlTransport(options({ storage, location }));

      await transport.memoize(() => 'nonce'); // slot 0
      const channel = await transport.establishChannel();
      await channel.send({ jsonrpc: '2.0', id: 5, method: 'm' }); // slot 1
      await tick();

      const stored = JSON.parse(storage.getItem(KEY) ?? 'null');
      expect(stored.results).toEqual({ 0: 'nonce' });
      expect(stored.pending.requests).toEqual([{ index: 1, id: 5 }]);
    });
  });

  describe('memoized pre-step across a redirect', () => {
    it('fetches the nonce once and replays it with the batched responses', async () => {
      const storage = createStorage();
      const fetchNonce = vi.fn().mockResolvedValue('nonce-123');
      const attributes = response(1, { attributes: ['verified'] });
      const delegation = response(2, { signerDelegation: ['chain'] });

      // Load 1: memoize the nonce, then issue two requests concurrently.
      const location1 = createLocation();
      const transport1 = new UrlTransport(options({ storage, location: location1 }));
      const nonce1 = await transport1.memoize(fetchNonce); // slot 0 → fetches
      expect(nonce1).toBe('nonce-123');
      const channel1 = await transport1.establishChannel();
      await channel1.send({ jsonrpc: '2.0', id: 1, method: 'icrc_attributes' }); // slot 1
      await channel1.send({ jsonrpc: '2.0', id: 2, method: 'icrc34_delegation' }); // slot 2
      await tick();
      expect(location1.assign).toHaveBeenCalledOnce();

      // Load 2: signer returns the batch; nonce replays, responses replay.
      const location2 = createLocation(
        hashFor({ message: JSON.stringify([attributes, delegation]), state: 'S' }),
      );
      const transport2 = new UrlTransport(options({ storage, location: location2 }));
      const nonce2 = await transport2.memoize(fetchNonce); // slot 0 → cached
      expect(nonce2).toBe('nonce-123');
      expect(fetchNonce).toHaveBeenCalledOnce(); // not re-fetched on replay

      const channel2 = await transport2.establishChannel();
      const got: JsonRpcResponse[] = [];
      channel2.addEventListener('response', r => got.push(r));
      await channel2.send({ jsonrpc: '2.0', id: 10, method: 'icrc_attributes' }); // slot 1 cached
      await channel2.send({ jsonrpc: '2.0', id: 11, method: 'icrc34_delegation' }); // slot 2 cached
      await microtask();

      expect(location2.assign).not.toHaveBeenCalled();
      expect(got).toEqual([
        { ...attributes, id: 10 },
        { ...delegation, id: 11 },
      ]);
    });
  });
});
