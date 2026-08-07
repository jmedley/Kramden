import { describe, it, expect, beforeEach } from 'vitest';

describe('jobsView', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <template id="job-row-template">
        <tr>
          <td><span class="job-title"></span></td>
          <td class="company"></td>
          <td class="location"></td>
          <td class="actions">
            <a class="btn-open" href="#" target="_blank">Open</a>
            <button class="btn-copy" type="button" data-url="">Copy</button>
          </td>
        </tr>
      </template>
      <table>
        <tbody></tbody>
      </table>
    `;
  });

  it('exposes jobsView and can createRow', async () => {
    await import('../scripts/jobsview.js');
    expect(window.jobsView).toBeDefined();
    const row = window.jobsView.createRow({
      title: 'Staff Technical Writer',
      company: 'Pinecone',
      location: 'Remote · $180K–$230K',
      url: 'https://example.test/job/1',
    });

    expect(row.querySelector('.job-title').textContent).toBe('Staff Technical Writer');
    expect(row.querySelector('.company').textContent).toBe('Pinecone');
    expect(row.querySelector('.location').textContent).toBe('Remote · $180K–$230K');
    expect(row.querySelector('.btn-open').href).toBe('https://example.test/job/1/');
    expect(row.querySelector('.btn-copy').dataset.url).toBe('https://example.test/job/1');
  });

  it('renderJobs appends rows to tbody', async () => {
    await import('../scripts/jobsview.js');
    const jobs = [
      { title: 'A', company: 'Co', location: 'Loc', url: 'https://a' },
      { title: 'B', company: 'Co2', location: 'Loc2', url: 'https://b' },
    ];
    window.jobsView.renderJobs(jobs);
    const trs = document.querySelectorAll('table tbody tr');
    expect(trs.length).toBe(2);
    expect(trs[0].querySelector('.job-title').textContent).toBe('A');
  });
});
