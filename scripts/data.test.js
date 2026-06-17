import { beforeEach, describe, expect, it, vi } from 'vitest';
import { chrome } from 'vitest-chrome/lib/index.esm.js';
import SenderData from './data.js';

function makeChromeMock(initialData = {}) {
  const store = { ...initialData };

  chrome.storage = {
    sync: {
      get: vi.fn(async (keys) => {
        const result = {};
        for (const key of keys) {
          if (Object.prototype.hasOwnProperty.call(store, key)) {
            result[key] = store[key];
          }
        }
        return result;
      }),
      set: vi.fn(async (data) => {
        Object.assign(store, data);
      }),
      _store: store,
    },
  };

  globalThis.chrome = chrome;
  return chrome;
}

// Use the real SenderData from scripts/data.js

describe('SenderData', () => {
  describe('constructor — empty storage', () => {
    let chrome;
    let instance;

    beforeEach(async () => {
      chrome = makeChromeMock();
      instance = new SenderData();
      await instance.ready;
    });

    it('creates the addresses key in storage', () => {
      expect(chrome.storage.sync._store.addresses).toEqual([]);
    });

    it('creates the lastRun key in storage', () => {
      expect(chrome.storage.sync._store.lastRun).toBe(null);
    });

    it('exposes an empty addresses array', async () => {
      expect(await instance.addresses).toEqual([]);
    });

    it('addresses is iterable with forEach', async () => {
      const visited = [];
      (await instance.addresses).forEach((e) => visited.push(e));
      expect(visited).toEqual([]);
    });
  });

  describe('constructor — pre-populated storage', () => {
    let instance;

    beforeEach(async () => {
      const chrome = makeChromeMock({
        addresses: [
          { sender: '', address: ['a@example.com'] },
          { sender: '', address: ['b@example.com'] },
        ],
        lastRun: '2026-01-01T00:00:00Z',
      });
      instance = new SenderData();
      await instance.ready;
    });

    it('loads pre-populated storage into addresses', async () => {
      expect(await instance.addresses).toEqual([
        { sender: '', address: ['a@example.com'] },
        { sender: '', address: ['b@example.com'] },
      ]);
    });

    it('exposes lastRun from storage', () => {
      expect(instance.lastRun).toBe('2026-01-01T00:00:00Z');
    });

    it('addresses is iterable with for...of', async () => {
      const visited = [];
      for (const e of await instance.addresses) visited.push(e);
      expect(visited).toEqual([
        { sender: '', address: ['a@example.com'] },
        { sender: '', address: ['b@example.com'] },
      ]);
    });
  });

  describe('add()', () => {
    let chrome;
    let instance;

    beforeEach(async () => {
      chrome = makeChromeMock({ addresses: [{ sender: '', address: ['a@example.com'] }], lastRun: null });
      instance = new SenderData();
      await instance.ready;
    });

    it('appends a new address to the array', async () => {
      await instance.add({ sender: 'Bob', address: ['b@example.com'] });
      expect(await instance.addresses).toEqual([
        { sender: '', address: ['a@example.com'] },
        { sender: 'Bob', address: ['b@example.com'] },
      ]);
    });

    it('persists the updated list to storage', async () => {
      await instance.add({ sender: 'Bob', address: ['b@example.com'] });
      expect(chrome.storage.sync._store.addresses).toEqual([
        { sender: '', address: ['a@example.com'] },
        { sender: 'Bob', address: ['b@example.com'] },
      ]);
    });

    it('ignores duplicate addresses', async () => {
      chrome = makeChromeMock({ addresses: [{ sender: '', address: ['a@example.com'] }], lastRun: null });
      instance = new SenderData();
      await instance.ready;

      await instance.add({ address: ['a@example.com'] });
      expect(await instance.addresses).toEqual([{ sender: '', address: ['a@example.com'] }]);
      expect(chrome.storage.sync._store.addresses).toEqual([{ sender: '', address: ['a@example.com'] }]);
    });
  });

  describe('hasAddress()', () => {
    let chrome;
    let instance;

    beforeEach(async () => {
      chrome = makeChromeMock({
        addresses: [
          { sender: '', address: ['a@example.com'] },
          { sender: '', address: ['b@example.com'] },
        ],
      });
      instance = new SenderData();
      await instance.ready;
    });

    it('returns true for an existing address', async () => {
      expect(await instance.hasAddress({ address: ['a@example.com'] })).toBe(true);
      expect(await instance.hasAddress({ address: ['a@example.com'] })).toBe(true);
    });

    it('returns false for a non-existing address', async () => {
      expect(await instance.hasAddress({ address: ['c@example.com'] })).toBe(false);
    });
  });

  describe('remove()', () => {
    let chrome;
    let instance;

    beforeEach(async () => {
      chrome = makeChromeMock({
        addresses: [
          { sender: '', address: ['a@example.com'] },
          { sender: '', address: ['b@example.com'] },
          { sender: '', address: ['c@example.com'] },
        ],
        lastRun: null,
      });
      instance = new SenderData();
      await instance.ready;
    });

    it('removes the specified address from the array', async () => {
      await instance.remove({ address: ['b@example.com'] });
      expect(await instance.addresses).toEqual([
        { sender: '', address: ['a@example.com'] },
        { sender: '', address: ['c@example.com'] },
      ]);
    });

    it('persists the updated list to storage', async () => {
      await instance.remove({ address: ['b@example.com'] });
      expect(chrome.storage.sync._store.addresses).toEqual([
        { sender: '', address: ['a@example.com'] },
        { sender: '', address: ['c@example.com'] },
      ]);
    });

    it('is a no-op for an address not in the list', async () => {
      await instance.remove({ address: ['z@example.com'] });
      expect(await instance.addresses).toEqual([
        { sender: '', address: ['a@example.com'] },
        { sender: '', address: ['b@example.com'] },
        { sender: '', address: ['c@example.com'] },
      ]);
    });
  });

  describe('addresses getter', () => {
    it('returns a copy — mutating it does not affect internal state', async () => {
      const chrome = makeChromeMock({ addresses: [{ sender: '', address: ['a@example.com'] }], lastRun: null });
      const instance = new SenderData();
      await instance.ready;

      const copy = await instance.addresses;
      copy.push({ sender: 'Injected', address: ['injected@example.com'] });

      expect(await instance.addresses).toEqual([{ sender: '', address: ['a@example.com'] }]);
    });
  });
});
