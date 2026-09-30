/*
  Copyright (c) 2026 Joseph Medley. All rights reserved.
  No part of this software may be used, copied, modified, or distributed
  without the express written permission of the author.
*/

import EmailClient from '../extensionutils/emailclient.js';
import getAuthToken from '../extensionutils/auth.js';
import ParserManager from '../extensionutils/parsermanager.js';
import { PARSERS } from '../emailparsers/index.js';
import BaseEmailParser from '../emailparsers/baseemailparser.js';
import renderData from '../scripts/jobsview.js';
import SenderData from '../extensionutils/data.js';
import { ColumnWidths } from '../extensionutils/data.js';
import { DayRange } from '../extensionutils/data.js';
import { HelpBanner } from '../extensionutils/data.js';
import { Installed } from '../extensionutils/data.js';
import { JobTitles } from '../extensionutils/data.js';
import { Jobs } from '../extensionutils/data.js';
import { SortColumn } from '../extensionutils/data.js';
import { SortDirection } from '../extensionutils/data.js';
import Timer from '../extensionutils/timer.js';
import { sortObjects, DateTimeValue } from '../extensionutils/utils.js';

const parserManager = new ParserManager(PARSERS, BaseEmailParser, chrome.i18n);
const senderData = new SenderData();
const jobTitles = new JobTitles();
const dayRange = new DayRange();
const sortColumn = new SortColumn();
const sortDirection = new SortDirection();
const columnWidths = new ColumnWidths();
const helpBanner = new HelpBanner();
const installedData = new Installed();
let addresses;
let currentJobs = [];
let currentSortedTh = null;
let currentSortDirection = 'asc';


// Page Help
const pageHelpBanner = document.getElementById('page-help-banner');
const btnDismissHelp = document.getElementById('btn-dismiss-help');

// Help Popovers
const helpDetailsElements = document.querySelectorAll('.help-details');
helpDetailsElements.forEach((details) => {
  details.addEventListener('pointerleave', () => {
    details.removeAttribute('open');
  });
});

// Jobs List
const initialHelp = document.getElementById('initial-help');
const emptyResultsHelp = document.getElementById('empty-results-help');
const emptyResultsDaysEl = document.getElementById('empty-results-days');
const jobsCountEl = document.getElementById('count-jobs');
const retrievingJobsEl = document.getElementById('retrieving-jobs');
const lastRetrievalTimeEl = document.getElementById('last-retrieval-time');
const countDaysEl = document.getElementById('count-days');
const btnRefreshJobs = document.getElementById('btn-refresh-jobs');
const btnRefreshJobs2 = document.getElementById('btn-refresh-jobs2');
const btnShare = document.getElementById('btn-share');
const shareUrl = 'https://chromewebstore.google.com/detail/job-search-monitor/ddamkhhbmihpacibjimjidchlkkalhnf?authuser=0&hl=en';

// Job List Headings
const jobsTableEl = document.getElementById('jobs-table');
const jobRowTemplate = document.getElementById('job-row-template');
const thJobTitleEl = document.getElementById('th-job-title');
const thCompanyEl = document.getElementById('th-company');
const thLocationEl = document.getElementById('th-location');
const thPayEl = document.getElementById('th-pay');
const thReceivedDateEl = document.getElementById('th-received-date');
const thActionsEl = document.getElementById('th-actions');

const jobHeadingSortKeys = {
  'th-job-title': 'jobTitle',
  'th-company': 'company',
  'th-location': 'location',
  'th-pay': 'pay',
  'th-received-date': 'receivedDate',
};

// Senders Configuration
const listTrackedSenders = document.getElementById('list-tracked-senders');

// Jobs List Configuration
const slctJobTitles = document.getElementById('select-job-titles');
const btnRemoveJobTitle = document.getElementById('btn-remove-job-title');
const txtJobTitle = document.getElementById('input-job-title');
const btnAddJobTitle = document.getElementById('btn-add-job-title');

// Add Job Title Dialog
const dialogAddJobTitle = document.getElementById('dialog-add-job-title');
const inputDialogJobTitle = document.getElementById('input-dialog-job-title');
const btnDialogSave = document.getElementById('btn-dialog-save');
const btnDialogCancel = document.getElementById('btn-dialog-cancel');

async function loadDataFromEmails() {
  if (slctJobTitles.length > 0) {
  } else {
    //User should get a message.
    return;
  }

  jobsCountEl.style.display = 'none';
  retrievingJobsEl.style.display = 'inline-flex';
  retrievingJobsEl.closest('.count').classList.add('is-loading');
  emptyResultsHelp.style.display = 'none';

  try {
    const authToken = await getAuthToken();
    const emailClient = new EmailClient(authToken, addresses, false, parseInt(countDaysEl.value, 10));
    const ids = await emailClient.loadIDs();
    // Becomes a generic, optional filter
    const titleTerms = await jobTitles.getTitles();
    const jobsData = new Jobs();

    const { results: messages, nullIDs } = await emailClient.getMessages(ids);
    if (nullIDs.length > 0) {
      console.log(`Failed to retrieve ${nullIDs.length} message(s)`);
    }
    for (const message of messages) {
      try {
        if (!message) {
          continue;
        }
        const result = parserManager.getMessageData(message);
        if (!result) {
          continue;
        }
        const jobs = result.messageData;
        const filtered = titleTerms.length
          ? jobs.filter((j) => titleTerms.some((t) => j.jobTitle?.toLowerCase().includes(t.toLowerCase())))
          : jobs;
        for (const job of filtered) {
          job.receivedDate = new DateTimeValue(result.receivedDate);
        }
        jobsData.add(filtered);
      } catch (err) {
        console.error('Error processing email message:', err);
      }
    }

    jobsCountEl.textContent = jobsData.jobs.length;
    const sortTh = currentSortedTh || thReceivedDateEl;
    currentJobs = sortObjects(jobsData.jobs, jobHeadingSortKeys[sortTh.id], currentSortDirection);
    markSortedHeading(sortTh, currentSortDirection);
    renderData(currentJobs);

    if (currentJobs.length === 0) {
      emptyResultsDaysEl.textContent = countDaysEl.value;
      emptyResultsHelp.style.display = 'block';
    }

    updateLastRetrievalTime();
  } finally {
    retrievingJobsEl.style.display = 'none';
    retrievingJobsEl.closest('.count').classList.remove('is-loading');
    jobsCountEl.style.display = '';
  }
}

async function loadSenderAddresses() {
  clearFollowedList();
  addresses = await senderData.addresses;

  // Each email entry is expected to carry an array of email addresses.
  for (const entry of addresses) {
    const li = document.createElement('li');
    const addressValues = entry.address.join(', ');
    const senderName = entry.sender ?? entry.name ?? '';
    li.textContent = `${senderName} (${addressValues})`;
    listTrackedSenders.appendChild(li);
  }
}

async function loadJobTitles() {
  clearJobTitlesList();
  const titles = await jobTitles.getTitles();
  for (const title of titles) {
    const option = document.createElement('option');
    option.value = title;
    option.textContent = title;
    slctJobTitles.appendChild(option);
  }
}

const attentionPulseElements = new WeakSet();

function pulseAttention(elementOrId) {
  const el = typeof elementOrId === 'string'
    ? document.getElementById(elementOrId)
    : elementOrId;

  if (!el) {
    console.warn(`pulseAttention: element not found for "${elementOrId}"`);
    return;
  }

  if (!attentionPulseElements.has(el)) {
    el.addEventListener('animationend', () => {
      el.classList.remove('attention-pulse');
    });
    attentionPulseElements.add(el);
  }

  el.classList.remove('attention-pulse');
  void el.offsetWidth; // force reflow so the animation restarts
  el.classList.add('attention-pulse');
}

async function addJob(title) {
  await jobTitles.add(title);
  txtJobTitle.value = '';
  btnAddJobTitle.disabled = true;
  await loadJobTitles();
}

function localizePage() {
  document.title = chrome.i18n.getMessage('extensionName');

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const message = chrome.i18n.getMessage(el.dataset.i18n);
    if (message) el.textContent = message;
  });

  document.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
    const message = chrome.i18n.getMessage(el.dataset.i18nAriaLabel);
    if (message) el.setAttribute('aria-label', message);
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const message = chrome.i18n.getMessage(el.dataset.i18nPlaceholder);
    if (message) el.setAttribute('placeholder', message);
  });

  document.querySelectorAll('[data-i18n-alt]').forEach((el) => {
    const message = chrome.i18n.getMessage(el.dataset.i18nAlt);
    if (message) el.setAttribute('alt', message);
  });

  jobRowTemplate.content.querySelectorAll('[data-i18n]').forEach((el) => {
    const message = chrome.i18n.getMessage(el.dataset.i18n);
    if (message) el.textContent = message;
  });
}

async function init() {
  localizePage();
  MIN_ACTIONS_WIDTH = measureMinActionsWidth() || MIN_ACTIONS_WIDTH;
  await restoreColumnWidths();
  jobsTableEl.classList.remove('col-widths-pending');

  if (await helpBanner.isDismissed()) {
    pageHelpBanner.style.display = 'none';
  }

  if (!(await installedData.isInstalled())) {
    await installedData.setInstalled();
    dialogAddJobTitle.showModal();
  }

  const storedColumnId = await sortColumn.getColumn();
  const storedDirection = await sortDirection.getDirection();
  if (storedColumnId && jobHeadingSortKeys[storedColumnId]) {
    const storedTh = document.getElementById(storedColumnId);
    if (storedTh) {
      markSortedHeading(storedTh, storedDirection);
    }
  }

  await loadSenderAddresses();
  await loadJobTitles();
  countDaysEl.value = await dayRange.getDays();
  await loadDataFromEmails();
  refreshTimer.start();

  btnRemoveJobTitle.disabled = true;
  btnAddJobTitle.disabled = true;

  txtJobTitle.addEventListener('input', () => {
    btnAddJobTitle.disabled = txtJobTitle.value.trim().length === 0;
  });

  btnAddJobTitle.addEventListener('click', () => {
    addJob(txtJobTitle.value.trim());
    initialHelp.style.display = 'none';
    pulseAttention('btn-refresh-jobs2');
  });

  slctJobTitles.addEventListener('change', () => {
    btnRemoveJobTitle.disabled = slctJobTitles.selectedIndex < 0;
  });

  btnRemoveJobTitle.addEventListener('click', async () => {
    const selectedOption = slctJobTitles.options[slctJobTitles.selectedIndex];
    if (selectedOption && selectedOption.value) {
      await jobTitles.remove(selectedOption.value);
      slctJobTitles.removeChild(selectedOption);
      slctJobTitles.dispatchEvent(new Event('change'));
      pulseAttention('btn-refresh-jobs2');
    }
  });
}

btnDismissHelp.addEventListener('click', async () => {
  pageHelpBanner.style.display = 'none';
  await helpBanner.dismiss();
});

btnDialogSave.addEventListener('click', async () => {
  await addJob(inputDialogJobTitle.value.trim());
  dialogAddJobTitle.close();
  await loadDataFromEmails();
});

btnDialogCancel.addEventListener('click', () => {
  dialogAddJobTitle.close();
});

async function refreshJobs() {
  clearJobsList();
  await dayRange.setDays(parseInt(countDaysEl.value, 10));
  await loadDataFromEmails();
  refreshTimer.reset();
}

const refreshTimer = new Timer(30, refreshJobs);

btnRefreshJobs.addEventListener('click', async () => refreshJobs());
btnRefreshJobs2.addEventListener('click', async () => refreshJobs());
countDaysEl.addEventListener('change', () => refreshJobs());

btnShare.addEventListener('click', async () => {
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Job Search Monitor',
        text: 'Let a friend know about this extension.',
        url: shareUrl
      });
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(shareUrl).catch(() => { });
  }
  const original = btnShare.textContent;
  btnShare.textContent = 'Copied';
  btnShare.setAttribute('aria-label', 'Copied');
  setTimeout(() => {
    btnShare.textContent = original;
    btnShare.setAttribute('aria-label', 'Share this extension');
  }, 1200);
});

function updateLastRetrievalTime() {
  const now = new Date();
  lastRetrievalTimeEl.dateTime = now.toISOString();
  lastRetrievalTimeEl.textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function markSortedHeading(th, direction = 'asc') {
  if (currentSortedTh) {
    currentSortedTh.classList.remove('th-sorted', 'sort-asc', 'sort-desc');
    currentSortedTh.setAttribute('aria-sort', 'none');
  }
  th.classList.add('th-sorted', `sort-${direction}`);
  th.setAttribute('aria-sort', direction === 'asc' ? 'ascending' : 'descending');
  currentSortedTh = th;
  currentSortDirection = direction;
  sortColumn.setColumn(th.id);
  sortDirection.setDirection(direction);
}

function sortJobsByHeading(th) {
  const key = jobHeadingSortKeys[th.id];
  if (!key || currentJobs.length === 0) return;
  const nextDirection = (th === currentSortedTh && currentSortDirection === 'asc') ? 'desc' : 'asc';
  sortObjects(currentJobs, key, nextDirection);
  renderData(currentJobs);
  markSortedHeading(th, nextDirection);
}

let resizeJustEnded = false;

[thJobTitleEl, thCompanyEl, thLocationEl, thPayEl, thReceivedDateEl].forEach((th) => {
  th.setAttribute('tabindex', '0');
  th.addEventListener('click', () => {
    if (resizeJustEnded) {
      resizeJustEnded = false;
      return;
    }
    sortJobsByHeading(th);
  });
  th.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      sortJobsByHeading(th);
    }
  });
});

// Column resizing: each th (but the first) carries a draggable separator on
// its left edge (options.css `th:not(:first-child)::before`), 7px wide
// (-3px to +4px from the border), which resizes the column to its left
// while distributing the opposite change equally across the columns to its
// right, so the table's total width (and therefore the sum of column
// widths) never drifts from the section-card's content width.
const MIN_COL_WIDTH = 60;
const RESIZE_HANDLE_HITBOX = 4;
const allHeadingEls = [thJobTitleEl, thCompanyEl, thLocationEl, thPayEl, thReceivedDateEl, thActionsEl];
// Overwritten in init() with a measurement of the actual (localized)
// Open/Copy-link buttons; this is only a fallback.
let MIN_ACTIONS_WIDTH = 160;
let resizeState = null;

function getMinWidth(th) {
  return th === thActionsEl ? MIN_ACTIONS_WIDTH : MIN_COL_WIDTH;
}

// Measures the Actions column's real minimum width from the localized
// job-row template so it stays correct in every locale, without depending
// on any job rows actually being rendered yet.
function measureMinActionsWidth() {
  const actionsCell = jobRowTemplate.content.querySelector('td.actions');
  if (!actionsCell) return 0;
  const wrapper = document.createElement('table');
  wrapper.style.cssText = 'position:absolute; visibility:hidden; left:-9999px; width:auto;';
  const tr = document.createElement('tr');
  tr.appendChild(actionsCell.cloneNode(true));
  wrapper.appendChild(tr);
  document.body.appendChild(wrapper);
  const width = Math.ceil(tr.firstElementChild.getBoundingClientRect().width);
  document.body.removeChild(wrapper);
  return width;
}

function onResizeMouseMove(e) {
  if (!resizeState) return;
  const { leftTh, leftStart, rightThs, rightStarts, startX } = resizeState;
  const rawDelta = e.clientX - startX;
  const n = rightThs.length;
  const lowerBound = MIN_COL_WIDTH - leftStart;
  let upperBound = Infinity;
  rightThs.forEach((t, i) => {
    upperBound = Math.min(upperBound, n * (rightStarts[i] - getMinWidth(t)));
  });
  const delta = Math.min(Math.max(rawDelta, lowerBound), upperBound);
  leftTh.style.width = `${leftStart + delta}px`;
  rightThs.forEach((t, i) => {
    t.style.width = `${rightStarts[i] - delta / n}px`;
  });
}

async function onResizeMouseUp() {
  if (!resizeState) return;
  resizeState = null;
  resizeJustEnded = true;
  document.body.style.userSelect = '';
  document.body.style.cursor = '';
  const widths = {};
  allHeadingEls.forEach((th) => {
    widths[th.id] = th.getBoundingClientRect().width;
  });
  await columnWidths.setWidths(widths);
}

document.addEventListener('mousemove', onResizeMouseMove);
document.addEventListener('mouseup', onResizeMouseUp);

allHeadingEls.slice(1).forEach((th) => {
  th.addEventListener('mousedown', (e) => {
    const rect = th.getBoundingClientRect();
    if (Math.abs(e.clientX - rect.left) > RESIZE_HANDLE_HITBOX) return;
    e.preventDefault();
    const idx = allHeadingEls.indexOf(th);
    const rightThs = allHeadingEls.slice(idx);
    resizeState = {
      leftTh: allHeadingEls[idx - 1],
      leftStart: allHeadingEls[idx - 1].getBoundingClientRect().width,
      rightThs,
      rightStarts: rightThs.map((t) => t.getBoundingClientRect().width),
      startX: e.clientX,
    };
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  });
});

// Rescales all column widths proportionally to fit the table's current
// rendered width, clamping each column at its minimum (Actions gets its own,
// larger floor) and redistributing any resulting deficit across the
// non-clamped columns. Used after restoring stored widths (which may have
// been saved at a different window size) and on window resize.
function normalizeColumnWidths() {
  const target = jobsTableEl.clientWidth;
  const current = allHeadingEls.map((th) => th.getBoundingClientRect().width);
  const total = current.reduce((a, b) => a + b, 0);
  if (!target || Math.abs(total - target) < 1) return;

  const mins = allHeadingEls.map(getMinWidth);
  let scaled = current.map((w) => (w * target) / total);
  let deficit = 0;
  const flexible = [];
  scaled = scaled.map((w, i) => {
    if (w < mins[i]) {
      deficit += mins[i] - w;
      return mins[i];
    }
    flexible.push(i);
    return w;
  });
  if (deficit > 0 && flexible.length) {
    const flexTotal = flexible.reduce((s, i) => s + scaled[i], 0);
    flexible.forEach((i) => {
      scaled[i] -= deficit * (scaled[i] / flexTotal);
    });
  }
  allHeadingEls.forEach((th, i) => {
    th.style.width = `${scaled[i]}px`;
  });
}

let resizeNormalizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeNormalizeTimer);
  resizeNormalizeTimer = setTimeout(async () => {
    normalizeColumnWidths();
    const widths = {};
    allHeadingEls.forEach((th) => {
      widths[th.id] = th.getBoundingClientRect().width;
    });
    await columnWidths.setWidths(widths);
  }, 200);
});

async function restoreColumnWidths() {
  const widths = await columnWidths.getWidths();
  allHeadingEls.forEach((th) => {
    if (typeof widths[th.id] === 'number') {
      th.style.width = `${widths[th.id]}px`;
    }
  });
  normalizeColumnWidths();
}

function clearJobsList() {
  document.getElementById('body-records-list').replaceChildren();
}

function clearJobTitlesList() {
  while (slctJobTitles.options.length > 0) {
    slctJobTitles.remove(0);
  }

  btnRemoveJobTitle.disabled = true;
  slctJobTitles.dispatchEvent(new Event('change'));
}

function clearFollowedList() {
  listTrackedSenders.replaceChildren();
}

// This module loads as `type="module"`, so it may execute after
// DOMContentLoaded has already fired. Run the one-time setup either way.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
