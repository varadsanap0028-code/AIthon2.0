import { randomUUID as uuidv4 } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { initDb, closeDb } from '../config/db.js';
import { runMigrations } from '../data/migrate.mjs';

const APEX_NAME = 'Apex Institute of Technology';

const FIRST = ['Aarav','Priya','Rohan','Ananya','Kabir','Diya','Vikram','Sneha','Arjun','Ishita','Aditya','Kavya','Nikhil','Riya','Sahil','Meera','Dev','Pooja','Karan','Shreya','Manav','Tara','Yash','Naina','Rahul','Zara','Farhan','Gauri','Harsh','Ira'];
const LAST = ['Sharma','Patel','Mehta','Reddy','Verma','Iyer','Joshi','Deshmukh','Singhal','Nair','Gupta','Khan','Das','Kulkarni','Bose','Chopra','Pillai','Rao','Agarwal','Menon'];

const BRANCH_PLAN = [
  { branch: 'CSE', degree: 'B.Tech Computer Science & Engineering', count: 160 },
  { branch: 'IT', degree: 'B.Tech Information Technology', count: 120 },
  { branch: 'AI/DS', degree: 'B.Tech Artificial Intelligence & Data Science', count: 80 },
  { branch: 'ECE', degree: 'B.Tech Electronics & Communication', count: 60 },
];

const ROLES = ['Software Engineer','Full-Stack Developer','Data Scientist','ML Engineer','Backend Engineer','Frontend Developer','DevOps Engineer','QA Engineer'];

const SKILLS = [
  { id: 'sk-apex-react', name: 'React.js', domain: 'dom-fullstack' },
  { id: 'sk-apex-node', name: 'Node.js & Express', domain: 'dom-fullstack' },
  { id: 'sk-apex-ts', name: 'TypeScript', domain: 'dom-fullstack' },
  { id: 'sk-apex-sql', name: 'SQL & PostgreSQL', domain: 'dom-fullstack' },
  { id: 'sk-apex-py', name: 'Python', domain: 'dom-fullstack' },
  { id: 'sk-apex-docker', name: 'Docker & DevOps', domain: 'dom-fullstack' },
  { id: 'sk-apex-jest', name: 'Unit Testing (Jest)', domain: 'dom-fullstack' },
  { id: 'sk-apex-git', name: 'Git & GitHub', domain: 'dom-fullstack' },
];

export async function seedCollege(dbFile) {
  runMigrations(dbFile);
  const db = initDb(dbFile);
  const now = new Date().toISOString();
  console.log('Seeding Apex Institute of Technology college cohort...');

  const inst = db.prepare('SELECT id FROM institutions WHERE name = ?;').get(APEX_NAME);
  const instId = inst?.id || `inst-${uuidv4().slice(0, 8)}`;
  if (!inst) {
    db.prepare(`INSERT INTO institutions (id, name, domain, settings, created_at, updated_at) VALUES (?, ?, ?, '{}', ?, ?);`)
      .run(instId, APEX_NAME, 'apex.edu', now, now);
  }

  db.prepare(`INSERT OR IGNORE INTO users (id, email, full_name, role, institution, institution_id, created_at, updated_at)
    VALUES ('usr-college-admin', 'admin@apex.edu', 'Apex College Admin', 'college', ?, ?, ?, ?);`)
    .run(APEX_NAME, instId, now, now);
  db.prepare(`INSERT OR IGNORE INTO users (id, email, full_name, role, institution, institution_id, created_at, updated_at)
    VALUES ('usr-college-tpo', 'tpo@apex.edu', 'Apex TPO Officer', 'college', ?, ?, ?, ?);`)
    .run(APEX_NAME, instId, now, now);

  const passwordHash = await bcrypt.hash('password123', 10);
  db.prepare(`UPDATE users SET password_hash = ? WHERE id IN ('usr-college-admin','usr-college-tpo');`).run(passwordHash);

  for (const sk of SKILLS) {
    db.prepare(`INSERT OR IGNORE INTO skills (id, domain_id, name, description, category, proficiency_scale, accepted_evidence_types, assessment_types, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'Technical', '1-5', '[]', '[]', 1, ?, ?);`)
      .run(sk.id, sk.domain, sk.name, `${sk.name} core competency`, now, now);
  }

  // FK-safe references: domains, orgs and the seed template domain must exist.
  db.prepare(`INSERT OR IGNORE INTO organisations (id, name, slug, timezone, currency, settings, created_at, updated_at)
    VALUES ('org-demo-1', 'Sarathi Enterprise Systems', 'sarathi-enterprise', 'Asia/Kolkata', 'INR', '{}', ?, ?);`)
    .run(now, now);
  db.prepare(`INSERT OR IGNORE INTO domains (id, title, description, icon_name, badge_color, created_at, updated_at)
    VALUES ('dom-fullstack', 'Full-Stack Development', 'End-to-end web architectures.', 'Layers', '#8B5CF6', ?, ?);`)
    .run(now, now);
  db.prepare(`INSERT OR IGNORE INTO jobs (id, org_id, creator_id, title, description, domain_id, location, employment_type, status, created_at, updated_at)
    VALUES ('job-1', 'org-demo-1', 'usr-college-admin', 'Campus Software Engineer (Apex)', 'Apex campus hiring drive role.', 'dom-fullstack', 'Bangalore', 'full_time', 'open', ?, ?);`)
    .run(now, now);

  let n = 0;
  db.prepare(`INSERT OR IGNORE INTO assessment_templates (id, title, description, domain_id, active, created_at, updated_at)
    VALUES ('tmpl-diagnostic', 'Apex Diagnostic Assessment', 'Institutional readiness diagnostic', 'dom-fullstack', 1, ?, ?);`)
    .run(now, now);
  db.prepare(`INSERT OR IGNORE INTO assessment_assignments (id, org_id, template_id, candidate_id, assigned_by, status, created_at, updated_at)
    VALUES ('asg-apex-diagnostic', 'org-demo-1', 'tmpl-diagnostic', 'usr-college-admin', 'usr-college-admin', 'active', ?, ?);`)
    .run(now, now);
  const assessStmt = db.prepare(`INSERT OR REPLACE INTO assessment_attempts (id, assignment_id, candidate_id, attempt_number, started_at, submitted_at, submission_payload, status, created_at, updated_at) VALUES (?, 'asg-apex-diagnostic', ?, 1, ?, ?, '{}', 'submitted', ?, ?);`);
  const resultStmt = db.prepare(`INSERT OR REPLACE INTO assessment_results (id, attempt_id, candidate_id, template_id, score, max_score, passed, graded_at, created_at) VALUES (?, ?, ?, 'tmpl-diagnostic', ?, 100.0, ?, ?, ?);`);
  const skillStmt = db.prepare(`INSERT OR REPLACE INTO candidate_skills (id, candidate_id, skill_id, proficiency, verification_status, source, last_verified_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'seed', ?, ?, ?);`);

  for (const plan of BRANCH_PLAN) {
    for (let i = 0; i < plan.count; i++) {
      const id = `usr-apex-${plan.branch.toLowerCase().replace('/', '')}-${String(i).padStart(3, '0')}`;
      const name = `${FIRST[n % FIRST.length]} ${LAST[(n * 7) % LAST.length]}`;
      const email = `${id}@apex.edu`;
      const readiness = 45 + ((n * 37) % 55);
      const assessed = (n % 10) < 8;
      const verified = (n % 10) < 6;
      const placed = readiness >= 78 && (n % 3) !== 0;

      db.prepare(`INSERT OR REPLACE INTO users (id, email, full_name, role, institution, institution_id, created_at, updated_at)
        VALUES (?, ?, ?, 'candidate', ?, ?, ?, ?);`)
        .run(id, email, name, APEX_NAME, instId, now, now);
      db.prepare(`INSERT OR REPLACE INTO candidate_profiles (id, target_role, degree, graduation_year, branch, created_at, updated_at)
        VALUES (?, ?, ?, 2026, ?, ?, ?);`)
        .run(id, ROLES[n % ROLES.length], plan.degree, plan.branch, now, now);

      if (assessed) {
        assessStmt.run(`att-${id}`, id, now, now, now, now);
        resultStmt.run(`res-${id}`, `att-${id}`, id, readiness, readiness >= 40 ? 1 : 0, now, now);
      }
      const sk = SKILLS[n % SKILLS.length];
      const level = Math.max(1, Math.min(5, Math.round(readiness / 20)));
      skillStmt.run(`cs-${id}`, id, sk.id, level, verified ? 'verified' : 'self_reported', verified ? now : null, now, now);

      if (placed) {
        const appId = `app-${id}`;
        db.prepare(`INSERT OR REPLACE INTO applications (id, org_id, job_id, candidate_id, stage, match_score, applied_at, updated_at)
          VALUES (?, 'org-demo-1', 'job-1', ?, 'placed', ?, ?, ?);`)
          .run(appId, id, readiness, now, now);
      }
      n++;
    }
  }

  console.log(`Seeded ${n} Apex students across ${BRANCH_PLAN.length} branches.`);

  // 18 partner companies as placement drives
  const companies = [
    ['Razorpay Technologies', 'Full-Stack Software Engineer', 16, 'upcoming', ['CSE', 'IT'], 70],
    ['TCS Digital', 'System Engineer & Cloud Specialist', 9, 'in_progress', ['CSE', 'IT', 'ECE'], 60],
    ['Swiggy', 'Backend & Platform Engineer', 19, 'completed', ['CSE', 'IT'], 72],
    ['Infosys', 'Systems Engineer', 8, 'upcoming', ['CSE', 'IT', 'AI/DS', 'ECE'], 55],
    ['Flipkart', 'SDE I - Consumer Platform', 21, 'upcoming', ['CSE', 'IT'], 75],
    ['Zeta', 'Frontend Engineer', 14, 'upcoming', ['CSE', 'IT'], 68],
    ['PhonePe', 'Backend Engineer - Payments', 18, 'in_progress', ['CSE'], 72],
    ['Freshworks', 'Full-Stack Developer', 13, 'upcoming', ['CSE', 'IT', 'AI/DS'], 65],
    ['Zoho', 'Software Developer', 11, 'completed', ['CSE', 'IT', 'ECE'], 60],
    ['CRED', 'Mobile & Platform Engineer', 24, 'upcoming', ['CSE'], 78],
    ['Groww', 'Frontend Engineer - Fintech', 17, 'upcoming', ['CSE', 'IT'], 70],
    ['Meesho', 'Backend Engineer', 15, 'in_progress', ['CSE', 'IT'], 66],
    ['Dream11', 'Data Engineer', 20, 'upcoming', ['AI/DS', 'CSE'], 70],
    ['Nykaa', 'Full-Stack Engineer - Commerce', 12, 'completed', ['CSE', 'IT'], 62],
    ['Ola Electric', 'Embedded & Platform Engineer', 13, 'upcoming', ['ECE', 'CSE'], 60],
    ['Bosch', 'IoT Systems Engineer', 10, 'upcoming', ['ECE'], 58],
    ['Fractal Analytics', 'ML Engineer', 19, 'in_progress', ['AI/DS'], 72],
    ['RazorpayX', 'DevOps Engineer', 15, 'upcoming', ['CSE', 'IT'], 68],
  ];
  let di = 0;
  for (const [company, role, pkg, status, branches, minR] of companies) {
    const did = `drv-apex-${String(di).padStart(2, '0')}`;
    db.prepare(`INSERT OR REPLACE INTO placement_drives (id, institution_id, institution_name, company, role, package_lpa, status, eligible_branches, min_readiness, required_skills, verified_passport_req, start_date, end_date, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', 0, ?, ?, 'usr-college-tpo', ?, ?);`)
      .run(did, instId, APEX_NAME, company, role, pkg, status, JSON.stringify(branches), minR, now, now, now, now);
    // seed a few drive applications from real students
    for (let a = 0; a < 5; a++) {
      const stu = db.prepare(`SELECT id FROM users WHERE institution_id = ? AND role = 'candidate' LIMIT 1 OFFSET ?;`).get(instId, (di * 13 + a * 29) % n);
      if (stu) {
        db.prepare(`INSERT OR IGNORE INTO drive_applications (id, drive_id, candidate_id, status, applied_at) VALUES (?, ?, ?, 'applied', ?);`)
          .run(`da-${did}-${a}`, did, stu.id, now);
      }
    }
    di++;
  }
  console.log(`Seeded ${di} placement drives for Apex.`);

  // Default college settings
  db.prepare(`INSERT OR REPLACE INTO college_settings (institution_id, institution_name, benchmark_threshold, branches, batch_year, updated_by, updated_at)
    VALUES (?, ?, 60, ?, 2026, 'usr-college-admin', ?);`)
    .run(instId, APEX_NAME, JSON.stringify(['CSE', 'IT', 'AI/DS', 'ECE']), now);
}

if (process.argv[1]?.endsWith('collegeSeeder.mjs')) {
  try {
    await seedCollege();
  } catch (err) {
    console.error('College seeding failed:', err);
    process.exit(1);
  } finally {
    closeDb();
  }
}
