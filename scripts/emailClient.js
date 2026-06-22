/*
  Copyright (c) 2026 Joseph Medley. All rights reserved.
  No part of this software may be used, copied, modified, or distributed
  without the express written permission of the author.
*/

class EmailClient {
  constructor(authToken, senders, preloadIDs = false) {
    this.authToken = authToken;
    this.senders = Array.isArray(senders) ? senders : [senders];
    this.messageIDs = [];
    this._baseURL = 'https://gmail.googleapis.com/gmail/v1/users/me';

    if (preloadIDs) {
      this.loadIDs();
    }
  }

  async loadIDs() {
    const query = `from:(${this.senders.flatMap(s => s.address).join(' OR ')})`;
    const url = `${this._baseURL}/messages?q=${encodeURIComponent(query)}`;

    const res = await fetch(url, { headers: this._authHeaders() });
    if (!res.ok) throw new Error(`loadIDs failed: ${res.status} ${res.statusText}`);

    const data = await res.json();
    this.messageIDs = (data.messages || []).map(m => m.id);
    return this.messageIDs;
  }

  async getMessage(messageID) {
    const url = `${this._baseURL}/messages/${messageID}?format=raw`;
    const res = await fetch(url, { headers: this._authHeaders() });
    if (!res.ok) throw new Error(`getMessage failed: ${res.status} ${res.statusText}`);
    const data = await res.json();
    return atob(data.raw.replace(/-/g, '+').replace(/_/g, '/'));
  }

  async getMetaData(messageID) {
    const url = `${this._baseURL}/messages/${messageID}?format=metadata`;
    const res = await fetch(url, { headers: this._authHeaders() });
    if (!res.ok) throw new Error(`getMetaData failed: ${res.status} ${res.statusText}`);
    return res.json();
  }

  _authHeaders() {
    return { Authorization: `Bearer ${this.authToken}` };
  }
}

export default EmailClient;
