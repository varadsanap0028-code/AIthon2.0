import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkGstin,
  checkPan,
  checkEmailDomain,
  checkDuplicateDocument,
  checkDuplicateTaxIdentifier,
} from '../../services/admin/approvalHintEngine.js';

describe('ApprovalHintEngine Unit Tests', () => {
  describe('GSTIN Verification', () => {
    it('passes valid corporate GSTIN with embedded company PAN', () => {
      // 27 (Maharashtra) + AAPCA1234C (PAN with 'C' as 4th char) + 1 + Z + 5
      const res = checkGstin('27AAPCA1234C1Z5');
      assert.equal(res.status, 'pass');
      assert.match(res.message, /Valid GSTIN with embedded Company PAN/i);
    });

    it('warns for valid GSTIN registered to individual/sole proprietor', () => {
      // 27 + AAPPA1234P + 1 + Z + 5 ('P' = Individual/Proprietor)
      const res = checkGstin('27AAPPA1234P1Z5');
      assert.equal(res.status, 'warn');
      assert.match(res.message, /Individual \/ Sole Proprietor/i);
    });

    it('fails malformed GSTIN syntax', () => {
      const res = checkGstin('INVALID_GSTIN_123');
      assert.equal(res.status, 'fail');
      assert.match(res.message, /Invalid 15-character GSTIN structure/i);
    });

    it('returns unknown for missing GSTIN', () => {
      const res = checkGstin(null);
      assert.equal(res.status, 'unknown');
    });
  });

  describe('PAN Verification', () => {
    it('passes valid corporate PAN', () => {
      const res = checkPan('AAPCA1234C');
      assert.equal(res.status, 'pass');
      assert.match(res.message, /Valid corporate PAN structure \(Company\)/i);
    });

    it('passes firm/LLP PAN', () => {
      const res = checkPan('AABFA1234F');
      assert.equal(res.status, 'pass');
      assert.match(res.message, /Firm \/ Limited Liability Partnership/i);
    });

    it('warns for individual PAN', () => {
      const res = checkPan('ABCPA1234P');
      assert.equal(res.status, 'warn');
      assert.match(res.message, /Individual\/Sole Proprietor/i);
    });

    it('fails invalid PAN format', () => {
      const res = checkPan('12345ABCDE');
      assert.equal(res.status, 'fail');
      assert.match(res.message, /Invalid 10-character PAN structure/i);
    });

    it('returns unknown for missing PAN', () => {
      const res = checkPan('');
      assert.equal(res.status, 'unknown');
    });
  });

  describe('Recruiter Email Domain Verification', () => {
    it('warns when recruiter uses consumer webmail (gmail/yahoo/etc.)', () => {
      const res1 = checkEmailDomain('recruiter@gmail.com', 'Acme Corp');
      assert.equal(res1.status, 'warn');
      assert.match(res1.message, /public consumer webmail \(@gmail\.com\)/i);

      const res2 = checkEmailDomain('hr@outlook.com', 'Tech Corp');
      assert.equal(res2.status, 'warn');
    });

    it('passes when recruiter uses corporate domain matching company name', () => {
      const res = checkEmailDomain('talent@nextech.com', 'NexTech Solutions');
      assert.equal(res.status, 'pass');
      assert.match(res.message, /matches registered organisation name/i);
    });

    it('passes with custom corporate domain even without direct name match', () => {
      const res = checkEmailDomain('admin@innovate-cloud.io', 'Alpha Industries');
      assert.equal(res.status, 'pass');
      assert.match(res.message, /Corporate custom domain \(@innovate-cloud\.io\) verified/i);
    });

    it('returns unknown for missing or invalid email', () => {
      const res = checkEmailDomain('not-an-email', 'Company');
      assert.equal(res.status, 'unknown');
    });
  });

  describe('Duplicate Document & Tax ID Collisions', () => {
    it('detects cross-organisation document fingerprint collision', () => {
      const mockDb = {
        prepare: () => ({
          get: (hash, orgId, id) => {
            if (hash === 'duplicate-sha256' && orgId !== 'org-1') {
              return { id: 'bv-other', company_name: 'Other Corp' };
            }
            return null;
          },
        }),
      };

      const resDup = checkDuplicateDocument(mockDb, {
        id: 'bv-curr',
        fileHash: 'duplicate-sha256',
        orgId: 'org-2',
      });
      assert.equal(resDup.status, 'fail');
      assert.match(resDup.message, /Other Corp/i);

      const resUnique = checkDuplicateDocument(mockDb, {
        id: 'bv-curr',
        fileHash: 'unique-sha256',
        orgId: 'org-2',
      });
      assert.equal(resUnique.status, 'pass');
    });

    it('detects cross-organisation Tax ID collision', () => {
      const mockDb = {
        prepare: () => ({
          get: (taxId, orgId, id) => {
            if (taxId === '27AAPCA1234C1Z5' && orgId !== 'org-1') {
              return { id: 'bv-other', company_name: 'Conflicting Corp' };
            }
            return null;
          },
        }),
      };

      const resCollision = checkDuplicateTaxIdentifier(mockDb, {
        id: 'bv-curr',
        taxIdentifier: '27AAPCA1234C1Z5',
        orgId: 'org-2',
      });
      assert.equal(resCollision.status, 'fail');
      assert.match(resCollision.message, /Conflicting Corp/i);

      const resUnique = checkDuplicateTaxIdentifier(mockDb, {
        id: 'bv-curr',
        taxIdentifier: '36BBBBB1234B1Z9',
        orgId: 'org-2',
      });
      assert.equal(resUnique.status, 'pass');
    });
  });
});
