/*
  Copyright (c) 2026 Joseph Medley. All rights reserved.
  No part of this software may be used, copied, modified, or distributed
  without the express written permission of the author.
*/

class EmailData {
  #emails = [];
  #lastRun = null;

  constructor() {
    this.ready = this.#init();
  }

  async #init() {
    const result = await chrome.storage.sync.get(['emails', 'lastRun']);

    if (result.emails !== undefined) {
      this.#emails = result.emails
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean);
    } else {
      await chrome.storage.sync.set({ emails: '' });
    }

    if (result.lastRun !== undefined) {
      this.#lastRun = result.lastRun;
    } else {
      await chrome.storage.sync.set({ lastRun: null });
    }
  }

  async add(address) {
    if (!this.#emails.includes(address)) {
      this.#emails.push(address);
      await chrome.storage.sync.set({ emails: this.#emails.join(',') });
    }
  }

  async hasEmail(address) {
    return this.#emails.includes(address);
  }

  async remove(address) {
    this.#emails = this.#emails.filter((e) => e !== address);
    await chrome.storage.sync.set({ emails: this.#emails.join(',') });
  }

  get emails() {
    return [...this.#emails];
  }

  get lastRun() {
    return this.#lastRun;
  }
}
