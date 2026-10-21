// studentCopilotIntent.js — intent classification and dispatch

import { getConcept } from './studentCopilotHelpers.js';
import { getTopResources } from './studentCopilotJobs.js';
import { studentSkillGap, skillsVerifiedCount, skillsTotal, verifiedSkillsList } from './studentCopilotRoadmap.js';

function intentOf(message) {
  const raw = String(message || '').trim();
  if (!raw) return { tool: 'help', params: {}, confidence: 1.0 };

  const clean = raw.toLowerCase().replace(/[^\w\s-]/g, ' ').replace(/\s+/g, ' ').trim();

  if (clean === 'help' || clean.includes('what can you do') || clean.includes('help me')) {
    return { tool: 'help', params: {}, confidence: 1.0 };
  }

  const concept = getConcept(clean);
  if (concept) {
    return { tool: 'concept', params: { concept: concept.t }, confidence: 0.95 };
  }

  if (clean.includes('roadmap') || clean.includes('create my roadmap') || clean.includes('12-week') || clean.includes('plan')) {
    return { tool: 'roadmap', params: {}, confidence: 0.95 };
  }

  if (clean.includes('gap') || clean.includes('assess') || clean.includes('assessment') || clean.includes('weakness')) {
    return { tool: 'skill_gap', params: {}, confidence: 0.9 };
  }

  if (clean.includes('job') || clean.includes('opportunit') || clean.includes('hire') || clean.includes('interview')) {
    return { tool: 'jobs', params: {}, confidence: 0.9 };
  }

  if (clean.includes('resource') || clean.includes('learn') || clean.includes('study')) {
    return { tool: 'resources', params: {}, confidence: 0.85 };
  }

  if (clean.includes('project') || clean.includes('portfolio') || clean.includes('github')) {
    return { tool: 'projects', params: {}, confidence: 0.85 };
  }

  if (clean.includes('passport') || clean.includes('verify') || clean.includes('evidence') || clean.includes('skill passport')) {
    return { tool: 'passport', params: {}, confidence: 0.85 };
  }

  return { tool: 'chat', params: { query: raw }, confidence: 0.7 };
}

function jobUrl(jobId) {
  return `/student/jobs/${jobId}`;
}

export { intentOf, jobUrl };
