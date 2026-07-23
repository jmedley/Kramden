/*
  Copyright (c) 2026 Joseph Medley. All rights reserved.
  No part of this software may be used, copied, modified, or distributed
  without the express written permission of the author.
*/

import { SenderData } from '../ExtensionUtils/data.js';

// State
let isFollowing = false;   // false = "Follow" showing, true = "Ignore" showing

// Data
const senderData = new SenderData();

// Elements
let tab;
const btnDashboard = document.getElementById('btn-dashboard');
const btnFollow = document.getElementById('btn-follow');
const followIcon = document.getElementById('follow-icon');
const followLabel = document.getElementById('follow-label');
const followError = document.getElementById('follow-error');

// Helpers
function setFollowUI(following) {
  isFollowing = following;
  followIcon.textContent = following ? '🔕' : '📌';
  followLabel.textContent = following ? 'Ignore current sender' : 'Follow current sender';
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
  const newSenderData = await getSenderFromActiveTab();
  if (!newSenderData) throw new Error('Could not determine sender of current email.');
  await senderData.add(newSenderData);
}

async function ignoreCurrentEmail() {
  const newSenderData = await getSenderFromActiveTab();
  if (!newSenderData) throw new Error('Could not determine sender of current email.');
  await senderData.remove(newSenderData);
}

// Handlers
btnDashboard.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
  window.close();
});

// btnFollow.addEventListener('click', async () => {
//   // showError('');
//   setLoading(true);

//   try {
//     if (!isFollowing) {
//       await followCurrentEmail();
//       setFollowUI(true);
//     } else {
//       await ignoreCurrentEmail();
//       setFollowUI(false);
//     }
//   } catch (err) {
//     // showError(err?.message ?? 'Something went wrong. Please try again.');
//   } finally {
//     setLoading(false);
//   }
//   window.close();
// });

// document.addEventListener('DOMContentLoaded', async () => {
//   const targetSubstring = "https://mail.google.com/mail";

//   [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
//   if (!tab) { return; }
//   if (!isEmailOpen(tab.url)) {
//     btnFollow.disabled = true;
//     return;
//   }

//   await senderData.ready;
//   const saved = await isAddressSaved();
//   console.log("Address saved:", saved);
//   if (saved) {
//     setFollowUI(true);
//   } else {
//     setFollowUI(false);
//   }
// });

async function isAddressSaved() {
  try {
    const data = await getSenderFromActiveTab();
    console.log("Sender data from active tab:", data);
    if (!data) throw new Error('Could not determine sender of current email.');
    // return await senderData.hasAddress(data);
    let retVal = await senderData.hasAddress(data);
    console.log("Result of hasAddress check:", retVal);
    return retVal;
  } catch (err) {
    console.error(err);
    return false;
  }
}

async function getSenderFromActiveTab() {
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