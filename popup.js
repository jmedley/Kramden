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
