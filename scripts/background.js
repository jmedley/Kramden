/*
  Copyright (c) 2026 Joseph Medley. All rights reserved.
  No part of this software may be used, copied, modified, or distributed
  without the express written permission of the author.
*/

import SenderData from '../ExtensionUtils/data.js';

const senderData = new SenderData();

const defaultSenders = [
    { sender: 'Dice', address: ['dice@connect.dice.com'] },
    { sender: 'Glassdoor', address: ['noreply@glassdoor.com'] },
    { sender: 'Indeed', address: ['donotreply@match.indeed.com'] },
    { sender: 'Jobright', address: ['noreply@jobright.ai'] },
    { sender: 'LinkedIn', address: ['jobs-noreply@linkedin.com'] }
];

chrome.runtime.onInstalled.addListener(async () => {
    for (let sender of defaultSenders) {
        await senderData.add(sender);
    }
});