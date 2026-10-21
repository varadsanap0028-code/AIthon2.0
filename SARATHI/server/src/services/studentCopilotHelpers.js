// studentCopilotHelpers.js — helper functions for studentCopilotEngine.js
import { repository } from '../data/repository.js';
import { resolveDomainTrack } from './roadmapService.js';

const CONCEPTS = [
  { keys: ['react'], t: 'React', b: 'A JS library for UIs from **components**. Key: props (inputs), state (memory), hooks `useState`/`useEffect`, one-way data flow. Start: [Roadmap](/student/roadmap) -> small project -> [Projects](/student/projects).' },
  { keys: ['javascript'], t: 'JavaScript', b: 'Web language. Master `let/const`, arrows, promises/`async-await`, array methods (`map|fiter|reduce`), DOM basics before frameworks.' },
  { keys: ['typescript'], t: 'TypeScript', b: 'JS + types. Catches `null/undefined` at compile time. Learn interfaces, generics, `strict` mode. Use it in a React project for a verified skill.' },
  { keys: ['node','express'], t: 'Node + Express', b: 'Run JS on the server. Learn routing, middleware, JWT auth, PostgreSQL. Build 2-3 REST APIs and link them as evidence.' },
  { keys: ['python'], t: 'Python', b: 'AI/ML, Data, scripting. Master functions, OOP, `pandas`, virtual envs, clean modules. Then take the [Assessment](/student/assessment).' },
  { keys: ['sql','postgres'], t: 'SQL/PostgreSQL', b: 'Query relational data: `SELECT`, `JOIN`, `GROUP BY`, indexes. Write 20+ queries. Show a schema you designed in your project README.' },
  { keys: ['git','github'], t: 'Git & GitHub', b: '`clone -> branch -> commit -> push -> PR`. Semantic commits + green graph = recruiters notice.' },
  { keys: ['dsa','data structure'], t: 'DSA', b: 'For interviews: arrays, maps, two-pointers, stacks/queues, trees, graphs, sorting, DP basics. 3/week + note complexity.' },
  { keys: ['api','rest'], t: 'REST', b: 'HTTP verbs (`GET/POST/PUT/DELETE`), status codes, JSON, auth headers. URLs like `/api/jobs/:id`.' },
  { keys: ['docker'], t: 'Docker', b: 'Containerize apps: `Dockerfile`, `build`, `run`, volumes, networks. Dockerize one full-stack project.' },
  { keys: ['ml','machine learning'], t: 'ML', b: 'Train models from data: train/val/test, overfitting, precision/recall. Start with scikit-learn before deep learning.' },
  { keys: ['nlp','llm','transformer'], t: 'LLMs/NLP', b: 'Transformers power chat/search. Learn tokens, embeddings, prompting, RAG. Build a doc-Q&A mini app.' },
  { keys: ['cyber','owasp'], t: 'Cybersecurity', b: 'Networks, Linux, OWASP Top 10 (XSS, SQLi, auth flaws). Never test systems you don\'t own or have permission for.' },
];

function getConcept(raw) {
  for (const c of CONCEPTS) {
    if (c.keys.some((k) => ` ${k.trim()} `.includes(` ${raw.trim()} `))) return c;
  }
  return null;
}

function getTrack(raw, targetRole) {
  const found = resolveDomainTrack(raw);
  if (found && !found.isFallback) return found;
  const role = targetRole || 'Full-Stack Developer';
  return resolveDomainTrack(role);
}

export { getConcept, getTrack };
