/*
  Copyright (c) 2026 Joseph Medley. All rights reserved.
  No part of this software may be used, copied, modified, or distributed
  without the express written permission of the author.
*/

/* jobsview.js — renders job rows using the #job-row-template and handles UI events */
import { EmailView } from '../extensionutils/emailview.js';

const templateId = 'job-row-template';

function getTemplate() {
  return document.getElementById(templateId);
}

function createRow(job = {}) {
  const tpl = getTemplate();
  if (!tpl) return document.createElement('tr');

  const tr = tpl.content.querySelector('tr').cloneNode(true);
  const titleEl = tr.querySelector('.job-title');
  const companyEl = tr.querySelector('.company');
  const locationEl = tr.querySelector('.location');
  const payEl = tr.querySelector('.pay');
  const receivedDateEl = tr.querySelector('.received-date');
  const anchor = tr.querySelector('.btn-open');
  const btnCopy = tr.querySelector('.btn-copy');

  if (titleEl) titleEl.textContent = job.jobTitle || '';
  if (companyEl) companyEl.textContent = job.company || '';
  if (locationEl) locationEl.textContent = job.location || 'Not provided';
  if (payEl) payEl.textContent = job.pay || 'Not provided';
  if (receivedDateEl) receivedDateEl.textContent = job.receivedDate ? job.receivedDate.toLocaleString() : 'Not provided';
  if (anchor) {
    anchor.href = job.applyLink || '#';
    anchor.target = '_blank';
  }
  if (btnCopy) btnCopy.dataset.url = job.applyLink || '';

  return tr;
}

const emailView = new EmailView(createRow);
const renderData = emailView.renderData.bind(emailView);
const initEventDelegation = emailView.initEventDelegation.bind(emailView);

export { initEventDelegation, createRow };
export default renderData;
document.addEventListener('DOMContentLoaded', initEventDelegation);
