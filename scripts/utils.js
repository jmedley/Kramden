/*
  Copyright (c) 2026 Joseph Medley. All rights reserved.
  No part of this software may be used, copied, modified, or distributed
  without the express written permission of the author.
*/

function sortObjects(objectArray, key) {
    const sorted = _mergeSortObjects(objectArray, key);

    for (let i = 0; i < sorted.length; i++) {
        objectArray[i] = sorted[i];
    }

    return objectArray;
}

function _mergeSortObjects(objectArray, key) {
    if (objectArray.length <= 1) {
        return objectArray;
    }

    const middle = Math.floor(objectArray.length / 2);
    const left = _mergeSortObjects(objectArray.slice(0, middle), key);
    const right = _mergeSortObjects(objectArray.slice(middle), key);

    return _mergeObjects(left, right, key);
}

function _mergeObjects(left, right, key) {
    const result = [];
    let i = 0;
    let j = 0;

    while (i < left.length && j < right.length) {
        if (left[i][key].localeCompare(right[j][key], undefined, { sensitivity: 'base' }) <= 0) {
            result.push(left[i]);
            i++;
        } else {
            result.push(right[j]);
            j++;
        }
    }

    return result.concat(left.slice(i)).concat(right.slice(j));
}

export { sortObjects };
