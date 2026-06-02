import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('jobsController', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <table>
        <tbody>
          <tr>
            <td><span class="job-title">Staff Technical Writer</span></td>
            <td class="company">Pinecone</td>
            <td class="location">Remote</td>
            <td class="actions">
              <a class="btn-open" href="https://job.test/1">Open</a>
              <button class="btn-copy">Copy</button>
            </td>
          </tr>
        </tbody>
      </table>
    `;
  });

  it('reads existing rows and calls jobsView.renderJobs', async () => {
    // Provide a stubbed jobsView.renderJobs before importing controller
    window.jobsView = { renderJobs: vi.fn() };
    await import('../scripts/jobsController.js');

    // trigger DOMContentLoaded to invoke controller.init
    document.dispatchEvent(new Event('DOMContentLoaded'));

    expect(window.jobsView.renderJobs).toHaveBeenCalled();
    const arg = window.jobsView.renderJobs.mock.calls[0][0];
    expect(Array.isArray(arg)).toBe(true);
    expect(arg[0].title).toBe('Staff Technical Writer');
    expect(arg[0].company).toBe('Pinecone');
    expect(arg[0].url).toBe('https://job.test/1');
  });
});
