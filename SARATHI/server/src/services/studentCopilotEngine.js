import { repository } from '../data/repository.js';
import { resolveDomainTrack } from './roadmapService.js';
import { getConcept, getTrack } from './studentCopilotHelpers.js';
import { getTopResources, getOpenJobs, jobUrl } from './studentCopilotJobs.js';
import { intentOf } from './studentCopilotIntent.js';
import { answerAsStudentCopilot } from './studentCopilotDispatch.js';
import { FOOTER } from './studentCopilotFooter.js';
import { getRoadmapProgress, roadProgress } from './studentCopilotRoadmap.js';

// Re-export all for direct module access
export {
  repository,
  resolveDomainTrack,
  getConcept,
  getTrack,
  roadProgress,
  getTopResources,
  getOpenJobs,
  jobUrl,
  intentOf,
  answerAsStudentCopilot,
  getRoadmapProgress,
  FOOTER,
};
