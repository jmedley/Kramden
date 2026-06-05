// content.js
function getSenderOfOpenEmail() {
  // Gmail often hides the full email address until you click to show details.
  // Narrow the search to the currently open message area before looking for span[email].
  const detailButton = document.querySelector('div[aria-label="Show details"], span[aria-label="Show details"]');
  const scope = detailButton?.closest('div[role="article"], div[role="main"], div[jscontroller], div[role="presentation"], div[role="heading"]') || document.body;

  const candidates = Array.from(scope.querySelectorAll('span[email], a[email]'));
  const senderElement = candidates.find((element) => {
    const email = element.getAttribute('email');
    const text = String(element.innerText || '').trim();
    return email && text;
  }) || Array.from(document.querySelectorAll('div[role="main"] span[email], div[role="main"] a[email]')).find((element) => {
    const email = element.getAttribute('email');
    const text = String(element.innerText || '').trim();
    return email && text;
  });

  console.log('Sender element found:', senderElement);

  if (senderElement) {
    return {
      sender: String(senderElement.innerText).trim(),
      email: [senderElement.getAttribute('email')]
    };
  }

  return null;
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log(request.action);
  if (request.action === "getSender") {
    const senderData = getSenderOfOpenEmail();
    sendResponse(senderData);
  }
});
