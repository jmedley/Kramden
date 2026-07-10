/*
  Copyright (c) 2026 Joseph Medley. All rights reserved.
  No part of this software may be used, copied, modified, or distributed
  without the express written permission of the author.
*/
import EmailClient from '../scripts/emailClient.js';
import getJobs from '../EmailParsers/index.js';
import renderJobs from '../scripts/jobsView.js';
import SenderData from '../scripts/data.js';
import { DayRange } from '../scripts/data.js';
import { JobTitles } from '../scripts/data.js';
import { Jobs } from '../scripts/data.js';
import { SortColumn } from '../scripts/data.js';
import { sortObjects } from '../scripts/utils.js';

// Data
const senderData = new SenderData();
const jobTitles = new JobTitles();
const dayRange = new DayRange();
const sortColumn = new SortColumn();
let addresses;
let currentJobs = [];
let currentSortedTh = null;


// Jobs List
const initialHelp = document.getElementById('initial-help');
const jobsCountEl = document.getElementById('count-jobs');
const retrievingJobsEl = document.getElementById('retrieving-jobs');
const countDaysEl = document.getElementById('count-days');
const btnRefreshJobs = document.getElementById('btn-refresh-jobs');

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
const btnRefreshJobTitles = document.getElementById('btn-refresh-job-titles');
const txtJobTitle = document.getElementById('input-job-title');
const btnAddJobTitle = document.getElementById('btn-add-job-title');

async function loadDataFromEmails() {
  if (slctJobTitles.length > 0) {
    initialHelp.style.display = 'none';
  } else {
    return;
  }

  jobsCountEl.style.display = 'none';
  retrievingJobsEl.style.display = 'inline-flex';

  try {
    const authToken = await getAuthToken();
    const emailClient = new EmailClient(authToken, addresses, false, parseInt(countDaysEl.value, 10));
    const ids = await emailClient.loadIDs();
    const titleTerms = await jobTitles.getTitles();
    const jobsData = new Jobs();

    for (const id of ids) {
      try {
        const message = await emailClient.getMessage(id);
        const jobs = getJobs(message);
        if (!jobs.jobs.length) {
          console.log(`No jobs found from ${jobs.senderEmail}`);
        }
        const filtered = titleTerms.length
          ? jobs.jobs.filter((j) => titleTerms.some((t) => j.jobTitle?.toLowerCase().includes(t.toLowerCase())))
          : jobs.jobs;
        for (const job of filtered) {
          job.receivedDate = jobs.receivedDate.toLocaleString();
        }
        jobsData.add(filtered);
      } catch (err) {
        console.error(`Error processing email ID ${id}:`, err);
      }
    }

    jobsCountEl.textContent = jobsData.jobs.length;
    const sortTh = currentSortedTh || thReceivedDateEl;
    currentJobs = sortObjects(jobsData.jobs, jobHeadingSortKeys[sortTh.id]);
    markSortedHeading(sortTh);
    renderJobs(currentJobs);
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
  if (slctTrackedSenders.options.length === 0) {
    btnStopTracking.disabled = true;
  } else {
    btnStopTracking.disabled = slctTrackedSenders.selectedIndex < 0;
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

document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState === "visible") {
    clearFollowedList();
    await loadSenderAddresses();
    await loadDataFromEmails();
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  const storedColumnId = await sortColumn.getColumn();
  if (storedColumnId && jobHeadingSortKeys[storedColumnId]) {
    const storedTh = document.getElementById(storedColumnId);
    if (storedTh) {
      markSortedHeading(storedTh);
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

  btnAddJobTitle.addEventListener('click', async () => {
    const title = txtJobTitle.value.trim();
    await jobTitles.add(title);
    txtJobTitle.value = '';
    btnAddJobTitle.disabled = true;
    await loadJobTitles();
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
    }
  });

  // Enable/disable stop-tracking button based on selection
  slctTrackedSenders.addEventListener('change', () => {
    if (slctTrackedSenders.selectedIndex >= 0) {
      btnStopTracking.disabled = false;
    } else {
      btnStopTracking.disabled = true;
    }
  });

  // Refresh the tracked address list from storage
  btnRefreshSenders.addEventListener('click', async () => {
    await loadSenderAddresses();
  });

  btnRefreshJobTitles.addEventListener('click', async () => {
    await loadJobTitles();
  });

  // Remove selected address from tracking
  btnStopTracking.addEventListener('click', async () => {
    const selectedOption = slctTrackedSenders.options[slctTrackedSenders.selectedIndex];
    if (selectedOption && selectedOption.value) {
      const addresses = selectedOption.value.split(', ').map((e) => e.trim());
      await senderData.remove({ address: addresses });
      slctTrackedSenders.removeChild(selectedOption);
      slctTrackedSenders.dispatchEvent(new Event('change'));
    }
  });
});

btnTrackSender.addEventListener('click', async () => {
  const senderData = {
    sender: txtSender.value.trim(),
    address: [txtSenderEmail.value.trim()]
  };
  senderData.add(senderData).then(() => {
    // Clear inputs and disable button after successful addition
    txtSender.value = '';
    txtSenderEmail.value = '';
    setButtonState();
    loadSenderAddresses(); // Refresh the list to show the newly added sender
  })
    .catch((err) => {
      console.error('Error adding sender:', err);
    });
});

txtSenderEmail.addEventListener('input', () => {
  setButtonState();
});

txtSender.addEventListener('input', () => {
  setButtonState();
});


btnRefreshJobs.addEventListener('click', async () => {
  clearJobsList();
  await dayRange.setDays(parseInt(countDaysEl.value, 10));
  await loadDataFromEmails();
});

btnRefreshJobTitles.addEventListener('click', async () => {
  clearJobsList();
  await loadDataFromEmails();
});

function markSortedHeading(th) {
  if (currentSortedTh) {
    currentSortedTh.classList.remove('th-sorted');
  }
  th.classList.add('th-sorted');
  currentSortedTh = th;
  sortColumn.setColumn(th.id);
}

function sortJobsByHeading(th) {
  const key = jobHeadingSortKeys[th.id];
  if (!key || currentJobs.length === 0) return;
  sortObjects(currentJobs, key);
  renderJobs(currentJobs);
  markSortedHeading(th);
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

  btnStopTracking.disabled = true;
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

function getAuthToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      console.log('Auth token obtained:', token);
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
      } else {
        console.log('Auth token obtained successfully:', token);
        resolve(token);
      }
    });
  });
}
