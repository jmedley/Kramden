/*
  Copyright (c) 2026 Joseph Medley. All rights reserved.
  No part of this software may be used, copied, modified, or distributed
  without the express written permission of the author.
*/

const btnDashboard = document.getElementById('btn-dashboard');

btnDashboard.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
  window.close();
});