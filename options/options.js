/*
  Copyright (c) 2026 Joseph Medley. All rights reserved.
  No part of this software may be used, copied, modified, or distributed
  without the express written permission of the author.
*/
import EmailClient from '../scripts/emailClient.js';
import getJobs from '../EmailParsers/index.js';
import renderJobs from '../scripts/jobsView.js';
import SenderData from '../scripts/data.js';

// Data
const senderData = new SenderData();
let addresses;

// Elements
const lstFollowed = document.getElementById('select-followed-emails');
const btnStopTracking = document.getElementById('btn-stop-tracking');
const btnRefreshList = document.getElementById('btn-refresh-list');
const txtSender = document.getElementById('input-sender');
const txtSenderEmail = document.getElementById('input-sender-email');
const btnTrackSender = document.getElementById('btn-track-sender');
const jobsCountEl = document.getElementById('count-jobs');
const countDaysEl = document.getElementById('count-days');

async function loadSenderData() {
  const authToken = await getAuthToken();
  const emailClient = new EmailClient(authToken, addresses, false);
  const ids = await emailClient.loadIDs();
  console.log('Loaded email IDs:', ids);
  let jobsCount = 0;

  for (const id of ids) {
    try {
      const message = await emailClient.getMessage(id);
      console.log('Fetched email message:', message);
      const jobs = getJobs(message);
      jobsCount += jobs.jobs.length;
      jobsCountEl.textContent = jobsCount;
      renderJobs(jobs.jobs);
    } catch (err) {
      console.error(`Error processing email ID ${id}:`, err);
    }
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
    lstFollowed.appendChild(option);
  }

  // Ensure stop button reflects current selection state on load
  if (lstFollowed.options.length === 0) {
    btnStopTracking.disabled = true;
  } else {
    btnStopTracking.disabled = lstFollowed.selectedIndex < 0;
  }
}

document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState === "visible") {
    clearFollowedList();
    await loadSenderAddresses();
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  await senderData.ready;
  await loadSenderAddresses();
  await loadSenderData();

  // Enable/disable stop-tracking button based on selection
  lstFollowed.addEventListener('change', () => {
    if (lstFollowed.selectedIndex >= 0) {
      btnStopTracking.disabled = false;
    } else {
      btnStopTracking.disabled = true;
    }
  });

  // Refresh the tracked address list from storage
  btnRefreshList.addEventListener('click', async () => {
    await loadSenderAddresses();
  });

  // Remove selected address from tracking
  btnStopTracking.addEventListener('click', async () => {
    const selectedOption = lstFollowed.options[lstFollowed.selectedIndex];
    if (selectedOption && selectedOption.value) {
      const addresses = selectedOption.value.split(', ').map((e) => e.trim());
      await senderData.remove({ address: addresses });
      lstFollowed.removeChild(selectedOption);
      lstFollowed.dispatchEvent(new Event('change'));
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

countDaysEl.addEventListener('input', () => {
  const digitsOnly = countDaysEl.value.replace(/\D/g, '');
  const clamped = Math.min(31, Math.max(1, parseInt(digitsOnly, 10) || 1));
  countDaysEl.value = clamped;
});

function setButtonState() {
  const isSenderValid = evaluateSenderInput();
  const isAddressValid = evaluateEmailInput();
  btnTrackSender.disabled = !(isSenderValid && isAddressValid);
}

function clearFollowedList() {
  while (lstFollowed.options.length > 0) {
    lstFollowed.remove(0);
  }

  btnStopTracking.disabled = true;
  lstFollowed.dispatchEvent(new Event('change'));
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