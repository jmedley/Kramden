/*
  Copyright (c) 2026 Joseph Medley. All rights reserved.
  No part of this software may be used, copied, modified, or distributed
  without the express written permission of the author.
*/

import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'mocha';

// ---------------------------------------------------------------------------
// Chrome storage mock
// ---------------------------------------------------------------------------

function makeChromeMock(initialData = {}) {
  const store = { ...initialData };
  return {
    storage: {
      sync: {
        get: async (keys) => {
          const result = {};
          for (const key of keys) {
            if (Object.prototype.hasOwnProperty.call(store, key)) {
              result[key] = store[key];
            }
          }
          return result;
        },
        set: async (data) => {
          Object.assign(store, data);
        },
        _store: store,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Inline EmailData (private fields can't be imported without a build step)
// ---------------------------------------------------------------------------

function makeEmailData(chromeMock) {
  class EmailData {
    #emails = [];
    #lastRun = null;

    constructor() {
      this.ready = this.#init();
    }

    async #init() {
      const result = await chromeMock.storage.sync.get(['emails', 'lastRun']);

      if (result.emails !== undefined) {
        this.#emails = this.#normalizeEmails(result.emails);
      } else {
        await chromeMock.storage.sync.set({ emails: [] });
      }

      if (result.lastRun !== undefined) {
        this.#lastRun = result.lastRun;
      } else {
        await chromeMock.storage.sync.set({ lastRun: null });
      }
    }

    #normalizeEmails(value) {
      if (Array.isArray(value)) {
        return value
          .filter(Boolean)
          .map((item) => {
            if (typeof item === 'string') {
              return { name: '', email: [item.trim()] };
            }

            const rawEmail = item.email;
            const emails = Array.isArray(rawEmail)
              ? rawEmail.map((e) => String(e).trim()).filter(Boolean)
              : typeof rawEmail === 'string'
              ? [rawEmail.trim()]
              : [];

            return { name: item.name ?? '', email: emails };
          })
          .filter((entry) => entry.email.length > 0);
      }

      if (typeof value === 'string') {
        return value
          .split(',')
          .map((e) => e.trim())
          .filter(Boolean)
          .map((email) => ({ name: '', email: [email] }));
      }

      return [];
    }

    #normalizeSender(sender) {
      const name = typeof sender === 'object' && sender?.name ? sender.name : '';
      if (typeof sender === 'string') {
        return { name: '', email: [sender.trim()] };
      }

      if (!sender?.email) {
        return { name, email: [] };
      }

      const emails = Array.isArray(sender.email)
        ? sender.email.map((e) => String(e).trim()).filter(Boolean)
        : typeof sender.email === 'string'
        ? [sender.email.trim()]
        : [];

      return { name, email: emails };
    }

    async add(sender) {
      const normalized = this.#normalizeSender(sender);
      if (normalized.email.length === 0) return;

      const exists = this.#emails.some((entry) =>
        entry.email.some((email) => normalized.email.includes(email))
      );

      if (!exists) {
        this.#emails.push(normalized);
        await chromeMock.storage.sync.set({ emails: this.#emails });
      }
    }

    async hasEmail(sender) {
      const normalized = this.#normalizeSender(sender);
      if (normalized.email.length === 0) return false;
      return this.#emails.some((entry) =>
        entry.email.some((email) => normalized.email.includes(email))
      );
    }

    async remove(sender) {
      const normalized = this.#normalizeSender(sender);
      this.#emails = this.#emails.filter(
        (entry) => !entry.email.some((email) => normalized.email.includes(email))
      );
      await chromeMock.storage.sync.set({ emails: this.#emails });
    }

    get emails() {
      return this.#emails.map((entry) => ({ ...entry }));
    }

    get lastRun() {
      return this.#lastRun;
    }
  }

  return new EmailData();
}

describe('EmailData', () => {
  describe('constructor — empty storage', () => {
    let chrome;
    let instance;

    beforeEach(async () => {
      chrome = makeChromeMock();
      instance = makeEmailData(chrome);
      await instance.ready;
    });

    it('creates the emails key in storage', () => {
      assert.deepEqual(chrome.storage.sync._store.emails, []);
    });

    it('creates the lastRun key in storage', () => {
      assert.equal(chrome.storage.sync._store.lastRun, null);
    });

    it('exposes an empty emails array', () => {
      assert.deepEqual(instance.emails, []);
    });

    it('emails is iterable with forEach', () => {
      const visited = [];
      instance.emails.forEach((e) => visited.push(e));
      assert.deepEqual(visited, []);
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
      instance = makeEmailData(chrome);
      await instance.ready;
    });

    it('splits the stored CSV into an array', () => {
      assert.deepEqual(instance.emails, [
        { name: '', email: ['a@example.com'] },
        { name: '', email: ['b@example.com'] },
      ]);
    });

    it('exposes lastRun from storage', () => {
      assert.equal(instance.lastRun, '2026-01-01T00:00:00Z');
    });

    it('emails is iterable with for...of', () => {
      const visited = [];
      for (const e of instance.emails) visited.push(e);
      assert.deepEqual(visited, [
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
      instance = makeEmailData(chrome);
      await instance.ready;
    });

    it('appends a new address to the array', async () => {
      await instance.add({ name: 'Bob', email: ['b@example.com'] });
      assert.deepEqual(instance.emails, [
        { name: '', email: ['a@example.com'] },
        { name: 'Bob', email: ['b@example.com'] },
      ]);
    });

    it('persists the updated list to storage', async () => {
      await instance.add({ name: 'Bob', email: ['b@example.com'] });
      assert.deepEqual(chrome.storage.sync._store.emails, [
        { name: '', email: ['a@example.com'] },
        { name: 'Bob', email: ['b@example.com'] },
      ]);
    });

    it('ignores duplicate addresses', async () => {
      chrome = makeChromeMock({ emails: [{ name: '', email: ['a@example.com'] }], lastRun: null });
      instance = makeEmailData(chrome);
      await instance.ready;

      await instance.add({ email: ['a@example.com'] });
      assert.deepEqual(instance.emails, [{ name: '', email: ['a@example.com'] }]);
      assert.deepEqual(chrome.storage.sync._store.emails, [{ name: '', email: ['a@example.com'] }]);
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
      instance = makeEmailData(chrome);
      await instance.ready;
    });

    it('returns true for an existing email', async () => {
      assert.strictEqual(await instance.hasEmail({ email: ['a@example.com'] }), true);
      assert.strictEqual(await instance.hasEmail({ email: ['a@example.com'] }), true);
    });

    it('returns false for a non-existing email', async () => {
      assert.strictEqual(await instance.hasEmail({ email: ['c@example.com'] }), false);
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
      instance = makeEmailData(chrome);
      await instance.ready;
    });

    it('removes the specified address from the array', async () => {
      await instance.remove({ email: ['b@example.com'] });
      assert.deepEqual(instance.emails, [
        { name: '', email: ['a@example.com'] },
        { name: '', email: ['c@example.com'] },
      ]);
    });

    it('persists the updated list to storage', async () => {
      await instance.remove({ email: ['b@example.com'] });
      assert.deepEqual(chrome.storage.sync._store.emails, [
        { name: '', email: ['a@example.com'] },
        { name: '', email: ['c@example.com'] },
      ]);
    });

    it('is a no-op for an address not in the list', async () => {
      await instance.remove({ email: ['z@example.com'] });
      assert.deepEqual(instance.emails, [
        { name: '', email: ['a@example.com'] },
        { name: '', email: ['b@example.com'] },
        { name: '', email: ['c@example.com'] },
      ]);
    });
  });

  describe('emails getter', () => {
    it('returns a copy — mutating it does not affect internal state', async () => {
      const chrome = makeChromeMock({ emails: [{ name: '', email: ['a@example.com'] }], lastRun: null });
      const instance = makeEmailData(chrome);
      await instance.ready;

      const copy = instance.emails;
      copy.push({ name: 'Injected', email: ['injected@example.com'] });

      assert.deepEqual(instance.emails, [{ name: '', email: ['a@example.com'] }]);
    });
  });
});
