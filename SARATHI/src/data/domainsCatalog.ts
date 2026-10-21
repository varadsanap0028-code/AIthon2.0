import type { CareerRoleRequirements } from '../types/gap';

export interface TechDomain {
  id: string;
  title: string;
  description: string;
  iconName: string;
  badgeColor: string;
  roleTitles: string[];
}

export const techDomains: TechDomain[] = [
  {
    id: 'web-dev',
    title: 'Web Development',
    description: 'Modern front-end, server-side architectures, and scalable full-stack web applications.',
    iconName: 'Globe',
    badgeColor: 'blue',
    roleTitles: [
      'Frontend Developer',
      'Backend Developer',
      'Full-Stack Developer',
      'React Developer',
      'Node.js Developer'
    ]
  },
  {
    id: 'ai-ml',
    title: 'Artificial Intelligence and Machine Learning',
    description: 'Statistical modeling, deep neural networks, NLP, and modern Generative AI systems.',
    iconName: 'Brain',
    badgeColor: 'purple',
    roleTitles: [
      'AI/ML Engineer',
      'Machine Learning Engineer',
      'Deep Learning Engineer',
      'NLP Engineer',
      'Generative AI Application Developer'
    ]
  },
  {
    id: 'data-science',
    title: 'Data Science and Analytics',
    description: 'Transforming complex data into predictive insights, BI dashboards, and data pipelines.',
    iconName: 'BarChart3',
    badgeColor: 'indigo',
    roleTitles: [
      'Data Analyst',
      'Data Scientist',
      'Data Engineer',
      'Business Intelligence Analyst'
    ]
  },
  {
    id: 'cybersecurity',
    title: 'Cybersecurity',
    description: 'Threat detection, penetration testing, defensive engineering, and forensic response.',
    iconName: 'ShieldAlert',
    badgeColor: 'red',
    roleTitles: [
      'Cybersecurity Analyst',
      'SOC Analyst',
      'Penetration Tester',
      'Security Engineer',
      'Digital Forensics Analyst'
    ]
  },
  {
    id: 'cloud-devops',
    title: 'Cloud Computing and DevOps',
    description: 'Infrastructure as Code, CI/CD pipelines, container orchestration, and system reliability.',
    iconName: 'Cloud',
    badgeColor: 'sky',
    roleTitles: [
      'Cloud Engineer',
      'DevOps Engineer',
      'Site Reliability Engineer',
      'Platform Engineer'
    ]
  },
  {
    id: 'mobile-dev',
    title: 'Mobile App Development',
    description: 'Native and cross-platform mobile apps for iOS and Android ecosystems.',
    iconName: 'Smartphone',
    badgeColor: 'emerald',
    roleTitles: [
      'Android Developer',
      'iOS Developer',
      'Flutter Developer',
      'React Native Developer'
    ]
  },
  {
    id: 'software-eng',
    title: 'Software Engineering',
    description: 'Core computer science, robust application engineering, and automated quality assurance.',
    iconName: 'Code2',
    badgeColor: 'teal',
    roleTitles: [
      'Software Engineer',
      'Java Developer',
      'Python Developer',
      'C++ Developer',
      'QA Automation Engineer'
    ]
  },
  {
    id: 'database-platforms',
    title: 'Database and Data Platforms',
    description: 'Relational & distributed database administration, SQL optimization, and data warehousing.',
    iconName: 'Database',
    badgeColor: 'amber',
    roleTitles: [
      'Database Administrator',
      'SQL Developer',
      'Data Warehouse Engineer'
    ]
  },
  {
    id: 'ui-ux-design',
    title: 'UI/UX and Product Design',
    description: 'Human-centered interfaces, interaction design systems, and product ergonomics.',
    iconName: 'Layout',
    badgeColor: 'pink',
    roleTitles: [
      'UI Designer',
      'UX Designer',
      'Product Designer'
    ]
  },
  {
    id: 'emerging-tech',
    title: 'Emerging Technology',
    description: 'Decentralized protocols, Web3, Internet of Things, and embedded robotics programming.',
    iconName: 'Cpu',
    badgeColor: 'violet',
    roleTitles: [
      'Blockchain Developer',
      'IoT Developer',
      'Robotics Software Engineer'
    ]
  }
];

export const allCareerRoleRequirements: Record<string, CareerRoleRequirements> = {
  // A. WEB DEVELOPMENT
  'Frontend Developer': {
    roleTitle: 'Frontend Developer',
    domainId: 'web-dev',
    domainTitle: 'Web Development',
    description: 'Crafts high-performance, accessible, and responsive user interfaces using modern web standards.',
    typicalTools: ['React', 'TypeScript', 'TailwindCSS', 'Vite', 'Chrome DevTools'],
    requiredSkills: [
      { skillName: 'HTML5 & Semantic Markup', category: 'Frontend', requiredProficiency: 4, whyItMatters: 'Ensures structured, accessible, and SEO-friendly document outlines.' },
      { skillName: 'CSS3 & Responsive Design', category: 'Frontend', requiredProficiency: 4, whyItMatters: 'Enables mobile-first layouts, animations, and container queries.' },
      { skillName: 'JavaScript (ES6+)', category: 'Frontend', requiredProficiency: 4, whyItMatters: 'Powers dynamic client interactivity, DOM manipulation, and async events.' },
      { skillName: 'React.js Architecture', category: 'Frontend', requiredProficiency: 4, whyItMatters: 'Core UI component lifecycle, custom hooks, and state management.' },
      { skillName: 'TypeScript', category: 'Frontend', requiredProficiency: 3, whyItMatters: 'Prevents type coercion bugs and provides compile-time interface safety.' },
      { skillName: 'Web Accessibility (a11y)', category: 'Frontend', requiredProficiency: 3, whyItMatters: 'Guarantees WCAG 2.1 AA compliance for assistive technology.' },
      { skillName: 'Git & Version Control', category: 'DevOps', requiredProficiency: 4, whyItMatters: 'Required for team collaboration, code branching, and PR review workflows.' }
    ]
  },
  'Backend Developer': {
    roleTitle: 'Backend Developer',
    domainId: 'web-dev',
    domainTitle: 'Web Development',
    description: 'Architects robust server APIs, background services, data persistence layers, and security middleware.',
    typicalTools: ['Node.js', 'Express', 'PostgreSQL', 'Redis', 'Docker', 'Postman'],
    requiredSkills: [
      { skillName: 'Node.js & Express', category: 'Backend', requiredProficiency: 4, whyItMatters: 'Powers asynchronous event-driven server endpoints and middleware chains.' },
      { skillName: 'RESTful API Architecture', category: 'Backend', requiredProficiency: 4, whyItMatters: 'Defines standardized HTTP verbs, status codes, and JSON contracts.' },
      { skillName: 'SQL & Relational Databases', category: 'Database', requiredProficiency: 4, whyItMatters: 'Enables transactional consistency, complex joins, and table indexing.' },
      { skillName: 'Authentication & JWT Security', category: 'Backend', requiredProficiency: 3, whyItMatters: 'Secures route endpoints against unauthorized access and session spoofing.' },
      { skillName: 'Caching with Redis', category: 'Backend', requiredProficiency: 3, whyItMatters: 'Reduces database query pressure and improves latency for hot endpoints.' },
      { skillName: 'Git & Version Control', category: 'DevOps', requiredProficiency: 4, whyItMatters: 'Essential for CI/CD automated deployments and release tagging.' }
    ]
  },
  'Full-Stack Developer': {
    roleTitle: 'Full-Stack Developer',
    domainId: 'web-dev',
    domainTitle: 'Web Development',
    description: 'Delivers complete end-to-end web products spanning client interfaces, server logic, and persistent storage.',
    typicalTools: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker', 'Git'],
    requiredSkills: [
      { skillName: 'HTML5 & Semantic Markup', category: 'Frontend', requiredProficiency: 4, whyItMatters: 'Solid foundation for browser layout structure.' },
      { skillName: 'JavaScript (ES6+)', category: 'Frontend', requiredProficiency: 4, whyItMatters: 'Universal language bridging client and server execution.' },
      { skillName: 'React.js Architecture', category: 'Frontend', requiredProficiency: 4, whyItMatters: 'Primary client-side component UI framework.' },
      { skillName: 'TypeScript', category: 'Frontend', requiredProficiency: 3, whyItMatters: 'End-to-end type safety across client and server boundaries.' },
      { skillName: 'Node.js & Express', category: 'Backend', requiredProficiency: 4, whyItMatters: 'Server-side API controllers and business logic.' },
      { skillName: 'SQL & Relational Databases', category: 'Database', requiredProficiency: 3, whyItMatters: 'Stores normalized entities and ensures transactional persistence.' },
      { skillName: 'RESTful API Architecture', category: 'Backend', requiredProficiency: 4, whyItMatters: 'Connects the frontend client to server capabilities.' },
      { skillName: 'Git & Version Control', category: 'DevOps', requiredProficiency: 4, whyItMatters: 'Collaborative revision control and feature branching.' }
    ]
  },
  'React Developer': {
    roleTitle: 'React Developer',
    domainId: 'web-dev',
    domainTitle: 'Web Development',
    description: 'Specializes deeply in the React ecosystem, modern state containers, Next.js / Vite build systems, and virtual DOM optimization.',
    typicalTools: ['React 18/19', 'Next.js', 'Redux/Zustand', 'Tailwind', 'Vitest'],
    requiredSkills: [
      { skillName: 'JavaScript (ES6+)', category: 'Frontend', requiredProficiency: 4, whyItMatters: 'Mastery of closures, prototypes, event delegation, and promises.' },
      { skillName: 'React.js Architecture', category: 'Frontend', requiredProficiency: 5, whyItMatters: 'Advanced hooks, context, memoization, and Suspense patterns.' },
      { skillName: 'TypeScript', category: 'Frontend', requiredProficiency: 4, whyItMatters: 'Generic component props, event handler typings, and strict null safety.' },
      { skillName: 'State Management (Zustand/Redux)', category: 'Frontend', requiredProficiency: 4, whyItMatters: 'Manages complex cross-component client application state.' },
      { skillName: 'Web Performance Optimization', category: 'Frontend', requiredProficiency: 3, whyItMatters: 'Improves Core Web Vitals (LCP, INP, CLS) and bundle sizes.' }
    ]
  },
  'Node.js Developer': {
    roleTitle: 'Node.js Developer',
    domainId: 'web-dev',
    domainTitle: 'Web Development',
    description: 'Builds high-throughput microservices, stream processors, and backend gateways using Node.js event loops.',
    typicalTools: ['Node.js', 'Express/Fastify', 'Prisma', 'MongoDB', 'Docker', 'Jest'],
    requiredSkills: [
      { skillName: 'Node.js & Express', category: 'Backend', requiredProficiency: 5, whyItMatters: 'Deep understanding of event loop, buffer streams, and cluster workers.' },
      { skillName: 'JavaScript (ES6+)', category: 'Backend', requiredProficiency: 4, whyItMatters: 'Asynchronous concurrency patterns and promise microtasks.' },
      { skillName: 'SQL & Relational Databases', category: 'Database', requiredProficiency: 4, whyItMatters: 'Relational data modeling, connection pooling, and migrations.' },
      { skillName: 'RESTful API Architecture', category: 'Backend', requiredProficiency: 4, whyItMatters: 'Clean API contract design and input validation schemas.' },
      { skillName: 'Microservices & Event Queues', category: 'System Design', requiredProficiency: 3, whyItMatters: 'Decoupled inter-service messaging using RabbitMQ or Kafka.' }
    ]
  },

  // B. AI AND MACHINE LEARNING
  'AI/ML Engineer': {
    roleTitle: 'AI/ML Engineer',
    domainId: 'ai-ml',
    domainTitle: 'Artificial Intelligence and Machine Learning',
    description: 'Designs, trains, tests, and deploys scalable statistical learning and neural network models.',
    typicalTools: ['Python', 'PyTorch', 'scikit-learn', 'TensorFlow', 'MLflow', 'Hugging Face'],
    requiredSkills: [
      { skillName: 'Python for AI/ML', category: 'AI & Machine Learning', requiredProficiency: 4, whyItMatters: 'Industry-standard language for tensor manipulation and ML libraries.' },
      { skillName: 'Machine Learning Fundamentals', category: 'AI & Machine Learning', requiredProficiency: 4, whyItMatters: 'Supervised vs unsupervised algorithms, loss functions, and cross-validation.' },
      { skillName: 'Deep Learning & Neural Networks', category: 'AI & Machine Learning', requiredProficiency: 3, whyItMatters: 'Backpropagation, activation functions, CNNs, and attention mechanisms.' },
      { skillName: 'Data Preprocessing & Feature Engineering', category: 'Data Science & Analytics', requiredProficiency: 4, whyItMatters: 'Handling missing values, scaling, encoding, and dimensionality reduction.' },
      { skillName: 'Model Evaluation & Metrics', category: 'AI & Machine Learning', requiredProficiency: 4, whyItMatters: 'Precision, recall, ROC-AUC, F1-score, and overfitting diagnosis.' },
      { skillName: 'MLOps & Model Deployment', category: 'DevOps', requiredProficiency: 3, whyItMatters: 'Packaging models into REST endpoints using FastAPI or Docker containers.' }
    ]
  },
  'Machine Learning Engineer': {
    roleTitle: 'Machine Learning Engineer',
    domainId: 'ai-ml',
    domainTitle: 'Artificial Intelligence and Machine Learning',
    description: 'Bridges data science modeling with production software engineering and automated pipeline monitoring.',
    typicalTools: ['Python', 'scikit-learn', 'PyTorch', 'MLflow', 'Docker', 'Kubeflow'],
    requiredSkills: [
      { skillName: 'Python for AI/ML', category: 'AI & Machine Learning', requiredProficiency: 4, whyItMatters: 'Clean vectorized operations with NumPy, Pandas, and SciPy.' },
      { skillName: 'Machine Learning Fundamentals', category: 'AI & Machine Learning', requiredProficiency: 5, whyItMatters: 'Gradient boosting, random forests, SVM, and hyperparameter tuning.' },
      { skillName: 'Model Evaluation & Metrics', category: 'AI & Machine Learning', requiredProficiency: 4, whyItMatters: 'Validating models against data drift and statistical degradation.' },
      { skillName: 'MLOps & Model Deployment', category: 'DevOps', requiredProficiency: 4, whyItMatters: 'Automated CI/CD for continuous model training and registry versioning.' },
      { skillName: 'SQL & Data Extraction', category: 'Database', requiredProficiency: 3, whyItMatters: 'Extracting training feature sets directly from analytical warehouses.' }
    ]
  },
  'Deep Learning Engineer': {
    roleTitle: 'Deep Learning Engineer',
    domainId: 'ai-ml',
    domainTitle: 'Artificial Intelligence and Machine Learning',
    description: 'Focuses on complex neural network architectures: Transformers, computer vision, diffusion, and generative modeling.',
    typicalTools: ['PyTorch', 'CUDA', 'TensorBoard', 'Transformers', 'Weights & Biases'],
    requiredSkills: [
      { skillName: 'Deep Learning & Neural Networks', category: 'AI & Machine Learning', requiredProficiency: 5, whyItMatters: 'Custom loss layers, multi-head attention, and gradient clipping.' },
      { skillName: 'Python for AI/ML', category: 'AI & Machine Learning', requiredProficiency: 4, whyItMatters: 'Tensor operations, GPU acceleration, and automated differentiation.' },
      { skillName: 'Transformer Architectures', category: 'AI & Machine Learning', requiredProficiency: 4, whyItMatters: 'Encoder-decoder attention blocks and positional encodings.' },
      { skillName: 'Model Evaluation & Metrics', category: 'AI & Machine Learning', requiredProficiency: 4, whyItMatters: 'Perplexity, BLEU, ROUGE, and validation loss divergence.' }
    ]
  },
  'NLP Engineer': {
    roleTitle: 'NLP Engineer',
    domainId: 'ai-ml',
    domainTitle: 'Artificial Intelligence and Machine Learning',
    description: 'Extracts meaning from unstructured human text via tokenization, sequence labeling, embeddings, and LLM fine-tuning.',
    typicalTools: ['spaCy', 'Hugging Face', 'PyTorch', 'NLTK', 'FAISS'],
    requiredSkills: [
      { skillName: 'Natural Language Processing', category: 'AI & Machine Learning', requiredProficiency: 5, whyItMatters: 'Tokenization, lemmatization, named entity recognition, and sentiment.' },
      { skillName: 'Vector Embeddings & Semantic Search', category: 'AI & Machine Learning', requiredProficiency: 4, whyItMatters: 'Cosine similarity, vector indexing, and embedding fine-tuning.' },
      { skillName: 'Transformer Architectures', category: 'AI & Machine Learning', requiredProficiency: 4, whyItMatters: 'BERT, RoBERTa, and autoregressive language models.' },
      { skillName: 'Python for AI/ML', category: 'AI & Machine Learning', requiredProficiency: 4, whyItMatters: 'Data cleansing and text token pipelines.' }
    ]
  },
  'Generative AI Application Developer': {
    roleTitle: 'Generative AI Application Developer',
    domainId: 'ai-ml',
    domainTitle: 'Artificial Intelligence and Machine Learning',
    description: 'Constructs production LLM agents, Retrieval-Augmented Generation (RAG) pipelines, and multimodal AI apps.',
    typicalTools: ['Gemini API', 'LangChain', 'LlamaIndex', 'Pinecone/Chroma', 'TypeScript/Python'],
    requiredSkills: [
      { skillName: 'Prompt Engineering & System Directives', category: 'AI & Machine Learning', requiredProficiency: 5, whyItMatters: 'Context steering, few-shot prompting, and structured output formatting.' },
      { skillName: 'Retrieval-Augmented Generation (RAG)', category: 'AI & Machine Learning', requiredProficiency: 4, whyItMatters: 'Chunking strategies, hybrid search, and grounding against hallucination.' },
      { skillName: 'Vector Embeddings & Semantic Search', category: 'AI & Machine Learning', requiredProficiency: 4, whyItMatters: 'Dense retrieval, semantic reranking, and vector databases.' },
      { skillName: 'RESTful API Architecture', category: 'Backend', requiredProficiency: 3, whyItMatters: 'Serving AI agent capabilities via scalable web services.' }
    ]
  },

  // C. DATA SCIENCE AND ANALYTICS
  'Data Analyst': {
    roleTitle: 'Data Analyst',
    domainId: 'data-science',
    domainTitle: 'Data Science and Analytics',
    description: 'Analyzes business metrics, designs interactive dashboards, and communicates actionable data-driven stories.',
    typicalTools: ['SQL', 'Tableau / Power BI', 'Excel / Sheets', 'Python (Pandas)', 'Metabase'],
    requiredSkills: [
      { skillName: 'Advanced SQL Querying', category: 'Data Science & Analytics', requiredProficiency: 4, whyItMatters: 'Window functions, CTEs, self-joins, and aggregations for reporting.' },
      { skillName: 'Data Visualization & Storytelling', category: 'Data Science & Analytics', requiredProficiency: 4, whyItMatters: 'Designing intuitive charts that clearly guide executive decision making.' },
      { skillName: 'Descriptive & Inferential Statistics', category: 'Data Science & Analytics', requiredProficiency: 3, whyItMatters: 'Hypothesis testing, p-values, distributions, and variance analysis.' },
      { skillName: 'Data Cleaning & Wrangling', category: 'Data Science & Analytics', requiredProficiency: 4, whyItMatters: 'Resolving duplicate records, null imputation, and datatype casting.' }
    ]
  },
  'Data Scientist': {
    roleTitle: 'Data Scientist',
    domainId: 'data-science',
    domainTitle: 'Data Science and Analytics',
    description: 'Combines predictive modeling, experimental A/B testing, and exploratory analytics to solve business challenges.',
    typicalTools: ['Python', 'Pandas', 'Statsmodels', 'scikit-learn', 'Jupyter', 'SQL'],
    requiredSkills: [
      { skillName: 'Statistical Analysis & A/B Testing', category: 'Data Science & Analytics', requiredProficiency: 4, whyItMatters: 'Sample sizing, confidence intervals, and causal inference.' },
      { skillName: 'Python for Data Analysis (Pandas/NumPy)', category: 'Data Science & Analytics', requiredProficiency: 4, whyItMatters: 'High-speed tabular manipulation and exploratory analysis.' },
      { skillName: 'Machine Learning Fundamentals', category: 'AI & Machine Learning', requiredProficiency: 3, whyItMatters: 'Supervised classification, regression, and clustering algorithms.' },
      { skillName: 'Advanced SQL Querying', category: 'Data Science & Analytics', requiredProficiency: 4, whyItMatters: 'Complex data wrangling directly inside analytical data warehouses.' }
    ]
  },
  'Data Engineer': {
    roleTitle: 'Data Engineer',
    domainId: 'data-science',
    domainTitle: 'Data Science and Analytics',
    description: 'Constructs fault-tolerant ETL/ELT pipelines, streaming data lakes, and structured analytical storage schemas.',
    typicalTools: ['Apache Spark', 'Airflow', 'dbt', 'BigQuery/Snowflake', 'Kafka', 'Python'],
    requiredSkills: [
      { skillName: 'ETL & Pipeline Orchestration', category: 'Data Science & Analytics', requiredProficiency: 4, whyItMatters: 'Automates DAG workflows and scheduled ingestion batch runs.' },
      { skillName: 'Data Modeling & Dimensional Schemas', category: 'Database', requiredProficiency: 4, whyItMatters: 'Star schemas, snowflake models, and slowly changing dimensions.' },
      { skillName: 'Advanced SQL Querying', category: 'Data Science & Analytics', requiredProficiency: 5, whyItMatters: 'High-performance SQL transformations and partitioning optimization.' },
      { skillName: 'Distributed Computing (Spark/PySpark)', category: 'Data Science & Analytics', requiredProficiency: 3, whyItMatters: 'Processes massive multi-terabyte datasets across computing clusters.' }
    ]
  },
  'Business Intelligence Analyst': {
    roleTitle: 'Business Intelligence Analyst',
    domainId: 'data-science',
    domainTitle: 'Data Science and Analytics',
    description: 'Builds operational dashboards, KPI monitors, and self-serve semantic analytical data models.',
    typicalTools: ['Power BI', 'DAX', 'SQL Server', 'Tableau', 'Excel'],
    requiredSkills: [
      { skillName: 'Advanced SQL Querying', category: 'Data Science & Analytics', requiredProficiency: 4, whyItMatters: 'Extracting clean summary datasets from transaction tables.' },
      { skillName: 'BI Dashboard Development', category: 'Data Science & Analytics', requiredProficiency: 5, whyItMatters: 'Building executive KPI drilldowns, parameters, and interactive filters.' },
      { skillName: 'Business KPI Formulation', category: 'Data Science & Analytics', requiredProficiency: 4, whyItMatters: 'Defining churn, customer lifetime value, CAC, and retention metrics.' }
    ]
  },

  // D. CYBERSECURITY
  'Cybersecurity Analyst': {
    roleTitle: 'Cybersecurity Analyst',
    domainId: 'cybersecurity',
    domainTitle: 'Cybersecurity',
    description: 'Monitors digital assets, investigates security alarms, responds to incidents, and enforces defensive postures.',
    typicalTools: ['SIEM (Splunk/Elastic)', 'Wireshark', 'Nmap', 'Suricata', 'Linux CLI'],
    requiredSkills: [
      { skillName: 'Network Security & Protocols', category: 'Cybersecurity', requiredProficiency: 4, whyItMatters: 'Understanding TCP/IP handshakes, DNS, HTTP, and packet inspection.' },
      { skillName: 'Security Log Analysis & SIEM', category: 'Cybersecurity', requiredProficiency: 4, whyItMatters: 'Detecting brute force, beaconing, and anomalous access spikes in logs.' },
      { skillName: 'Vulnerability Assessment', category: 'Cybersecurity', requiredProficiency: 3, whyItMatters: 'Scanning networks for known CVEs and outdated patch levels.' },
      { skillName: 'Incident Response Lifecycle', category: 'Cybersecurity', requiredProficiency: 3, whyItMatters: 'Containment, eradication, recovery, and post-mortem reporting.' }
    ]
  },
  'SOC Analyst': {
    roleTitle: 'SOC Analyst',
    domainId: 'cybersecurity',
    domainTitle: 'Cybersecurity',
    description: 'Frontline Security Operations Center defender triaging alerts, assessing telemetry, and hunting threats.',
    typicalTools: ['Splunk', 'CrowdStrike', 'Wireshark', 'VirusTotal', 'Zeek'],
    requiredSkills: [
      { skillName: 'Security Log Analysis & SIEM', category: 'Cybersecurity', requiredProficiency: 5, whyItMatters: 'Triaging high-volume alarm telemetry without alert fatigue.' },
      { skillName: 'Network Security & Protocols', category: 'Cybersecurity', requiredProficiency: 4, whyItMatters: 'Inspecting PCAP packet captures for malicious payload strings.' },
      { skillName: 'Threat Intelligence & IOCs', category: 'Cybersecurity', requiredProficiency: 4, whyItMatters: 'Correlating hashes, IPs, and domains against threat databases.' }
    ]
  },
  'Penetration Tester': {
    roleTitle: 'Penetration Tester',
    domainId: 'cybersecurity',
    domainTitle: 'Cybersecurity',
    description: 'Ethical hacker identifying and demonstrating vulnerabilities across web apps, APIs, and network perimeters.',
    typicalTools: ['Burp Suite', 'Metasploit', 'Nmap', 'OWASP ZAP', 'Kali Linux'],
    requiredSkills: [
      { skillName: 'Web Application Pentesting (OWASP Top 10)', category: 'Cybersecurity', requiredProficiency: 5, whyItMatters: 'Testing for SQL injection, XSS, CSRF, IDOR, and broken auth.' },
      { skillName: 'Network Scanning & Reconnaissance', category: 'Cybersecurity', requiredProficiency: 4, whyItMatters: 'Port enumeration, service fingerprinting, and surface mapping.' },
      { skillName: 'Security Remediation Guidance', category: 'Cybersecurity', requiredProficiency: 4, whyItMatters: 'Translating exploit proof-of-concepts into actionable developer fixes.' }
    ]
  },
  'Security Engineer': {
    roleTitle: 'Security Engineer',
    domainId: 'cybersecurity',
    domainTitle: 'Cybersecurity',
    description: 'Implements defensive infrastructure, cryptographic controls, IAM policies, and automated security guardrails.',
    typicalTools: ['Vault', 'AWS IAM', 'Terraform', 'WAF', 'OpenSSL'],
    requiredSkills: [
      { skillName: 'Cloud & Infrastructure Hardening', category: 'Cybersecurity', requiredProficiency: 4, whyItMatters: 'Least-privilege IAM policies, VPC security groups, and encryption.' },
      { skillName: 'Cryptography & PKI Fundamentals', category: 'Cybersecurity', requiredProficiency: 3, whyItMatters: 'Symmetric/asymmetric encryption, TLS certificates, and hash salts.' },
      { skillName: 'Network Security & Protocols', category: 'Cybersecurity', requiredProficiency: 4, whyItMatters: 'Firewall architecture, zero-trust tunnels, and bastion controls.' }
    ]
  },
  'Digital Forensics Analyst': {
    roleTitle: 'Digital Forensics Analyst',
    domainId: 'cybersecurity',
    domainTitle: 'Cybersecurity',
    description: 'Investigates digital evidence, preserves chain of custody, recovers deleted artifacts, and reconstructs attacks.',
    typicalTools: ['Autopsy', 'FTK Imager', 'Volatility', 'YARA'],
    requiredSkills: [
      { skillName: 'Memory & Disk Forensics', category: 'Cybersecurity', requiredProficiency: 4, whyItMatters: 'Analyzing RAM dumps and forensic file system images.' },
      { skillName: 'Evidence Preservation & Chain of Custody', category: 'Cybersecurity', requiredProficiency: 4, whyItMatters: 'Ensuring digital evidence integrity for legal admissibility.' },
      { skillName: 'Security Log Analysis & SIEM', category: 'Cybersecurity', requiredProficiency: 3, whyItMatters: 'Timeline reconstruction through correlated system events.' }
    ]
  },

  // E. CLOUD COMPUTING AND DEVOPS
  'Cloud Engineer': {
    roleTitle: 'Cloud Engineer',
    domainId: 'cloud-devops',
    domainTitle: 'Cloud Computing and DevOps',
    description: 'Architects, provisions, and maintains scalable cloud infrastructure across AWS, GCP, or Azure.',
    typicalTools: ['AWS / GCP', 'Terraform', 'Docker', 'Linux', 'CloudWatch'],
    requiredSkills: [
      { skillName: 'Cloud Services & Architecture (AWS/GCP)', category: 'Cloud & Infrastructure', requiredProficiency: 4, whyItMatters: 'Compute instances, object storage, managed databases, and VPCs.' },
      { skillName: 'Infrastructure as Code (Terraform)', category: 'Cloud & Infrastructure', requiredProficiency: 4, whyItMatters: 'Declarative resource provisioning preventing drift.' },
      { skillName: 'Linux Administration & Shell Scripting', category: 'DevOps', requiredProficiency: 4, whyItMatters: 'Managing permissions, systemd services, SSH, and Bash automation.' },
      { skillName: 'Containerization (Docker)', category: 'DevOps', requiredProficiency: 4, whyItMatters: 'Building lightweight reproducible container images.' }
    ]
  },
  'DevOps Engineer': {
    roleTitle: 'DevOps Engineer',
    domainId: 'cloud-devops',
    domainTitle: 'Cloud Computing and DevOps',
    description: 'Automates deployment lifecycles, builds continuous delivery pipelines, and streamlines developer productivity.',
    typicalTools: ['GitHub Actions', 'Docker', 'Kubernetes', 'Terraform', 'Prometheus', 'Helm'],
    requiredSkills: [
      { skillName: 'CI/CD Pipeline Automation', category: 'DevOps', requiredProficiency: 5, whyItMatters: 'Automates test execution, linting, image build, and rollout.' },
      { skillName: 'Containerization (Docker)', category: 'DevOps', requiredProficiency: 4, whyItMatters: 'Multi-stage Dockerfiles and container image security scanning.' },
      { skillName: 'Kubernetes Orchestration', category: 'Cloud & Infrastructure', requiredProficiency: 3, whyItMatters: 'Deployments, services, ingress routing, and config maps.' },
      { skillName: 'Infrastructure as Code (Terraform)', category: 'Cloud & Infrastructure', requiredProficiency: 4, whyItMatters: 'Repeatable infrastructure across dev, staging, and production.' }
    ]
  },
  'Site Reliability Engineer': {
    roleTitle: 'Site Reliability Engineer',
    domainId: 'cloud-devops',
    domainTitle: 'Cloud Computing and DevOps',
    description: 'Guarantees system availability, defines SLOs/SLAs, automates incident remediation, and eliminates toil.',
    typicalTools: ['Prometheus', 'Grafana', 'Kubernetes', 'Python/Go', 'PagerDuty'],
    requiredSkills: [
      { skillName: 'Observability & Monitoring (SLO/SLI)', category: 'DevOps', requiredProficiency: 5, whyItMatters: 'Tracking error budgets, latency percentiles (p99), and metrics.' },
      { skillName: 'Kubernetes Orchestration', category: 'Cloud & Infrastructure', requiredProficiency: 4, whyItMatters: 'Horizontal pod autoscaling, rolling updates, and self-healing.' },
      { skillName: 'Incident Management & RCA', category: 'DevOps', requiredProficiency: 4, whyItMatters: 'Root cause analysis and blameless post-mortems.' }
    ]
  },
  'Platform Engineer': {
    roleTitle: 'Platform Engineer',
    domainId: 'cloud-devops',
    domainTitle: 'Cloud Computing and DevOps',
    description: 'Designs Internal Developer Platforms (IDP) that provide self-service tooling and infrastructure for product teams.',
    typicalTools: ['Kubernetes', 'Backstage', 'ArgoCD', 'Terraform', 'Helm'],
    requiredSkills: [
      { skillName: 'Internal Developer Platforms & Tooling', category: 'DevOps', requiredProficiency: 4, whyItMatters: 'Standardizes developer onboarding and infrastructure self-service.' },
      { skillName: 'Kubernetes Orchestration', category: 'Cloud & Infrastructure', requiredProficiency: 4, whyItMatters: 'Multi-tenant cluster policies and GitOps with ArgoCD.' },
      { skillName: 'CI/CD Pipeline Automation', category: 'DevOps', requiredProficiency: 4, whyItMatters: 'Reusable workflow templates for engineering teams.' }
    ]
  },

  // F. MOBILE APP DEVELOPMENT
  'Android Developer': {
    roleTitle: 'Android Developer',
    domainId: 'mobile-dev',
    domainTitle: 'Mobile App Development',
    description: 'Creates modern native Android applications using Kotlin, Jetpack Compose, and material guidelines.',
    typicalTools: ['Kotlin', 'Android Studio', 'Jetpack Compose', 'Coroutines', 'Retrofit'],
    requiredSkills: [
      { skillName: 'Kotlin Programming', category: 'Mobile Development', requiredProficiency: 4, whyItMatters: 'Null safety, extension functions, coroutines, and idioms.' },
      { skillName: 'Jetpack Compose UI', category: 'Mobile Development', requiredProficiency: 4, whyItMatters: 'Declarative Android UI components and state hoisting.' },
      { skillName: 'Android Lifecycle & Architecture Components', category: 'Mobile Development', requiredProficiency: 4, whyItMatters: 'ViewModel, LiveData/Flow, and configuration change handling.' },
      { skillName: 'RESTful API & Network Integration', category: 'Backend', requiredProficiency: 3, whyItMatters: 'JSON deserialization and asynchronous background requests.' }
    ]
  },
  'iOS Developer': {
    roleTitle: 'iOS Developer',
    domainId: 'mobile-dev',
    domainTitle: 'Mobile App Development',
    description: 'Develops sleek native iOS applications for iPhone and iPad using Swift and SwiftUI.',
    typicalTools: ['Swift', 'Xcode', 'SwiftUI', 'Combine', 'TestFlight'],
    requiredSkills: [
      { skillName: 'Swift Programming', category: 'Mobile Development', requiredProficiency: 4, whyItMatters: 'Type safety, protocols, optionals, and async/await syntax.' },
      { skillName: 'SwiftUI Declarative Architecture', category: 'Mobile Development', requiredProficiency: 4, whyItMatters: 'State, Binding, Observable objects, and custom views.' },
      { skillName: 'iOS App Lifecycle & Memory Management', category: 'Mobile Development', requiredProficiency: 4, whyItMatters: 'ARC retain cycles, memory leaks, and background execution.' },
      { skillName: 'RESTful API & Network Integration', category: 'Backend', requiredProficiency: 3, whyItMatters: 'URLSession and secure keychain storage.' }
    ]
  },
  'Flutter Developer': {
    roleTitle: 'Flutter Developer',
    domainId: 'mobile-dev',
    domainTitle: 'Mobile App Development',
    description: 'Builds cross-platform native-compiled apps from a single codebase using Flutter and Dart.',
    typicalTools: ['Dart', 'Flutter SDK', 'Bloc / Provider', 'Firebase', 'VS Code'],
    requiredSkills: [
      { skillName: 'Dart Language Fundamentals', category: 'Mobile Development', requiredProficiency: 4, whyItMatters: 'Object-oriented programming, async futures, and streams.' },
      { skillName: 'Flutter Widget Hierarchy & Layouts', category: 'Mobile Development', requiredProficiency: 4, whyItMatters: 'Stateless vs Stateful widgets, render tree, and custom animations.' },
      { skillName: 'State Management (Bloc/Provider)', category: 'Mobile Development', requiredProficiency: 4, whyItMatters: 'Predictable reactive state flow across screens.' },
      { skillName: 'Cross-Platform Native Integrations', category: 'Mobile Development', requiredProficiency: 3, whyItMatters: 'MethodChannels, camera access, and local storage.' }
    ]
  },
  'React Native Developer': {
    roleTitle: 'React Native Developer',
    domainId: 'mobile-dev',
    domainTitle: 'Mobile App Development',
    description: 'Builds iOS and Android mobile apps leveraging React paradigms, JavaScript bridges, and Expo.',
    typicalTools: ['React Native', 'Expo', 'TypeScript', 'Redux', 'Flipper'],
    requiredSkills: [
      { skillName: 'React Native Architecture', category: 'Mobile Development', requiredProficiency: 4, whyItMatters: 'Native bridge, TurboModules, and mobile styling primitives.' },
      { skillName: 'JavaScript (ES6+) & TypeScript', category: 'Frontend', requiredProficiency: 4, whyItMatters: 'Asynchronous event handling and strict typed contracts.' },
      { skillName: 'Mobile Navigation & State', category: 'Mobile Development', requiredProficiency: 4, whyItMatters: 'React Navigation, stack managers, and offline caching.' }
    ]
  },

  // G. SOFTWARE ENGINEERING
  'Software Engineer': {
    roleTitle: 'Software Engineer',
    domainId: 'software-eng',
    domainTitle: 'Software Engineering',
    description: 'Designs structured algorithms, reusable object-oriented systems, and maintainable software components.',
    typicalTools: ['Git', 'Docker', 'Linux', 'IDE (VS Code / IntelliJ)', 'Unit Testing'],
    requiredSkills: [
      { skillName: 'Data Structures & Algorithms', category: 'Software Engineering', requiredProficiency: 4, whyItMatters: 'Time/space complexity analysis (Big-O), trees, hashes, and graphs.' },
      { skillName: 'Object-Oriented & Design Patterns', category: 'Software Engineering', requiredProficiency: 4, whyItMatters: 'SOLID principles, Factory, Strategy, and Observer patterns.' },
      { skillName: 'System Architecture Fundamentals', category: 'System Design', requiredProficiency: 3, whyItMatters: 'Modular separation of concerns, scalability, and cohesion.' },
      { skillName: 'Automated Unit Testing', category: 'Testing & QA', requiredProficiency: 4, whyItMatters: 'Writing test suites preventing regressions during refactoring.' },
      { skillName: 'Git & Version Control', category: 'DevOps', requiredProficiency: 4, whyItMatters: 'Branching strategies, merge conflicts, and commit hygiene.' }
    ]
  },
  'Java Developer': {
    roleTitle: 'Java Developer',
    domainId: 'software-eng',
    domainTitle: 'Software Engineering',
    description: 'Builds enterprise-grade backends and microservices utilizing the JVM and Spring Boot ecosystem.',
    typicalTools: ['Java 17/21', 'Spring Boot', 'Maven/Gradle', 'PostgreSQL', 'JUnit'],
    requiredSkills: [
      { skillName: 'Java Core & Concurrency', category: 'Software Engineering', requiredProficiency: 4, whyItMatters: 'JVM memory management, multi-threading, streams, and generics.' },
      { skillName: 'Spring Boot Framework', category: 'Backend', requiredProficiency: 4, whyItMatters: 'Dependency injection, REST controllers, Spring Data JPA, and security.' },
      { skillName: 'SQL & Relational Databases', category: 'Database', requiredProficiency: 4, whyItMatters: 'Hibernate ORM mappings, transaction management, and indexing.' },
      { skillName: 'Automated Unit Testing', category: 'Testing & QA', requiredProficiency: 3, whyItMatters: 'JUnit 5 and Mockito mocking frameworks.' }
    ]
  },
  'Python Developer': {
    roleTitle: 'Python Developer',
    domainId: 'software-eng',
    domainTitle: 'Software Engineering',
    description: 'Builds high-efficiency web backends, automation scripts, and data services with idiomatic Python.',
    typicalTools: ['Python 3.11+', 'FastAPI / Django', 'Poetry', 'Pytest', 'PostgreSQL'],
    requiredSkills: [
      { skillName: 'Python Advanced Idioms', category: 'Software Engineering', requiredProficiency: 4, whyItMatters: 'Generators, decorators, context managers, and type hints.' },
      { skillName: 'FastAPI / Web Frameworks', category: 'Backend', requiredProficiency: 4, whyItMatters: 'Async route handlers, Pydantic data validation, and OpenAPI.' },
      { skillName: 'SQL & Relational Databases', category: 'Database', requiredProficiency: 3, whyItMatters: 'SQLAlchemy ORM and relational query optimization.' },
      { skillName: 'Automated Unit Testing', category: 'Testing & QA', requiredProficiency: 4, whyItMatters: 'Pytest fixtures, parameterization, and test coverage.' }
    ]
  },
  'C++ Developer': {
    roleTitle: 'C++ Developer',
    domainId: 'software-eng',
    domainTitle: 'Software Engineering',
    description: 'Develops high-performance, low-latency, resource-constrained systems and desktop engines.',
    typicalTools: ['C++17/20', 'CMake', 'GDB', 'Valgrind', 'Visual Studio'],
    requiredSkills: [
      { skillName: 'Modern C++ (17/20)', category: 'Software Engineering', requiredProficiency: 4, whyItMatters: 'RAII, smart pointers, move semantics, and templates.' },
      { skillName: 'Memory Management & Pointers', category: 'Software Engineering', requiredProficiency: 5, whyItMatters: 'Preventing memory leaks, segmentation faults, and cache misses.' },
      { skillName: 'Data Structures & Algorithms', category: 'Software Engineering', requiredProficiency: 4, whyItMatters: 'Optimized memory layouts and algorithmic execution efficiency.' }
    ]
  },
  'QA Automation Engineer': {
    roleTitle: 'QA Automation Engineer',
    domainId: 'software-eng',
    domainTitle: 'Software Engineering',
    description: 'Designs automated end-to-end testing frameworks, test plans, and CI/CD validation gates.',
    typicalTools: ['Playwright', 'Selenium', 'Cypress', 'Postman', 'Jest/JUnit'],
    requiredSkills: [
      { skillName: 'Test Automation Frameworks (Playwright/Cypress)', category: 'Testing & QA', requiredProficiency: 5, whyItMatters: 'Writing resilient web E2E tests with selector assertions.' },
      { skillName: 'API Testing & Validation', category: 'Testing & QA', requiredProficiency: 4, whyItMatters: 'Testing HTTP status codes, schema validation, and edge cases.' },
      { skillName: 'Test Strategy & Edge-Case Identification', category: 'Testing & QA', requiredProficiency: 4, whyItMatters: 'Equivalence partitioning, boundary value analysis, and smoke suites.' }
    ]
  },

  // H. DATABASE AND DATA PLATFORMS
  'Database Administrator': {
    roleTitle: 'Database Administrator',
    domainId: 'database-platforms',
    domainTitle: 'Database and Data Platforms',
    description: 'Manages enterprise database installations, backups, replication topologies, security, and query tuning.',
    typicalTools: ['PostgreSQL', 'MySQL', 'pgAdmin', 'Percona', 'Linux'],
    requiredSkills: [
      { skillName: 'Database Administration & Configuration', category: 'Database', requiredProficiency: 5, whyItMatters: 'Buffer pooling, write-ahead logs, and storage tuning.' },
      { skillName: 'High Availability & Replication', category: 'Database', requiredProficiency: 4, whyItMatters: 'Primary-replica replication, failover automation, and disaster recovery.' },
      { skillName: 'SQL Query Optimization & Indexing', category: 'Database', requiredProficiency: 5, whyItMatters: 'Analyzing EXPLAIN ANALYZE execution plans and B-tree vs GIN indexes.' }
    ]
  },
  'SQL Developer': {
    roleTitle: 'SQL Developer',
    domainId: 'database-platforms',
    domainTitle: 'Database and Data Platforms',
    description: 'Writes sophisticated stored procedures, views, complex relational joins, and database scripts.',
    typicalTools: ['PostgreSQL', 'Oracle PL/SQL', 'SQL Server T-SQL', 'DBeaver'],
    requiredSkills: [
      { skillName: 'Advanced SQL Querying', category: 'Database', requiredProficiency: 5, whyItMatters: 'Recursive CTEs, complex analytical window partitions, and pivoting.' },
      { skillName: 'Stored Procedures & Functions', category: 'Database', requiredProficiency: 4, whyItMatters: 'Encapsulating transactional business logic within the database tier.' },
      { skillName: 'SQL Query Optimization & Indexing', category: 'Database', requiredProficiency: 4, whyItMatters: 'Eliminating sequential scans on multi-million row tables.' }
    ]
  },
  'Data Warehouse Engineer': {
    roleTitle: 'Data Warehouse Engineer',
    domainId: 'database-platforms',
    domainTitle: 'Database and Data Platforms',
    description: 'Architects columnar analytical data warehouses, OLAP data marts, and transformation schedules.',
    typicalTools: ['Snowflake', 'BigQuery', 'dbt', 'Redshift', 'Airflow'],
    requiredSkills: [
      { skillName: 'Data Modeling & Dimensional Schemas', category: 'Database', requiredProficiency: 5, whyItMatters: 'Conformed dimensions, fact tables, and slowly changing dimensions.' },
      { skillName: 'Cloud Data Warehousing (BigQuery/Snowflake)', category: 'Database', requiredProficiency: 4, whyItMatters: 'Clustering keys, partitioning strategies, and compute scaling.' },
      { skillName: 'Advanced SQL Querying', category: 'Database', requiredProficiency: 4, whyItMatters: 'Complex analytical rollups and aggregation queries.' }
    ]
  },

  // I. UI/UX AND PRODUCT DESIGN
  'UI Designer': {
    roleTitle: 'UI Designer',
    domainId: 'ui-ux-design',
    domainTitle: 'UI/UX and Product Design',
    description: 'Creates pixel-perfect visual designs, design systems, typographic hierarchies, and component libraries.',
    typicalTools: ['Figma', 'Adobe XD', 'Tokens Studio', 'Illustrator'],
    requiredSkills: [
      { skillName: 'Visual Design & Typography Hierarchy', category: 'UI/UX & Design', requiredProficiency: 5, whyItMatters: 'Color harmonies, layout balance, line-heights, and visual weighting.' },
      { skillName: 'Design Systems & Component Libraries', category: 'UI/UX & Design', requiredProficiency: 4, whyItMatters: 'Reusable UI variants, token management, and autolayout in Figma.' },
      { skillName: 'Web Accessibility & Contrast Ratios', category: 'UI/UX & Design', requiredProficiency: 4, whyItMatters: 'Ensuring accessible color contrast and readable sizing.' }
    ]
  },
  'UX Designer': {
    roleTitle: 'UX Designer',
    domainId: 'ui-ux-design',
    domainTitle: 'UI/UX and Product Design',
    description: 'Conducts user research, builds interactive wireframes, and optimizes user journey usability.',
    typicalTools: ['Figma', 'Miro', 'UserTesting', 'Maze', 'Notion'],
    requiredSkills: [
      { skillName: 'User Journey Mapping & Wireframing', category: 'UI/UX & Design', requiredProficiency: 5, whyItMatters: 'Mapping friction points, task flows, and low-fidelity prototypes.' },
      { skillName: 'Usability Testing & User Research', category: 'UI/UX & Design', requiredProficiency: 4, whyItMatters: 'Moderated interviews, heuristic evaluations, and usability metrics.' },
      { skillName: 'Information Architecture', category: 'UI/UX & Design', requiredProficiency: 4, whyItMatters: 'Navigation taxonomy, card sorting, and mental model alignment.' }
    ]
  },
  'Product Designer': {
    roleTitle: 'Product Designer',
    domainId: 'ui-ux-design',
    domainTitle: 'UI/UX and Product Design',
    description: 'Bridges user experience research with business objectives and technical product execution.',
    typicalTools: ['Figma', 'Mixpanel', 'Jira', 'Whimsical'],
    requiredSkills: [
      { skillName: 'Product Strategy & Discovery', category: 'UI/UX & Design', requiredProficiency: 4, whyItMatters: 'Aligning business metrics with user problems and MVP definition.' },
      { skillName: 'Design Systems & Component Libraries', category: 'UI/UX & Design', requiredProficiency: 4, whyItMatters: 'Scalable UI components mapped to engineer handoff specs.' },
      { skillName: 'User Journey Mapping & Wireframing', category: 'UI/UX & Design', requiredProficiency: 4, whyItMatters: 'High-fidelity prototyping and interactive flow validation.' }
    ]
  },

  // J. EMERGING TECHNOLOGY
  'Blockchain Developer': {
    roleTitle: 'Blockchain Developer',
    domainId: 'emerging-tech',
    domainTitle: 'Emerging Technology',
    description: 'Builds decentralized smart contracts, web3 dApps, and cryptographically verified transactions.',
    typicalTools: ['Solidity', 'Hardhat', 'Ethers.js', 'MetaMask', 'Remix'],
    requiredSkills: [
      { skillName: 'Smart Contract Development (Solidity)', category: 'Emerging Tech', requiredProficiency: 4, whyItMatters: 'State variables, gas optimization, modifiers, and ERC standards.' },
      { skillName: 'Smart Contract Security & Reentrancy', category: 'Emerging Tech', requiredProficiency: 4, whyItMatters: 'Checks-effects-interactions pattern preventing exploit drains.' },
      { skillName: 'Web3 Client Integration (Ethers/Viem)', category: 'Emerging Tech', requiredProficiency: 3, whyItMatters: 'Connecting browser dApp wallets to blockchain RPC nodes.' }
    ]
  },
  'IoT Developer': {
    roleTitle: 'IoT Developer',
    domainId: 'emerging-tech',
    domainTitle: 'Emerging Technology',
    description: 'Programs connected hardware sensors, edge devices, and telemetry gateways using lightweight protocols.',
    typicalTools: ['C/C++', 'MQTT', 'Raspberry Pi / ESP32', 'Python', 'Node-RED'],
    requiredSkills: [
      { skillName: 'Embedded Programming (C/C++)', category: 'Emerging Tech', requiredProficiency: 4, whyItMatters: 'Memory-constrained microcontrollers, GPIO pins, and timers.' },
      { skillName: 'IoT Protocols (MQTT/CoAP)', category: 'Emerging Tech', requiredProficiency: 4, whyItMatters: 'Low-bandwidth publish-subscribe telemetry delivery.' },
      { skillName: 'Sensor Telemetry & Edge Processing', category: 'Emerging Tech', requiredProficiency: 3, whyItMatters: 'Analog-to-digital sensor calibration and edge data filtering.' }
    ]
  },
  'Robotics Software Engineer': {
    roleTitle: 'Robotics Software Engineer',
    domainId: 'emerging-tech',
    domainTitle: 'Emerging Technology',
    description: 'Develops motion planning algorithms, sensor fusion, and autonomous control software for robotic agents.',
    typicalTools: ['ROS / ROS 2', 'C++', 'Python', 'Gazebo', 'OpenCV'],
    requiredSkills: [
      { skillName: 'Robot Operating System (ROS / ROS 2)', category: 'Emerging Tech', requiredProficiency: 4, whyItMatters: 'Nodes, topics, service calls, URDF, and transform trees (tf2).' },
      { skillName: 'Kinematics & Motion Planning', category: 'Emerging Tech', requiredProficiency: 4, whyItMatters: 'Forward/inverse kinematics, path trajectories, and collision checks.' },
      { skillName: 'Computer Vision & Sensor Fusion', category: 'Emerging Tech', requiredProficiency: 3, whyItMatters: 'LiDAR point clouds, Kalman filters, and depth cameras.' }
    ]
  }
};

// All available target role strings
export const availableTargetRoles = Object.keys(allCareerRoleRequirements);

// Helper functions
export const getDomainById = (domainId: string): TechDomain | undefined => {
  return techDomains.find(d => d.id === domainId);
};

export const getDomainByRoleTitle = (roleTitle: string): TechDomain | undefined => {
  const req = allCareerRoleRequirements[roleTitle];
  if (req && req.domainId) {
    return techDomains.find(d => d.id === req.domainId);
  }
  // Fallback search
  return techDomains.find(d => d.roleTitles.some(r => r.toLowerCase() === roleTitle.toLowerCase()));
};

export const getRolesForDomain = (domainId: string): string[] => {
  const domain = techDomains.find(d => d.id === domainId);
  return domain ? domain.roleTitles : [];
};

export const getRoleRequirements = (roleTitle?: string): CareerRoleRequirements => {
  if (!roleTitle || roleTitle === 'Not selected yet' || roleTitle === '') {
    return {
      roleTitle: 'Not selected yet',
      domainId: '',
      domainTitle: 'Not selected',
      description: 'Select your target career role to see required skills and benchmark proficiencies.',
      typicalTools: [],
      requiredSkills: []
    };
  }

  // Exact match
  if (allCareerRoleRequirements[roleTitle]) {
    return allCareerRoleRequirements[roleTitle];
  }

  // Fuzzy match
  const lower = roleTitle.toLowerCase();
  for (const [key, value] of Object.entries(allCareerRoleRequirements)) {
    if (key.toLowerCase() === lower || lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return value;
    }
  }

  // Fallback to Full-Stack Developer
  return allCareerRoleRequirements['Full-Stack Developer'];
};
