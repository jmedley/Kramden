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

module.exports = EmailData;
