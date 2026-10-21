import type { StudentRoadmap } from '../types/roadmap';
import type { SkillGapItem } from '../types/gap';
import { getRoleRequirements } from './domainsCatalog';
import { resolveDomainTrack, getDomainRoadmap } from './domainRoadmaps';

// Demo roadmap with prefilled progress for Alex Morgan only
export const initialStudentRoadmap: StudentRoadmap = {
  targetRole: 'Full-Stack Developer',
  overallProgress: 45,
  recommendedNextTaskId: 'task-3-2',
  stages: [
    {
      id: 'stage-1',
      stageNumber: 1,
      title: 'Foundations of Modern Web',
      description: 'Master core web technologies, responsive layouts, semantic markup, and modern JavaScript syntax.',
      tasks: [
        {
          id: 'task-1-1',
          stageId: 'stage-1',
          topic: 'Semantic HTML5 & Accessibility',
          description: 'Learn landmark elements, ARIA attributes, document structure, and screen reader compatibility.',
          relevanceToRole: 'Essential foundation for creating professional, accessible web applications.',
          estimatedDuration: '3 hours',
          difficulty: 'Beginner',
          resourceName: 'MDN Web Docs — HTML Structuring',
          resourceUrl: 'https://developer.mozilla.org/en-US/docs/Learn/HTML',
          isFreeResource: true,
          isCompleted: true
        },
        {
          id: 'task-1-2',
          stageId: 'stage-1',
          topic: 'CSS Flexbox & Grid Masterclass',
          description: 'Build complex, mobile-responsive page layouts without relying on heavy UI frameworks.',
          relevanceToRole: 'Crucial for styling responsive full-stack web layouts.',
          estimatedDuration: '5 hours',
          difficulty: 'Beginner',
          resourceName: 'CSS-Tricks Complete Guide to Flexbox & Grid',
          resourceUrl: 'https://css-tricks.com/snippets/css/a-guide-to-flexbox/',
          isFreeResource: true,
          isCompleted: true
        },
        {
          id: 'task-1-3',
          stageId: 'stage-1',
          topic: 'Modern JavaScript (ES6+)',
          description: 'Master arrow functions, destructuring, promises, async/await, closures, and modules.',
          relevanceToRole: 'Core language powering both React frontend and Node backend.',
          estimatedDuration: '8 hours',
          difficulty: 'Intermediate',
          resourceName: 'javascript.info — The Modern JavaScript Tutorial',
          resourceUrl: 'https://javascript.info/',
          isFreeResource: true,
          isCompleted: true
        }
      ]
    },
    {
      id: 'stage-2',
      stageNumber: 2,
      title: 'Frontend Mastery with React & TypeScript',
      description: 'Build component-driven user interfaces with state management, hooks, and static type safety.',
      tasks: [
        {
          id: 'task-2-1',
          stageId: 'stage-2',
          topic: 'React Fundamentals & State',
          description: 'Understand JSX, props, state, event handling, and component lifecycle with hooks.',
          relevanceToRole: 'Industry standard library for building dynamic full-stack user interfaces.',
          estimatedDuration: '10 hours',
          difficulty: 'Intermediate',
          resourceName: 'React Documentation — Describing the UI',
          resourceUrl: 'https://react.dev/learn',
          isFreeResource: true,
          isCompleted: true
        },
        {
          id: 'task-2-2',
          stageId: 'stage-2',
          topic: 'TypeScript for React Developers',
          description: 'Type React components, props, hooks, custom events, and API response structures.',
          relevanceToRole: 'Reduces runtime bugs and ensures code quality in team environments.',
          estimatedDuration: '6 hours',
          difficulty: 'Intermediate',
          resourceName: 'TypeScript Handbook for React',
          resourceUrl: 'https://www.typescriptlang.org/docs/handbook/react.html',
          isFreeResource: true,
          isCompleted: false
        }
      ]
    },
    {
      id: 'stage-3',
      stageNumber: 3,
      title: 'Backend Architecture with Node & Express',
      description: 'Design robust HTTP REST APIs, middleware pipelines, authentication, and error handling.',
      tasks: [
        {
          id: 'task-3-1',
          stageId: 'stage-3',
          topic: 'Node.js & Express API Development',
          description: 'Build HTTP servers, route parameters, controllers, and JSON responses with Express.',
          relevanceToRole: 'Powers server-side business logic and endpoint creation.',
          estimatedDuration: '8 hours',
          difficulty: 'Intermediate',
          resourceName: 'Express.js Getting Started Guide',
          resourceUrl: 'https://expressjs.com/en/starter/installing.html',
          isFreeResource: true,
          isCompleted: true
        },
        {
          id: 'task-3-2',
          stageId: 'stage-3',
          topic: 'JWT Authentication & Security',
          description: 'Implement JSON Web Tokens, password hashing with bcrypt, and protected middleware routes.',
          relevanceToRole: 'Essential for user login systems and API security.',
          estimatedDuration: '5 hours',
          difficulty: 'Advanced',
          resourceName: 'Auth0 JWT Security Best Practices',
          resourceUrl: 'https://jwt.io/introduction',
          isFreeResource: true,
          isCompleted: false
        }
      ]
    },
    {
      id: 'stage-4',
      stageNumber: 4,
      title: 'Databases & Persistent Data Storage',
      description: 'Design relational schemas, write performant SQL queries, and integrate ORMs / Supabase.',
      tasks: [
        {
          id: 'task-4-1',
          stageId: 'stage-4',
          topic: 'Relational Database Design & SQL',
          description: 'Master table normalized design, primary/foreign keys, joins, indexing, and aggregations.',
          relevanceToRole: 'Stores user accounts, skill profiles, and application records.',
          estimatedDuration: '7 hours',
          difficulty: 'Intermediate',
          resourceName: 'PostgreSQL Official Documentation & Tutorial',
          resourceUrl: 'https://www.postgresqltutorial.com/',
          isFreeResource: true,
          isCompleted: false
        },
        {
          id: 'task-4-2',
          stageId: 'stage-4',
          topic: 'Supabase / PostgreSQL Integration',
          description: 'Configure database tables, Row Level Security (RLS) policies, and client queries.',
          relevanceToRole: 'Modern cloud database integration for full-stack web applications.',
          estimatedDuration: '4 hours',
          difficulty: 'Intermediate',
          resourceName: 'Supabase Official Quickstart',
          resourceUrl: 'https://supabase.com/docs',
          isFreeResource: true,
          isCompleted: false
        }
      ]
    },
    {
      id: 'stage-5',
      stageNumber: 5,
      title: 'Full-Stack Project & Capstone',
      description: 'Combine frontend React, Node API, database persistence, and deployment into a live product.',
      tasks: [
        {
          id: 'task-5-1',
          stageId: 'stage-5',
          topic: 'Capstone: End-to-End SaaS Web App',
          description: 'Build a feature-rich web app with authentication, CRUD operations, dark mode, and responsive UI.',
          relevanceToRole: 'Tangible project evidence required for Skill Passport and recruiter matching.',
          estimatedDuration: '20 hours',
          difficulty: 'Advanced',
          resourceName: 'Full Stack Open — Deep Dive into Modern Web Development',
          resourceUrl: 'https://fullstackopen.com/en/',
          isFreeResource: true,
          isCompleted: false
        }
      ]
    },
    {
      id: 'stage-6',
      stageNumber: 6,
      title: 'Portfolio, Interview & Career Readiness',
      description: 'Prepare your Skill Passport, optimize GitHub portfolio repositories, and practice technical interviews.',
      tasks: [
        {
          id: 'task-6-1',
          stageId: 'stage-6',
          topic: 'Skill Passport & GitHub Optimization',
          description: 'Format clean README files, host live demos on Vercel/Netlify, and showcase verified skills.',
          relevanceToRole: 'Differentiates your portfolio to hiring recruiters.',
          estimatedDuration: '4 hours',
          difficulty: 'Intermediate',
          resourceName: 'GitHub Portfolio Guide for Engineers',
          resourceUrl: 'https://docs.github.com/en/get-started',
          isFreeResource: true,
          isCompleted: false
        }
      ]
    }
  ]
};

// Generates a clean 0% progress roadmap for any selected role
export const getRoadmapForRole = (
  roleTitle: string = 'Full-Stack Developer',
  skillGaps?: SkillGapItem[]
): StudentRoadmap => {
  const resolved = resolveDomainTrack(roleTitle);

  // If roleTitle or alias resolves to a dedicated non-web domain track
  if (resolved.trackKey !== 'web-dev') {
    return getDomainRoadmap(roleTitle, skillGaps);
  }

  const isFrontend = roleTitle.toLowerCase().includes('frontend');
  const isBackend = roleTitle.toLowerCase().includes('backend');

  if (isFrontend) {
    return {
      targetRole: 'Frontend Developer',
      overallProgress: 0,
      recommendedNextTaskId: 'task-fe-1-1',
      stages: [
        {
          id: 'stage-fe-1',
          stageNumber: 1,
          title: 'Semantic HTML, CSS Architecture & UX',
          description: 'Master responsive designs, modern CSS Grid/Flexbox, accessibility standards, and clean DOM markup.',
          tasks: [
            {
              id: 'task-fe-1-1',
              stageId: 'stage-fe-1',
              topic: 'Semantic HTML5 & Accessibility Guidelines',
              description: 'Implement accessible web interfaces following WCAG guidelines with aria labels and landmark roles.',
              relevanceToRole: 'Foundational for compliant enterprise frontend engineering.',
              estimatedDuration: '4 hours',
              difficulty: 'Beginner',
              resourceName: 'MDN Web Docs — HTML & Accessibility',
              resourceUrl: 'https://developer.mozilla.org/en-US/docs/Learn/Accessibility',
              isFreeResource: true,
              isCompleted: false
            },
            {
              id: 'task-fe-1-2',
              stageId: 'stage-fe-1',
              topic: 'Responsive Styling with Modern CSS & Tailwind',
              description: 'Construct responsive breakpoints, fluid typography, and custom utility classes.',
              relevanceToRole: 'Ensures cross-device compatibility and modern UX aesthetics.',
              estimatedDuration: '5 hours',
              difficulty: 'Beginner',
              resourceName: 'Tailwind CSS Official Documentation',
              resourceUrl: 'https://tailwindcss.com/docs',
              isFreeResource: true,
              isCompleted: false
            }
          ]
        },
        {
          id: 'stage-fe-2',
          stageNumber: 2,
          title: 'JavaScript Deep Dive & TypeScript Fundamentals',
          description: 'Master ES6+ asynchronous features, DOM APIs, and static typing.',
          tasks: [
            {
              id: 'task-fe-2-1',
              stageId: 'stage-fe-2',
              topic: 'Modern JavaScript (ES6+) & Async Programming',
              description: 'Async/await, Promises, closures, array pipelines, and module bundler basics.',
              relevanceToRole: 'Essential core runtime knowledge for interactive applications.',
              estimatedDuration: '8 hours',
              difficulty: 'Intermediate',
              resourceName: 'javascript.info — The Modern JavaScript Tutorial',
              resourceUrl: 'https://javascript.info/',
              isFreeResource: true,
              isCompleted: false
            },
            {
              id: 'task-fe-2-2',
              stageId: 'stage-fe-2',
              topic: 'TypeScript for UI Engineers',
              description: 'Generics, union types, interfaces, and strict type checking.',
              relevanceToRole: 'Prevents bugs and enhances code maintainability.',
              estimatedDuration: '6 hours',
              difficulty: 'Intermediate',
              resourceName: 'TypeScript Handbook',
              resourceUrl: 'https://www.typescriptlang.org/docs/handbook/intro.html',
              isFreeResource: true,
              isCompleted: false
            }
          ]
        },
        {
          id: 'stage-fe-3',
          stageNumber: 3,
          title: 'React Architecture, State & Hooks',
          description: 'Build component hierarchies, manage global application state, and optimize rendering performance.',
          tasks: [
            {
              id: 'task-fe-3-1',
              stageId: 'stage-fe-3',
              topic: 'React Core & Custom Hooks',
              description: 'Component lifecycles, useEffect rules, memoization, and reusable custom hooks.',
              relevanceToRole: 'Industry-standard frontend development framework.',
              estimatedDuration: '10 hours',
              difficulty: 'Intermediate',
              resourceName: 'React.dev Official Guides',
              resourceUrl: 'https://react.dev/learn',
              isFreeResource: true,
              isCompleted: false
            },
            {
              id: 'task-fe-3-2',
              stageId: 'stage-fe-3',
              topic: 'Component Testing with Jest & RTL',
              description: 'Write unit and integration tests for React components and user interactions.',
              relevanceToRole: 'Ensures UI reliability and automated regression protection.',
              estimatedDuration: '6 hours',
              difficulty: 'Intermediate',
              resourceName: 'Testing Library Docs',
              resourceUrl: 'https://testing-library.com/docs/react-testing-library/intro/',
              isFreeResource: true,
              isCompleted: false
            }
          ]
        },
        {
          id: 'stage-fe-4',
          stageNumber: 4,
          title: 'Frontend Portfolio & Verification',
          description: 'Deploy real-world web apps with live demos, code repositories, and Lighthouse audits.',
          tasks: [
            {
              id: 'task-fe-4-1',
              stageId: 'stage-fe-4',
              topic: 'Capstone Frontend Web Application',
              description: 'Build and deploy a feature-complete web app with responsive design, search, and caching.',
              relevanceToRole: 'Verifiable project evidence for your Skill Passport.',
              estimatedDuration: '15 hours',
              difficulty: 'Advanced',
              resourceName: 'Frontend Mentor & Project Prompts',
              resourceUrl: 'https://www.frontendmentor.io/',
              isFreeResource: true,
              isCompleted: false
            }
          ]
        }
      ]
    };
  }

  if (isBackend) {
    return {
      targetRole: 'Backend Developer',
      overallProgress: 0,
      recommendedNextTaskId: 'task-be-1-1',
      stages: [
        {
          id: 'stage-be-1',
          stageNumber: 1,
          title: 'Node.js Runtime & Server Architecture',
          description: 'Understand the event loop, streams, buffers, file systems, and Node package ecosystem.',
          tasks: [
            {
              id: 'task-be-1-1',
              stageId: 'stage-be-1',
              topic: 'Node.js Core & Asynchronous Runtime',
              description: 'Master event loop mechanics, non-blocking I/O, events emitter, and module architecture.',
              relevanceToRole: 'Foundation of modern JavaScript server-side engineering.',
              estimatedDuration: '6 hours',
              difficulty: 'Beginner',
              resourceName: 'Node.js Official Documentation',
              resourceUrl: 'https://nodejs.org/en/docs',
              isFreeResource: true,
              isCompleted: false
            },
            {
              id: 'task-be-1-2',
              stageId: 'stage-be-1',
              topic: 'Git & Version Control for Backend Pipelines',
              description: 'Feature branching, git rebase, tag releases, and pull request workflows.',
              relevanceToRole: 'Essential for team code management and deployment.',
              estimatedDuration: '4 hours',
              difficulty: 'Beginner',
              resourceName: 'Git Book & Interactive Tutorial',
              resourceUrl: 'https://git-scm.com/book/en/v2',
              isFreeResource: true,
              isCompleted: false
            }
          ]
        },
        {
          id: 'stage-be-2',
          stageNumber: 2,
          title: 'RESTful API Engineering & Middleware',
          description: 'Build Express web servers, route handling, authentication, rate limiting, and structured error handling.',
          tasks: [
            {
              id: 'task-be-2-1',
              stageId: 'stage-be-2',
              topic: 'Express.js & REST API Design Best Practices',
              description: 'Build modular controllers, middleware pipelines, status codes, and input validation with Zod/Joi.',
              relevanceToRole: 'Powers scalable server-side communication interfaces.',
              estimatedDuration: '8 hours',
              difficulty: 'Intermediate',
              resourceName: 'Express Guide — Routing & Middleware',
              resourceUrl: 'https://expressjs.com/en/guide/routing.html',
              isFreeResource: true,
              isCompleted: false
            },
            {
              id: 'task-be-2-2',
              stageId: 'stage-be-2',
              topic: 'JWT Authentication & Password Encryption',
              description: 'Implement bcrypt hashing, access and refresh tokens, and protected authorization middleware.',
              relevanceToRole: 'Critical for enterprise data security and user management.',
              estimatedDuration: '6 hours',
              difficulty: 'Advanced',
              resourceName: 'JWT.io Guide & RFC Standards',
              resourceUrl: 'https://jwt.io/introduction',
              isFreeResource: true,
              isCompleted: false
            }
          ]
        },
        {
          id: 'stage-be-3',
          stageNumber: 3,
          title: 'Relational Databases & Persistent Storage',
          description: 'Design normalized SQL tables, write performant queries, setup connection pooling, and handle migrations.',
          tasks: [
            {
              id: 'task-be-3-1',
              stageId: 'stage-be-3',
              topic: 'PostgreSQL & SQL Query Optimization',
              description: 'Table indexing, JOINs, transactions (ACID), and schema migrations.',
              relevanceToRole: 'Primary data storage layer for transactional systems.',
              estimatedDuration: '8 hours',
              difficulty: 'Intermediate',
              resourceName: 'PostgreSQL Tutorial',
              resourceUrl: 'https://www.postgresqltutorial.com/',
              isFreeResource: true,
              isCompleted: false
            },
            {
              id: 'task-be-3-2',
              stageId: 'stage-be-3',
              topic: 'Backend Unit & Integration Testing',
              description: 'Test API endpoints, mocked database queries, and test assertions using Jest and Supertest.',
              relevanceToRole: 'Guarantees reliable API contracts and eliminates regressions.',
              estimatedDuration: '6 hours',
              difficulty: 'Intermediate',
              resourceName: 'Supertest & Jest Integration Guide',
              resourceUrl: 'https://jestjs.io/docs/getting-started',
              isFreeResource: true,
              isCompleted: false
            }
          ]
        },
        {
          id: 'stage-be-4',
          stageNumber: 4,
          title: 'Backend Capstone & Cloud Deployment',
          description: 'Deploy a resilient microservice or backend API with Docker containers and database persistence.',
          tasks: [
            {
              id: 'task-be-4-1',
              stageId: 'stage-be-4',
              topic: 'Capstone: Production-Ready Auth & Data API',
              description: 'Deploy a containerized REST API with PostgreSQL database on a cloud platform (Render/Railway).',
              relevanceToRole: 'Provides tangible project evidence for your Skill Passport.',
              estimatedDuration: '16 hours',
              difficulty: 'Advanced',
              resourceName: 'Deploying Node.js Applications',
              resourceUrl: 'https://nodejs.org/en/learn/getting-started/how-to-deploy-a-nodejs-app',
              isFreeResource: true,
              isCompleted: false
            }
          ]
        }
      ]
    };
  }

  if (roleTitle.toLowerCase().includes('full-stack') || roleTitle.toLowerCase().includes('full stack')) {
    return {
      targetRole: 'Full-Stack Developer',
      overallProgress: 0,
      recommendedNextTaskId: 'task-1-1',
      stages: initialStudentRoadmap.stages.map(stage => ({
        ...stage,
        tasks: stage.tasks.map(task => ({ ...task, isCompleted: false }))
      }))
    };
  }

  // Dynamic tailored roadmap for any of the 10 domains and 38 career roles
  const reqs = getRoleRequirements(roleTitle);
  const skillList = reqs.requiredSkills;

  const stage1Skills = skillList.slice(0, Math.ceil(skillList.length / 3));
  const stage2Skills = skillList.slice(Math.ceil(skillList.length / 3), Math.ceil((skillList.length * 2) / 3));
  const stage3Skills = skillList.slice(Math.ceil((skillList.length * 2) / 3));

  const stages = [
    {
      id: `stage-${roleTitle.toLowerCase().replace(/\s+/g, '-')}-1`,
      stageNumber: 1,
      title: `${reqs.roleTitle} — Foundational Core`,
      description: `Master fundamental competencies and architectural principles required for ${reqs.roleTitle}.`,
      tasks: stage1Skills.map((s, idx) => ({
        id: `task-${roleTitle.toLowerCase().replace(/\s+/g, '-')}-1-${idx + 1}`,
        stageId: `stage-${roleTitle.toLowerCase().replace(/\s+/g, '-')}-1`,
        topic: s.skillName,
        description: s.whyItMatters,
        relevanceToRole: `Critical foundational skill (Target Level: ${s.requiredProficiency}/5).`,
        estimatedDuration: '6-8 hours',
        difficulty: 'Beginner' as const,
        resourceName: `Official Documentation & Tutorials for ${s.skillName}`,
        resourceUrl: 'https://roadmap.sh',
        isFreeResource: true,
        isCompleted: false
      }))
    },
    {
      id: `stage-${roleTitle.toLowerCase().replace(/\s+/g, '-')}-2`,
      stageNumber: 2,
      title: `${reqs.roleTitle} — Advanced Systems & Engineering`,
      description: `Deepen expertise in specialized tooling, performance, and best practices.`,
      tasks: stage2Skills.map((s, idx) => ({
        id: `task-${roleTitle.toLowerCase().replace(/\s+/g, '-')}-2-${idx + 1}`,
        stageId: `stage-${roleTitle.toLowerCase().replace(/\s+/g, '-')}-2`,
        topic: s.skillName,
        description: s.whyItMatters,
        relevanceToRole: `Core professional benchmark for ${reqs.roleTitle}.`,
        estimatedDuration: '8-12 hours',
        difficulty: 'Intermediate' as const,
        resourceName: `Advanced Industry Guides for ${s.skillName}`,
        resourceUrl: 'https://github.com',
        isFreeResource: true,
        isCompleted: false
      }))
    },
    {
      id: `stage-${roleTitle.toLowerCase().replace(/\s+/g, '-')}-3`,
      stageNumber: 3,
      title: `${reqs.roleTitle} — Capstone Project & Skill Passport Verification`,
      description: `Synthesize skills into end-to-end verified portfolio artifacts and diagnostic proof.`,
      tasks: [
        ...stage3Skills.map((s, idx) => ({
          id: `task-${roleTitle.toLowerCase().replace(/\s+/g, '-')}-3-${idx + 1}`,
          stageId: `stage-${roleTitle.toLowerCase().replace(/\s+/g, '-')}-3`,
          topic: s.skillName,
          description: s.whyItMatters,
          relevanceToRole: `Advanced competency requirement for ${reqs.roleTitle}.`,
          estimatedDuration: '10-14 hours',
          difficulty: 'Advanced' as const,
          resourceName: `Production Best Practices for ${s.skillName}`,
          resourceUrl: 'https://roadmap.sh',
          isFreeResource: true,
          isCompleted: false
        })),
        {
          id: `task-${roleTitle.toLowerCase().replace(/\s+/g, '-')}-3-capstone`,
          stageId: `stage-${roleTitle.toLowerCase().replace(/\s+/g, '-')}-3`,
          topic: `Capstone Project: Production ${reqs.roleTitle} System`,
          description: `Build and deploy an end-to-end project demonstrating key competencies required for ${reqs.roleTitle}. Submit repository link for Skill Passport evidence.`,
          relevanceToRole: `Provides verified project proof for recruiters and employers.`,
          estimatedDuration: '20-25 hours',
          difficulty: 'Advanced' as const,
          resourceName: `SARATHI Project Verification Guide`,
          resourceUrl: '/student/projects',
          isFreeResource: true,
          isCompleted: false
        }
      ]
    }
  ];

  return {
    targetRole: reqs.roleTitle,
    overallProgress: 0,
    recommendedNextTaskId: stages[0].tasks[0]?.id || '',
    stages
  };
};
