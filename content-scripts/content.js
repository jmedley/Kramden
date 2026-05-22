// content.js
function getSenderOfOpenEmail() {
  // Gmail often hides the full email address until you click to show details
  // Here we query for the official data-hovercard-id or email tooltip attributes
  const senderElement = document.querySelector('div[aria-label="Show details"] span[email], span[email]');
  
  if (senderElement) {
    return {
      name: senderElement.innerText,
      email: [senderElement.getAttribute('email')]
    }
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
