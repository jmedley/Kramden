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
        this.#emails = result.emails
          .split(',')
          .map((e) => e.trim())
          .filter(Boolean);
      } else {
        await chromeMock.storage.sync.set({ emails: '' });
      }

      if (result.lastRun !== undefined) {
        this.#lastRun = result.lastRun;
      } else {
        await chromeMock.storage.sync.set({ lastRun: null });
      }
    }

    async add(address) {
      if (!this.#emails.includes(address)) {
        this.#emails.push(address);
        await chromeMock.storage.sync.set({ emails: this.#emails.join(',') });
      }
    }

    async remove(address) {
      this.#emails = this.#emails.filter((e) => e !== address);
      await chromeMock.storage.sync.set({ emails: this.#emails.join(',') });
    }

    get emails() {
      return [...this.#emails];
    }

    get lastRun() {
      return this.#lastRun;
    }
  }

  return new EmailData();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

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
      assert.equal(chrome.storage.sync._store.emails, '');
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
        emails: 'a@example.com,b@example.com',
        lastRun: '2026-01-01T00:00:00Z',
      });
      instance = makeEmailData(chrome);
      await instance.ready;
    });

    it('splits the stored CSV into an array', () => {
      assert.deepEqual(instance.emails, ['a@example.com', 'b@example.com']);
    });

    it('exposes lastRun from storage', () => {
      assert.equal(instance.lastRun, '2026-01-01T00:00:00Z');
    });

    it('emails is iterable with for...of', () => {
      const visited = [];
      for (const e of instance.emails) visited.push(e);
      assert.deepEqual(visited, ['a@example.com', 'b@example.com']);
    });
  });

  describe('add()', () => {
    let chrome;
    let instance;

    beforeEach(async () => {
      chrome = makeChromeMock({ emails: 'a@example.com', lastRun: null });
      instance = makeEmailData(chrome);
      await instance.ready;
    });

    it('appends a new address to the array', async () => {
      await instance.add('b@example.com');
      assert.deepEqual(instance.emails, ['a@example.com', 'b@example.com']);
    });

    it('persists the updated list to storage', async () => {
      await instance.add('b@example.com');
      assert.equal(chrome.storage.sync._store.emails, 'a@example.com,b@example.com');
    });

    it('ignores duplicate addresses', async () => {
      await instance.add('a@example.com');
      assert.deepEqual(instance.emails, ['a@example.com']);
      assert.equal(chrome.storage.sync._store.emails, 'a@example.com');
    });
  });

  describe('remove()', () => {
    let chrome;
    let instance;

    beforeEach(async () => {
      chrome = makeChromeMock({
        emails: 'a@example.com,b@example.com,c@example.com',
        lastRun: null,
      });
      instance = makeEmailData(chrome);
      await instance.ready;
    });

    it('removes the specified address from the array', async () => {
      await instance.remove('b@example.com');
      assert.deepEqual(instance.emails, ['a@example.com', 'c@example.com']);
    });

    it('persists the updated list to storage', async () => {
      await instance.remove('b@example.com');
      assert.equal(chrome.storage.sync._store.emails, 'a@example.com,c@example.com');
    });

    it('is a no-op for an address not in the list', async () => {
      await instance.remove('z@example.com');
      assert.deepEqual(instance.emails, ['a@example.com', 'b@example.com', 'c@example.com']);
    });
  });

  describe('emails getter', () => {
    it('returns a copy — mutating it does not affect internal state', async () => {
      const chrome = makeChromeMock({ emails: 'a@example.com', lastRun: null });
      const instance = makeEmailData(chrome);
      await instance.ready;

      const copy = instance.emails;
      copy.push('injected@example.com');

      assert.deepEqual(instance.emails, ['a@example.com']);
    });
  });
});
