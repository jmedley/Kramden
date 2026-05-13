/*
  Copyright (c) 2026 Joseph Medley. All rights reserved.
  No part of this software may be used, copied, modified, or distributed
  without the express written permission of the author.
*/

/**
 * Fetches the sender's email address for a given Gmail Message ID.
 * @param {string} messageId - The ID of the message to retrieve.
 * @param {string} accessToken - A valid Google OAuth2 access token.
 * @returns {Promise<string|null>} - The sender's email address or null if not found.
 */
async function getSenderEmail(messageId, accessToken) {
  // Use 'metadata' format to minimize data transfer; we only need headers.
  const url = `https://googleapis.com{messageId}?format=metadata&metadataHeaders=From`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error(`Error: ${response.statusText}`);

    const data = await response.json();
    
    // Find the 'From' header in the response payload
    const fromHeader = data.payload.headers.find(header => header.name === 'From');
    
    if (fromHeader) {
      // Extract email from "Name <email@example.com>" or just "email@example.com"
      const emailMatch = fromHeader.value.match(/<(.+)>|(\S+@\S+)/);
      return emailMatch ? (emailMatch[1] || emailMatch[2]) : fromHeader.value;
    }

    return null;
  } catch (error) {
    console.error("Failed to fetch sender email:", error);
    return null;
  }
}
