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
      this.#emails = this.#normalizeEmails(result.emails);
    } else {
      await chrome.storage.sync.set({ emails: [] });
    }

    if (result.lastRun !== undefined) {
      this.#lastRun = result.lastRun;
    } else {
      await chrome.storage.sync.set({ lastRun: null });
    }
  }

  #normalizeEmails(value) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter(Boolean)
      .map((item) => ({
        sender: item.sender ?? item.name ?? '',
        email: Array.isArray(item.email)
          ? item.email.map((e) => String(e).trim()).filter(Boolean)
          : [],
      }))
      .filter((entry) => entry.email.length > 0);
  }

  #normalizeSender(sender) {
    const senderName =
      typeof sender === 'object' && (sender?.sender ?? sender?.name)
        ? sender?.sender ?? sender?.name
        : '';

    if (!sender?.email || !Array.isArray(sender.email)) {
      return { sender: senderName, email: [] };
    }

    const emails = sender.email.map((e) => String(e).trim()).filter(Boolean);
    return { sender: senderName, email: emails };
  }

  async add(sender) {
    console.log("Adding email:", sender);
    const normalized = this.#normalizeSender(sender);
    if (normalized.email.length === 0) return;

    const exists = this.#emails.some((entry) =>
      entry.email.some((email) => normalized.email.includes(email))
    );

    if (!exists) {
      this.#emails.push(normalized);
      await chrome.storage.sync.set({ emails: this.#emails });
    }
  }

  async hasEmail(sender) {
    console.log("Checking if email is saved:", sender);
    const normalized = this.#normalizeSender(sender);
    if (normalized.email.length === 0) return false;
    return this.#emails.some((entry) =>
      entry.email.some((email) => normalized.email.includes(email))
    );
  }

  async remove(sender) {
    console.log("Removing email:", sender);
    const normalized = this.#normalizeSender(sender);
    if (normalized.email.length === 0) return;

    this.#emails = this.#emails.filter(
      (entry) => !entry.email.some((email) => normalized.email.includes(email))
    );
    await chrome.storage.sync.set({ emails: this.#emails });
  }

  // Refresh cached data from chrome.storage.sync.
  // Call this when you need to ensure the in-memory `#emails` reflects
  // the latest data (for example, when another tab or extension page may
  // have modified storage).
  async refresh() {
    this.ready = this.#init();
    await this.ready;
    return this.emails;
  }

  get emails() {
    return this.refresh().then(() => this.#emails.map((entry) => ({
      sender: entry.sender,
      email: [...entry.email],
    })));
  }

  get lastRun() {
    return this.#lastRun;
  }
}

// export default EmailData;
