/**
 * Canonical Role Benchmarks Service
 * Single source of truth for career roles, required competencies, weights,
 * mandatory indicators, prerequisite dependencies, and benchmark versions.
 * Complies with SARATHI AI Skill Intelligence Engine specifications.
 */

import { initDb } from '../config/db.js';

export const BENCHMARK_VERSION = '2026.1';

export const ROLE_BENCHMARKS = {
  // === WEB DEVELOPMENT ===
  'Frontend Developer': {
    roleTitle: 'Frontend Developer',
    domainId: 'web-dev',
    domainTitle: 'Web Development',
    description: 'Crafts high-performance, accessible, and responsive user interfaces using modern web standards.',
    benchmarkVersion: BENCHMARK_VERSION,
    requiredSkills: [
      {
        skillId: 'sk-html5',
        skillName: 'HTML5 & Semantic Markup',
        category: 'Frontend',
        requiredProficiency: 4,
        weight: 1.2,
        isMandatory: true,
        prerequisites: [],
        whyItMatters: 'Ensures structured, accessible, and SEO-friendly document outlines.'
      },
      {
        skillId: 'sk-css3',
        skillName: 'CSS3 & Responsive Design',
        category: 'Frontend',
        requiredProficiency: 4,
        weight: 1.2,
        isMandatory: true,
        prerequisites: ['HTML5 & Semantic Markup'],
        whyItMatters: 'Enables mobile-first layouts, animations, and container queries.'
      },
      {
        skillId: 'sk-js',
        skillName: 'JavaScript (ES6+)',
        category: 'Frontend',
        requiredProficiency: 4,
        weight: 1.5,
        isMandatory: true,
        prerequisites: [],
        whyItMatters: 'Powers dynamic client interactivity, DOM manipulation, and async events.'
      },
      {
        skillId: 'sk-react',
        skillName: 'React.js Architecture',
        category: 'Frontend',
        requiredProficiency: 4,
        weight: 1.5,
        isMandatory: true,
        prerequisites: ['JavaScript (ES6+)', 'HTML5 & Semantic Markup'],
        whyItMatters: 'Core UI component lifecycle, custom hooks, and state management.'
      },
      {
        skillId: 'sk-ts',
        skillName: 'TypeScript',
        category: 'Frontend',
        requiredProficiency: 3,
        weight: 1.0,
        isMandatory: false,
        prerequisites: ['JavaScript (ES6+)'],
        whyItMatters: 'Prevents type coercion bugs and provides compile-time interface safety.'
      },
      {
        skillId: 'sk-a11y',
        skillName: 'Web Accessibility (a11y)',
        category: 'Frontend',
        requiredProficiency: 3,
        weight: 1.0,
        isMandatory: false,
        prerequisites: ['HTML5 & Semantic Markup'],
        whyItMatters: 'Guarantees WCAG 2.1 AA compliance for assistive technology.'
      },
      {
        skillId: 'sk-git',
        skillName: 'Git & Version Control',
        category: 'DevOps',
        requiredProficiency: 4,
        weight: 1.0,
        isMandatory: true,
        prerequisites: [],
        whyItMatters: 'Required for team collaboration, code branching, and PR review workflows.'
      }
    ]
  },
  'Backend Developer': {
    roleTitle: 'Backend Developer',
    domainId: 'web-dev',
    domainTitle: 'Web Development',
    description: 'Architects robust server APIs, background services, data persistence layers, and security middleware.',
    benchmarkVersion: BENCHMARK_VERSION,
    requiredSkills: [
      {
        skillId: 'sk-js',
        skillName: 'JavaScript (ES6+)',
        category: 'Backend',
        requiredProficiency: 4,
        weight: 1.2,
        isMandatory: true,
        prerequisites: [],
        whyItMatters: 'Powers asynchronous event-driven server runtime logic.'
      },
      {
        skillId: 'sk-nodejs',
        skillName: 'Node.js & Express',
        category: 'Backend',
        requiredProficiency: 4,
        weight: 1.5,
        isMandatory: true,
        prerequisites: ['JavaScript (ES6+)'],
        whyItMatters: 'Powers asynchronous event-driven server endpoints and middleware chains.'
      },
      {
        skillId: 'sk-rest',
        skillName: 'RESTful API Architecture',
        category: 'Backend',
        requiredProficiency: 4,
        weight: 1.5,
        isMandatory: true,
        prerequisites: ['Node.js & Express'],
        whyItMatters: 'Defines standardized HTTP verbs, status codes, and JSON contracts.'
      },
      {
        skillId: 'sk-sql',
        skillName: 'SQL & Relational Databases',
        category: 'Database',
        requiredProficiency: 4,
        weight: 1.5,
        isMandatory: true,
        prerequisites: [],
        whyItMatters: 'Enables transactional consistency, complex joins, and table indexing.'
      },
      {
        skillId: 'sk-auth',
        skillName: 'Authentication & JWT Security',
        category: 'Backend',
        requiredProficiency: 3,
        weight: 1.2,
        isMandatory: true,
        prerequisites: ['Node.js & Express', 'RESTful API Architecture'],
        whyItMatters: 'Secures route endpoints against unauthorized access and session spoofing.'
      },
      {
        skillId: 'sk-redis',
        skillName: 'Caching with Redis',
        category: 'Backend',
        requiredProficiency: 3,
        weight: 1.0,
        isMandatory: false,
        prerequisites: ['Node.js & Express'],
        whyItMatters: 'Reduces database query pressure and improves latency for hot endpoints.'
      },
      {
        skillId: 'sk-git',
        skillName: 'Git & Version Control',
        category: 'DevOps',
        requiredProficiency: 4,
        weight: 1.0,
        isMandatory: true,
        prerequisites: [],
        whyItMatters: 'Essential for CI/CD automated deployments and release tagging.'
      }
    ]
  },
  'Full-Stack Developer': {
    roleTitle: 'Full-Stack Developer',
    domainId: 'web-dev',
    domainTitle: 'Web Development',
    description: 'Delivers complete end-to-end web products spanning client interfaces, server logic, and persistent storage.',
    benchmarkVersion: BENCHMARK_VERSION,
    requiredSkills: [
      {
        skillId: 'sk-html5',
        skillName: 'HTML5 & Semantic Markup',
        category: 'Frontend',
        requiredProficiency: 4,
        weight: 1.0,
        isMandatory: true,
        prerequisites: [],
        whyItMatters: 'Solid foundation for browser layout structure.'
      },
      {
        skillId: 'sk-js',
        skillName: 'JavaScript (ES6+)',
        category: 'Frontend',
        requiredProficiency: 4,
        weight: 1.5,
        isMandatory: true,
        prerequisites: [],
        whyItMatters: 'Universal language bridging client and server execution.'
      },
      {
        skillId: 'sk-react',
        skillName: 'React.js Architecture',
        category: 'Frontend',
        requiredProficiency: 4,
        weight: 1.5,
        isMandatory: true,
        prerequisites: ['JavaScript (ES6+)', 'HTML5 & Semantic Markup'],
        whyItMatters: 'Primary client-side component UI framework.'
      },
      {
        skillId: 'sk-ts',
        skillName: 'TypeScript',
        category: 'Frontend',
        requiredProficiency: 3,
        weight: 1.0,
        isMandatory: false,
        prerequisites: ['JavaScript (ES6+)'],
        whyItMatters: 'End-to-end type safety across client and server boundaries.'
      },
      {
        skillId: 'sk-nodejs',
        skillName: 'Node.js & Express',
        category: 'Backend',
        requiredProficiency: 4,
        weight: 1.5,
        isMandatory: true,
        prerequisites: ['JavaScript (ES6+)'],
        whyItMatters: 'Server-side API controllers and business logic.'
      },
      {
        skillId: 'sk-sql',
        skillName: 'SQL & Relational Databases',
        category: 'Database',
        requiredProficiency: 3,
        weight: 1.2,
        isMandatory: true,
        prerequisites: [],
        whyItMatters: 'Stores normalized entities and ensures transactional persistence.'
      },
      {
        skillId: 'sk-rest',
        skillName: 'RESTful API Architecture',
        category: 'Backend',
        requiredProficiency: 4,
        weight: 1.5,
        isMandatory: true,
        prerequisites: ['Node.js & Express'],
        whyItMatters: 'Connects the frontend client to server capabilities.'
      },
      {
        skillId: 'sk-git',
        skillName: 'Git & Version Control',
        category: 'DevOps',
        requiredProficiency: 4,
        weight: 1.0,
        isMandatory: true,
        prerequisites: [],
        whyItMatters: 'Collaborative revision control and feature branching.'
      }
    ]
  },
  'React Developer': {
    roleTitle: 'React Developer',
    domainId: 'web-dev',
    domainTitle: 'Web Development',
    description: 'Specializes deeply in the React ecosystem, modern state containers, Next.js / Vite build systems, and virtual DOM optimization.',
    benchmarkVersion: BENCHMARK_VERSION,
    requiredSkills: [
      {
        skillId: 'sk-js',
        skillName: 'JavaScript (ES6+)',
        category: 'Frontend',
        requiredProficiency: 4,
        weight: 1.5,
        isMandatory: true,
        prerequisites: [],
        whyItMatters: 'Mastery of closures, prototypes, event delegation, and promises.'
      },
      {
        skillId: 'sk-react',
        skillName: 'React.js Architecture',
        category: 'Frontend',
        requiredProficiency: 5,
        weight: 2.0,
        isMandatory: true,
        prerequisites: ['JavaScript (ES6+)'],
        whyItMatters: 'Advanced hooks, context, memoization, and Suspense patterns.'
      },
      {
        skillId: 'sk-ts',
        skillName: 'TypeScript',
        category: 'Frontend',
        requiredProficiency: 4,
        weight: 1.2,
        isMandatory: true,
        prerequisites: ['JavaScript (ES6+)'],
        whyItMatters: 'Generic component props, event handler typings, and strict null safety.'
      },
      {
        skillId: 'sk-state',
        skillName: 'State Management (Zustand/Redux)',
        category: 'Frontend',
        requiredProficiency: 4,
        weight: 1.2,
        isMandatory: true,
        prerequisites: ['React.js Architecture'],
        whyItMatters: 'Manages complex cross-component client application state.'
      },
      {
        skillId: 'sk-perf',
        skillName: 'Web Performance Optimization',
        category: 'Frontend',
        requiredProficiency: 3,
        weight: 1.0,
        isMandatory: false,
        prerequisites: ['React.js Architecture'],
        whyItMatters: 'Improves Core Web Vitals (LCP, INP, CLS) and bundle sizes.'
      }
    ]
  },

  // === AI & MACHINE LEARNING ===
  'Machine Learning Engineer': {
    roleTitle: 'Machine Learning Engineer',
    domainId: 'ai-ml',
    domainTitle: 'Artificial Intelligence and Machine Learning',
    description: 'Bridges data science modeling with production software engineering and automated pipeline monitoring.',
    benchmarkVersion: BENCHMARK_VERSION,
    requiredSkills: [
      {
        skillId: 'sk-py-ml',
        skillName: 'Python for AI/ML',
        category: 'AI & Machine Learning',
        requiredProficiency: 4,
        weight: 1.5,
        isMandatory: true,
        prerequisites: [],
        whyItMatters: 'Clean vectorized operations with NumPy, Pandas, and SciPy.'
      },
      {
        skillId: 'sk-ml-fund',
        skillName: 'Machine Learning Fundamentals',
        category: 'AI & Machine Learning',
        requiredProficiency: 5,
        weight: 2.0,
        isMandatory: true,
        prerequisites: ['Python for AI/ML'],
        whyItMatters: 'Gradient boosting, random forests, SVM, and hyperparameter tuning.'
      },
      {
        skillId: 'sk-eval',
        skillName: 'Model Evaluation & Metrics',
        category: 'AI & Machine Learning',
        requiredProficiency: 4,
        weight: 1.5,
        isMandatory: true,
        prerequisites: ['Machine Learning Fundamentals'],
        whyItMatters: 'Validating models against data drift and statistical degradation.'
      },
      {
        skillId: 'sk-mlops',
        skillName: 'MLOps & Model Deployment',
        category: 'DevOps',
        requiredProficiency: 4,
        weight: 1.2,
        isMandatory: false,
        prerequisites: ['Machine Learning Fundamentals', 'Python for AI/ML'],
        whyItMatters: 'Automated CI/CD for continuous model training and registry versioning.'
      },
      {
        skillId: 'sk-sql-extract',
        skillName: 'SQL & Data Extraction',
        category: 'Database',
        requiredProficiency: 3,
        weight: 1.0,
        isMandatory: false,
        prerequisites: [],
        whyItMatters: 'Extracting training feature sets directly from analytical warehouses.'
      }
    ]
  },
  'AI/ML Engineer': {
    roleTitle: 'AI/ML Engineer',
    domainId: 'ai-ml',
    domainTitle: 'Artificial Intelligence and Machine Learning',
    description: 'Designs, trains, tests, and deploys scalable statistical learning and neural network models.',
    benchmarkVersion: BENCHMARK_VERSION,
    requiredSkills: [
      {
        skillId: 'sk-py-ml',
        skillName: 'Python for AI/ML',
        category: 'AI & Machine Learning',
        requiredProficiency: 4,
        weight: 1.5,
        isMandatory: true,
        prerequisites: [],
        whyItMatters: 'Industry-standard language for tensor manipulation and ML libraries.'
      },
      {
        skillId: 'sk-ml-fund',
        skillName: 'Machine Learning Fundamentals',
        category: 'AI & Machine Learning',
        requiredProficiency: 4,
        weight: 1.8,
        isMandatory: true,
        prerequisites: ['Python for AI/ML'],
        whyItMatters: 'Supervised vs unsupervised algorithms, loss functions, and cross-validation.'
      },
      {
        skillId: 'sk-deep-learn',
        skillName: 'Deep Learning & Neural Networks',
        category: 'AI & Machine Learning',
        requiredProficiency: 3,
        weight: 1.5,
        isMandatory: true,
        prerequisites: ['Machine Learning Fundamentals'],
        whyItMatters: 'Backpropagation, activation functions, CNNs, and attention mechanisms.'
      },
      {
        skillId: 'sk-feature-eng',
        skillName: 'Data Preprocessing & Feature Engineering',
        category: 'Data Science & Analytics',
        requiredProficiency: 4,
        weight: 1.2,
        isMandatory: true,
        prerequisites: ['Python for AI/ML'],
        whyItMatters: 'Handling missing values, scaling, encoding, and dimensionality reduction.'
      },
      {
        skillId: 'sk-eval',
        skillName: 'Model Evaluation & Metrics',
        category: 'AI & Machine Learning',
        requiredProficiency: 4,
        weight: 1.2,
        isMandatory: true,
        prerequisites: ['Machine Learning Fundamentals'],
        whyItMatters: 'Precision, recall, ROC-AUC, F1-score, and overfitting diagnosis.'
      }
    ]
  },

  // === CYBERSECURITY ===
  'Cybersecurity Analyst': {
    roleTitle: 'Cybersecurity Analyst',
    domainId: 'cybersecurity',
    domainTitle: 'Cybersecurity',
    description: 'Monitors, detects, and defends networks and systems against intrusions and unauthorized access.',
    benchmarkVersion: BENCHMARK_VERSION,
    requiredSkills: [
      {
        skillId: 'sk-networking',
        skillName: 'Computer Networking & Protocols',
        category: 'Infrastructure',
        requiredProficiency: 4,
        weight: 1.5,
        isMandatory: true,
        prerequisites: [],
        whyItMatters: 'Understanding OSI layers, TCP/IP handshakes, DNS, and subnet routing.'
      },
      {
        skillId: 'sk-linux-admin',
        skillName: 'Linux Administration',
        category: 'Infrastructure',
        requiredProficiency: 4,
        weight: 1.2,
        isMandatory: true,
        prerequisites: [],
        whyItMatters: 'File permissions, system logging, process isolation, and CLI navigation.'
      },
      {
        skillId: 'sk-threat-analysis',
        skillName: 'Threat Analysis & Vulnerability Assessment',
        category: 'Security',
        requiredProficiency: 4,
        weight: 1.8,
        isMandatory: true,
        prerequisites: ['Computer Networking & Protocols', 'Linux Administration'],
        whyItMatters: 'CVE indexing, vulnerability scanning, and risk triage.'
      },
      {
        skillId: 'sk-network-defense',
        skillName: 'Network Defense & Firewall Architecture',
        category: 'Security',
        requiredProficiency: 3,
        weight: 1.2,
        isMandatory: false,
        prerequisites: ['Computer Networking & Protocols'],
        whyItMatters: 'IDS/IPS configuration, iptables rules, and egress packet filtering.'
      },
      {
        skillId: 'sk-incident-resp',
        skillName: 'Incident Response & Digital Forensics',
        category: 'Security',
        requiredProficiency: 3,
        weight: 1.0,
        isMandatory: false,
        prerequisites: ['Threat Analysis & Vulnerability Assessment'],
        whyItMatters: 'Evidence preservation, root-cause forensic timelines, and mitigation.'
      }
    ]
  },

  // === DATA SCIENCE ===
  'Data Analyst': {
    roleTitle: 'Data Analyst',
    domainId: 'data-science',
    domainTitle: 'Data Science and Analytics',
    description: 'Analyzes structured datasets to uncover business trends, build dashboards, and support executive decisions.',
    benchmarkVersion: BENCHMARK_VERSION,
    requiredSkills: [
      {
        skillId: 'sk-sql-adv',
        skillName: 'Advanced SQL Querying',
        category: 'Database',
        requiredProficiency: 4,
        weight: 1.8,
        isMandatory: true,
        prerequisites: [],
        whyItMatters: 'Window functions, CTEs, subqueries, and aggregation performance.'
      },
      {
        skillId: 'sk-bi-viz',
        skillName: 'BI & Data Visualization (PowerBI/Tableau)',
        category: 'Data Science & Analytics',
        requiredProficiency: 4,
        weight: 1.5,
        isMandatory: true,
        prerequisites: [],
        whyItMatters: 'Designing intuitive, interactive dashboards for business stakeholders.'
      },
      {
        skillId: 'sk-py-data',
        skillName: 'Python for Data Analysis',
        category: 'Data Science & Analytics',
        requiredProficiency: 3,
        weight: 1.2,
        isMandatory: false,
        prerequisites: [],
        whyItMatters: 'Automating extraction, cleaning, and statistical summarization.'
      },
      {
        skillId: 'sk-stat-eval',
        skillName: 'Statistical Analysis & Hypothesis Testing',
        category: 'Data Science & Analytics',
        requiredProficiency: 3,
        weight: 1.2,
        isMandatory: true,
        prerequisites: [],
        whyItMatters: 'Validating A/B tests, confidence intervals, and p-value significance.'
      }
    ]
  }
};

export class RoleBenchmarkService {
  static _loadBenchmarkFromDb(roleTitle) {
    if (!roleTitle || typeof roleTitle !== 'string') return null;
    try {
      const db = initDb();
      const cleanTitle = roleTitle.trim();
      const slug = cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const roleRow = db.prepare(`
        SELECT rb.*, d.title as domain_title
        FROM role_benchmarks rb
        LEFT JOIN domains d ON rb.domain_id = d.id
        WHERE LOWER(rb.title) = LOWER(?) OR rb.role_id = ?
        LIMIT 1;
      `).get(cleanTitle, slug);

      if (!roleRow) return null;

      const skillsRows = db.prepare(`
        SELECT rbs.*, s.name as skill_name, s.category
        FROM role_benchmark_skills rbs
        LEFT JOIN skills s ON rbs.skill_id = s.id
        WHERE rbs.benchmark_id = ?
        ORDER BY rbs.weight DESC;
      `).all(roleRow.id);

      if (!skillsRows || skillsRows.length === 0) return null;

      return {
        id: roleRow.id,
        roleId: roleRow.role_id,
        roleTitle: roleRow.title,
        domainId: roleRow.domain_id,
        domainTitle: roleRow.domain_title || roleRow.domain_id,
        description: roleRow.description || '',
        benchmarkVersion: roleRow.benchmark_version,
        requiredSkills: skillsRows.map(s => {
          const staticSkill = ROLE_BENCHMARKS[roleRow.title]?.requiredSkills?.find(
            x => x.skillId === s.skill_id || (s.skill_name && x.skillName.toLowerCase() === s.skill_name.toLowerCase())
          );
          const skillName = s.skill_name || staticSkill?.skillName || s.skill_id;
          return {
            skillId: s.skill_id,
            skillName,
            category: s.category || staticSkill?.category || 'General',
            requiredProficiency: s.target_level,
            weight: s.weight,
            isMandatory: s.is_mandatory === 1,
            prerequisites: (() => {
              try { return JSON.parse(s.prerequisites_json || '[]'); } catch { return []; }
            })(),
            whyItMatters: s.why_it_matters || staticSkill?.whyItMatters || ''
          };
        })
      };
    } catch {
      return null;
    }
  }

  /**
   * Retrieves canonical role benchmark definition.
   * Checks database first, falls back gracefully to static benchmarks.
   */
  static getRoleBenchmark(roleTitle) {
    if (!roleTitle || typeof roleTitle !== 'string') {
      const dbDefault = this._loadBenchmarkFromDb('Full-Stack Developer');
      return dbDefault || ROLE_BENCHMARKS['Full-Stack Developer'];
    }

    const fromDb = this._loadBenchmarkFromDb(roleTitle);
    if (fromDb) return fromDb;

    const cleanTitle = roleTitle.trim();
    if (ROLE_BENCHMARKS[cleanTitle]) {
      return ROLE_BENCHMARKS[cleanTitle];
    }

    // Case-insensitive / partial match
    const lower = cleanTitle.toLowerCase();
    for (const [title, benchmark] of Object.entries(ROLE_BENCHMARKS)) {
      if (title.toLowerCase() === lower || lower.includes(title.toLowerCase())) {
        return benchmark;
      }
    }

    // Role aliases
    if (lower.includes('frontend') || lower.includes('front-end')) return this.getRoleBenchmark('Frontend Developer');
    if (lower.includes('backend') || lower.includes('back-end')) return this.getRoleBenchmark('Backend Developer');
    if (lower.includes('react')) return this.getRoleBenchmark('React Developer');
    if (lower.includes('machine learning') || lower === 'ml') return this.getRoleBenchmark('Machine Learning Engineer');
    if (lower.includes('ai') || lower.includes('artificial intelligence')) return this.getRoleBenchmark('AI/ML Engineer');
    if (lower.includes('cyber') || lower.includes('security')) return this.getRoleBenchmark('Cybersecurity Analyst');
    if (lower.includes('data')) return this.getRoleBenchmark('Data Analyst');

    return ROLE_BENCHMARKS['Full-Stack Developer'];
  }

  static getAllBenchmarks() {
    try {
      const db = initDb();
      const rows = db.prepare('SELECT title FROM role_benchmarks;').all();
      if (rows && rows.length > 0) {
        return rows.map(r => this.getRoleBenchmark(r.title)).filter(Boolean);
      }
    } catch {
      // fallback
    }
    return Object.values(ROLE_BENCHMARKS);
  }

  static getAvailableRoles() {
    try {
      const db = initDb();
      const rows = db.prepare('SELECT title FROM role_benchmarks;').all();
      if (rows && rows.length > 0) {
        return rows.map(r => r.title);
      }
    } catch {
      // fallback
    }
    return Object.keys(ROLE_BENCHMARKS);
  }
}
