import bcrypt from 'bcryptjs';
import { randomUUID as uuidv4 } from 'node:crypto';
import { initDb, closeDb } from '../config/db.js';
import { runMigrations } from '../data/migrate.mjs';
import { seedAssessmentBank } from '../data/seeds/assessmentSeeder.js';
import { seedLearningResources } from '../data/seeds/resourceSeeder.js';

export async function runSeeder(dbFile) {
  runMigrations(dbFile);
  const db = initDb(dbFile);
  console.log('Seeding SARATHI Multi-Domain Skill Intelligence & Recruiter Platform...');

  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. ORGANISATIONS
  const orgs = [
    {
      id: 'org-demo-1',
      name: 'Sarathi Enterprise Systems',
      slug: 'sarathi-enterprise',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      settings: JSON.stringify({
        allowPublicApplications: true,
        requireAssessmentForSenior: true,
        defaultPassingScore: 75,
      }),
    },
    {
      id: 'org-demo-2',
      name: 'Apex Cloud Innovations',
      slug: 'apex-cloud',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      settings: JSON.stringify({
        allowPublicApplications: true,
        requireAssessmentForSenior: false,
        defaultPassingScore: 70,
      }),
    }
  ];

  for (const o of orgs) {
    db.prepare(`
      INSERT OR REPLACE INTO organisations (id, name, slug, timezone, currency, settings, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `).run(o.id, o.name, o.slug, o.timezone, o.currency, o.settings, now, now);
  }

  // 2. USERS
  const users = [
    {
      id: 'usr-admin-1',
      email: 'admin@sarathi.ai',
      full_name: 'Priya Sharma (Platform Admin)',
      role: 'platform_admin',
      company_name: 'SARATHI Systems',
      institution: 'IIT Delhi',
    },
    {
      id: 'usr-recruiter-1',
      email: 'recruiter@sarathi.ai',
      full_name: 'Vikram Mehta (Lead Recruiter)',
      role: 'recruiter',
      company_name: 'Sarathi Enterprise Systems',
      institution: 'IIM Bangalore',
    },
    {
      id: 'usr-assessor-1',
      email: 'assessor@sarathi.ai',
      full_name: 'Dr. Anita Roy (Technical Assessor)',
      role: 'assessor',
      company_name: 'Sarathi Enterprise Systems',
      institution: 'IISc Bangalore',
    },
    {
      id: 'usr-student-demo',
      email: 'student@sarathi.ai',
      full_name: 'Alex Morgan',
      role: 'candidate',
      company_name: null,
      institution: 'National Institute of Technology',
    },
    {
      id: 'usr-cand-1',
      email: 'aarav.patel@example.com',
      full_name: 'Aarav Patel',
      role: 'candidate',
      company_name: null,
      institution: 'NIT Trichy',
    },
    {
      id: 'usr-cand-2',
      email: 'diya.sharma@example.com',
      full_name: 'Diya Sharma',
      role: 'candidate',
      company_name: null,
      institution: 'BITS Pilani',
    },
    {
      id: 'usr-cand-3',
      email: 'rohan.iyer@example.com',
      full_name: 'Rohan Iyer',
      role: 'candidate',
      company_name: null,
      institution: 'IIIT Hyderabad',
    },
    {
      id: 'usr-cand-4',
      email: 'ananya.reddy@example.com',
      full_name: 'Ananya Reddy',
      role: 'candidate',
      company_name: null,
      institution: 'IIT Bombay',
    },
    {
      id: 'usr-cand-5',
      email: 'kabir.verma@example.com',
      full_name: 'Kabir Verma',
      role: 'candidate',
      company_name: null,
      institution: 'Delhi Technological University',
    },
  ];

  for (const u of users) {
    db.prepare(`
      INSERT OR REPLACE INTO users (id, email, password_hash, full_name, role, company_name, institution, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `).run(u.id, u.email, passwordHash, u.full_name, u.role, u.company_name, u.institution, now, now);
  }

  // 3. MEMBERSHIPS
  const memberships = [
    { id: 'mem-1', org_id: 'org-demo-1', user_id: 'usr-recruiter-1', role: 'recruiter' },
    { id: 'mem-2', org_id: 'org-demo-1', user_id: 'usr-assessor-1', role: 'assessor' },
    { id: 'mem-3', org_id: 'org-demo-1', user_id: 'usr-admin-1', role: 'org_owner' },
    { id: 'mem-4', org_id: 'org-demo-2', user_id: 'usr-admin-1', role: 'org_owner' },
  ];

  for (const m of memberships) {
    db.prepare(`
      INSERT OR REPLACE INTO organisation_memberships (id, org_id, user_id, role, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'active', ?, ?);
    `).run(m.id, m.org_id, m.user_id, m.role, now, now);
  }

  // 4. CANDIDATE PROFILES
  const profiles = [
    {
      id: 'usr-student-demo',
      headline: 'Aspiring Full-Stack Developer | React, Node.js, TypeScript',
      target_role: 'Full-Stack Developer',
      bio: 'Passionate computer science student aiming to become a lead full-stack product engineer.',
      experience_years: 0.5,
      location: 'Bangalore, India',
      work_preference: 'flexible',
      resume_url: 'https://sarathi.ai/resumes/alex-morgan.pdf',
      github_url: 'https://github.com/alexmorgan-dev',
      portfolio_url: 'https://alexmorgan.dev',
      repo_count: 8,
    },
    {
      id: 'usr-cand-1',
      headline: 'Full-Stack & Cloud Engineer | React, Node.js, AWS, TypeScript',
      target_role: 'Full-Stack Developer',
      bio: 'Enthusiastic software engineer with 2+ years experience building scalable web applications and cloud architectures.',
      experience_years: 2.5,
      location: 'Bangalore, India',
      work_preference: 'hybrid',
      resume_url: 'https://sarathi.ai/resumes/aarav-patel.pdf',
      github_url: 'https://github.com/aaravpatel-dev',
      portfolio_url: 'https://aaravpatel.me',
      repo_count: 18,
    },
    {
      id: 'usr-cand-2',
      headline: 'AI & Data Science Specialist | PyTorch, LLMs, Computer Vision',
      target_role: 'Machine Learning Engineer',
      bio: 'Published ML researcher and practitioner specializing in transformer fine-tuning, embeddings, and generative pipelines.',
      experience_years: 3.0,
      location: 'Hyderabad, India',
      work_preference: 'remote',
      resume_url: 'https://sarathi.ai/resumes/diya-sharma.pdf',
      github_url: 'https://github.com/diyasharma-ai',
      portfolio_url: 'https://diyasharma.ai',
      repo_count: 24,
    },
    {
      id: 'usr-cand-3',
      headline: 'Backend Systems Engineer | Go, Distributed Systems, Kafka, PostgreSQL',
      target_role: 'Backend Engineer',
      bio: 'High-throughput microservices engineer passionate about low-latency caching and ACID databases.',
      experience_years: 4.0,
      location: 'Pune, India',
      work_preference: 'onsite',
      resume_url: 'https://sarathi.ai/resumes/rohan-iyer.pdf',
      github_url: 'https://github.com/rohaniyer-sys',
      portfolio_url: 'https://rohaniyer.dev',
      repo_count: 31,
    },
    {
      id: 'usr-cand-4',
      headline: 'DevOps & Platform Architect | Kubernetes, Terraform, CI/CD, Docker',
      target_role: 'DevOps Engineer',
      bio: 'Infrastructure automation enthusiast automating multi-region clusters, GitOps pipelines, and observability.',
      experience_years: 3.5,
      location: 'Bangalore, India',
      work_preference: 'hybrid',
      resume_url: 'https://sarathi.ai/resumes/ananya-reddy.pdf',
      github_url: 'https://github.com/ananyareddy-ops',
      portfolio_url: 'https://ananyaops.dev',
      repo_count: 15,
    },
    {
      id: 'usr-cand-5',
      headline: 'Cybersecurity Analyst & Penetration Tester | OWASP, Network Defense',
      target_role: 'Security Engineer',
      bio: 'Ethical hacker and application security specialist with bug bounty track records and CEH certification.',
      experience_years: 1.5,
      location: 'Delhi, India',
      work_preference: 'flexible',
      resume_url: 'https://sarathi.ai/resumes/kabir-verma.pdf',
      github_url: 'https://github.com/kabirverma-sec',
      portfolio_url: 'https://kabirsec.info',
      repo_count: 12,
    },
  ];

  for (const p of profiles) {
    db.prepare(`
      INSERT OR REPLACE INTO candidate_profiles (
        id, headline, target_role, bio, experience_years, location, work_preference,
        resume_url, github_url, portfolio_url, repo_count, visibility, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'public', ?, ?);
    `).run(
      p.id, p.headline, p.target_role, p.bio, p.experience_years, p.location, p.work_preference,
      p.resume_url, p.github_url, p.portfolio_url, p.repo_count, now, now
    );
  }

  // 5. 20 MULTI-DOMAIN TAXONOMY
  const domains = [
    { id: 'dom-frontend', title: 'Frontend Development', description: 'Modern reactive web UI, DOM state, accessibility, and client architecture.', icon_name: 'Layout', badge_color: '#3B82F6' },
    { id: 'dom-backend', title: 'Backend Development', description: 'Server-side API design, business logic, asynchronous queues, and database access.', icon_name: 'Server', badge_color: '#6366F1' },
    { id: 'dom-fullstack', title: 'Full-Stack Development', description: 'End-to-end web architectures bridging browser ergonomics with resilient server systems.', icon_name: 'Layers', badge_color: '#8B5CF6' },
    { id: 'dom-mobile', title: 'Mobile App Development', description: 'Native and cross-platform mobile engineering for iOS and Android.', icon_name: 'Smartphone', badge_color: '#EC4899' },
    { id: 'dom-aiml', title: 'AI and Machine Learning', description: 'Supervised, unsupervised models, mathematical optimization, and PyTorch/TensorFlow.', icon_name: 'Brain', badge_color: '#10B981' },
    { id: 'dom-genai', title: 'Generative AI', description: 'Large Language Models, RAG, prompt tuning, agents, and multimodal reasoning.', icon_name: 'Sparkles', badge_color: '#F59E0B' },
    { id: 'dom-datascience', title: 'Data Science', description: 'Statistical modeling, hypothesis testing, feature engineering, and exploratory analytics.', icon_name: 'PieChart', badge_color: '#06B6D4' },
    { id: 'dom-dataeng', title: 'Data Engineering', description: 'Big data pipelines, streaming architectures, Spark, Kafka, and data lakehouses.', icon_name: 'Database', badge_color: '#3B82F6' },
    { id: 'dom-dataanalytics', title: 'Data Analytics', description: 'Business intelligence, metric modeling, dashboarding, and SQL warehousing.', icon_name: 'TrendingUp', badge_color: '#14B8A6' },
    { id: 'dom-cybersec', title: 'Cybersecurity', description: 'Threat modeling, incident response, network defense, and vulnerability management.', icon_name: 'Shield', badge_color: '#EF4444' },
    { id: 'dom-appsec', title: 'Application Security', description: 'OWASP Top 10 mitigation, secure code auditing, SAST/DAST, and cryptography.', icon_name: 'Lock', badge_color: '#F43F5E' },
    { id: 'dom-cloud', title: 'Cloud Computing', description: 'Cloud-native infrastructure on AWS, GCP, and Azure with high availability.', icon_name: 'Cloud', badge_color: '#0EA5E9' },
    { id: 'dom-devops', title: 'DevOps & Platform Engineering', description: 'CI/CD pipelines, Kubernetes orchestration, Infrastructure as Code, and GitOps.', icon_name: 'GitBranch', badge_color: '#64748B' },
    { id: 'dom-database', title: 'Database Engineering', description: 'Relational schema modeling, indexing, query optimization, and NoSQL clusters.', icon_name: 'HardDrive', badge_color: '#7C3AED' },
    { id: 'dom-networking', title: 'Networking', description: 'TCP/IP protocols, load balancing, DNS routing, and software-defined networks.', icon_name: 'Network', badge_color: '#475569' },
    { id: 'dom-qa', title: 'QA & Test Automation', description: 'End-to-end testing, integration test suites, Playwright, Jest, and performance testing.', icon_name: 'CheckCircle', badge_color: '#10B981' },
    { id: 'dom-uiux', title: 'UI/UX Design', description: 'Design systems, Figma wireframing, user journey research, and interaction design.', icon_name: 'Figma', badge_color: '#A855F7' },
    { id: 'dom-blockchain', title: 'Blockchain Development', description: 'Smart contracts, Ethereum, Solidity, cryptography, and Web3 protocols.', icon_name: 'Coins', badge_color: '#EAB308' },
    { id: 'dom-iot', title: 'Embedded Systems & IoT', description: 'Low-power microcontrollers, C/C++, firmware engineering, and hardware protocols.', icon_name: 'Cpu', badge_color: '#64748B' },
    { id: 'dom-robotics', title: 'Robotics', description: 'Kinematics, ROS (Robot Operating System), sensor fusion, and autonomous control.', icon_name: 'Bot', badge_color: '#2563EB' },
  ];

  for (const d of domains) {
    db.prepare(`
      INSERT OR REPLACE INTO domains (id, title, description, icon_name, badge_color, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?);
    `).run(d.id, d.title, d.description, d.icon_name, d.badge_color, now, now);
  }

  // 6. REPRESENTATIVE SKILLS FOR EACH DOMAIN
  const skills = [
    // Frontend
    { id: 'sk-react', domain_id: 'dom-frontend', name: 'React.js', category: 'Framework', proficiency_scale: '1-5' },
    { id: 'sk-typescript', domain_id: 'dom-frontend', name: 'TypeScript', category: 'Language', proficiency_scale: '1-5' },
    { id: 'sk-nextjs', domain_id: 'dom-frontend', name: 'Next.js', category: 'Framework', proficiency_scale: '1-5' },
    { id: 'sk-tailwind', domain_id: 'dom-frontend', name: 'Tailwind CSS', category: 'Styling', proficiency_scale: '1-5' },
    // Backend
    { id: 'sk-nodejs', domain_id: 'dom-backend', name: 'Node.js', category: 'Runtime', proficiency_scale: '1-5' },
    { id: 'sk-express', domain_id: 'dom-backend', name: 'Express.js', category: 'Framework', proficiency_scale: '1-5' },
    { id: 'sk-golang', domain_id: 'dom-backend', name: 'Go (Golang)', category: 'Language', proficiency_scale: '1-5' },
    { id: 'sk-restapi', domain_id: 'dom-backend', name: 'RESTful API Design', category: 'Architecture', proficiency_scale: '1-5' },
    // Full-stack
    { id: 'sk-fullstack-arch', domain_id: 'dom-fullstack', name: 'Full-Stack Web Architecture', category: 'Architecture', proficiency_scale: '1-5' },
    { id: 'sk-graphql', domain_id: 'dom-fullstack', name: 'GraphQL', category: 'API', proficiency_scale: '1-5' },
    // AI/ML & GenAI
    { id: 'sk-pytorch', domain_id: 'dom-aiml', name: 'PyTorch', category: 'Framework', proficiency_scale: '1-5' },
    { id: 'sk-scikit', domain_id: 'dom-aiml', name: 'Scikit-Learn', category: 'Library', proficiency_scale: '1-5' },
    { id: 'sk-llm-fine', domain_id: 'dom-genai', name: 'LLM Fine-Tuning & Prompting', category: 'GenAI', proficiency_scale: '1-5' },
    { id: 'sk-rag', domain_id: 'dom-genai', name: 'RAG & Vector Search', category: 'GenAI', proficiency_scale: '1-5' },
    // Data Engineering & DB
    { id: 'sk-postgres', domain_id: 'dom-database', name: 'PostgreSQL', category: 'Database', proficiency_scale: '1-5' },
    { id: 'sk-redis', domain_id: 'dom-database', name: 'Redis Caching', category: 'Database', proficiency_scale: '1-5' },
    { id: 'sk-kafka', domain_id: 'dom-dataeng', name: 'Apache Kafka', category: 'Streaming', proficiency_scale: '1-5' },
    { id: 'sk-spark', domain_id: 'dom-dataeng', name: 'Apache Spark', category: 'Data', proficiency_scale: '1-5' },
    // DevOps & Cloud
    { id: 'sk-k8s', domain_id: 'dom-devops', name: 'Kubernetes', category: 'Containerization', proficiency_scale: '1-5' },
    { id: 'sk-docker', domain_id: 'dom-devops', name: 'Docker', category: 'Containerization', proficiency_scale: '1-5' },
    { id: 'sk-terraform', domain_id: 'dom-devops', name: 'Terraform (IaC)', category: 'Infrastructure', proficiency_scale: '1-5' },
    { id: 'sk-aws', domain_id: 'dom-cloud', name: 'Amazon Web Services (AWS)', category: 'Cloud', proficiency_scale: '1-5' },
    // Security
    { id: 'sk-owasp', domain_id: 'dom-appsec', name: 'OWASP Security Best Practices', category: 'Security', proficiency_scale: '1-5' },
    { id: 'sk-pentest', domain_id: 'dom-cybersec', name: 'Penetration Testing', category: 'Security', proficiency_scale: '1-5' },
    // QA & UI/UX
    { id: 'sk-jest', domain_id: 'dom-qa', name: 'Jest / Vitest Automation', category: 'Testing', proficiency_scale: '1-5' },
    { id: 'sk-playwright', domain_id: 'dom-qa', name: 'Playwright E2E Testing', category: 'Testing', proficiency_scale: '1-5' },
    { id: 'sk-figma', domain_id: 'dom-uiux', name: 'Figma Design Systems', category: 'Design', proficiency_scale: '1-5' },
  ];

  for (const s of skills) {
    db.prepare(`
      INSERT OR REPLACE INTO skills (
        id, domain_id, name, description, category, proficiency_scale,
        accepted_evidence_types, assessment_types, active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, '["github_pr","project_repo","assessment_score","certificate","code_sample"]', '["practical_coding","mcq","code_review"]', 1, ?, ?);
    `).run(s.id, s.domain_id, s.name, `${s.name} core competency and real-world application`, s.category, s.proficiency_scale, now, now);
  }

  // 7. CANDIDATE SKILLS & VERIFICATION STATES
  const candSkills = [
    // Aarav Patel (Full-stack)
    { cand: 'usr-cand-1', skill: 'sk-react', prof: 4, status: 'verified', source: 'practical_assessment' },
    { cand: 'usr-cand-1', skill: 'sk-typescript', prof: 4, status: 'verified', source: 'peer_review' },
    { cand: 'usr-cand-1', skill: 'sk-nodejs', prof: 3, status: 'verified', source: 'github_pr' },
    { cand: 'usr-cand-1', skill: 'sk-aws', prof: 3, status: 'evidence_submitted', source: 'candidate_profile' },
    { cand: 'usr-cand-1', skill: 'sk-postgres', prof: 3, status: 'self_reported', source: 'candidate_profile' },
    // Diya Sharma (AI/ML)
    { cand: 'usr-cand-2', skill: 'sk-pytorch', prof: 5, status: 'verified', source: 'practical_assessment' },
    { cand: 'usr-cand-2', skill: 'sk-llm-fine', prof: 4, status: 'verified', source: 'github_pr' },
    { cand: 'usr-cand-2', skill: 'sk-rag', prof: 4, status: 'verified', source: 'practical_assessment' },
    { cand: 'usr-cand-2', skill: 'sk-scikit', prof: 4, status: 'verified', source: 'candidate_profile' },
    { cand: 'usr-cand-2', skill: 'sk-docker', prof: 3, status: 'self_reported', source: 'candidate_profile' },
    // Rohan Iyer (Backend)
    { cand: 'usr-cand-3', skill: 'sk-golang', prof: 5, status: 'verified', source: 'practical_assessment' },
    { cand: 'usr-cand-3', skill: 'sk-postgres', prof: 4, status: 'verified', source: 'peer_review' },
    { cand: 'usr-cand-3', skill: 'sk-kafka', prof: 4, status: 'verified', source: 'github_pr' },
    { cand: 'usr-cand-3', skill: 'sk-redis', prof: 4, status: 'verified', source: 'practical_assessment' },
    { cand: 'usr-cand-3', skill: 'sk-k8s', prof: 2, status: 'verification_rejected', source: 'candidate_profile' },
    // Ananya Reddy (DevOps)
    { cand: 'usr-cand-4', skill: 'sk-k8s', prof: 4, status: 'verified', source: 'practical_assessment' },
    { cand: 'usr-cand-4', skill: 'sk-docker', prof: 4, status: 'verified', source: 'peer_review' },
    { cand: 'usr-cand-4', skill: 'sk-terraform', prof: 4, status: 'verified', source: 'github_pr' },
    { cand: 'usr-cand-4', skill: 'sk-aws', prof: 4, status: 'verified', source: 'practical_assessment' },
    // Kabir Verma (Security)
    { cand: 'usr-cand-5', skill: 'sk-owasp', prof: 4, status: 'verified', source: 'practical_assessment' },
    { cand: 'usr-cand-5', skill: 'sk-pentest', prof: 3, status: 'evidence_submitted', source: 'candidate_profile' },
  ];

  for (const cs of candSkills) {
    db.prepare(`
      INSERT OR REPLACE INTO candidate_skills (
        id, candidate_id, skill_id, proficiency, verification_status, source,
        last_verified_at, verified_by, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `).run(
      `cs-${uuidv4().slice(0, 8)}`,
      cs.cand,
      cs.skill,
      cs.prof,
      cs.status,
      cs.source,
      cs.status === 'verified' ? now : null,
      cs.status === 'verified' ? 'usr-assessor-1' : null,
      cs.status === 'verified' ? 'Independently evaluated against Sarathi technical rubric.' : null,
      now,
      now
    );
  }

  // 8. SKILL EVIDENCE & REVIEWS
  const evidenceRecords = [
    {
      id: 'evi-1',
      candidate_id: 'usr-cand-1',
      skill_id: 'sk-react',
      evidence_type: 'github_pr',
      title: 'Production State Management Refactor with Redux Toolkit & Hooks',
      reference_url: 'https://github.com/facebook/react/pull/48291',
      status: 'verified',
      rationale: 'Demonstrated clean immutable state handling, unit tests with 95% coverage, and strict TypeScript types.',
    },
    {
      id: 'evi-2',
      candidate_id: 'usr-cand-1',
      skill_id: 'sk-aws',
      evidence_type: 'project_repo',
      title: 'Serverless Event-Driven Microservices Architecture',
      reference_url: 'https://github.com/aaravpatel-dev/aws-eventbridge-demo',
      status: 'pending_review',
      rationale: null,
    },
    {
      id: 'evi-3',
      candidate_id: 'usr-cand-2',
      skill_id: 'sk-llm-fine',
      evidence_type: 'code_sample',
      title: 'LoRA QLoRA Parameter-Efficient Fine-Tuning Pipeline for LLaMA-3',
      reference_url: 'https://github.com/diyasharma-ai/llama3-lora-tuning',
      status: 'verified',
      rationale: 'Comprehensive dataset preprocessing, evaluation loss curves, and perplexity reduction verified.',
    },
    {
      id: 'evi-4',
      candidate_id: 'usr-cand-3',
      skill_id: 'sk-kafka',
      evidence_type: 'github_pr',
      title: 'Zero-Data-Loss Kafka Producer/Consumer Pipeline in Go',
      reference_url: 'https://github.com/rohaniyer-sys/kafka-distributed-events/pull/12',
      status: 'verified',
      rationale: 'Proper offset commit logic, idempotent producer configuration, and dead letter queue routing implemented.',
    },
    {
      id: 'evi-5',
      candidate_id: 'usr-cand-5',
      skill_id: 'sk-pentest',
      evidence_type: 'certificate',
      title: 'Certified Ethical Hacker (CEH) Credential Verification',
      reference_url: 'https://eccouncil.org/verify/CEH-8291038',
      status: 'pending_review',
      rationale: null,
    },
  ];

  for (const e of evidenceRecords) {
    db.prepare(`
      INSERT OR REPLACE INTO skill_evidence (
        id, candidate_id, skill_id, evidence_type, title, reference_url,
        metadata, source, verification_status, decision_rationale,
        verified_by, verified_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, '{}', 'manual_submission', ?, ?, ?, ?, ?, ?);
    `).run(
      e.id, e.candidate_id, e.skill_id, e.evidence_type, e.title, e.reference_url,
      e.status, e.rationale, e.status === 'verified' ? 'usr-assessor-1' : null,
      e.status === 'verified' ? now : null, now, now
    );

    if (e.status === 'verified') {
      db.prepare(`
        INSERT OR REPLACE INTO verification_reviews (
          id, evidence_id, reviewer_id, previous_status, new_status,
          decision_rationale, rubric_evaluations, created_at
        ) VALUES (?, ?, 'usr-assessor-1', 'pending_review', 'verified', ?, '{"codeQuality":5,"documentation":4,"testCoverage":5}', ?);
      `).run(`vr-${uuidv4().slice(0, 8)}`, e.id, e.rationale, now);
    }
  }

  // 9. ASSESSMENT TEMPLATES
  const templates = [
    {
      id: 'asmt-react-deep',
      domain_id: 'dom-frontend',
      title: 'React & TypeScript Enterprise Architecture Assessment',
      description: 'Hands-on live coding challenge covering custom hooks, performance profiling, and accessible compound components.',
      type: 'practical_coding',
      duration_minutes: 60,
      passing_score: 75.0,
      skills: ['sk-react', 'sk-typescript'],
    },
    {
      id: 'asmt-go-micro',
      domain_id: 'dom-backend',
      title: 'Go High-Concurrency Microservices & Caching Benchmark',
      description: 'Construct a resilient concurrent HTTP/gRPC service with Redis caching and goroutine worker pools.',
      type: 'practical_coding',
      duration_minutes: 90,
      passing_score: 80.0,
      skills: ['sk-golang', 'sk-redis'],
    },
    {
      id: 'asmt-genai-rag',
      domain_id: 'dom-genai',
      title: 'RAG Pipeline & Embeddings Retrieval Assessment',
      description: 'Implement hybrid semantic retrieval with cosine similarity reranking and hallucination mitigation checks.',
      type: 'practical_coding',
      duration_minutes: 75,
      passing_score: 75.0,
      skills: ['sk-rag', 'sk-llm-fine'],
    },
    {
      id: 'asmt-k8s-infra',
      domain_id: 'dom-devops',
      title: 'Kubernetes Cluster Deployment & GitOps Pipeline',
      description: 'Author secure Helm charts, ingress definitions, and horizontal pod autoscaler configurations.',
      type: 'code_review',
      duration_minutes: 45,
      passing_score: 70.0,
      skills: ['sk-k8s', 'sk-terraform'],
    },
  ];

  for (const t of templates) {
    db.prepare(`
      INSERT OR REPLACE INTO assessment_templates (
        id, domain_id, title, description, type, duration_minutes, passing_score,
        scoring_rubric, assessed_skills, active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, '{"architecture":30,"correctness":40,"testing":20,"efficiency":10}', ?, 1, ?, ?);
    `).run(t.id, t.domain_id, t.title, t.description, t.type, t.duration_minutes, t.passing_score, JSON.stringify(t.skills), now, now);
  }

  // 10. ASSESSMENT ASSIGNMENTS & RESULTS
  const asmtAssignments = [
    {
      id: 'aa-1',
      org_id: 'org-demo-1',
      template_id: 'asmt-react-deep',
      candidate_id: 'usr-cand-1',
      assigned_by: 'usr-recruiter-1',
      score: 88.0,
      passed: 1,
      feedback: 'Excellent clean architecture and comprehensive hook design. Passed with distinction.',
    },
    {
      id: 'aa-2',
      org_id: 'org-demo-1',
      template_id: 'asmt-genai-rag',
      candidate_id: 'usr-cand-2',
      assigned_by: 'usr-recruiter-1',
      score: 94.0,
      passed: 1,
      feedback: 'Flawless vector indexing and top-k reranking implementation with minimal retrieval latency.',
    },
    {
      id: 'aa-3',
      org_id: 'org-demo-1',
      template_id: 'asmt-go-micro',
      candidate_id: 'usr-cand-3',
      assigned_by: 'usr-recruiter-1',
      score: 91.0,
      passed: 1,
      feedback: 'Superior concurrency management using sync.WaitGroup and context cancellation.',
    },
  ];

  for (const a of asmtAssignments) {
    db.prepare(`
      INSERT OR REPLACE INTO assessment_assignments (
        id, org_id, template_id, candidate_id, assigned_by, status, attempt_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'completed', 1, ?, ?);
    `).run(a.id, a.org_id, a.template_id, a.candidate_id, a.assigned_by, now, now);

    const attemptId = `att-${uuidv4().slice(0, 8)}`;
    db.prepare(`
      INSERT OR REPLACE INTO assessment_attempts (
        id, assignment_id, candidate_id, attempt_number, started_at, submitted_at,
        submission_payload, status, created_at, updated_at
      ) VALUES (?, ?, ?, 1, ?, ?, '{}', 'graded', ?, ?);
    `).run(attemptId, a.id, a.candidate_id, now, now, now, now);

    db.prepare(`
      INSERT OR REPLACE INTO assessment_results (
        id, attempt_id, candidate_id, template_id, score, max_score, passed,
        rubric_scores, reviewer_feedback, verified_skill_awards, graded_by, graded_at, created_at
      ) VALUES (?, ?, ?, ?, ?, 100.0, ?, '{"correctness":38,"architecture":28,"testing":18}', ?, '[]', 'usr-assessor-1', ?, ?);
    `).run(`ar-${uuidv4().slice(0, 8)}`, attemptId, a.candidate_id, a.template_id, a.score, a.passed, a.feedback, now, now);
  }

  // 11. JOBS & SKILL REQUIREMENTS
  const jobs = [
    {
      id: 'job-1',
      org_id: 'org-demo-1',
      creator_id: 'usr-recruiter-1',
      title: 'Senior Full-Stack Engineer (React & Node.js)',
      description: 'Lead our core enterprise engineering initiatives. Build responsive web user interfaces and robust microservice APIs.',
      department: 'Platform Engineering',
      domain_id: 'dom-fullstack',
      experience_level: 'senior',
      employment_type: 'full_time',
      work_arrangement: 'hybrid',
      location: 'Bangalore, India',
      salary_min: 2400000,
      salary_max: 3600000,
      status: 'published',
      skills: [
        { skillId: 'sk-react', type: 'required', prof: 4, weight: 1.5, assessment: true },
        { skillId: 'sk-typescript', type: 'required', prof: 4, weight: 1.2, assessment: false },
        { skillId: 'sk-nodejs', type: 'required', prof: 3, weight: 1.0, assessment: false },
        { skillId: 'sk-aws', type: 'preferred', prof: 3, weight: 0.8, assessment: false },
        { skillId: 'sk-postgres', type: 'preferred', prof: 3, weight: 0.8, assessment: false },
      ]
    },
    {
      id: 'job-2',
      org_id: 'org-demo-1',
      creator_id: 'usr-recruiter-1',
      title: 'Lead AI & Machine Learning Scientist',
      description: 'Drive generative AI research, custom model adaptation, and low-latency retrieval pipelines.',
      department: 'AI Research Labs',
      domain_id: 'dom-aiml',
      experience_level: 'lead',
      employment_type: 'full_time',
      work_arrangement: 'remote',
      location: 'Bangalore / Remote, India',
      salary_min: 3200000,
      salary_max: 5000000,
      status: 'published',
      skills: [
        { skillId: 'sk-pytorch', type: 'required', prof: 4, weight: 1.5, assessment: true },
        { skillId: 'sk-llm-fine', type: 'required', prof: 4, weight: 1.3, assessment: true },
        { skillId: 'sk-rag', type: 'required', prof: 4, weight: 1.2, assessment: false },
        { skillId: 'sk-scikit', type: 'preferred', prof: 3, weight: 0.7, assessment: false },
      ]
    },
    {
      id: 'job-3',
      org_id: 'org-demo-1',
      creator_id: 'usr-recruiter-1',
      title: 'Principal Backend Systems Architect (Go & Distributed Systems)',
      description: 'Architect million-QPS event brokers and mission-critical transactional storage engines.',
      department: 'Core Infrastructure',
      domain_id: 'dom-backend',
      experience_level: 'lead',
      employment_type: 'full_time',
      work_arrangement: 'onsite',
      location: 'Bangalore, India',
      salary_min: 3500000,
      salary_max: 5500000,
      status: 'published',
      skills: [
        { skillId: 'sk-golang', type: 'required', prof: 5, weight: 1.5, assessment: true },
        { skillId: 'sk-kafka', type: 'required', prof: 4, weight: 1.2, assessment: false },
        { skillId: 'sk-postgres', type: 'required', prof: 4, weight: 1.0, assessment: false },
        { skillId: 'sk-redis', type: 'preferred', prof: 4, weight: 0.8, assessment: false },
      ]
    },
    {
      id: 'job-4',
      org_id: 'org-demo-1',
      creator_id: 'usr-recruiter-1',
      title: 'DevOps & Site Reliability Engineer',
      description: 'Own Kubernetes multi-cluster lifecycle, automated blue-green rollouts, and multi-cloud resilience.',
      department: 'Cloud Operations',
      domain_id: 'dom-devops',
      experience_level: 'mid',
      employment_type: 'full_time',
      work_arrangement: 'hybrid',
      location: 'Hyderabad, India',
      salary_min: 1800000,
      salary_max: 2800000,
      status: 'published',
      skills: [
        { skillId: 'sk-k8s', type: 'required', prof: 4, weight: 1.5, assessment: true },
        { skillId: 'sk-docker', type: 'required', prof: 4, weight: 1.0, assessment: false },
        { skillId: 'sk-terraform', type: 'required', prof: 3, weight: 1.0, assessment: false },
        { skillId: 'sk-aws', type: 'preferred', prof: 3, weight: 0.8, assessment: false },
      ]
    },
    {
      id: 'job-5',
      org_id: 'org-demo-1',
      creator_id: 'usr-recruiter-1',
      title: 'Junior Application Security Analyst (Draft)',
      description: 'Triage vulnerability disclosures, conduct SAST scans, and assist developers with OWASP remediation.',
      department: 'Information Security',
      domain_id: 'dom-appsec',
      experience_level: 'entry',
      employment_type: 'full_time',
      work_arrangement: 'hybrid',
      location: 'Bangalore, India',
      salary_min: 1000000,
      salary_max: 1600000,
      status: 'draft',
      skills: [
        { skillId: 'sk-owasp', type: 'required', prof: 3, weight: 1.5, assessment: true },
        { skillId: 'sk-pentest', type: 'preferred', prof: 2, weight: 1.0, assessment: false },
      ]
    }
  ];

  for (const j of jobs) {
    db.prepare(`
      INSERT OR REPLACE INTO jobs (
        id, org_id, creator_id, title, description, responsibilities, department, domain_id,
        experience_level, employment_type, work_arrangement, location, salary_min, salary_max,
        currency, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, '["Architect modular systems","Conduct peer reviews","Drive automated test coverage"]', ?, ?, ?, ?, ?, ?, ?, ?, 'INR', ?, ?, ?);
    `).run(
      j.id, j.org_id, j.creator_id, j.title, j.description, j.department, j.domain_id,
      j.experience_level, j.employment_type, j.work_arrangement, j.location,
      j.salary_min, j.salary_max, j.status, now, now
    );

    for (const s of j.skills) {
      db.prepare(`
        INSERT OR REPLACE INTO job_skill_requirements (
          id, job_id, skill_id, requirement_type, target_proficiency, weight,
          accepted_evidence_types, assessment_required, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, '[]', ?, ?, ?);
      `).run(
        `jsr-${uuidv4().slice(0, 8)}`, j.id, s.skillId, s.type, s.prof, s.weight,
        s.assessment ? 1 : 0, now, now
      );
    }
  }

  // 12. APPLICATIONS & PIPELINE STAGES
  const apps = [
    {
      id: 'app-1',
      org_id: 'org-demo-1',
      job_id: 'job-1',
      candidate_id: 'usr-cand-1',
      stage: 'shortlisted',
      match_score: 92.0,
      note: 'Strong portfolio and verified React + TypeScript competencies.',
    },
    {
      id: 'app-2',
      org_id: 'org-demo-1',
      job_id: 'job-2',
      candidate_id: 'usr-cand-2',
      stage: 'interview_scheduled',
      match_score: 96.0,
      note: 'Exceptional AI/ML research profile with top-tier RAG implementation.',
    },
    {
      id: 'app-3',
      org_id: 'org-demo-1',
      job_id: 'job-3',
      candidate_id: 'usr-cand-3',
      stage: 'interview_completed',
      match_score: 95.0,
      note: 'Extensive Kafka and distributed database expertise.',
    },
    {
      id: 'app-4',
      org_id: 'org-demo-1',
      job_id: 'job-4',
      candidate_id: 'usr-cand-4',
      stage: 'under_review',
      match_score: 89.0,
      note: 'Verified Kubernetes and Terraform certifications.',
    },
    {
      id: 'app-5',
      org_id: 'org-demo-1',
      job_id: 'job-1',
      candidate_id: 'usr-cand-3',
      stage: 'new_applicant',
      match_score: 54.0,
      note: 'Backend specialist applying for full-stack role.',
    },
  ];

  for (const a of apps) {
    db.prepare(`
      INSERT OR REPLACE INTO applications (
        id, org_id, job_id, candidate_id, stage, match_score, cover_note, applied_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `).run(a.id, a.org_id, a.job_id, a.candidate_id, a.stage, a.match_score, a.note, now, now);

    db.prepare(`
      INSERT OR REPLACE INTO application_stage_history (
        id, application_id, from_stage, to_stage, changed_by, reason, created_at
      ) VALUES (?, ?, NULL, ?, 'usr-recruiter-1', 'Initial candidate screening', ?);
    `).run(`ash-${uuidv4().slice(0, 8)}`, a.id, a.stage, now);
  }

  // 13. SCHEDULED INTERVIEWS
  const interviews = [
    {
      id: 'int-1',
      org_id: 'org-demo-1',
      job_id: 'job-2',
      candidate_id: 'usr-cand-2',
      application_id: 'app-2',
      title: 'Technical Deep-Dive: LLM Architectures & Transformers',
      interview_type: 'technical',
      scheduled_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      duration_minutes: 60,
      status: 'scheduled',
    },
    {
      id: 'int-2',
      org_id: 'org-demo-1',
      job_id: 'job-3',
      candidate_id: 'usr-cand-3',
      application_id: 'app-3',
      title: 'System Design: Distributed Event Streaming Architecture',
      interview_type: 'system_design',
      scheduled_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      duration_minutes: 60,
      status: 'completed',
    },
  ];

  for (const i of interviews) {
    db.prepare(`
      INSERT OR REPLACE INTO interviews (
        id, org_id, job_id, candidate_id, application_id, title,
        interview_type, scheduled_at, duration_minutes, timezone,
        meeting_link, status, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Asia/Kolkata', 'https://meet.google.com/sarathi-tech-eval', ?, 'usr-recruiter-1', ?, ?);
    `).run(i.id, i.org_id, i.job_id, i.candidate_id, i.application_id, i.title, i.interview_type, i.scheduled_at, i.duration_minutes, i.status, now, now);

    db.prepare(`
      INSERT OR REPLACE INTO interview_participants (id, interview_id, user_id, role, created_at)
      VALUES (?, ?, 'usr-assessor-1', 'interviewer', ?);
    `).run(`ip-${uuidv4().slice(0, 8)}`, i.id, now);

    if (i.status === 'completed') {
      db.prepare(`
        INSERT OR REPLACE INTO interview_feedback (
          id, interview_id, interviewer_id, technical_rating, communication_rating,
          overall_recommendation, feedback_notes, confidential_notes, submitted_at, created_at
        ) VALUES (?, ?, 'usr-assessor-1', 5, 4, 'strong_hire', 'Masterful grasp of distributed consensus and Kafka partition replication.', 'Candidate is highly capable of architecting our next-gen streaming pipeline.', ?, ?);
      `).run(`ifb-${uuidv4().slice(0, 8)}`, i.id, now, now);
    }
  }

  // 14. SHORTLISTS
  const shortlistId = 'sl-high-potential';
  db.prepare(`
    INSERT OR REPLACE INTO shortlists (id, org_id, creator_id, job_id, title, description, created_at, updated_at)
    VALUES (?, 'org-demo-1', 'usr-recruiter-1', 'job-1', 'Top Tier Full-Stack Contenders', 'Verified candidates with proven React and TypeScript track records.', ?, ?);
  `).run(shortlistId, now, now);

  db.prepare(`
    INSERT OR REPLACE INTO shortlist_members (id, shortlist_id, candidate_id, notes, added_by, created_at)
    VALUES ('sm-1', ?, 'usr-cand-1', 'High match score and verified GitHub PR.', 'usr-recruiter-1', ?);
  `).run(shortlistId, now);

  // 15. AUDIT EVENTS
  const auditLogs = [
    { action: 'job.create', type: 'jobs', id: 'job-1', payload: '{"title":"Senior Full-Stack Engineer"}' },
    { action: 'candidate.verify_skill', type: 'candidate_skills', id: 'usr-cand-1', payload: '{"skill":"React.js","status":"verified"}' },
    { action: 'assessment.grade', type: 'assessment_results', id: 'asmt-react-deep', payload: '{"score":88,"passed":true}' },
    { action: 'pipeline.stage_change', type: 'applications', id: 'app-1', payload: '{"stage":"shortlisted"}' },
  ];

  for (const a of auditLogs) {
    db.prepare(`
      INSERT INTO audit_events (id, org_id, actor_id, action, resource_type, resource_id, payload, created_at)
      VALUES (?, 'org-demo-1', 'usr-recruiter-1', ?, ?, ?, ?, ?);
    `).run(`ae-${uuidv4().slice(0, 8)}`, a.action, a.type, a.id, a.payload, now);
  }

  // 13. V2 ASSESSMENT QUESTION BANK
  seedAssessmentBank(db);

  // 14. EXPANDED LEARNING RESOURCES (Phase 2 Catalog)
  seedLearningResources();

  console.log('Seeding completed successfully! 20 domains, realistic candidates, jobs, evidence, and audit logs are live.');
}

if (process.argv[1]?.endsWith('seeder.mjs')) {
  try {
    await runSeeder();
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  } finally {
    closeDb();
  }
}
