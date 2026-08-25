import { describe, it, expect, beforeEach, vi } from 'vitest';
import renderData, { initEventDelegation, createRow } from '../scripts/jobsview.js';

describe('jobsView', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <template id="job-row-template">
        <tr>
          <td><span class="job-title"></span></td>
          <td class="company"></td>
          <td class="location"></td>
          <td class="pay"></td>
          <td class="received-date"></td>
          <td class="actions">
            <a class="btn-open" href="#" target="_blank">Open</a>
            <button class="btn-copy" type="button" data-url="">Copy</button>
          </td>
        </tr>
      </template>
      <section id="section-records-list">
        <table>
          <tbody id="body-records-list"></tbody>
        </table>
      </section>
    `;
  });

  it('createRow populates fields from a job object', () => {
    const receivedDate = new Date('2026-01-01T00:00:00Z');
    const row = createRow({
      jobTitle: 'Staff Technical Writer',
      company: 'Pinecone',
      location: 'Remote',
      pay: '$180K–$230K',
      receivedDate,
      applyLink: 'https://example.test/job/1',
    });

    expect(row.querySelector('.job-title').textContent).toBe('Staff Technical Writer');
    expect(row.querySelector('.company').textContent).toBe('Pinecone');
    expect(row.querySelector('.location').textContent).toBe('Remote');
    expect(row.querySelector('.pay').textContent).toBe('$180K–$230K');
    expect(row.querySelector('.received-date').textContent).toBe(receivedDate.toLocaleString());
    expect(row.querySelector('.btn-open').getAttribute('href')).toBe('https://example.test/job/1');
    expect(row.querySelector('.btn-copy').dataset.url).toBe('https://example.test/job/1');
  });

  it('createRow falls back to defaults for missing fields', () => {
    const row = createRow({});
    expect(row.querySelector('.job-title').textContent).toBe('');
    expect(row.querySelector('.location').textContent).toBe('Not provided');
    expect(row.querySelector('.pay').textContent).toBe('Not provided');
    expect(row.querySelector('.received-date').textContent).toBe('Not provided');
    expect(row.querySelector('.btn-open').getAttribute('href')).toBe('#');
    expect(row.querySelector('.btn-copy').dataset.url).toBe('');
  });

  it('renderData (via the EmailView instance) appends rows to the records tbody', () => {
    const jobs = [
      { jobTitle: 'A', company: 'Co', applyLink: 'https://a' },
      { jobTitle: 'B', company: 'Co2', applyLink: 'https://b' },
    ];
    renderData(jobs);
    const trs = document.querySelectorAll('#body-records-list tr');
    expect(trs.length).toBe(2);
    expect(trs[0].querySelector('.job-title').textContent).toBe('A');
    expect(trs[1].querySelector('.job-title').textContent).toBe('B');
  });

  it('renderData clears previously rendered rows before appending new ones', () => {
    renderData([{ jobTitle: 'A', applyLink: 'https://a' }]);
    renderData([{ jobTitle: 'B', applyLink: 'https://b' }]);
    const trs = document.querySelectorAll('#body-records-list tr');
    expect(trs.length).toBe(1);
    expect(trs[0].querySelector('.job-title').textContent).toBe('B');
  });

  it('initEventDelegation wires up copy-to-clipboard on the records table', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    renderData([{ jobTitle: 'A', applyLink: 'https://a' }]);
    initEventDelegation();

    const btn = document.querySelector('.btn-copy');
    btn.click();

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://a');
    expect(btn.textContent).toBe('Copied');
  });
});
