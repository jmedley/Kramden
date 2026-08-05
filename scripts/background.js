/*
  Copyright (c) 2026 Joseph Medley. All rights reserved.
  No part of this software may be used, copied, modified, or distributed
  without the express written permission of the author.
*/

import SenderData from '../ExtensionUtils/data.js';

const senderData = new SenderData();

const oldSenders = [
    { sender: 'Dice', address: ['dice@connect.dice.com'] },
    { sender: 'Glassdoor', address: ['noreply@glassdoor.com'] },
    { sender: 'Indeed', address: ['donotreply@match.indeed.com'] },
    { sender: 'Jobright', address: ['noreply@jobright.ai'] },
    { sender: 'LinkedIn', address: ['jobs-noreply@linkedin.com'] }
];

const defaultSenders = [
    { sender: 'Dice', address: ['connect.dice.com'] },
    { sender: 'Glassdoor', address: ['glassdoor.com'] },
    { sender: 'Indeed', address: ['jobalert.indeed.com'] },
    { sender: 'Indeed', address: ['match.indeed.com'] },
    { sender: 'Jobright', address: ['jobright.ai'] },
    { sender: 'LinkedIn', address: ['linkedin.com'] }
];

chrome.runtime.onInstalled.addListener(async () => {
    for (let sender of oldSenders) {
        await senderData.remove(sender);
    }

    for (let sender of defaultSenders) {
        await senderData.add(sender);
    }
});