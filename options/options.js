/*
  Copyright (c) 2026 Joseph Medley. All rights reserved.
  No part of this software may be used, copied, modified, or distributed
  without the express written permission of the author.
*/

// Data
const emailData = new EmailData();

// Elements
const lstFollowed = document.getElementById('select-followed-emails');
const btnStop = document.getElementById('btn-stop-tracking');
const txtAddEmail = document.getElementById('input-add-email');
const btnAddEmail = document.getElementById('btn-add-email');


document.addEventListener('DOMContentLoaded', async () => {
  await emailData.ready;
  const emails = emailData.emails;
  console.log('Followed emails:', emails);
  
  // Each email entry is expected to carry an array of email addresses.
  for (const emailEntry of emails) {
    const option = document.createElement('option');
    const emailValues = emailEntry.email.join(', ');
    const emailLabel = emailEntry.name;
    option.value = emailValues;
    option.textContent = `${emailLabel} (${emailValues})`;
    lstFollowed.appendChild(option);
  }

  // Ensure stop button reflects current selection state on load
  if (lstFollowed.options.length === 0) {
    btnStop.disabled = true;
  } else {
    btnStop.disabled = lstFollowed.selectedIndex < 0;
  }

  // Enable/disable stop-tracking button based on selection
  lstFollowed.addEventListener('change', () => {
    if (lstFollowed.selectedIndex >= 0) {
      btnStop.disabled = false;
    } else {
      btnStop.disabled = true;
    }
  });

  // Remove selected email from tracking
  btnStop.addEventListener('click', async () => {
    const selectedOption = lstFollowed.options[lstFollowed.selectedIndex];
    if (selectedOption && selectedOption.value) {
      const emails = selectedOption.value.split(', ').map((e) => e.trim());
      await emailData.remove({ email: emails });
      lstFollowed.removeChild(selectedOption);
      lstFollowed.dispatchEvent(new Event('change'));
    }
  });
});

txtAddEmail.addEventListener('input', () => {
  const value = txtAddEmail.value.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  btnAddEmail.disabled = !emailRegex.test(value);
});