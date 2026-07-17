import { describe, expect, it, vi } from 'vitest';
import { UrlChannel } from './urlChannel.js';
import { UrlTransport, UrlTransportError } from './urlTransport.js';

const CALLBACK = 'https://relying.example.com/signer-callback';

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

const baseOptions = () => ({
  url: 'https://signer.example.com/icrc-167',
  callbackUrl: CALLBACK,
  storage: createStorage(),
  location: { assign: vi.fn(), hash: '', pathname: '/', search: '' },
  history: { replaceState: vi.fn() },
  crypto: { randomUUID: () => 'state-0' } as Pick<Crypto, 'randomUUID'>,
});

describe('UrlTransport', () => {
  describe('constructor', () => {
    it('accepts https, localhost and 127.0.0.1 signer urls', () => {
      for (const url of [
        'https://signer.example.com/icrc-167',
        'https://app.localhost/icrc-167',
        'http://127.0.0.1:8080/icrc-167',
      ]) {
        expect(() => new UrlTransport({ ...baseOptions(), url })).not.toThrow();
      }
    });

    it('rejects insecure signer urls', () => {
      expect(
        () => new UrlTransport({ ...baseOptions(), url: 'http://signer.example.com/icrc-167' }),
      ).toThrow(UrlTransportError);
    });

    it('rejects a callback url containing a fragment', () => {
      expect(() => new UrlTransport({ ...baseOptions(), callbackUrl: `${CALLBACK}#x` })).toThrow(
        UrlTransportError,
      );
    });

    it('rejects an invalid callback url', () => {
      expect(() => new UrlTransport({ ...baseOptions(), callbackUrl: 'not a url' })).toThrow(
        UrlTransportError,
      );
    });
  });

  describe('establishChannel', () => {
    it('returns a UrlChannel', async () => {
      const transport = new UrlTransport(baseOptions());
      expect(await transport.establishChannel()).toBeInstanceOf(UrlChannel);
    });
  });

  describe('flow lifecycle', () => {
    it('reports and clears pending flow state', () => {
      const storage = createStorage({ 'icrc167:flow': JSON.stringify({ results: {} }) });
      const transport = new UrlTransport({ ...baseOptions(), storage });

      expect(transport.hasPendingFlow()).toBe(true);
      transport.clearFlow();
      expect(transport.hasPendingFlow()).toBe(false);
    });
  });
});
