const fs = require('fs');
const path = require('path');
const docx = require('docx');

const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType,
} = docx;

function createDoc() {
  const primaryColor = '087BFA';
  const navyColor = '0B1B43';
  const grayColor = '64748B';
  const lightBg = 'F4F7FC';
  const headerBg = '0B1B43';
  const whiteColor = 'FFFFFF';
  const borderColor = 'D1D5DB';

  const tableBorder = {
    top: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
    left: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
    right: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
  };

  const createHeaderCell = (text, widthPct = 25) =>
    new TableCell({
      width: { size: widthPct, type: WidthType.PERCENTAGE },
      shading: { fill: headerBg, type: ShadingType.CLEAR },
      borders: tableBorder,
      children: [
        new Paragraph({
          spacing: { before: 80, after: 80 },
          children: [new TextRun({ text, bold: true, color: whiteColor, size: 20 })],
        }),
      ],
    });

  const createCell = (text, bold = false, widthPct = 25, isAlt = false) =>
    new TableCell({
      width: { size: widthPct, type: WidthType.PERCENTAGE },
      shading: isAlt ? { fill: lightBg, type: ShadingType.CLEAR } : undefined,
      borders: tableBorder,
      children: [
        new Paragraph({
          spacing: { before: 60, after: 60 },
          children: [new TextRun({ text, bold, size: 20 })],
        }),
      ],
    });

  const doc = new Document({
    title: 'Sarathi AI - Complete Student Portal & Platform Architecture Documentation',
    description: 'Master technical reference for Sarathi AI',
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 22, color: '0F172A' },
          paragraph: { spacing: { line: 276, before: 100, after: 100 } },
        },
      },
    },
    sections: [
      {
        properties: {},
        children: [
          // TITLE BLOCK
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 300, after: 80 },
            children: [
              new TextRun({
                text: 'SARATHI AI',
                bold: true,
                size: 52,
                color: primaryColor,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 150 },
            children: [
              new TextRun({
                text: 'Student Portal & Platform Engineering Architecture Documentation',
                bold: true,
                size: 30,
                color: navyColor,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 300 },
            children: [
              new TextRun({
                text: 'Comprehensive Audit: System Architecture, Data Pipelines, API Inventory, Database Schema, and Roadmap',
                italics: true,
                size: 20,
                color: grayColor,
              }),
            ],
          }),

          // METADATA SUMMARY TABLE
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createCell('Document Classification', true, 30, true),
                  createCell('Canonical System Engineering & Architecture Reference', false, 70),
                ],
              }),
              new TableRow({
                children: [
                  createCell('Software Release / Schema', true, 30, true),
                  createCell('Version 2.5.0 (SQLite Schema v4 / Assessment Engine V2 Active)', false, 70),
                ],
              }),
              new TableRow({
                children: [
                  createCell('Audit Verification Status', true, 30, true),
                  createCell('142 / 142 Backend Tests Passed (100%), 39 / 39 Client Tests Passed', false, 70),
                ],
              }),
              new TableRow({
                children: [
                  createCell('Target Audience', true, 30, true),
                  createCell('Software Engineers, AI Pair-Programmers (Antigravity/Claude), Technical Architects', false, 70),
                ],
              }),
            ],
          }),

          new Paragraph({ spacing: { before: 300, after: 100 }, children: [] }),

          // TABLE OF CONTENTS (MANUAL MAPPING)
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: 'Table of Contents', bold: true, color: primaryColor })],
          }),
          new Paragraph({ children: [new TextRun('1. Executive Summary & Core Platform Vision')] }),
          new Paragraph({ children: [new TextRun('2. Technical Architecture & Tech Stack')] }),
          new Paragraph({ children: [new TextRun('3. Complete Multi-Portal Feature Inventory')] }),
          new Paragraph({ children: [new TextRun('4. Student Portal Deep Audit & Functional Workflows')] }),
          new Paragraph({ children: [new TextRun('5. Recruiter, College & Reviewer Portals')] }),
          new Paragraph({ children: [new TextRun('6. REST API Inventory (19 Endpoint Modules)')] }),
          new Paragraph({ children: [new TextRun('7. SQLite Relational Database Architecture (v4 Schema)')] }),
          new Paragraph({ children: [new TextRun('8. Security, Multi-Tenant Isolation & Authentication')] }),
          new Paragraph({ children: [new TextRun('9. Testing & Quality Assurance Verification')] }),
          new Paragraph({ children: [new TextRun('10. Architectural Debt & Engineering Roadmap')] }),

          new Paragraph({ spacing: { before: 300, after: 100 }, children: [] }),

          // 1. EXECUTIVE SUMMARY
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: '1. Executive Summary & Core Platform Vision', bold: true, color: primaryColor })],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Sarathi AI is an intelligent, multi-tenant career acceleration, skill verification, and institutional talent placement platform. It provides candidates with automated diagnostic skill benchmarking, adaptive curriculum generation, verifiable skill credentials, and an integrated AI career mentor. Simultaneously, the platform equips recruiters with multi-dimensional candidate search and automated hiring pipelines, while offering colleges cohort-level placement intelligence.',
              }),
            ],
          }),

          // 2. TECHNICAL ARCHITECTURE
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 100 },
            children: [new TextRun({ text: '2. Technical Architecture & Tech Stack', bold: true, color: primaryColor })],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'The Sarathi AI platform is built as a modular monorepo structured into decoupled frontend, backend, and database tiers:',
              }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('Tier / Layer', 20),
                  createHeaderCell('Core Technology', 25),
                  createHeaderCell('Key Libraries / Drivers', 30),
                  createHeaderCell('Primary Responsibility', 25),
                ],
              }),
              new TableRow({
                children: [
                  createCell('Frontend UI', true, 20),
                  createCell('React 18.3 / Vite 8.3', false, 25),
                  createCell('TypeScript 5.6, Tailwind CSS v4, Lucide React, Recharts', false, 30),
                  createCell('Reactive portal interfaces, local state management, charts', false, 25),
                ],
              }),
              new TableRow({
                children: [
                  createCell('Backend API', true, 20, true),
                  createCell('Node.js 24 / Express 5.0', false, 25, true),
                  createCell('CORS, Cookie-Parser, Scrypt/Crypto, JWT', false, 30, true),
                  createCell('19 REST route controllers, 18 domain business services', false, 25, true),
                ],
              }),
              new TableRow({
                children: [
                  createCell('Database Tier', true, 20),
                  createCell('Node SQLite (node:sqlite)', false, 25),
                  createCell('Transactional SQL repository wrapper, schema migrations', false, 30),
                  createCell('25+ relational tables, foreign key cascading, multi-tenancy', false, 25),
                ],
              }),
              new TableRow({
                children: [
                  createCell('AI Provider Tier', true, 20, true),
                  createCell('Multi-Provider Orchestrator', false, 25, true),
                  createCell('Google Gemini (gemini-1.5-flash), OpenAI (gpt-4o-mini)', false, 30, true),
                  createCell('Contextual candidate mentoring with local fallback', false, 25, true),
                ],
              }),
            ],
          }),

          // 3. COMPLETE FEATURE INVENTORY
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 100 },
            children: [new TextRun({ text: '3. Complete Multi-Portal Feature Inventory', bold: true, color: primaryColor })],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'The platform spans four distinct operational portals plus standalone public authentication surfaces. The implementation status of every major feature is classified below:',
              }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('Portal', 15),
                  createHeaderCell('Feature Name', 25),
                  createHeaderCell('Implementation Status', 25),
                  createHeaderCell('Data Binding & Persistence', 35),
                ],
              }),
              new TableRow({
                children: [
                  createCell('Student', true, 15),
                  createCell('Career Dashboard', false, 25),
                  createCell('Verified Functional', true, 25),
                  createCell('GET /api/analytics/student + StudentContext', false, 35),
                ],
              }),
              new TableRow({
                children: [
                  createCell('Student', true, 15, true),
                  createCell('Skill Assessment (V1/V2)', false, 25, true),
                  createCell('Verified Functional (V2 Proctored)', true, 25, true),
                  createCell('POST /api/v2/assessment/* + assessment_sessions', false, 35, true),
                ],
              }),
              new TableRow({
                children: [
                  createCell('Student', true, 15),
                  createCell('Skill Gap Analysis', false, 25),
                  createCell('Verified Functional', true, 25),
                  createCell('domainsCatalog.ts + GET /api/resources', false, 35),
                ],
              }),
              new TableRow({
                children: [
                  createCell('Student', true, 15, true),
                  createCell('Dynamic Roadmap', false, 25, true),
                  createCell('Verified Functional', true, 25, true),
                  createCell('GET/POST /api/roadmap + student_roadmaps', false, 35, true),
                ],
              }),
              new TableRow({
                children: [
                  createCell('Student', true, 15),
                  createCell('Project Evidence / GitHub', false, 25),
                  createCell('Verified Functional', true, 25),
                  createCell('POST /api/candidates/github/import + skill_evidence', false, 35),
                ],
              }),
              new TableRow({
                children: [
                  createCell('Student', true, 15, true),
                  createCell('Skill Passport', false, 25, true),
                  createCell('Verified Functional', true, 25, true),
                  createCell('GET/POST /api/passport/share + passport_shares', false, 35, true),
                ],
              }),
              new TableRow({
                children: [
                  createCell('Student', true, 15),
                  createCell('Opportunities & Pipeline', false, 25),
                  createCell('Verified Functional', true, 25),
                  createCell('GET /api/jobs + GET /api/pipeline/my-applications', false, 35),
                ],
              }),
              new TableRow({
                children: [
                  createCell('Student', true, 15, true),
                  createCell('AI Mentor Chatbot', false, 25, true),
                  createCell('Verified Functional', true, 25, true),
                  createCell('POST /api/chat + aiChatService.js (Gemini/OpenAI)', false, 35, true),
                ],
              }),
              new TableRow({
                children: [
                  createCell('Recruiter', true, 15),
                  createCell('Candidate Discovery', false, 25),
                  createCell('Verified Functional', true, 25),
                  createCell('GET /api/candidates/search + matchingService.js', false, 35),
                ],
              }),
              new TableRow({
                children: [
                  createCell('Recruiter', true, 15, true),
                  createCell('Hiring Pipeline (Kanban)', false, 25, true),
                  createCell('Verified Functional', true, 25, true),
                  createCell('/api/pipeline/* + applications table (11 stages)', false, 35, true),
                ],
              }),
              new TableRow({
                children: [
                  createCell('Reviewer', true, 15),
                  createCell('Proctoring Review Queue', false, 25),
                  createCell('Verified Functional', true, 25),
                  createCell('GET/POST /api/v2/assessment/review/* + integrity_reviews', false, 35),
                ],
              }),
              new TableRow({
                children: [
                  createCell('College', true, 15, true),
                  createCell('Placement Dashboard', false, 25, true),
                  createCell('Mock / Prototype', false, 25, true),
                  createCell('Frontend state via mockRecruiterCollege.ts', false, 35, true),
                ],
              }),
            ],
          }),

          // 4. STUDENT PORTAL DEEP AUDIT
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 100 },
            children: [new TextRun({ text: '4. Student Portal Deep Audit & Functional Workflows', bold: true, color: primaryColor })],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'The Student Portal represents the core experience for job seekers and learners. The sections below describe its implementation and data integrity mechanics:',
              }),
            ],
          }),
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: '4.1 Career Readiness Engine & Formula', bold: true, color: navyColor })],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'The Career Readiness Score is calculated deterministically in StudentContext.tsx. It evaluates verified and diagnostic-evaluated skills against the target role requirements in domainsCatalog.ts. Points are earned only for skills with demonstrated proficiencies (Level 1 to 5). If no assessment has been taken, readiness remains null, prompting the user to take a diagnostic assessment.',
              }),
            ],
          }),
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: '4.2 Proctored V2 Assessment Engine', bold: true, color: navyColor })],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Activated by VITE_ASSESSMENT_V2=true, the V2 engine introduces camera proctoring (CameraCheck.tsx), full-screen lock enforcement, tab-switch event tracking (IntegrityBanner.tsx), and in-browser code execution (CodeWorkbench.tsx). The backend RunnerDriver handles local dev execution with timeout protection and SQL injection blocking. Flagged attempts enter the human proctoring review queue.',
              }),
            ],
          }),
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: '4.3 Adaptive Roadmap & Domain Track Synchronization', bold: true, color: navyColor })],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'When a candidate changes their career specialization (e.g. from Frontend to DevOps), StudentContext.setTargetRole dynamically builds the domain track curriculum, prioritizes tasks matching active skill gaps, and preserves completed task IDs in SQLite via /api/roadmap.',
              }),
            ],
          }),

          // 5. RECRUITER & COLLEGE OVERVIEW
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 100 },
            children: [new TextRun({ text: '5. Recruiter, College & Reviewer Portals', bold: true, color: primaryColor })],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'The Recruiter Portal includes 13 production pages with full backend database connectivity. It supports candidate discovery, job requisitions, 11-stage Kanban pipeline advancement, interview scheduling, and evidence verification. The Reviewer Portal (/reviewer/*) allows proctors to review flagged assessment attempts. The College Portal (/college/*) renders department analytics, at-risk student lists, and placement drive schedules using client mock data; backend endpoints (/api/analytics/college) represent an upcoming enhancement.',
              }),
            ],
          }),

          // 6. REST API INVENTORY
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 100 },
            children: [new TextRun({ text: '6. REST API Inventory (19 Endpoint Modules)', bold: true, color: primaryColor })],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('Route File', 25),
                  createHeaderCell('Base URL Path', 25),
                  createHeaderCell('Primary Methods', 20),
                  createHeaderCell('Authentication Requirement', 30),
                ],
              }),
              new TableRow({
                children: [
                  createCell('authRoutes.js', true, 25),
                  createCell('/api/auth/*', false, 25),
                  createCell('GET, POST', false, 20),
                  createCell('Public (login/register) / Bearer (me/logout)', false, 30),
                ],
              }),
              new TableRow({
                children: [
                  createCell('analyticsRoutes.js', true, 25, true),
                  createCell('/api/analytics/*', false, 25, true),
                  createCell('GET', false, 20, true),
                  createCell('Bearer Token (Student / Recruiter RBAC)', false, 30, true),
                ],
              }),
              new TableRow({
                children: [
                  createCell('assessmentV2Routes.js', true, 25),
                  createCell('/api/v2/assessment/*', false, 25),
                  createCell('GET, POST', false, 20),
                  createCell('Bearer Token (Candidate / Reviewer RBAC)', false, 30),
                ],
              }),
              new TableRow({
                children: [
                  createCell('candidateRoutes.js', true, 25, true),
                  createCell('/api/candidates/*', false, 25, true),
                  createCell('GET, POST, PUT', false, 20, true),
                  createCell('Bearer Token (Candidate Profile / Search)', false, 30, true),
                ],
              }),
              new TableRow({
                children: [
                  createCell('jobRoutes.js', true, 25),
                  createCell('/api/jobs/*', false, 25),
                  createCell('GET, POST, PUT, DELETE', false, 20),
                  createCell('Public (read jobs) / Recruiter (mutate jobs)', false, 30),
                ],
              }),
              new TableRow({
                children: [
                  createCell('pipelineRoutes.js', true, 25, true),
                  createCell('/api/pipeline/*', false, 25, true),
                  createCell('GET, POST, PATCH', false, 20, true),
                  createCell('Bearer Token (Candidate apply / Recruiter manage)', false, 30, true),
                ],
              }),
              new TableRow({
                children: [
                  createCell('chatRoutes.js', true, 25),
                  createCell('/api/chat/*', false, 25),
                  createCell('POST', false, 20),
                  createCell('Bearer Token (Authenticated AI Mentorship)', false, 30),
                ],
              }),
              new TableRow({
                children: [
                  createCell('roadmapRoutes.js', true, 25, true),
                  createCell('/api/roadmap/*', false, 25, true),
                  createCell('GET, POST', false, 20, true),
                  createCell('Bearer Token (Candidate Roadmap Persistence)', false, 30, true),
                ],
              }),
              new TableRow({
                children: [
                  createCell('passportShareRoutes.js', true, 25),
                  createCell('/api/passport/share/*', false, 25),
                  createCell('GET, POST', false, 20),
                  createCell('Bearer Token (manage) / Public (view token)', false, 30),
                ],
              }),
              new TableRow({
                children: [
                  createCell('resourceRoutes.js', true, 25, true),
                  createCell('/api/resources/*', false, 25, true),
                  createCell('GET, POST', false, 20, true),
                  createCell('Bearer Token (Bookmarks & Progress tracking)', false, 30, true),
                ],
              }),
            ],
          }),

          // 7. DATABASE ARCHITECTURE
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 100 },
            children: [new TextRun({ text: '7. SQLite Relational Database Architecture (v4 Schema)', bold: true, color: primaryColor })],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'The database tier (server/src/data/schema.js) is versioned at Schema Version 4. Key tables and foreign-key dependencies are documented below:',
              }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('Table Name', 25),
                  createHeaderCell('Primary Key', 20),
                  createHeaderCell('Foreign Key References', 25),
                  createHeaderCell('Purpose & Data Stored', 30),
                ],
              }),
              new TableRow({
                children: [
                  createCell('users', true, 25),
                  createCell('id (TEXT)', false, 20),
                  createCell('Self-contained identity table', false, 25),
                  createCell('Global user identity, email, password_hash, role', false, 30),
                ],
              }),
              new TableRow({
                children: [
                  createCell('candidate_profiles', true, 25, true),
                  createCell('id (TEXT)', false, 20, true),
                  createCell('users(id) ON DELETE CASCADE', false, 25, true),
                  createCell('Target role, headline, github_url, portfolio, resume', false, 30, true),
                ],
              }),
              new TableRow({
                children: [
                  createCell('candidate_skills', true, 25),
                  createCell('id (TEXT)', false, 20),
                  createCell('users(id), skills(id)', false, 25),
                  createCell('Demonstrated proficiency level, verification status', false, 30),
                ],
              }),
              new TableRow({
                children: [
                  createCell('assessment_sessions', true, 25, true),
                  createCell('id (TEXT)', false, 20, true),
                  createCell('users(id) ON DELETE CASCADE', false, 25, true),
                  createCell('Assessment attempts, practice/secure mode, deadlines', false, 30, true),
                ],
              }),
              new TableRow({
                children: [
                  createCell('jobs', true, 25),
                  createCell('id (TEXT)', false, 20),
                  createCell('organisations(id), users(id)', false, 25),
                  createCell('Job postings, salary range, employment type, status', false, 30),
                ],
              }),
              new TableRow({
                children: [
                  createCell('applications', true, 25, true),
                  createCell('id (TEXT)', false, 20, true),
                  createCell('jobs(id), users(id)', false, 25, true),
                  createCell('Candidate applications across 11 recruitment stages', false, 30, true),
                ],
              }),
            ],
          }),

          // 8. SECURITY & MULTI-TENANCY
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 100 },
            children: [new TextRun({ text: '8. Security, Multi-Tenant Isolation & Authentication', bold: true, color: primaryColor })],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Multi-tenant boundaries are enforced at both the database and service levels. Every operational recruiter entity is scoped to an org_id. Cross-tenant queries are strictly rejected with 403 Forbidden. Candidates cannot access recruiter candidate pools or modify applications from other users. Authentication tokens are cryptographically signed using HS256 with 7-day expiration.',
              }),
            ],
          }),

          // 9. TESTING & VERIFICATION
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 100 },
            children: [new TextRun({ text: '9. Testing & Quality Assurance Verification', bold: true, color: primaryColor })],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'The backend test suite executes 142 integration tests across 22 test suites via Node.js native test runner (npm test) with 100% pass rate. Verified areas include session security, multi-tenant data isolation, real password authentication, roadmap track synchronization, runner driver security bounds, AI chat rate limiting, and candidate matching algorithms. The frontend client executes 39 Vitest tests covering assessment UI components.',
              }),
            ],
          }),

          // 10. ARCHITECTURAL DEBT & ROADMAP
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 100 },
            children: [new TextRun({ text: '10. Architectural Debt & Engineering Roadmap', bold: true, color: primaryColor })],
          }),
          new Paragraph({
            bullet: { level: 0 },
            children: [
              new TextRun({ bold: true, text: 'Login UI Modernization: ' }),
              new TextRun('Execute redesign according to SARATHI_LOGIN_UI_REDESIGN_HANDOFF.md while preserving the 8-layer authentication contracts.'),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            children: [
              new TextRun({ bold: true, text: 'College Portal Backend Integration: ' }),
              new TextRun('Build real Express endpoints (/api/analytics/college) backed by SQL aggregations to replace client mock data.'),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            children: [
              new TextRun({ bold: true, text: 'Session Persistence Enhancement: ' }),
              new TextRun('Implement conditional localStorage token persistence when the user toggles "Remember Me".'),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            children: [
              new TextRun({ bold: true, text: 'Cloud Container Execution: ' }),
              new TextRun('Deploy production Judge0 runner containers for sandboxed multi-language code execution.'),
            ],
          }),
        ],
      },
    ],
  });

  return doc;
}

async function run() {
  const doc = createDoc();
  const buffer = await Packer.toBuffer(doc);
  const outputPath = path.join(__dirname, '..', 'docs', 'Sarathi_Student_Portal_Project_Documentation.docx');
  fs.writeFileSync(outputPath, buffer);
  console.log(`Updated comprehensive document written to ${outputPath} (${buffer.length} bytes)`);
}

run().catch(err => {
  console.error('Error generating docx:', err);
  process.exit(1);
});
