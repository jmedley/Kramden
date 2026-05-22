/*
  Copyright (c) 2026 Joseph Medley. All rights reserved.
  No part of this software may be used, copied, modified, or distributed
  without the express written permission of the author.
*/

// State
let isFollowing = false;   // false = "Follow" showing, true = "Ignore" showing

// Data
const emailData = new EmailData();

// Elements
let tab;
const btnDashboard = document.getElementById('btn-dashboard');
const btnFollow    = document.getElementById('btn-follow');
const followIcon   = document.getElementById('follow-icon');
const followLabel  = document.getElementById('follow-label');
const followError  = document.getElementById('follow-error');

// Helpers
function setFollowUI(following) {
  isFollowing = following;
  followIcon.textContent  = following ? '🔕' : '📌';
  followLabel.textContent = following ? 'Ignore current email' : 'Follow current email';
}

function setLoading(on) {
  btnFollow.disabled = on;
  btnDashboard.disabled = on;

  if (on) {
    const spinner = document.createElement('span');
    spinner.className = 'spinner';
    spinner.id = 'follow-spinner';
    btnFollow.prepend(spinner);
  } else {
    document.getElementById('follow-spinner')?.remove();
  }
}

function showError(msg) {
  followError.textContent = msg;
  followError.style.display = msg ? 'block' : 'none';
}

function isEmailOpen(str) {
  const regex = /\/\w{32}/;
  return regex.test(str);
}

async function followCurrentEmail() { 
  const senderData = await getEmailFromActiveTab();
  if (!senderData) throw new Error('Could not determine sender of current email.');
  await emailData.add(senderData);
 }

async function ignoreCurrentEmail() { 
  const senderData = await getEmailFromActiveTab();
  if (!senderData) throw new Error('Could not determine sender of current email.');
  await emailData.remove(senderData.email);
}

// Handlers
btnDashboard.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

btnFollow.addEventListener('click', async () => {
  showError('');
  setLoading(true);

  try {
    if (!isFollowing) {
      await followCurrentEmail();
      setFollowUI(true);
    } else {
      await ignoreCurrentEmail();
      setFollowUI(false);
    }
  } catch (err) {
    showError(err?.message ?? 'Something went wrong. Please try again.');
  } finally {
    setLoading(false);
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  const targetSubstring = "https://mail.google.com/mail";

  // Query for the active tab in the current window
  [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (tab && tab.url) {
    // Check if the URL contains the target string
    if (tab.url.includes(targetSubstring) && isEmailOpen(tab.url) &&!isEmailSaved()) {
      btnFollow.disabled = false;
      btnFollow.classList.remove('deactivated');
      console.log("Match found: Button activated.");
    } else {
      btnFollow.disabled = true;
      btnFollow.classList.add('deactivated');
      console.log("No match: Button deactivated.");
    }
  }  
});

function isEmailSaved() {
  const senderData = getEmailFromActiveTab()
    .then((data) => {
      if (!data) throw new Error('Could not determine sender of current email.');
      return emailData.hasEmail(data.email);
    })
    .catch((err) => {
      console.error(err);
      return false;
    });
}

async function getEmailFromActiveTab() {
  return await new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tab.id, { action: "getSender" }, (response) => {
      if (response) {
        resolve(response);
      } else {
        reject(new Error("No sender data found. Is an email open?"));
      }
    });
  });
}