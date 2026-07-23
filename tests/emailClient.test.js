/*
  Copyright (c) 2026 Joseph Medley. All rights reserved.
  No part of this software may be used, copied, modified, or distributed
  without the express written permission of the author.
*/
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import EmailClientModule from '../scripts/emailClient.js';

const EmailClient = EmailClientModule?.default ?? EmailClientModule;

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
  afterEach(() => {
    vi.restoreAllMocks();
    // cleanup global.fetch if tests set it
    try { delete global.fetch; } catch (e) {}
  });

  describe('constructor', () => {
    it('stores authToken and senders', () => {
      const client = new EmailClient(FAKE_TOKEN, FAKE_SENDERS);
      expect(client.authToken).toBe(FAKE_TOKEN);
      expect(client.senders).toEqual(FAKE_SENDERS);
    });

    it('wraps a single sender string in an array', () => {
      const client = new EmailClient(FAKE_TOKEN, 'jobs@example.com');
      expect(client.senders).toEqual(['jobs@example.com']);
    });

    it('initializes messageIDs as empty array', () => {
      const client = new EmailClient(FAKE_TOKEN, FAKE_SENDERS);
      expect(client.messageIDs).toEqual([]);
    });
  });

  describe('loadIDs()', () => {
    it('populates messageIDs from API response', async () => {
      const client = new EmailClient(FAKE_TOKEN, FAKE_SENDERS);
      global.fetch = mockFetch([{ body: { messages: [{ id: 'a' }, { id: 'b' }] } }]);

      const ids = await client.loadIDs();
      expect(ids).toEqual(['a', 'b']);
      expect(client.messageIDs).toEqual(['a', 'b']);
    });

    it('handles empty messages list', async () => {
      const client = new EmailClient(FAKE_TOKEN, FAKE_SENDERS);
      global.fetch = mockFetch([{ body: {} }]);

      const ids = await client.loadIDs();
      expect(ids).toEqual([]);
    });

    it('throws on non-ok response', async () => {
      const client = new EmailClient(FAKE_TOKEN, FAKE_SENDERS);
      global.fetch = mockFetch([{ ok: false, status: 401, statusText: 'Unauthorized' }]);

      await expect(client.loadIDs()).rejects.toThrow(/loadIDs failed: 401/);
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
      expect(capturedURL.includes(encodeURIComponent('from:a@example.com OR from:b@example.com'))).toBe(true);
    });
  });

  describe('getMessage()', () => {
    it('returns full message from API', async () => {
      const client = new EmailClient(FAKE_TOKEN, FAKE_SENDERS);
      const fakeMsg = { id: MSG_ID, payload: { body: { data: 'SGVsbG8=' } } };
      global.fetch = mockFetch([{ body: fakeMsg }]);

      const msg = await client.getMessage(MSG_ID);
      expect(msg).toEqual(fakeMsg);
    });

    it('requests format=full', async () => {
      const client = new EmailClient(FAKE_TOKEN, FAKE_SENDERS);
      let capturedURL = '';
      global.fetch = async (url) => {
        capturedURL = url;
        return { ok: true, json: async () => ({}) };
      };

      await client.getMessage(MSG_ID);
      expect(capturedURL.includes('format=full')).toBe(true);
    });

    it('throws on non-ok response', async () => {
      const client = new EmailClient(FAKE_TOKEN, FAKE_SENDERS);
      global.fetch = mockFetch([{ ok: false, status: 404, statusText: 'Not Found' }]);

      await expect(client.getMessage(MSG_ID)).rejects.toThrow(/getMessage failed: 404/);
    });
  });

  describe('getMetaData()', () => {
    it('returns metadata from API', async () => {
      const client = new EmailClient(FAKE_TOKEN, FAKE_SENDERS);
      const fakeMeta = { id: MSG_ID, labelIds: ['INBOX'], snippet: 'Hello' };
      global.fetch = mockFetch([{ body: fakeMeta }]);

      const meta = await client.getMetaData(MSG_ID);
      expect(meta).toEqual(fakeMeta);
    });

    it('requests format=metadata', async () => {
      const client = new EmailClient(FAKE_TOKEN, FAKE_SENDERS);
      let capturedURL = '';
      global.fetch = async (url) => {
        capturedURL = url;
        return { ok: true, json: async () => ({}) };
      };

      await client.getMetaData(MSG_ID);
      expect(capturedURL.includes('format=metadata')).toBe(true);
    });

    it('throws on non-ok response', async () => {
      const client = new EmailClient(FAKE_TOKEN, FAKE_SENDERS);
      global.fetch = mockFetch([{ ok: false, status: 403, statusText: 'Forbidden' }]);

      await expect(client.getMetaData(MSG_ID)).rejects.toThrow(/getMetaData failed: 403/);
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
      expect(capturedHeaders.Authorization).toBe(`Bearer ${FAKE_TOKEN}`);
    });
  });
});
