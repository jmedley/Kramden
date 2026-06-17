/*
  Copyright (c) 2026 Joseph Medley. All rights reserved.
  No part of this software may be used, copied, modified, or distributed
  without the express written permission of the author.
*/

// Data
const emailData = new EmailData();
let emails;

// Elements
const lstFollowed = document.getElementById('select-followed-emails');
const btnStopTracking = document.getElementById('btn-stop-tracking');
const btnRefreshList = document.getElementById('btn-refresh-list');
const txtSender = document.getElementById('input-sender');
const txtSenderEmail = document.getElementById('input-sender-email');
const btnTrackSender = document.getElementById('btn-track-sender');

async function loadEmailData() {
  const authToken = await getAuthToken();
  const emailClient = new EmailClient(authToken, emails, false);
  const ids = await emailClient.loadIDs();
  console.log('Loaded email IDs:', ids);
}

async function loadEmailAddresses() {
  clearFollowedList();

  // Each email entry is expected to carry an array of email addresses.
  for (const emailEntry of emails) {
    const option = document.createElement('option');
    const emailValues = emailEntry.email.join(', ');
    const emailSender = emailEntry.sender ?? emailEntry.name ?? '';
    option.value = emailValues;
    option.textContent = `${emailSender} (${emailValues})`;
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
    await loadEmailAddresses();
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  await emailData.ready;
  emails = await emailData.emails;
  await loadEmailAddresses();
  await loadEmailData();

  // Enable/disable stop-tracking button based on selection
  lstFollowed.addEventListener('change', () => {
    if (lstFollowed.selectedIndex >= 0) {
      btnStopTracking.disabled = false;
    } else {
      btnStopTracking.disabled = true;
    }
  });

  // Refresh the tracked email list from storage
  btnRefreshList.addEventListener('click', async () => {
    await loadEmailAddresses();
  });

  // Remove selected email from tracking
  btnStopTracking.addEventListener('click', async () => {
    const selectedOption = lstFollowed.options[lstFollowed.selectedIndex];
    if (selectedOption && selectedOption.value) {
      const emails = selectedOption.value.split(', ').map((e) => e.trim());
      await emailData.remove({ email: emails });
      lstFollowed.removeChild(selectedOption);
      lstFollowed.dispatchEvent(new Event('change'));
    }
  });
});

btnTrackSender.addEventListener('click', async () => {
  const senderData = {
    sender: txtSender.value.trim(),
    email: [txtSenderEmail.value.trim()]
  };
  emailData.add(senderData).then(() => {
    // Clear inputs and disable button after successful addition
    txtSender.value = '';
    txtSenderEmail.value = '';
    setButtonState();
    loadEmailAddresses(); // Refresh the list to show the newly added sender
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

function setButtonState() {
  const isSenderValid = evaluateSenderInput();
  const isEmailValid = evaluateEmailInput();
  btnTrackSender.disabled = !(isSenderValid && isEmailValid);
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

function evaluateEmailInput() {
  const emailValue = txtSenderEmail.value.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(emailValue);
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