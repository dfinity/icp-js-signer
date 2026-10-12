import { describe, expect, it, vi } from 'vitest';
import { Signer } from '../signer.js';
import type { JsonRpcRequest, JsonRpcResponse } from '../transport.js';
import { UrlChannel } from './urlChannel.js';
import { UrlTransport, UrlTransportError, type UrlTransportOptions } from './urlTransport.js';

const URL_ = 'https://signer.example.com/icrc-167';
const CALLBACK = 'https://relying.example.com/signer-callback';
// The transport derives its storage key from the callback URL.
const KEY = `icrc167:flow:${CALLBACK}`;
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

const options = (overrides: Partial<UrlTransportOptions> = {}): UrlTransportOptions => ({
  url: URL_,
  callbackUrl: CALLBACK,
  storage: createStorage(),
  location: createLocation() as UrlTransportOptions['location'],
  history: { replaceState: vi.fn() },
  crypto: { randomUUID: () => 'S' } as Pick<Crypto, 'randomUUID'>,
  now: () => NOW,
  flowTimeout: 1_000_000,
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
const journal = (results: Record<number, unknown>) => JSON.stringify({ createdAt: NOW, results });

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

  describe('flow journal', () => {
    it('does not replay a completed leftover journal (a new flow starts fresh)', async () => {
      const storage = createStorage({ [KEY]: journal({ 0: response(1, { accounts: [] }) }) }); // completed, no pending
      const location = createLocation();
      const transport = new UrlTransport(options({ storage, location }));
      const channel = await transport.establishChannel();
      const listener = vi.fn();
      channel.addEventListener('response', listener);

      await channel.send({ jsonrpc: '2.0', id: 9, method: 'icrc27_accounts' });
      await microtask();
      await tick();

      expect(listener).not.toHaveBeenCalled(); // stale result not replayed
      expect(location.assign).toHaveBeenCalledOnce(); // navigated fresh instead
    });

    it('namespaces the journal by callback url', async () => {
      const storage = createStorage();
      const transport = new UrlTransport(options({ storage, callbackUrl: `${CALLBACK}/a` }));

      await transport.memoize(() => 'x');

      expect(storage.getItem(`icrc167:flow:${CALLBACK}/a`)).not.toBeNull();
      expect(storage.getItem(`icrc167:flow:${CALLBACK}/b`)).toBeNull();
    });

    it('does not resume an expired flow, and clears it on construction', () => {
      const storage = createStorage({ [KEY]: journal({ 0: 'x' }) });
      new UrlTransport(options({ storage, now: () => NOW + 999_999, flowTimeout: 1000 }));
      expect(storage.getItem(KEY)).toBeNull();
    });
  });

  describe('memoize', () => {
    it('runs the callback once and journals the result', async () => {
      const storage = createStorage();
      const transport = new UrlTransport(options({ storage }));
      const produce = vi.fn().mockResolvedValue('nonce');

      expect(await transport.memoize(produce)).toBe('nonce');
      expect(produce).toHaveBeenCalledOnce();
      expect(JSON.parse(storage.getItem(KEY) ?? 'null').results).toEqual({ 0: 'nonce' });
    });

    it('replays a journaled result on a return without re-running the callback', async () => {
      const returned = response('d', { ok: true });
      const storage = createStorage({
        [KEY]: JSON.stringify({
          createdAt: NOW,
          results: { 0: 'nonce' },
          pending: { state: 'S', requests: [{ index: 1, id: 'd' }] },
        }),
      });
      const location = createLocation(hashFor({ message: JSON.stringify(returned), state: 'S' }));
      const transport = new UrlTransport(options({ storage, location }));
      const produce = vi.fn();

      expect(await transport.memoize(produce)).toBe('nonce'); // slot 0 kept across the return
      expect(produce).not.toHaveBeenCalled();
    });

    it('shares one call-order counter with channel sends', async () => {
      const storage = createStorage();
      const transport = new UrlTransport(options({ storage }));

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
      expect(await transport1.memoize(fetchNonce)).toBe('nonce-123'); // slot 0 → fetches
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
      expect(await transport2.memoize(fetchNonce)).toBe('nonce-123'); // slot 0 → cached
      expect(fetchNonce).toHaveBeenCalledOnce(); // not re-fetched on replay

      const channel2 = await transport2.establishChannel();
      const got: JsonRpcResponse[] = [];
      channel2.addEventListener('response', r => got.push(r));
      await channel2.send({ jsonrpc: '2.0', id: 10, method: 'icrc_attributes' }); // slot 1 cached
      await channel2.send({ jsonrpc: '2.0', id: 11, method: 'icrc34_delegation' }); // slot 2 cached
      await microtask();
      await tick();

      expect(location2.assign).not.toHaveBeenCalled();
      expect(got).toEqual([
        { ...attributes, id: 10 },
        { ...delegation, id: 11 },
      ]);
    });
  });

  describe('promised requests across a redirect', () => {
    // The shape of a sign-in that asks for attributes: the attributes request
    // depends on a memoized nonce that is slow on the first load and replays
    // at once on the return, while the delegation request is ready at once on
    // both. Sent as promises, each keeps the slot of its call.
    const run = (transport: UrlTransport, nonceDelay: Promise<void>) => {
      const signer = new Signer({ transport, autoCloseTransportChannel: false });
      const nonce = transport.memoize(async () => {
        await nonceDelay;
        return 'nonce-123';
      });
      const attributes = signer.sendRequest(
        nonce.then((value): JsonRpcRequest => ({
          jsonrpc: '2.0',
          id: 'a',
          method: 'icrc_attributes',
          params: { nonce: value },
        })),
      );
      const delegation = signer.sendRequest({
        jsonrpc: '2.0',
        id: 'd',
        method: 'icrc34_delegation',
      });
      return Promise.all([attributes, delegation]);
    };

    it('replays into the slots they were called in when their inputs arrive in another order', async () => {
      const storage = createStorage();

      const location1 = createLocation();
      const transport1 = new UrlTransport(options({ storage, location: location1 }));
      let releaseNonce!: () => void;
      void run(
        transport1,
        new Promise(resolve => {
          releaseNonce = resolve;
        }),
      );
      await tick();
      await tick();
      // The delegation is ready, but the redirect waits for the attributes.
      expect(location1.assign).not.toHaveBeenCalled();
      releaseNonce();
      await tick();
      await tick();
      expect(location1.assign).toHaveBeenCalledOnce();

      // Slot 0 is the nonce; the requests hold the slots of their calls.
      const { requestKeys } = JSON.parse(storage.getItem(KEY) ?? '{}') as {
        requestKeys: Record<number, string>;
      };
      expect(
        Object.entries(requestKeys).map(([slot, key]) => [slot, JSON.parse(key).method]),
      ).toEqual([
        ['1', 'icrc_attributes'],
        ['2', 'icrc34_delegation'],
      ]);

      const location2 = createLocation(
        hashFor({
          message: JSON.stringify([
            response('d', { signerDelegation: ['chain'] }),
            response('a', { attributes: ['verified'] }),
          ]),
          state: 'S',
        }),
      );
      const transport2 = new UrlTransport(options({ storage, location: location2 }));
      const [attributes, delegation] = await run(transport2, Promise.resolve());

      expect(location2.assign).not.toHaveBeenCalled();
      expect(attributes).toEqual(response('a', { attributes: ['verified'] }));
      expect(delegation).toEqual(response('d', { signerDelegation: ['chain'] }));
    });
  });
});
