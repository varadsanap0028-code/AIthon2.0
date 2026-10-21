/**
 * Test Integrity & Anti-Cheat Risk Engine Configuration
 * Single source of truth for weights, bias, bands, and scoring thresholds.
 * Ref: SARATHI_ADMIN_PRD.md Section 5.1
 */

export const INTEGRITY_RISK_CONFIG = {
  weights: {
    paste: 1.4,
    pasteRatio: 1.6,
    blur: 0.8,
    blurTime: 0.8,
    fast: 1.2,
    camera: 1.0,
    similarity: 2.4,
    firstTry: 0.6,
  },
  bias: 3.2,
  bands: {
    low: 35,
    high: 65,
  },
  thresholds: {
    minPeerCountForFast: 10,
    maxHistoryDaysForSimilarity: 90,
    maxPeerSubmissionsForSimilarity: 500,
    shingleTokenSize: 5,
    highSimilarityThreshold: 0.8,
  },
  modelVersion: '1.0.0',
};
