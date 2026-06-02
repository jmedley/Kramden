(function () {
  function readExistingRows() {
    const tbody = document.querySelector('#section-jobs-list table tbody');
    if (!tbody) return [];
    const rows = Array.from(tbody.querySelectorAll('tr'));
    return rows.map((row) => {
      const title = row.querySelector('.job-title')?.textContent?.trim() || '';
      const company = row.querySelector('.company')?.textContent?.trim() || '';
      const location = row.querySelector('.location')?.textContent?.trim() || '';
      const anchor = row.querySelector('.btn-open');
      const url = anchor?.href || '';
      return { title, company, location, url };
    });
  }

  function init() {
    const jobs = readExistingRows();
    if (window.jobsView && typeof window.jobsView.renderJobs === 'function') {
      window.jobsView.renderJobs(jobs);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
