/*
  Copyright (c) 2026 Joseph Medley. All rights reserved.
  No part of this software may be used, copied, modified, or distributed
  without the express written permission of the author.
*/

class SenderData {
  #addresses = [];

  constructor() {
    this.ready = this.#init();
  }

  async #init() {
    const result = await chrome.storage.sync.get(['addresses']);

    if (result.addresses !== undefined) {
      this.#addresses = this.#normalizeAddresses(result.addresses);
    } else {
      await chrome.storage.sync.set({ addresses: [] });
    }
  }

  #normalizeAddresses(value) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter(Boolean)
      .map((item) => ({
        sender: item.sender ?? item.name ?? '',
        address: Array.isArray(item.address)
          ? item.address.map((e) => String(e).trim()).filter(Boolean)
          : [],
      }))
      .filter((entry) => entry.address.length > 0);
  }

  #normalizeSender(sender) {
    const senderName =
      typeof sender === 'object' && (sender?.sender ?? sender?.name)
        ? sender?.sender ?? sender?.name
        : '';

    if (!sender?.address || !Array.isArray(sender.address)) {
      return { sender: senderName, address: [] };
    }

    const addresses = sender.address.map((e) => String(e).trim()).filter(Boolean);
    return { sender: senderName, address: addresses };
  }

  async add(sender) {
    console.log("Adding address:", sender);
    const normalized = this.#normalizeSender(sender);
    if (normalized.address.length === 0) return;

    const exists = this.#addresses.some((entry) =>
      entry.address.some((address) => normalized.address.includes(address))
    );

    if (!exists) {
      this.#addresses.push(normalized);
      await chrome.storage.sync.set({ addresses: this.#addresses });
    }
  }

  async hasAddress(sender) {
    console.log("Checking if address is saved:", sender);
    const normalized = this.#normalizeSender(sender);
    console.log("Normalized sender for hasAddress check:", normalized);
    console.log("Length of normalized address:", normalized.address.length);
    if (normalized.address.length === 0) return false;
    return this.#addresses.some((entry) => {
      console.log("Checking against entry:", entry);
      return entry.address.some((address) => normalized.address.includes(address));
    });
  }

  async remove(sender) {
    console.log("Removing address:", sender);
    const normalized = this.#normalizeSender(sender);
    if (normalized.address.length === 0) return;

    this.#addresses = this.#addresses.filter(
      (entry) => !entry.address.some((address) => normalized.address.includes(address))
    );
    await chrome.storage.sync.set({ addresses: this.#addresses });
  }

  // Refresh cached data from chrome.storage.sync.
  // Call this when you need to ensure the in-memory `#addresses` reflects
  // the latest data (for example, when another tab or extension page may
  // have modified storage).
  async refresh() {
    this.ready = this.#init();
    await this.ready;
    return this.addresses;
  }

  get addresses() {
    return this.ready.then(() =>
      this.#addresses.map((entry) => ({
        sender: entry.sender,
        address: [...entry.address],
      }))
    );
  }


}

export default SenderData;
