/*
  Copyright (c) 2026 Joseph Medley. All rights reserved.
  No part of this software may be used, copied, modified, or distributed
  without the express written permission of the author.
*/

// Data
const emailData = new EmailData();

// Elements
const lstFollowed = document.getElementById('select-followed-emails');
const btnStopTracking = document.getElementById('btn-stop-tracking');
const txtSender = document.getElementById('input-sender');
const txtSenderEmail = document.getElementById('input-sender-email');
const btnTrackSender = document.getElementById('btn-track-sender');


document.addEventListener('DOMContentLoaded', async () => {
  await emailData.ready;
  const emails = emailData.emails;
  console.log('Followed emails:', emails);
  
  // Each email entry is expected to carry an array of email addresses.
  for (const emailEntry of emails) {
    const option = document.createElement('option');
    const emailValues = emailEntry.email.join(', ');
    const emailSender = emailEntry.name;
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

  // Enable/disable stop-tracking button based on selection
  lstFollowed.addEventListener('change', () => {
    if (lstFollowed.selectedIndex >= 0) {
      btnStopTracking.disabled = false;
    } else {
      btnStopTracking.disabled = true;
    }
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

txtSenderEmail.addEventListener('input', () => {
  const value = txtSenderEmail.value.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  btnTrackSender.disabled = !emailRegex.test(value);
});