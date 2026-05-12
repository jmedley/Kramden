const assert = require('assert');
const EmailClient = require('./emailClient');

const FAKE_TOKEN = 'test-token-abc';
const FAKE_SENDERS = ['jobs-noreply@linkedin.com'];
const MSG_ID = 'msg123';

function mockFetch(responses) {
  let call = 0;
  return async (url, opts) => {
    const response = responses[call++] ?? responses[responses.length - 1];
    return {
      ok: response.ok ?? true,
      status: response.status ?? 200,
      statusText: response.statusText ?? 'OK',
      json: async () => response.body,
    };
  };
}

describe('EmailClient', () => {
  describe('constructor', () => {
    it('stores authToken and senders', () => {
      const client = new EmailClient(FAKE_TOKEN, FAKE_SENDERS);
      assert.strictEqual(client.authToken, FAKE_TOKEN);
      assert.deepStrictEqual(client.senders, FAKE_SENDERS);
    });

    it('wraps a single sender string in an array', () => {
      const client = new EmailClient(FAKE_TOKEN, 'jobs@example.com');
      assert.deepStrictEqual(client.senders, ['jobs@example.com']);
    });

    it('initializes messageIDs as empty array', () => {
      const client = new EmailClient(FAKE_TOKEN, FAKE_SENDERS);
      assert.deepStrictEqual(client.messageIDs, []);
    });
  });

  describe('loadIDs()', () => {
    it('populates messageIDs from API response', async () => {
      const client = new EmailClient(FAKE_TOKEN, FAKE_SENDERS);
      global.fetch = mockFetch([{ body: { messages: [{ id: 'a' }, { id: 'b' }] } }]);

      const ids = await client.loadIDs();
      assert.deepStrictEqual(ids, ['a', 'b']);
      assert.deepStrictEqual(client.messageIDs, ['a', 'b']);
    });

    it('handles empty messages list', async () => {
      const client = new EmailClient(FAKE_TOKEN, FAKE_SENDERS);
      global.fetch = mockFetch([{ body: {} }]);

      const ids = await client.loadIDs();
      assert.deepStrictEqual(ids, []);
    });

    it('throws on non-ok response', async () => {
      const client = new EmailClient(FAKE_TOKEN, FAKE_SENDERS);
      global.fetch = mockFetch([{ ok: false, status: 401, statusText: 'Unauthorized' }]);

      await assert.rejects(() => client.loadIDs(), /loadIDs failed: 401/);
    });

    it('builds query from multiple senders', async () => {
      const senders = ['a@example.com', 'b@example.com'];
      const client = new EmailClient(FAKE_TOKEN, senders);
      let capturedURL = '';
      global.fetch = async (url) => {
        capturedURL = url;
        return { ok: true, json: async () => ({ messages: [] }) };
      };

      await client.loadIDs();
      assert.ok(capturedURL.includes(encodeURIComponent('from:a@example.com OR from:b@example.com')));
    });
  });

  describe('getMessage()', () => {
    it('returns full message from API', async () => {
      const client = new EmailClient(FAKE_TOKEN, FAKE_SENDERS);
      const fakeMsg = { id: MSG_ID, payload: { body: { data: 'SGVsbG8=' } } };
      global.fetch = mockFetch([{ body: fakeMsg }]);

      const msg = await client.getMessage(MSG_ID);
      assert.deepStrictEqual(msg, fakeMsg);
    });

    it('requests format=full', async () => {
      const client = new EmailClient(FAKE_TOKEN, FAKE_SENDERS);
      let capturedURL = '';
      global.fetch = async (url) => {
        capturedURL = url;
        return { ok: true, json: async () => ({}) };
      };

      await client.getMessage(MSG_ID);
      assert.ok(capturedURL.includes('format=full'));
    });

    it('throws on non-ok response', async () => {
      const client = new EmailClient(FAKE_TOKEN, FAKE_SENDERS);
      global.fetch = mockFetch([{ ok: false, status: 404, statusText: 'Not Found' }]);

      await assert.rejects(() => client.getMessage(MSG_ID), /getMessage failed: 404/);
    });
  });

  describe('getMetaData()', () => {
    it('returns metadata from API', async () => {
      const client = new EmailClient(FAKE_TOKEN, FAKE_SENDERS);
      const fakeMeta = { id: MSG_ID, labelIds: ['INBOX'], snippet: 'Hello' };
      global.fetch = mockFetch([{ body: fakeMeta }]);

      const meta = await client.getMetaData(MSG_ID);
      assert.deepStrictEqual(meta, fakeMeta);
    });

    it('requests format=metadata', async () => {
      const client = new EmailClient(FAKE_TOKEN, FAKE_SENDERS);
      let capturedURL = '';
      global.fetch = async (url) => {
        capturedURL = url;
        return { ok: true, json: async () => ({}) };
      };

      await client.getMetaData(MSG_ID);
      assert.ok(capturedURL.includes('format=metadata'));
    });

    it('throws on non-ok response', async () => {
      const client = new EmailClient(FAKE_TOKEN, FAKE_SENDERS);
      global.fetch = mockFetch([{ ok: false, status: 403, statusText: 'Forbidden' }]);

      await assert.rejects(() => client.getMetaData(MSG_ID), /getMetaData failed: 403/);
    });
  });

  describe('auth headers', () => {
    it('sends Bearer token in Authorization header', async () => {
      const client = new EmailClient(FAKE_TOKEN, FAKE_SENDERS);
      let capturedHeaders = {};
      global.fetch = async (url, opts) => {
        capturedHeaders = opts.headers;
        return { ok: true, json: async () => ({}) };
      };

      await client.getMetaData(MSG_ID);
      assert.strictEqual(capturedHeaders.Authorization, `Bearer ${FAKE_TOKEN}`);
    });
  });
});
