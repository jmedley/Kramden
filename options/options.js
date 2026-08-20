/*
  Copyright (c) 2026 Joseph Medley. All rights reserved.
  No part of this software may be used, copied, modified, or distributed
  without the express written permission of the author.
*/
import EmailClient from '../extensionutils/emailclient.js';
import getAuthToken from '../extensionutils/auth.js';
import emailManager from '../extensionutils/emailmanager.js';
import renderJobs from '../scripts/jobsview.js';
import SenderData from '../extensionutils/data.js';
import { DayRange } from '../extensionutils/data.js';
import { HelpBanner } from '../extensionutils/data.js';
import { Installed } from '../extensionutils/data.js';
import { JobTitles } from '../extensionutils/data.js';
import { Jobs } from '../extensionutils/data.js';
import { SortColumn } from '../extensionutils/data.js';
import { SortDirection } from '../extensionutils/data.js';
import { sortObjects } from '../extensionutils/utils.js';

// Data
const senderData = new SenderData();
const jobTitles = new JobTitles();
const dayRange = new DayRange();
const sortColumn = new SortColumn();
const sortDirection = new SortDirection();
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
const countDaysEl = document.getElementById('count-days');
const btnRefreshJobs = document.getElementById('btn-refresh-jobs');
const btnRefreshJobs2 = document.getElementById('btn-refresh-jobs2');
const btnShare = document.getElementById('btn-share');
const shareUrl = 'https://chromewebstore.google.com/detail/job-search-monitor/ddamkhhbmihpacibjimjidchlkkalhnf?authuser=0&hl=en';

// Job List Headings
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
const slctTrackedSenders = document.getElementById('select-tracked-senders');
const btnStopTracking = document.getElementById('btn-stop-tracking');
const btnRefreshSenders = document.getElementById('btn-refresh-senders');
const txtSender = document.getElementById('input-sender');
const txtSenderEmail = document.getElementById('input-sender-email');
const btnTrackSender = document.getElementById('btn-track-sender');

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
    initialHelp.style.display = 'none';
  } else {
    //User should get a message.
    return;
  }

  jobsCountEl.style.display = 'none';
  retrievingJobsEl.style.display = 'inline-flex';
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
        const result = emailManager.getMessageData(message);
        if (!result) {
          continue;
        }
        const jobs = result.messageData;
        const filtered = titleTerms.length
          ? jobs.filter((j) => titleTerms.some((t) => j.jobTitle?.toLowerCase().includes(t.toLowerCase())))
          : jobs;
        for (const job of filtered) {
          job.receivedDate = result.receivedDate.toLocaleString();
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
    renderJobs(currentJobs);

    if (currentJobs.length === 0) {
      emptyResultsDaysEl.textContent = countDaysEl.value;
      emptyResultsHelp.style.display = 'block';
    }
  } finally {
    retrievingJobsEl.style.display = 'none';
    jobsCountEl.style.display = '';
  }
}

async function loadSenderAddresses() {
  clearFollowedList();
  addresses = await senderData.addresses;

  // Each email entry is expected to carry an array of email addresses.
  for (const entry of addresses) {
    const option = document.createElement('option');
    const addressValues = entry.address.join(', ');
    const senderName = entry.sender ?? entry.name ?? '';
    option.value = addressValues;
    option.textContent = `${senderName} (${addressValues})`;
    slctTrackedSenders.appendChild(option);
  }

  // Ensure stop button reflects current selection state on load
  // if (slctTrackedSenders.options.length === 0) {
  //   btnStopTracking.disabled = true;
  // } else {
  //   btnStopTracking.disabled = slctTrackedSenders.selectedIndex < 0;
  // }
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

async function addJob(title) {
  await jobTitles.add(title);
  txtJobTitle.value = '';
  btnAddJobTitle.disabled = true;
  await loadJobTitles();
}

document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState === "visible") {
    clearFollowedList();
    await loadSenderAddresses();
    await loadDataFromEmails();
  }
});

document.addEventListener('DOMContentLoaded', async () => {
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

  btnRemoveJobTitle.disabled = true;
  btnAddJobTitle.disabled = true;

  txtJobTitle.addEventListener('input', () => {
    btnAddJobTitle.disabled = txtJobTitle.value.trim().length === 0;
  });

  btnAddJobTitle.addEventListener('click', () => addJob(txtJobTitle.value.trim()));

  slctJobTitles.addEventListener('change', () => {
    btnRemoveJobTitle.disabled = slctJobTitles.selectedIndex < 0;
  });

  btnRemoveJobTitle.addEventListener('click', async () => {
    const selectedOption = slctJobTitles.options[slctJobTitles.selectedIndex];
    if (selectedOption && selectedOption.value) {
      await jobTitles.remove(selectedOption.value);
      slctJobTitles.removeChild(selectedOption);
      slctJobTitles.dispatchEvent(new Event('change'));
    }
  });

  // Enable/disable stop-tracking button based on selection
  // slctTrackedSenders.addEventListener('change', () => {
  //   if (slctTrackedSenders.selectedIndex >= 0) {
  //     btnStopTracking.disabled = false;
  //   } else {
  //     btnStopTracking.disabled = true;
  //   }
  // });

  // Refresh the tracked address list from storage
  // btnRefreshSenders.addEventListener('click', async () => {
  //   await loadSenderAddresses();
  // });

  // Remove selected address from tracking
  // btnStopTracking.addEventListener('click', async () => {
  //   const selectedOption = slctTrackedSenders.options[slctTrackedSenders.selectedIndex];
  //   if (selectedOption && selectedOption.value) {
  //     const addresses = selectedOption.value.split(', ').map((e) => e.trim());
  //     await senderData.remove({ address: addresses });
  //     slctTrackedSenders.removeChild(selectedOption);
  //     slctTrackedSenders.dispatchEvent(new Event('change'));
  //   }
  // });
});

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

// btnTrackSender.addEventListener('click', async () => {
//   const senderData = {
//     sender: txtSender.value.trim(),
//     address: [txtSenderEmail.value.trim()]
//   };
//   senderData.add(senderData).then(() => {
//     // Clear inputs and disable button after successful addition
//     txtSender.value = '';
//     txtSenderEmail.value = '';
//     setButtonState();
//     loadSenderAddresses(); // Refresh the list to show the newly added sender
//   })
//     .catch((err) => {
//       console.error('Error adding sender:', err);
//     });
// });

// txtSenderEmail.addEventListener('input', () => {
//   setButtonState();
// });

// txtSender.addEventListener('input', () => {
//   setButtonState();
// });

async function refreshJobs() {
  clearJobsList();
  await dayRange.setDays(parseInt(countDaysEl.value, 10));
  await loadDataFromEmails();
}

btnRefreshJobs.addEventListener('click', async () => refreshJobs());
btnRefreshJobs2.addEventListener('click', async () => refreshJobs());

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
  setTimeout(() => (btnShare.textContent = original), 1200);
});

function markSortedHeading(th, direction = 'asc') {
  if (currentSortedTh) {
    currentSortedTh.classList.remove('th-sorted', 'sort-asc', 'sort-desc');
  }
  th.classList.add('th-sorted', `sort-${direction}`);
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
  renderJobs(currentJobs);
  markSortedHeading(th, nextDirection);
}

[thJobTitleEl, thCompanyEl, thLocationEl, thPayEl, thReceivedDateEl, thActionsEl].forEach((th) => {
  th.addEventListener('click', () => sortJobsByHeading(th));
});

function setButtonState() {
  const isSenderValid = evaluateSenderInput();
  const isAddressValid = evaluateAddressInput();
  btnTrackSender.disabled = !(isSenderValid && isAddressValid);
}

function clearJobsList() {
  document.getElementById('body-jobs-list').replaceChildren();
}

function clearJobTitlesList() {
  while (slctJobTitles.options.length > 0) {
    slctJobTitles.remove(0);
  }

  btnRemoveJobTitle.disabled = true;
  slctJobTitles.dispatchEvent(new Event('change'));
}

function clearFollowedList() {
  while (slctTrackedSenders.options.length > 0) {
    slctTrackedSenders.remove(0);
  }

  // btnStopTracking.disabled = true;
  slctTrackedSenders.dispatchEvent(new Event('change'));
}

function evaluateSenderInput() {
  const senderValue = txtSender.value.trim();
  return senderValue.length > 0;
}

function evaluateAddressInput() {
  const addressValue = txtSenderEmail.value.trim();
  const addressRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return addressRegex.test(addressValue);
}
