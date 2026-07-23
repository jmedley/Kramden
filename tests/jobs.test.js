/*
  Copyright (c) 2026 Joseph Medley. All rights reserved.
  No part of this software may be used, copied, modified, or distributed
  without the express written permission of the author.
*/
import { describe, expect, it } from 'vitest';
import { Jobs } from '../scripts/data.js';

describe('Jobs', () => {
  describe('add()', () => {
    it('does not store a duplicate job with the same title, company, and location', () => {
      const instance = new Jobs();
      const job = { jobTitle: 'Software Engineer', company: 'Acme', location: 'Remote' };

      instance.add([job]);
      instance.add([job]);

      expect(instance.jobs).toEqual([job]);
    });
  });
});
