/*
  Copyright (c) 2026 Joseph Medley. All rights reserved.
  No part of this software may be used, copied, modified, or distributed
  without the express written permission of the author.
*/

// -------------------------------------------------------------------------
// Placeholders — replace with real implementations
// -------------------------------------------------------------------------
/* async function followCurrentEmail() { ... } */
/* async function ignoreCurrentEmail() { ... } */

// -------------------------------------------------------------------------
// State
// -------------------------------------------------------------------------
let isFollowing = false;   // false = "Follow" showing, true = "Ignore" showing

// -------------------------------------------------------------------------
// Elements
// -------------------------------------------------------------------------
const btnDashboard = document.getElementById('btn-dashboard');
const btnFollow    = document.getElementById('btn-follow');
const followIcon   = document.getElementById('follow-icon');
const followLabel  = document.getElementById('follow-label');
const followError  = document.getElementById('follow-error');

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------
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
  const regex = /#inbox\/\w{32}/;
  return regex.test(str);
}

// -------------------------------------------------------------------------
// Handlers
// -------------------------------------------------------------------------
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
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (tab && tab.url) {
    // Check if the URL contains the target string
    if (tab.url.includes(targetSubstring) && isEmailOpen(tab.url)) {
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
