/*
  Copyright (c) 2026 Joseph Medley. All rights reserved.
  No part of this software may be used, copied, modified, or distributed
  without the express written permission of the author.
*/

// Data
const emailData = new EmailData();

// Elements
const selectList = document.getElementById('followed-emails');
const btnStop = document.getElementById('stop-tracking');


document.addEventListener('DOMContentLoaded', async () => {
  const emailData = new EmailData();
  await emailData.ready;
  const emails = emailData.emails;
  console.log('Followed emails:', emails);
  
  // Each email entry is expected to carry an array of email addresses.
  for (const emailEntry of emails) {
    const option = document.createElement('option');
    const emailValues = emailEntry.email.join(', ');
    const emailLabel = emailEntry.name;
    option.value = emailValues;
    option.textContent = `${emailLabel} (${emailValues})`;
    document.getElementById('followed-emails').appendChild(option);
  }

  // Enable/disable stop-tracking button based on selection
  selectList.addEventListener('change', () => {
    if (selectList.selectedIndex >= 0) {
      btnStop.disabled = false;
    } else {
      btnStop.disabled = true;
    }
  });

  // Remove selected email from tracking
  btnStop.addEventListener('click', async () => {
    const selectedOption = selectList.options[selectList.selectedIndex];
    if (selectedOption && selectedOption.value) {
      const emails = selectedOption.value.split(', ').map((e) => e.trim());
      await emailData.remove({ email: emails });
      selectList.removeChild(selectedOption);
      selectList.dispatchEvent(new Event('change'));
    }
  });
});

// function copyUrl(btn, url) {
//   navigator.clipboard.writeText(url).then(() => {
//     btn.textContent = "Copied!";
//     btn.classList.add("copied");
//     setTimeout(() => {
//       btn.textContent = "Copy";
//       btn.classList.remove("copied");
//     }, 1800);
//   }).catch(() => {
//     const ta = document.createElement("textarea");
//     ta.value = url;
//     ta.style.position = "fixed";
//     ta.style.opacity = "0";
//     document.body.appendChild(ta);
//     ta.select();
//     document.execCommand("copy");
//     document.body.removeChild(ta);
//     btn.textContent = "Copied!";
//     btn.classList.add("copied");
//     setTimeout(() => {
//       btn.textContent = "Copy";
//       btn.classList.remove("copied");
//     }, 1800);
//   });
// }

// Build sections
// sections.forEach(section => {
//   const div = document.createElement("div");
//   div.className = "section";

//   const header = document.createElement("div");
//   header.className = "section-header";
//   header.innerHTML = `${section.label} <span class="count">${section.jobs.length}</span>`;
//   div.appendChild(header);

//   const table = document.createElement("table");
//   table.innerHTML = `<thead><tr><th>Job Title</th><th>Company</th><th>Location</th><th></th></tr></thead>`;
//   const tbody = document.createElement("tbody");

//   section.jobs.forEach(job => {
//     const tr = document.createElement("tr");
//     tr.innerHTML = `
//       <td class="title">${job.title}</td>
//       <td class="company">${job.company}</td>
//       <td class="location">${job.location}</td>
//       <td class="actions">
//         <a href="${job.url}" target="_blank" class="btn btn-open">Open</a>
//         <button class="btn btn-copy" onclick="copyUrl(this, '${job.url.replace(/'/g, "\\'")}')">Copy</button>
//       </td>
//     `;
//     tbody.appendChild(tr);
//   });

//   table.appendChild(tbody);
//   div.appendChild(table);
//   document.body.appendChild(div);
// });

// // No-URL section
// const noUrlDiv = document.createElement("div");
// noUrlDiv.className = "section";
// const noUrlHeader = document.createElement("div");
// noUrlHeader.className = "section-header";
// noUrlHeader.innerHTML = `Emails Without Extractable Job URLs <span class="count">${noUrl.length}</span>`;
// noUrlDiv.appendChild(noUrlHeader);

// const noUrlTable = document.createElement("table");
// noUrlTable.className = "no-url-table";
// noUrlTable.innerHTML = `<thead><tr><th>Sender</th><th>Subject</th><th>Date</th><th>Time (PDT)</th></tr></thead>`;
// const noUrlBody = document.createElement("tbody");
// noUrl.forEach(row => {
//   const tr = document.createElement("tr");
//   tr.innerHTML = `
//     <td class="sender">${row.sender}</td>
//     <td class="subject">${row.subject}</td>
//     <td>${row.date}</td>
//     <td>${row.time}</td>
//   `;
//   noUrlBody.appendChild(tr);
// });
// noUrlTable.appendChild(noUrlBody);
// noUrlDiv.appendChild(noUrlTable);
// document.body.appendChild(noUrlDiv);

// function copyUrl(url, btn) {
//   navigator.clipboard.writeText(url).then(() => {
//     const original = btn.textContent;
//     btn.textContent = 'Copied!';
//     btn.classList.add('copied');
//     setTimeout(() => {
//       btn.textContent = original;
//       btn.classList.remove('copied');
//     }, 2000);
//   });
// }