import { beforeEach, describe, expect, it, vi } from 'vitest';
import { chrome } from 'vitest-chrome/lib/index.esm.js';
import SenderData from '../scripts/data.js';

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
  describe('addresses getter — empty storage', () => {
    it('returns an empty array', async () => {
      makeChromeMock();
      const instance = new SenderData();
      expect(await instance.addresses).toEqual([]);
    });

    it('is iterable with forEach', async () => {
      makeChromeMock();
      const instance = new SenderData();
      const visited = [];
      (await instance.addresses).forEach((e) => visited.push(e));
      expect(visited).toEqual([]);
    });
  });

  describe('addresses getter — pre-populated storage', () => {
    let instance;

    beforeEach(() => {
      makeChromeMock({
        addresses: [
          { sender: '', address: ['a@example.com'] },
          { sender: '', address: ['b@example.com'] },
        ],
      });
      instance = new SenderData();
    });

    it('reads pre-populated storage', async () => {
      expect(await instance.addresses).toEqual([
        { sender: '', address: ['a@example.com'] },
        { sender: '', address: ['b@example.com'] },
      ]);
    });

    it('is iterable with for...of', async () => {
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

    beforeEach(() => {
      chrome = makeChromeMock({ addresses: [{ sender: '', address: ['a@example.com'] }] });
      instance = new SenderData();
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
      chrome = makeChromeMock({ addresses: [{ sender: '', address: ['a@example.com'] }] });
      instance = new SenderData();

      await instance.add({ address: ['a@example.com'] });
      expect(await instance.addresses).toEqual([{ sender: '', address: ['a@example.com'] }]);
      expect(chrome.storage.sync._store.addresses).toEqual([{ sender: '', address: ['a@example.com'] }]);
    });
  });

  describe('hasAddress()', () => {
    let instance;

    beforeEach(() => {
      makeChromeMock({
        addresses: [
          { sender: '', address: ['a@example.com'] },
          { sender: '', address: ['b@example.com'] },
        ],
      });
      instance = new SenderData();
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

    beforeEach(() => {
      chrome = makeChromeMock({
        addresses: [
          { sender: '', address: ['a@example.com'] },
          { sender: '', address: ['b@example.com'] },
          { sender: '', address: ['c@example.com'] },
        ],
      });
      instance = new SenderData();
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
    it('returns a copy — mutating it does not affect storage', async () => {
      makeChromeMock({ addresses: [{ sender: '', address: ['a@example.com'] }] });
      const instance = new SenderData();

      const copy = await instance.addresses;
      copy.push({ sender: 'Injected', address: ['injected@example.com'] });

      expect(await instance.addresses).toEqual([{ sender: '', address: ['a@example.com'] }]);
    });
  });
});
