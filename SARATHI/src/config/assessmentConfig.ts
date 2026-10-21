/**
 * Authoritative scoring configuration for SARATHI assessments.
 * Single source of truth for weighting, thresholds, and transparency messaging.
 */
export const ASSESSMENT_SCORING_CONFIG = {
  knowledgeWeight: 0.4,
  practicalWeight: 0.6,
  knowledgePercentage: 40,
  practicalPercentage: 60,
  get weightingLabel(): string {
    return `${this.knowledgePercentage}% Knowledge + ${this.practicalPercentage}% Practical`;
  },
  formulaDisplay: 'round(0.4 × KnowledgeScore + 0.6 × PracticalScore)',
  knowledgeLabel: 'Knowledge Quiz (40% Weight)',
  practicalLabel: 'Practical Workbench (60% Weight)',
};
