// studentCopilotDispatch.js — answerAsStudentCopilot dispatcher

import { intentOf } from './studentCopilotIntent.js';
import { getTopResources } from './studentCopilotJobs.js';
import { studentSkillGap, skillsVerifiedCount, skillsTotal, verifiedSkillsList } from './studentCopilotRoadmap.js';

async function answerAsStudentCopilot(input, ctx) {
  const myTrack = ctx?.myTrack || null;
  const userId = ctx?.userId || '';

  const intent = intentOf(input);
  const tool = intent.tool;
  const params = intent.params || {};

  switch (tool) {
    case 'help':
      return `**Sarathi Copilot** help:

**I can do:**
• Explain concepts (*"tell me about React"*)
• Create your 12-week roadmap
• Show your skill gaps & assessment results
• Find open jobs & interview prep
• Recommend resources for your track
• Help with projects & portfolio
• Verify skills on your passport

**Try:** *"Create my roadmap,"* *"Explain my skill gaps,"* *"Find me jobs for Full-Stack Developer"*

Type **help** anytime.`;

    case 'concept':
      const concept = getConcept(params.concept);
      if (concept) {
        return `**${concept.t}** — ${concept.b}`;
      }
      return `I didn't find a specific concept "<strong>${params.concept}</strong>". Try *"tell me about React"*, *"explain TypeScript"*, or type **help**.`;

    case 'roadmap':
      return `I'll build you a **12-week roadmap** for **${myTrack?.canonicalRoleTitle || 'Full-Stack Developer'}**.

**Your track:** ${myTrack?.domainTitle || 'Web Development'}

**Milestone plan:**
1. Foundations & setup
2. Core skills (frontend/backend)
3. Database & APIs
4. Capstone project
5. Polish & job prep

**Track your progress** — mark each milestone complete as you finish it. View your full roadmap at [Roadmap](/student/roadmap).`;

    case 'skill_gap': {
      const gapData = studentSkillGap(userId, myTrack);
      if (gapData && gapData.gaps.length > 0) {
        return `**Your Skill Gaps** (${gapData.gaps.length} gaps):

${gapData.gaps.map(g => `• **${g.skill}** — you're at L${g.current}/5, target L${g.target}/5 (${g.difficulty} difficulty, ${g.recommendation})`).join('\n')}

**Next step:** Take a focused assessment to get verified credit. [Assessment](/student/assessment)`;
      }
      return `I don't have enough data yet. Complete your skill profile at [Skill Gap](/student/skill-gap) and take the [Assessment](/student/assessment).`;
    }

    case 'jobs': {
      const jobs = (await import('./studentCopilotJobs.js')).getOpenJobs(userId, 6);
      if (jobs.length > 0) {
        return `**${jobs.length} Open Role${jobs.length > 1 ? 's' : ''}** for ${myTrack?.canonicalRoleTitle || 'Full-Stack Developer'}:
${jobs.map(j => `- [${j.title}](${jobUrl(j.id)}) — ${j.experience_level}`).join('\n')}`;
      }
      return `I couldn't find any open roles matching your profile right now. Check back soon, or update your target role at [Dashboard](/student/dashboard).`;
    }

    case 'resources': {
      const resources = getTopResources(myTrack?.trackKey || 'web-dev', 6);
      if (resources.length > 0) {
        return `**Top Resources for ${myTrack?.domainTitle || 'Web Development'}**:
${resources.map(r => `- [${r.title}](${r.url}) — ${r.provider} (${r.level})`).join('\n')}`;
      }
      return `No resources yet for ${myTrack?.trackKey || 'web-dev'}. Browse all resources at [Resources](/student/resources).`;
    }

    case 'projects':
      return `**Project Ideas** for ${myTrack?.canonicalRoleTitle || 'Full-Stack Developer'}:

1. Full-stack app with auth (RGBC, DB, tests)
2. Open-source contribution tracker
3. API + documentation with CI/CD
4. Portfolio case study with data viz

Pick one → build it → [linked skills](/student/skill-passport) → recruiters see verified evidence.`;

    case 'passport':
      return `**Skill Passport** — your verified skills record.

Verified: ${skillsVerifiedCount(userId)}/${skillsTotal(userId)}

**Verified skills:**
${verifiedSkillsList(userId)}

Review all your submissions, reorder evidence, and export your passport at [Skill Passport](/student/skill-passport).`;

    case 'chat':
      return `**Sarathi Copilot** says:

I heard: "${input}"

I can help with career paths, roadmaps, skill gaps, jobs, assessments, and more. Tell me what you'd like to do — or type **help** for all my capabilities.`;

    default:
      return `**Sarathi Copilot** says:

I heard: "${input}"

Type **help** to see everything I can do.`;
  }
}

export { answerAsStudentCopilot };
