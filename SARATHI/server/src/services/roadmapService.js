/**
 * Server-side mirror and domain roadmap service for Sarathi career tracks.
 * Provides canonical track resolution, domain roadmap generation,
 * skill gap prioritization, and progress isolation.
 */

export const resolveDomainTrack = (input) => {
  if (!input || typeof input !== 'string') {
    return {
      trackKey: 'web-dev',
      domainId: 'web-dev',
      canonicalRoleTitle: 'Full-Stack Developer',
      domainTitle: 'Web Development',
      isFallback: true
    };
  }

  const clean = input.trim().toLowerCase();

  // 1. Machine Learning (Distinguished from general AI)
  if (
    clean === 'ml' ||
    clean === 'machine learning' ||
    clean === 'machine-learning' ||
    clean.includes('machine learning') ||
    clean === 'ml engineer' ||
    clean.includes('mlops')
  ) {
    return {
      trackKey: 'machine-learning',
      domainId: 'ai-ml',
      canonicalRoleTitle: 'Machine Learning Engineer',
      domainTitle: 'Machine Learning',
      isFallback: false
    };
  }

  // 2. Artificial Intelligence (Deep Learning, Generative AI, NLP, AI/ML)
  if (
    clean === 'ai' ||
    clean === 'artificial intelligence' ||
    clean === 'ai/ml' ||
    clean === 'ai-ml' ||
    clean === 'deep learning' ||
    clean === 'generative ai' ||
    clean === 'nlp' ||
    clean.includes('artificial intelligence') ||
    clean.includes('deep learning') ||
    clean.includes('generative ai') ||
    clean.includes('nlp engineer') ||
    clean.includes('ai/ml engineer')
  ) {
    let role = 'AI/ML Engineer';
    if (clean.includes('deep learning')) role = 'Deep Learning Engineer';
    else if (clean.includes('generative ai')) role = 'Generative AI Application Developer';
    else if (clean.includes('nlp')) role = 'NLP Engineer';

    return {
      trackKey: 'artificial-intelligence',
      domainId: 'ai-ml',
      canonicalRoleTitle: role,
      domainTitle: 'Artificial Intelligence and Machine Learning',
      isFallback: false
    };
  }

  // 3. Web Development (Frontend, Backend, Full-Stack)
  if (
    clean === 'web-dev' ||
    clean === 'web' ||
    clean.includes('web dev') ||
    clean.includes('frontend') ||
    clean.includes('backend') ||
    clean.includes('full-stack') ||
    clean.includes('full stack') ||
    clean.includes('react developer') ||
    clean.includes('node.js developer')
  ) {
    let role = 'Full-Stack Developer';
    if (clean.includes('frontend')) role = 'Frontend Developer';
    else if (clean.includes('backend')) role = 'Backend Developer';
    else if (clean.includes('react')) role = 'React Developer';
    else if (clean.includes('node')) role = 'Node.js Developer';

    return {
      trackKey: 'web-dev',
      domainId: 'web-dev',
      canonicalRoleTitle: role,
      domainTitle: 'Web Development',
      isFallback: false
    };
  }

  // 4. Cybersecurity
  if (
    clean === 'cybersecurity' ||
    clean.includes('cyber') ||
    clean.includes('security') ||
    clean.includes('soc analyst') ||
    clean.includes('penetration tester') ||
    clean.includes('forensics')
  ) {
    let role = 'Cybersecurity Analyst';
    if (clean.includes('soc')) role = 'SOC Analyst';
    else if (clean.includes('penetration')) role = 'Penetration Tester';
    else if (clean.includes('security engineer')) role = 'Security Engineer';

    return {
      trackKey: 'cybersecurity',
      domainId: 'cybersecurity',
      canonicalRoleTitle: role,
      domainTitle: 'Cybersecurity',
      isFallback: false
    };
  }

  // 5. Data Science & Analytics
  if (
    clean === 'data-science' ||
    clean.includes('data science') ||
    clean.includes('data analytics') ||
    clean.includes('data analyst') ||
    clean.includes('data scientist') ||
    clean.includes('business intelligence')
  ) {
    let role = 'Data Scientist';
    if (clean.includes('analyst') && !clean.includes('scientist')) role = 'Data Analyst';
    else if (clean.includes('business intelligence')) role = 'Business Intelligence Analyst';

    return {
      trackKey: 'data-science',
      domainId: 'data-science',
      canonicalRoleTitle: role,
      domainTitle: 'Data Science and Analytics',
      isFallback: false
    };
  }

  // 6. Cloud Computing & DevOps
  if (
    clean === 'cloud-devops' ||
    clean.includes('cloud') ||
    clean.includes('devops') ||
    clean.includes('site reliability') ||
    clean.includes('platform engineer') ||
    clean.includes('sre')
  ) {
    let role = 'Cloud Engineer';
    if (clean.includes('devops')) role = 'DevOps Engineer';
    else if (clean.includes('site reliability') || clean.includes('sre')) role = 'Site Reliability Engineer';
    else if (clean.includes('platform')) role = 'Platform Engineer';

    return {
      trackKey: 'cloud-devops',
      domainId: 'cloud-devops',
      canonicalRoleTitle: role,
      domainTitle: 'Cloud Computing and DevOps',
      isFallback: false
    };
  }

  // 7. Mobile App Development
  if (
    clean === 'mobile-dev' ||
    clean.includes('mobile') ||
    clean.includes('android') ||
    clean.includes('ios') ||
    clean.includes('flutter') ||
    clean.includes('react native')
  ) {
    let role = 'Mobile App Developer';
    if (clean.includes('android')) role = 'Android Developer';
    else if (clean.includes('ios')) role = 'iOS Developer';
    else if (clean.includes('flutter')) role = 'Flutter Developer';
    else if (clean.includes('react native')) role = 'React Native Developer';

    return {
      trackKey: 'mobile-dev',
      domainId: 'mobile-dev',
      canonicalRoleTitle: role,
      domainTitle: 'Mobile App Development',
      isFallback: false
    };
  }

  // 8. Software Engineering
  if (
    clean === 'software-eng' ||
    clean.includes('software eng') ||
    clean.includes('software development engineer') ||
    clean.includes('sde') ||
    clean.includes('system software') ||
    clean.includes('qa')
  ) {
    return {
      trackKey: 'software-eng',
      domainId: 'software-eng',
      canonicalRoleTitle: 'Software Development Engineer (SDE)',
      domainTitle: 'Software Engineering',
      isFallback: false
    };
  }

  // Fallback to Web Development
  return {
    trackKey: 'web-dev',
    domainId: 'web-dev',
    canonicalRoleTitle: 'Full-Stack Developer',
    domainTitle: 'Web Development',
    isFallback: true
  };
};

export const DOMAIN_MILESTONES = {
  'machine-learning': [
    'Python, Scientific Computing & Data Handling',
    'Mathematics, Statistics & Exploratory Data Analysis',
    'Supervised & Unsupervised Machine Learning',
    'Model Evaluation, Validation & Hyperparameter Tuning',
    'MLOps Pipeline Engineering & Production Deployment'
  ],
  'artificial-intelligence': [
    'Mathematical Foundations & Python for AI',
    'Machine Learning Fundamentals & Optimization',
    'Neural Networks & Deep Learning Architectures',
    'Transformers, Foundation Models & Generative AI',
    'Applied AI Systems & Capstone Project'
  ],
  'web-dev': [
    'Foundations of Modern Web',
    'Frontend Mastery with React & TypeScript',
    'Backend Architecture with Node & Express',
    'Databases & Persistent Data Storage',
    'Full-Stack Project & Capstone'
  ],
  'cybersecurity': [
    'Computer Networking & Linux Systems',
    'Security Fundamentals, Cryptography & Identity',
    'Threat Analysis & Vulnerability Assessment',
    'Defensive Security & Security Operations (SOC)',
    'Practical Security Auditing & Capstone Project'
  ],
  'data-science': [
    'Python Programming & SQL Data Foundations',
    'Statistical Inference & Probability Analysis',
    'Data Cleaning, Wrangling & Feature Engineering',
    'Exploratory Data Visualization & BI Storytelling',
    'Predictive Modeling & Portfolio Capstone'
  ],
  'cloud-devops': [
    'Linux Systems, Networking & Git Workflows',
    'Cloud Infrastructure & Core Services',
    'Containerization & Microservices with Docker',
    'Infrastructure as Code (IaC) & CI/CD Automation',
    'Container Orchestration & Observability Capstone'
  ],
  'mobile-dev': [
    'Mobile Programming Fundamentals & UI Patterns',
    'Cross-Platform Framework & Navigation Architecture',
    'REST API Integration, State & Offline Storage',
    'Device Hardware APIs & Push Notifications',
    'Mobile Testing, App Bundling & Capstone'
  ]
};

export const roadmapService = {
  resolveDomainTrack,

  getMilestonesForDomain(domainOrRole) {
    const resolved = resolveDomainTrack(domainOrRole);
    return DOMAIN_MILESTONES[resolved.trackKey] || DOMAIN_MILESTONES['web-dev'];
  },

  createMockStorage() {
    const store = new Map();
    return {
      getItem(k) { return store.get(k) || null; },
      setItem(k, v) { store.set(k, String(v)); },
      removeItem(k) { store.delete(k); },
      clear() { store.clear(); }
    };
  }
};
