/* jobsview.js — renders job rows using the #job-row-template and handles UI events */
const tbodySelector = '#section-jobs-list table tbody';
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

function renderJobs(jobs = []) {
  const tbody = document.getElementById('body-jobs-list');
  if (!tbody) return;
  tbody.innerHTML = '';
  const frag = document.createDocumentFragment();
  jobs.forEach((job) => frag.appendChild(createRow(job)));
  tbody.appendChild(frag);
}

function handleClick(e) {
  const btn = e.target.closest('.btn-copy');
  if (!btn) return;
  const url = btn.dataset.url || btn.getAttribute('data-url') || '';
  if (!url) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).catch(() => { });
  }
  const original = btn.textContent;
  btn.textContent = 'Copied';
  setTimeout(() => (btn.textContent = original), 1200);
}

function initEventDelegation() {
  const tbody = document.querySelector(tbodySelector);
  if (!tbody) return;
  tbody.addEventListener('click', handleClick);
}

// window.jobsView = { renderJobs, initEventDelegation, createRow };
export { initEventDelegation, createRow };
export default renderJobs;
document.addEventListener('DOMContentLoaded', initEventDelegation);
