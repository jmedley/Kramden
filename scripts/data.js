/*
  Copyright (c) 2026 Joseph Medley. All rights reserved.
  No part of this software may be used, copied, modified, or distributed
  without the express written permission of the author.
*/

import { sortObjects } from '../scripts/utils.js';

class SenderData {
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

  async #getAddresses() {
    const result = await chrome.storage.sync.get(['addresses']);
    return this.#normalizeAddresses(result.addresses ?? []);
  }

  async add(sender) {
    console.log("Adding address:", sender);
    const normalized = this.#normalizeSender(sender);
    if (normalized.address.length === 0) return;

    const addresses = await this.#getAddresses();
    const exists = addresses.some((entry) =>
      entry.address.some((address) => normalized.address.includes(address))
    );

    if (!exists) {
      addresses.push(normalized);
      await chrome.storage.sync.set({ addresses });
    }
  }

  async hasAddress(sender) {
    console.log("Checking if address is saved:", sender);
    const normalized = this.#normalizeSender(sender);
    console.log("Normalized sender for hasAddress check:", normalized);
    console.log("Length of normalized address:", normalized.address.length);
    if (normalized.address.length === 0) return false;
    const addresses = await this.#getAddresses();
    return addresses.some((entry) => {
      console.log("Checking against entry:", entry);
      return entry.address.some((address) => normalized.address.includes(address));
    });
  }

  async remove(sender) {
    console.log("Removing address:", sender);
    const normalized = this.#normalizeSender(sender);
    if (normalized.address.length === 0) return;

    const addresses = await this.#getAddresses();
    const filtered = addresses.filter(
      (entry) => !entry.address.some((address) => normalized.address.includes(address))
    );
    await chrome.storage.sync.set({ addresses: filtered });
  }

  get addresses() {
    return this.#getAddresses().then((addresses) =>
      sortObjects(
        addresses.map((entry) => ({
          sender: entry.sender,
          address: [...entry.address],
        })),
        'sender'
      )
    );
  }
}

class DayRange {

  async getDays() {
    const result = await chrome.storage.sync.get(['days']);
    const days = parseInt(result.days, 10);
    return isNaN(days) ? 1 : Math.max(1, Math.min(31, days));
  }

  async setDays(days) {
    await chrome.storage.sync.set({ days: days });
  }
}

class JobTitles {
  async getTitles() {
    const result = await chrome.storage.sync.get(['jobTitles']);
    const titles = result.jobTitles || [];
    return Array.isArray(titles)
      ? titles.filter(Boolean).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
      : [];
  }

  async add(title) {
    if (!title || typeof title !== 'string') return;
    const titles = await this.getTitles();
    if (!titles.includes(title)) {
      titles.push(title);
      await chrome.storage.sync.set({ jobTitles: titles });
    }
  }

  async remove(title) {
    if (!title || typeof title !== 'string') return;
    const titles = await this.getTitles();
    const filtered = titles.filter((t) => t !== title);
    await chrome.storage.sync.set({ jobTitles: filtered });
  }


}

class SortColumn {
  async getColumn() {
    const result = await chrome.storage.local.get(['sortColumn']);
    return result.sortColumn ?? null;
  }

  async setColumn(id) {
    await chrome.storage.local.set({ sortColumn: id });
  }
}

class SortDirection {
  async getDirection() {
    const result = await chrome.storage.local.get(['sortDirection']);
    return result.sortDirection === 'desc' ? 'desc' : 'asc';
  }

  async setDirection(direction) {
    await chrome.storage.local.set({ sortDirection: direction });
  }
}

class HelpBanner {
  async isDismissed() {
    const result = await chrome.storage.local.get(['helpBannerDismissed']);
    return result.helpBannerDismissed === true;
  }

  async dismiss() {
    await chrome.storage.local.set({ helpBannerDismissed: true });
  }
}

//  { jobTitle: title, company, location, applyLink: url, datePosted, pay: 'Not provided' };

class Jobs {
  #jobs = [];

  add(jobs) {
    for (const job of jobs) {
      const isDuplicate = this.#jobs.some(
        (j) => j.jobTitle === job.jobTitle && j.company === job.company && j.location === job.location
      );
      if (!isDuplicate) {
        this.#jobs.push(job);
      }
    }
  }

  get jobs() {
    return this.#jobs;
  }
}

export { DayRange, HelpBanner, JobTitles, Jobs, SortColumn, SortDirection };
export default SenderData;