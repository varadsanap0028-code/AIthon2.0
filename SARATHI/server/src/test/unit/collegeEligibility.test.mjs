import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { checkEligibility } from '../../services/collegeDrivesService.js';

const drive = (over = {}) => ({
  eligibility: {
    branches: ['CSE', 'IT'],
    minReadiness: 60,
    requiredSkills: ['React.js'],
    verifiedPassportRequired: false,
    ...over,
  },
});

describe('College eligibility engine', () => {
  test('eligible student passes all gates', () => {
    const r = checkEligibility({ branch: 'CSE' }, drive(), 75, ['React.js']);
    assert.strictEqual(r.eligible, true);
  });

  test('wrong branch is rejected', () => {
    const r = checkEligibility({ branch: 'ECE' }, drive(), 90, ['React.js']);
    assert.strictEqual(r.eligible, false);
    assert.match(r.reason, /Branch/);
  });

  test('low readiness is rejected', () => {
    const r = checkEligibility({ branch: 'CSE' }, drive(), 40, ['React.js']);
    assert.strictEqual(r.eligible, false);
    assert.match(r.reason, /Readiness/);
  });

  test('missing verified skills are rejected', () => {
    const r = checkEligibility({ branch: 'CSE' }, drive(), 80, ['Python']);
    assert.strictEqual(r.eligible, false);
    assert.match(r.reason, /Missing verified skills/);
  });

  test('verified passport gate enforced when required', () => {
    const d = drive({ requiredSkills: [], verifiedPassportRequired: true });
    const r = checkEligibility({ branch: 'CSE' }, d, 80, []);
    assert.strictEqual(r.eligible, false);
    assert.match(r.reason, /Verified passport/);
  });
});
