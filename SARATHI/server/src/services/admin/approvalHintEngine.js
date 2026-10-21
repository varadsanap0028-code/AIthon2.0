/**
 * Automated Advisory Hint Engine for Recruiter Business Verifications.
 *
 * All functions are pure and advisory only (never auto-approve).
 * Validates GSTIN, PAN, corporate email vs free-mail domains, and cross-company collisions.
 */

const FREE_MAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.in',
  'ymail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'proton.me',
  'protonmail.com',
  'aol.com',
  'zoho.com',
  'rediffmail.com',
  'mail.com',
  'gmx.com',
  'yandex.com',
]);

const PAN_ENTITY_TYPES = {
  C: 'Company',
  F: 'Firm / Limited Liability Partnership (LLP)',
  P: 'Individual / Sole Proprietor',
  T: 'Trust',
  H: 'Hindu Undivided Family (HUF)',
  A: 'Association of Persons (AOP)',
  B: 'Body of Individuals (BOI)',
  G: 'Government Agency',
  J: 'Artificial Juridical Person',
  L: 'Local Authority',
};

/**
 * Checks Indian GSTIN syntax and embedded PAN structure.
 * Standard format: 2-digit state code + 10-char PAN + 1 entity digit + 'Z' + 1 checksum char.
 *
 * @param {string|null|undefined} rawGstin
 * @returns {{ key: string, title: string, status: 'pass'|'warn'|'fail'|'unknown', message: string }}
 */
export function checkGstin(rawGstin) {
  if (!rawGstin || typeof rawGstin !== 'string' || !rawGstin.trim()) {
    return {
      key: 'gstin_format',
      title: 'GSTIN Structure',
      status: 'unknown',
      message: 'No GSTIN provided on this verification',
    };
  }

  const gstin = rawGstin.trim().toUpperCase();
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

  if (!gstinRegex.test(gstin)) {
    return {
      key: 'gstin_format',
      title: 'GSTIN Structure',
      status: 'fail',
      message: `Invalid 15-character GSTIN structure ("${gstin}")`,
    };
  }

  const embeddedPan = gstin.slice(2, 12);
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
  if (!panRegex.test(embeddedPan)) {
    return {
      key: 'gstin_format',
      title: 'GSTIN Structure',
      status: 'fail',
      message: `GSTIN has malformed embedded PAN component (${embeddedPan})`,
    };
  }

  const entityChar = embeddedPan[3];
  const entityName = PAN_ENTITY_TYPES[entityChar] || 'Unrecognized Entity';
  const isCorporate = entityChar === 'C' || entityChar === 'F' || entityChar === 'L';

  return {
    key: 'gstin_format',
    title: 'GSTIN Structure',
    status: isCorporate ? 'pass' : 'warn',
    message: isCorporate
      ? `Valid GSTIN with embedded ${entityName} PAN (${embeddedPan})`
      : `Valid GSTIN, but registered to ${entityName} ('${entityChar}') rather than corporate company`,
  };
}

/**
 * Checks Indian Permanent Account Number (PAN) structure and entity type code.
 * Standard format: 5 letters + 4 digits + 1 letter.
 *
 * @param {string|null|undefined} rawPan
 * @returns {{ key: string, title: string, status: 'pass'|'warn'|'fail'|'unknown', message: string }}
 */
export function checkPan(rawPan) {
  if (!rawPan || typeof rawPan !== 'string' || !rawPan.trim()) {
    return {
      key: 'pan_format',
      title: 'PAN Structure',
      status: 'unknown',
      message: 'No PAN provided on this verification',
    };
  }

  const pan = rawPan.trim().toUpperCase();
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

  if (!panRegex.test(pan)) {
    return {
      key: 'pan_format',
      title: 'PAN Structure',
      status: 'fail',
      message: `Invalid 10-character PAN structure ("${pan}")`,
    };
  }

  const entityChar = pan[3];
  const entityName = PAN_ENTITY_TYPES[entityChar] || null;

  if (entityChar === 'C' || entityChar === 'F' || entityChar === 'L') {
    return {
      key: 'pan_format',
      title: 'PAN Structure',
      status: 'pass',
      message: `Valid corporate PAN structure (${entityName})`,
    };
  }

  if (entityChar === 'P') {
    return {
      key: 'pan_format',
      title: 'PAN Structure',
      status: 'warn',
      message: 'Valid PAN syntax, but registered to an Individual/Sole Proprietor rather than a Company/LLP',
    };
  }

  return {
    key: 'pan_format',
    title: 'PAN Structure',
    status: entityName ? 'pass' : 'warn',
    message: entityName
      ? `Valid PAN registered to ${entityName}`
      : `Valid PAN syntax with unrecognized entity type indicator '${entityChar}'`,
  };
}

/**
 * Computes simple Bigram / Dice similarity between two normalized strings.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number} Score from 0.0 to 1.0
 */
function diceCoefficient(a, b) {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  const getBigrams = (str) => {
    const bigrams = new Map();
    for (let i = 0; i < str.length - 1; i++) {
      const bigram = str.slice(i, i + 2);
      bigrams.set(bigram, (bigrams.get(bigram) || 0) + 1);
    }
    return bigrams;
  };

  const aBigrams = getBigrams(a);
  const bBigrams = getBigrams(b);
  let intersection = 0;

  for (const [bigram, count] of aBigrams.entries()) {
    if (bBigrams.has(bigram)) {
      intersection += Math.min(count, bBigrams.get(bigram));
    }
  }

  return (2.0 * intersection) / (a.length - 1 + (b.length - 1));
}

/**
 * Checks whether recruiter email uses a free webmail provider and checks domain alignment with company name.
 *
 * @param {string|null|undefined} email
 * @param {string|null|undefined} companyName
 * @returns {{ key: string, title: string, status: 'pass'|'warn'|'fail'|'unknown', message: string }}
 */
export function checkEmailDomain(email, companyName) {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return {
      key: 'email_domain',
      title: 'Corporate Email Domain',
      status: 'unknown',
      message: 'No recruiter email address recorded',
    };
  }

  const domain = email.split('@')[1].toLowerCase().trim();

  if (FREE_MAIL_DOMAINS.has(domain)) {
    return {
      key: 'email_domain',
      title: 'Corporate Email Domain',
      status: 'warn',
      message: `Recruiter uses public consumer webmail (@${domain}) instead of a corporate business domain`,
    };
  }

  const normCompany = (companyName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const domainPrefix = domain.split('.')[0].replace(/[^a-z0-9]/g, '');

  if (normCompany && domainPrefix) {
    if (normCompany.includes(domainPrefix) || domainPrefix.includes(normCompany)) {
      return {
        key: 'email_domain',
        title: 'Corporate Email Domain',
        status: 'pass',
        message: `Corporate email (@${domain}) matches registered organisation name`,
      };
    }

    const similarity = diceCoefficient(normCompany, domainPrefix);
    if (similarity >= 0.4) {
      return {
        key: 'email_domain',
        title: 'Corporate Email Domain',
        status: 'pass',
        message: `Corporate email (@${domain}) closely matches registered organisation name (${Math.round(similarity * 100)}% match)`,
      };
    }
  }

  return {
    key: 'email_domain',
    title: 'Corporate Email Domain',
    status: 'pass',
    message: `Corporate custom domain (@${domain}) verified`,
  };
}

/**
 * Checks for identical document hashes across other organisations.
 *
 * @param {object} db Database instance
 * @param {{ id: string, fileHash: string, orgId: string }} params
 * @returns {{ key: string, title: string, status: 'pass'|'warn'|'fail'|'unknown', message: string }}
 */
export function checkDuplicateDocument(db, { id, fileHash, orgId }) {
  if (!fileHash || !db) {
    return {
      key: 'duplicate_document',
      title: 'Document Fingerprint',
      status: 'unknown',
      message: 'No document checksum available',
    };
  }

  try {
    const collision = db.prepare(`
      SELECT b.id, o.name as company_name 
      FROM business_verifications b
      JOIN organisations o ON o.id = b.org_id
      WHERE b.file_hash = ? AND b.org_id != ? AND b.id != ?
      LIMIT 1;
    `).get(fileHash, orgId, id || '');

    if (collision) {
      return {
        key: 'duplicate_document',
        title: 'Document Fingerprint',
        status: 'fail',
        message: `Identical document fingerprint was already submitted by another company ("${collision.company_name}")`,
      };
    }

    return {
      key: 'duplicate_document',
      title: 'Document Fingerprint',
      status: 'pass',
      message: 'Document fingerprint is unique across organisations',
    };
  } catch {
    return {
      key: 'duplicate_document',
      title: 'Document Fingerprint',
      status: 'unknown',
      message: 'Unable to check document fingerprint collision',
    };
  }
}

/**
 * Checks for tax identifier (GSTIN/PAN) collisions across other organisations.
 *
 * @param {object} db Database instance
 * @param {{ id: string, taxIdentifier: string, orgId: string }} params
 * @returns {{ key: string, title: string, status: 'pass'|'warn'|'fail'|'unknown', message: string }}
 */
export function checkDuplicateTaxIdentifier(db, { id, taxIdentifier, orgId }) {
  if (!taxIdentifier || typeof taxIdentifier !== 'string' || !taxIdentifier.trim() || !db) {
    return {
      key: 'duplicate_tax_id',
      title: 'Tax ID Collision',
      status: 'unknown',
      message: 'No tax identifier available for collision detection',
    };
  }

  const cleanTaxId = taxIdentifier.trim().toUpperCase();

  try {
    const collision = db.prepare(`
      SELECT b.id, o.name as company_name 
      FROM business_verifications b
      JOIN organisations o ON o.id = b.org_id
      WHERE UPPER(TRIM(b.tax_identifier)) = ? AND b.org_id != ? AND b.id != ?
      LIMIT 1;
    `).get(cleanTaxId, orgId, id || '');

    if (collision) {
      return {
        key: 'duplicate_tax_id',
        title: 'Tax ID Collision',
        status: 'fail',
        message: `Tax identifier ${cleanTaxId} is already associated with another company ("${collision.company_name}")`,
      };
    }

    return {
      key: 'duplicate_tax_id',
      title: 'Tax ID Collision',
      status: 'pass',
      message: `Tax identifier ${cleanTaxId} is unique across organisations`,
    };
  } catch {
    return {
      key: 'duplicate_tax_id',
      title: 'Tax ID Collision',
      status: 'unknown',
      message: 'Unable to check tax identifier collision',
    };
  }
}

/**
 * Computes all automated advisory hints for a verification item.
 *
 * @param {object} db Database instance
 * @param {object} item Verification row with org and user details
 * @returns {Array<{ key: string, title: string, status: 'pass'|'warn'|'fail'|'unknown', message: string }>}
 */
export function generateAllHints(db, item) {
  const taxId = item.tax_identifier || '';
  const isGstin = taxId.length === 15 || item.document_type === 'gstin';
  const isPan = (taxId.length === 10 && !isGstin) || item.document_type === 'pan';

  const gstinHint = checkGstin(isGstin ? taxId : null);
  const panHint = checkPan(isPan ? taxId : (isGstin ? taxId.slice(2, 12) : null));
  const emailHint = checkEmailDomain(item.recruiter_email || item.email, item.company_name || item.company);
  const dupDocHint = checkDuplicateDocument(db, {
    id: item.id,
    fileHash: item.file_hash,
    orgId: item.org_id,
  });
  const dupTaxHint = checkDuplicateTaxIdentifier(db, {
    id: item.id,
    taxIdentifier: taxId,
    orgId: item.org_id,
  });

  return [gstinHint, panHint, emailHint, dupDocHint, dupTaxHint];
}
