import { beforeEach, describe, expect, it, vi } from 'vitest';
import { chrome } from 'vitest-chrome/lib/index.esm.js';
import EmailData from './data.js';

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

// Use the real EmailData from scripts/data.js

describe('EmailData', () => {
  describe('constructor — empty storage', () => {
    let chrome;
    let instance;

    beforeEach(async () => {
      chrome = makeChromeMock();
      instance = new EmailData();
      await instance.ready;
    });

    it('creates the emails key in storage', () => {
      expect(chrome.storage.sync._store.emails).toEqual([]);
    });

    it('creates the lastRun key in storage', () => {
      expect(chrome.storage.sync._store.lastRun).toBe(null);
    });

    it('exposes an empty emails array', () => {
      expect(instance.emails).toEqual([]);
    });

    it('emails is iterable with forEach', () => {
      const visited = [];
      instance.emails.forEach((e) => visited.push(e));
      expect(visited).toEqual([]);
    });
  });

  describe('constructor — pre-populated storage', () => {
    let instance;

    beforeEach(async () => {
      const chrome = makeChromeMock({
        emails: [
          { name: '', email: ['a@example.com'] },
          { name: '', email: ['b@example.com'] },
        ],
        lastRun: '2026-01-01T00:00:00Z',
      });
      instance = new EmailData();
      await instance.ready;
    });

    it('splits the stored CSV into an array', () => {
      expect(instance.emails).toEqual([
        { name: '', email: ['a@example.com'] },
        { name: '', email: ['b@example.com'] },
      ]);
    });

    it('exposes lastRun from storage', () => {
      expect(instance.lastRun).toBe('2026-01-01T00:00:00Z');
    });

    it('emails is iterable with for...of', () => {
      const visited = [];
      for (const e of instance.emails) visited.push(e);
      expect(visited).toEqual([
        { name: '', email: ['a@example.com'] },
        { name: '', email: ['b@example.com'] },
      ]);
    });
  });

  describe('add()', () => {
    let chrome;
    let instance;

    beforeEach(async () => {
      chrome = makeChromeMock({ emails: [{ name: '', email: ['a@example.com'] }], lastRun: null });
      instance = new EmailData();
      await instance.ready;
    });

    it('appends a new address to the array', async () => {
      await instance.add({ name: 'Bob', email: ['b@example.com'] });
      expect(instance.emails).toEqual([
        { name: '', email: ['a@example.com'] },
        { name: 'Bob', email: ['b@example.com'] },
      ]);
    });

    it('persists the updated list to storage', async () => {
      await instance.add({ name: 'Bob', email: ['b@example.com'] });
      expect(chrome.storage.sync._store.emails).toEqual([
        { name: '', email: ['a@example.com'] },
        { name: 'Bob', email: ['b@example.com'] },
      ]);
    });

    it('ignores duplicate addresses', async () => {
      chrome = makeChromeMock({ emails: [{ name: '', email: ['a@example.com'] }], lastRun: null });
      instance = new EmailData();
      await instance.ready;

      await instance.add({ email: ['a@example.com'] });
      expect(instance.emails).toEqual([{ name: '', email: ['a@example.com'] }]);
      expect(chrome.storage.sync._store.emails).toEqual([{ name: '', email: ['a@example.com'] }]);
    });
  });

  describe('hasEmail()', () => {
    let chrome;
    let instance;

    beforeEach(async () => {
      chrome = makeChromeMock({
        emails: [
          { name: '', email: ['a@example.com'] },
          { name: '', email: ['b@example.com'] },
        ],
      });
      instance = new EmailData();
      await instance.ready;
    });

    it('returns true for an existing email', async () => {
      expect(await instance.hasEmail({ email: ['a@example.com'] })).toBe(true);
      expect(await instance.hasEmail({ email: ['a@example.com'] })).toBe(true);
    });

    it('returns false for a non-existing email', async () => {
      expect(await instance.hasEmail({ email: ['c@example.com'] })).toBe(false);
    });
  });

  describe('remove()', () => {
    let chrome;
    let instance;

    beforeEach(async () => {
      chrome = makeChromeMock({
        emails: [
          { name: '', email: ['a@example.com'] },
          { name: '', email: ['b@example.com'] },
          { name: '', email: ['c@example.com'] },
        ],
        lastRun: null,
      });
      instance = new EmailData();
      await instance.ready;
    });

    it('removes the specified address from the array', async () => {
      await instance.remove({ email: ['b@example.com'] });
      expect(instance.emails).toEqual([
        { name: '', email: ['a@example.com'] },
        { name: '', email: ['c@example.com'] },
      ]);
    });

    it('persists the updated list to storage', async () => {
      await instance.remove({ email: ['b@example.com'] });
      expect(chrome.storage.sync._store.emails).toEqual([
        { name: '', email: ['a@example.com'] },
        { name: '', email: ['c@example.com'] },
      ]);
    });

    it('is a no-op for an address not in the list', async () => {
      await instance.remove({ email: ['z@example.com'] });
      expect(instance.emails).toEqual([
        { name: '', email: ['a@example.com'] },
        { name: '', email: ['b@example.com'] },
        { name: '', email: ['c@example.com'] },
      ]);
    });
  });

  describe('emails getter', () => {
    it('returns a copy — mutating it does not affect internal state', async () => {
      const chrome = makeChromeMock({ emails: [{ name: '', email: ['a@example.com'] }], lastRun: null });
      const instance = new EmailData();
      await instance.ready;

      const copy = instance.emails;
      copy.push({ name: 'Injected', email: ['injected@example.com'] });

      expect(instance.emails).toEqual([{ name: '', email: ['a@example.com'] }]);
    });
  });
});
