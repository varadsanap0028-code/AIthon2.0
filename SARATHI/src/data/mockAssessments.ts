import type { AssessmentQuestion, PracticalTask } from '../types/assessment';

export const assessmentQuestionsData: AssessmentQuestion[] = [
  // --- A. WEB DEVELOPMENT ---
  {
    id: 'web-q1',
    domainId: 'web-dev',
    skillName: 'JavaScript (ES6+)',
    category: 'Frontend',
    question: 'What is the output of `console.log(typeof null)` in JavaScript, and why?',
    options: [
      '"undefined" because null has no assigned value',
      '"null" as it represents the primitive null type',
      '"object" due to a historical quirk in early JavaScript engine type tags',
      '"boolean" because null evaluates to false in boolean contexts'
    ],
    correctAnswerIndex: 2,
    explanation: 'In the original JavaScript implementation, values were represented with a type tag and a value. Objects had a type tag of 0, and the null pointer was represented as 0x00, causing `typeof null` to return "object".',
    difficulty: 'Beginner',
    proficiencyTarget: 2
  },
  {
    id: 'web-q2',
    domainId: 'web-dev',
    skillName: 'React.js Architecture',
    category: 'Frontend',
    question: 'When should `useCallback` be used in a React functional component?',
    options: [
      'To cache the calculated return value of an expensive mathematical computation',
      'To memoize a callback function instance between renders, preventing unnecessary child re-renders when passed as a prop',
      'To trigger synchronous DOM updates prior to browser paint',
      'To replace all state variables created with useState'
    ],
    correctAnswerIndex: 1,
    explanation: '`useCallback` caches a function definition between renders. It is primarily valuable when passing callbacks to optimized child components that rely on reference equality to prevent re-renders.',
    difficulty: 'Intermediate',
    proficiencyTarget: 4
  },
  {
    id: 'web-q3',
    domainId: 'web-dev',
    skillName: 'TypeScript',
    category: 'Frontend',
    question: 'What is the key difference between TypeScript `unknown` and `any` types?',
    options: [
      '`any` is strictly type-checked at compile time, whereas `unknown` disables all type-checking',
      '`unknown` is a type-safe counterpart of `any`; you cannot call methods or properties on `unknown` without type narrowing or assertion',
      '`unknown` can only hold primitive numbers and strings',
      'There is no difference; they are aliases for the same internal type'
    ],
    correctAnswerIndex: 1,
    explanation: '`unknown` represents any value but forces developers to perform type checks (like `typeof` or `instanceof`) before performing operations on it, maintaining static type safety.',
    difficulty: 'Intermediate',
    proficiencyTarget: 3
  },
  {
    id: 'web-q4',
    domainId: 'web-dev',
    skillName: 'Node.js & Express',
    category: 'Backend',
    question: 'How does Express.js distinguish an error-handling middleware from standard route middleware?',
    options: [
      'By declaring it with `app.error()` instead of `app.use()`',
      'By inspecting the function arity: error middleware takes exactly four parameters `(err, req, res, next)`',
      'By returning an Error object from the middleware function',
      'By naming the function `errorHandler`'
    ],
    correctAnswerIndex: 1,
    explanation: 'Express examines `fn.length` at runtime. Middleware with 4 parameters `(err, req, res, next)` is registered internally as an error-handling middleware.',
    difficulty: 'Intermediate',
    proficiencyTarget: 4
  },
  {
    id: 'web-q5',
    domainId: 'web-dev',
    skillName: 'RESTful API Architecture',
    category: 'Backend',
    question: 'Which HTTP method should be used when updating an existing user record with partial field changes, according to REST conventions?',
    options: ['PUT', 'POST', 'PATCH', 'UPDATE'],
    correctAnswerIndex: 2,
    explanation: '`PATCH` is designed for partial modifications to an existing resource, whereas `PUT` replaces the entire target resource with the uploaded payload.',
    difficulty: 'Beginner',
    proficiencyTarget: 3
  },

  // --- B. AI AND MACHINE LEARNING ---
  {
    id: 'ai-q1',
    domainId: 'ai-ml',
    skillName: 'Model Evaluation & Metrics',
    category: 'AI & Machine Learning',
    question: 'In a medical diagnostic classifier detecting a rare life-threatening disease, which metric should be prioritized to minimize false negatives?',
    options: [
      'Accuracy, because it measures total correct predictions',
      'Precision, to ensure positive diagnoses are always correct',
      'Recall (Sensitivity), to maximize the proportion of actual positive cases identified',
      'Specificity, to maximize true negative screening'
    ],
    correctAnswerIndex: 2,
    explanation: 'Recall = TP / (TP + FN). In life-critical medical diagnosis, missing a true positive (False Negative) has catastrophic consequences, so maximizing Recall is critical.',
    difficulty: 'Beginner',
    proficiencyTarget: 3
  },
  {
    id: 'ai-q2',
    domainId: 'ai-ml',
    skillName: 'Machine Learning Fundamentals',
    category: 'AI & Machine Learning',
    question: 'What is the primary manifestation of high bias (underfitting) in a machine learning model?',
    options: [
      'Near-zero training error but high test error',
      'Both high training error and high validation/test error',
      'Extreme sensitivity to small fluctuations in training data',
      'Over-parameterization with high polynomial degrees'
    ],
    correctAnswerIndex: 1,
    explanation: 'High bias implies the model makes strong simplistic assumptions and fails to capture the underlying patterns, resulting in elevated error on both training and validation sets.',
    difficulty: 'Intermediate',
    proficiencyTarget: 3
  },
  {
    id: 'ai-q3',
    domainId: 'ai-ml',
    skillName: 'Deep Learning & Neural Networks',
    category: 'AI & Machine Learning',
    question: 'Why did the Self-Attention mechanism in Transformers supersede traditional Recurrent Neural Networks (RNNs) for sequence modeling?',
    options: [
      'Self-attention requires zero training parameters',
      'Self-attention enables parallel computation across the entire sequence length, bypassing sequential recurrent hidden-state bottlenecks',
      'Transformers can only process fixed-size single words',
      'Attention eliminates the need for activation functions'
    ],
    correctAnswerIndex: 1,
    explanation: 'RNNs process tokens sequentially ($O(N)$ sequential operations), preventing parallel GPU acceleration. Self-attention computes pairwise token relationships in parallel matrix multiplications.',
    difficulty: 'Advanced',
    proficiencyTarget: 4
  },
  {
    id: 'ai-q4',
    domainId: 'ai-ml',
    skillName: 'Retrieval-Augmented Generation (RAG)',
    category: 'AI & Machine Learning',
    question: 'What is the primary role of dense vector embeddings in a Retrieval-Augmented Generation (RAG) system?',
    options: [
      'To compile Python code into WebAssembly',
      'To represent text semantic meaning as multi-dimensional coordinate vectors, enabling fast approximate nearest neighbor (ANN) retrieval of relevant context chunks',
      'To encrypt private user conversations',
      'To directly generate the final natural language answer without an LLM'
    ],
    correctAnswerIndex: 1,
    explanation: 'Embeddings map text fragments into vector spaces where semantically similar texts cluster together. When a user asks a query, nearest neighbor search finds the most contextually relevant documents to ground the prompt.',
    difficulty: 'Intermediate',
    proficiencyTarget: 4
  },

  // --- C. DATA SCIENCE AND ANALYTICS ---
  {
    id: 'ds-q1',
    domainId: 'data-science',
    skillName: 'Advanced SQL Querying',
    category: 'Data Science & Analytics',
    question: 'What is the difference between `RANK()` and `DENSE_RANK()` window functions in SQL when ranking duplicate values?',
    options: [
      '`RANK()` skips subsequent ranking positions following ties (e.g. 1, 2, 2, 4), while `DENSE_RANK()` leaves no gaps (e.g. 1, 2, 2, 3)',
      '`DENSE_RANK()` requires an entire table scan, while `RANK()` does not',
      '`RANK()` is only supported in SQLite',
      'They produce identical sequence numbers'
    ],
    correctAnswerIndex: 0,
    explanation: '`RANK()` leaves gaps after identical values equal to the number of tied rows. `DENSE_RANK()` increments consecutively without leaving gaps.',
    difficulty: 'Intermediate',
    proficiencyTarget: 4
  },
  {
    id: 'ds-q2',
    domainId: 'data-science',
    skillName: 'Statistical Analysis & A/B Testing',
    category: 'Data Science & Analytics',
    question: 'What does a p-value of 0.03 indicate when testing against a standard significance threshold of alpha = 0.05?',
    options: [
      'The probability that the alternate hypothesis is false is exactly 3%',
      'There is a 3% probability of observing the data or more extreme results assuming the null hypothesis is true, justifying rejecting the null hypothesis',
      'The test has 97% statistical power',
      'The treatment group increased revenue by 3%'
    ],
    correctAnswerIndex: 1,
    explanation: 'A p-value measures the probability of obtaining test results at least as extreme as the observed results, assuming the null hypothesis is correct. Since 0.03 < 0.05, we reject the null hypothesis.',
    difficulty: 'Intermediate',
    proficiencyTarget: 3
  },
  {
    id: 'ds-q3',
    domainId: 'data-science',
    skillName: 'Data Modeling & Dimensional Schemas',
    category: 'Database',
    question: 'In a Kimball dimensional data warehouse, what is a "Fact Table"?',
    options: [
      'A table that stores descriptive textual attributes and hierarchies (e.g. customer name, product category)',
      'A table containing numerical quantitative measurements and foreign keys referencing dimension tables',
      'A temporary table created during ETL runs',
      'A system catalog listing user permissions'
    ],
    correctAnswerIndex: 1,
    explanation: 'Fact tables contain business metrics/measurements (such as order amounts, quantities, durations) along with foreign keys linking to surrounding dimension tables in a star schema.',
    difficulty: 'Intermediate',
    proficiencyTarget: 4
  },

  // --- D. CYBERSECURITY ---
  {
    id: 'sec-q1',
    domainId: 'cybersecurity',
    skillName: 'Web Application Pentesting (OWASP Top 10)',
    category: 'Cybersecurity',
    question: 'Which secure programming practice is the most effective defense against SQL Injection vulnerabilities?',
    options: [
      'Blacklisting single quotes and semicolons in client-side JavaScript',
      'Using Parameterized Queries (Prepared Statements) or an Object-Relational Mapper (ORM) that separates SQL code from user-supplied data',
      'Storing all database tables in encrypted volumes',
      'Running web servers on non-standard port numbers'
    ],
    correctAnswerIndex: 1,
    explanation: 'Parameterized queries ensure the database driver treats user input strictly as literal parameter data, preventing the SQL parser from interpreting user input as executable SQL commands.',
    difficulty: 'Beginner',
    proficiencyTarget: 3
  },
  {
    id: 'sec-q2',
    domainId: 'cybersecurity',
    skillName: 'Security Log Analysis & SIEM',
    category: 'Cybersecurity',
    question: 'A SIEM alert flags 1,200 HTTP POST requests to `/api/v1/auth/login` from a single external IP within 90 seconds, followed by a 200 OK. What attack pattern does this indicate?',
    options: [
      'Distributed Denial of Service (DDoS) reflection attack',
      'Credential Stuffing or Brute Force Authentication attack',
      'Cross-Site Request Forgery (CSRF)',
      'Server-Side Request Forgery (SSRF)'
    ],
    correctAnswerIndex: 1,
    explanation: 'Rapid successive login POST attempts from one source IP followed by an eventual success is the signature of an automated brute force or credential stuffing attack against authentication endpoints.',
    difficulty: 'Intermediate',
    proficiencyTarget: 4
  },
  {
    id: 'sec-q3',
    domainId: 'cybersecurity',
    skillName: 'Cloud & Infrastructure Hardening',
    category: 'Cybersecurity',
    question: 'What is the core principle of "Least Privilege" in cloud Identity and Access Management (IAM)?',
    options: [
      'Users should be assigned Admin privileges by default and revoked when they leave the organization',
      'Identities (users, services, and roles) must only be granted the minimum permissions strictly necessary to perform their intended function',
      'All team members share a single root access key',
      'IAM policies should only use wildcard (`*`) actions to avoid deployment errors'
    ],
    correctAnswerIndex: 1,
    explanation: 'Least Privilege mandates that principals receive only the specific permissions needed for their duties. This limits the blast radius if credentials are leaked or compromised.',
    difficulty: 'Beginner',
    proficiencyTarget: 3
  },

  // --- E. CLOUD COMPUTING AND DEVOPS ---
  {
    id: 'cloud-q1',
    domainId: 'cloud-devops',
    skillName: 'Containerization (Docker)',
    category: 'DevOps',
    question: 'Why are multi-stage builds recommended when authoring production Dockerfiles?',
    options: [
      'They allow running multiple operating system kernels inside one container',
      'They separate build-time dependencies (compilers, dev tools) from runtime artifacts, producing minimal, secure production images',
      'They automatically provision cloud load balancers',
      'They encrypt the container filesystem with AES-256'
    ],
    correctAnswerIndex: 1,
    explanation: 'Multi-stage builds leave behind heavyweight compilers, SDKs, and build cache in intermediate stages, copying only final production binaries/assets into a lean runtime base image.',
    difficulty: 'Intermediate',
    proficiencyTarget: 4
  },
  {
    id: 'cloud-q2',
    domainId: 'cloud-devops',
    skillName: 'Kubernetes Orchestration',
    category: 'Cloud & Infrastructure',
    question: 'What is the primary role of a Kubernetes Service object with `type: ClusterIP`?',
    options: [
      'To expose the pods directly to the public internet through a cloud provider load balancer',
      'To provide a stable internal IP address and DNS name for load balancing traffic across matching pods inside the cluster',
      'To manage persistent volume storage attachments',
      'To restart failing worker node instances'
    ],
    correctAnswerIndex: 1,
    explanation: '`ClusterIP` is the default Service type. It provides an immutable internal cluster IP and DNS record that routes traffic across dynamically changing pod replica IP addresses.',
    difficulty: 'Intermediate',
    proficiencyTarget: 3
  },
  {
    id: 'cloud-q3',
    domainId: 'cloud-devops',
    skillName: 'Infrastructure as Code (Terraform)',
    category: 'Cloud & Infrastructure',
    question: 'What purpose does the `terraform.tfstate` file serve in HashiCorp Terraform?',
    options: [
      'It stores the application container source code',
      'It maps declarative configuration resources in your code to real-world infrastructure IDs provisioned in the cloud provider',
      'It is an executable bash script executed during deployment',
      'It holds local git branch commits'
    ],
    correctAnswerIndex: 1,
    explanation: 'Terraform state records metadata and real-world provider IDs (e.g. AWS ARN, VPC ID) to track managed resources, detect drift, and calculate required modifications during plans.',
    difficulty: 'Intermediate',
    proficiencyTarget: 4
  },

  // --- F. MOBILE APP DEVELOPMENT ---
  {
    id: 'mob-q1',
    domainId: 'mobile-dev',
    skillName: 'Kotlin Programming',
    category: 'Mobile Development',
    question: 'How does Kotlin eliminate `NullPointerException` (NPE) bugs at compile time?',
    options: [
      'By converting all variables to Java Object types',
      'By distinguishing nullable types (`String?`) from non-nullable types (`String`) in its type system and enforcing safe calls (`?.`) or Elvis operators (`?:`)',
      'By ignoring null values during runtime',
      'By allocating all variables on the CPU registers'
    ],
    correctAnswerIndex: 1,
    explanation: 'Kotlin types are non-nullable by default. Attempting to assign `null` to a non-nullable type causes a compile-time error, preventing runtime null pointer crashes.',
    difficulty: 'Beginner',
    proficiencyTarget: 3
  },
  {
    id: 'mob-q2',
    domainId: 'mobile-dev',
    skillName: 'SwiftUI Declarative Architecture',
    category: 'Mobile Development',
    question: 'In SwiftUI, when should `@StateObject` be used instead of `@ObservedObject`?',
    options: [
      'When the view owns and initializes the observable model lifecycle, ensuring it is not destroyed when the parent view re-evaluates its body',
      'When binding to simple string values in text fields',
      'When declaring static constant values',
      'When downloading images from a URL asynchronously'
    ],
    correctAnswerIndex: 0,
    explanation: '`@StateObject` ensures SwiftUI creates and persists the instance across view redraws. `@ObservedObject` is intended for instances injected from an external parent that owns the lifecycle.',
    difficulty: 'Intermediate',
    proficiencyTarget: 4
  },

  // --- G. SOFTWARE ENGINEERING ---
  {
    id: 'se-q1',
    domainId: 'software-eng',
    skillName: 'Data Structures & Algorithms',
    category: 'Software Engineering',
    question: 'What is the average time complexity of searching for a key in a balanced Hash Map vs an unbalanced Binary Search Tree (BST)?',
    options: [
      'Hash Map: O(1) average; Unbalanced BST: O(N) worst-case',
      'Hash Map: O(log N); Unbalanced BST: O(1)',
      'Hash Map: O(N); Unbalanced BST: O(N log N)',
      'Both have identical O(1) performance in all scenarios'
    ],
    correctAnswerIndex: 0,
    explanation: 'A Hash Map achieves average O(1) key lookup via hash hashing and bucket indexing. An unbalanced BST can degenerate into a linked list with O(N) linear lookup.',
    difficulty: 'Beginner',
    proficiencyTarget: 3
  },
  {
    id: 'se-q2',
    domainId: 'software-eng',
    skillName: 'Object-Oriented & Design Patterns',
    category: 'Software Engineering',
    question: 'Which SOLID principle is violated if a derived child class alters expected behavior such that replacing the base class with the child breaks existing caller code?',
    options: [
      'Single Responsibility Principle (SRP)',
      'Liskov Substitution Principle (LSP)',
      'Interface Segregation Principle (ISP)',
      'Dependency Inversion Principle (DIP)'
    ],
    correctAnswerIndex: 1,
    explanation: 'Liskov Substitution Principle states that subclasses should be substitutable for their base types without altering program correctness.',
    difficulty: 'Intermediate',
    proficiencyTarget: 4
  },

  // --- H. DATABASE AND DATA PLATFORMS ---
  {
    id: 'db-q1',
    domainId: 'database-platforms',
    skillName: 'SQL Query Optimization & Indexing',
    category: 'Database',
    question: 'Why might a database query engine perform a full table scan even though an index exists on the queried column `WHERE status = "active"`?',
    options: [
      'Because the database cache is completely full',
      'If low cardinality causes "active" to match a high percentage (e.g. 85%) of all table rows, sequential scan is faster than random index disk I/O lookups',
      'Because indexes cannot index string values',
      'Because `SELECT *` disables all indexes permanently'
    ],
    correctAnswerIndex: 1,
    explanation: 'Cost-based query optimizers estimate disk page I/O. When an index lookup yields a high selectivity percentage of the table, sequential page reading is cheaper than random index page seeks.',
    difficulty: 'Advanced',
    proficiencyTarget: 4
  },

  // --- I. UI/UX AND PRODUCT DESIGN ---
  {
    id: 'ux-q1',
    domainId: 'ui-ux-design',
    skillName: 'Web Accessibility & Contrast Ratios',
    category: 'UI/UX & Design',
    question: 'According to WCAG 2.1 Level AA guidelines, what is the minimum required contrast ratio for normal body text against its background?',
    options: ['3:1', '4.5:1', '7:1', '10:1'],
    correctAnswerIndex: 1,
    explanation: 'WCAG 2.1 AA mandates a minimum contrast ratio of 4.5:1 for standard body text (below 18pt/24px) and 3:1 for large text (18pt+ or 14pt bold).',
    difficulty: 'Beginner',
    proficiencyTarget: 3
  },

  // --- J. EMERGING TECHNOLOGY ---
  {
    id: 'em-q1',
    domainId: 'emerging-tech',
    skillName: 'Smart Contract Security & Reentrancy',
    category: 'Emerging Tech',
    question: 'How does the "Checks-Effects-Interactions" pattern prevent reentrancy exploits in Ethereum Solidity smart contracts?',
    options: [
      'By encrypting user ether deposits with a password',
      'By updating internal state variables (e.g. deducting user balance) BEFORE calling external untrusted contracts or transferring ether',
      'By disabling all contract gas fees',
      'By using proof-of-work mining inside the contract'
    ],
    correctAnswerIndex: 1,
    explanation: 'In a reentrancy attack, an external malicious contract calls back into the withdrawal function before the balance is zeroed. Updating internal state before making external calls ensures subsequent re-entrant calls fail balance checks.',
    difficulty: 'Advanced',
    proficiencyTarget: 4
  }
];

// Curated interactive practical tasks for each domain
export const practicalTasksData: PracticalTask[] = [
  // 1. Web Development Practical Task
  {
    id: 'task-web-1',
    domainId: 'web-dev',
    roleTitle: 'Full-Stack Developer',
    skillName: 'Node.js & Express',
    category: 'Backend',
    title: 'Fix Vulnerable Express Authentication Middleware',
    scenario: 'You are reviewing a mission-critical Express.js authentication middleware that is failing to properly verify bearer tokens and allows unauthorized requests when headers are missing or malformed.',
    instructions: [
      '1. Verify the `Authorization` header exists and starts with `"Bearer "`.',
      '2. If missing or invalid format, return status code `401` with `{ error: "Unauthorized" }`.',
      '3. Extract the token and verify it with `jwt.verify(token, SECRET)`.',
      '4. Attach decoded payload to `req.user` and call `next()`.',
      '5. Handle catch block errors with status `403` or `401`.'
    ],
    taskType: 'code-debug',
    starterContent: `// Express Auth Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  
  // TODO: Fix missing header check and bearer token extraction
  if (!authHeader) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: "Invalid token format" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Forbidden: invalid token" });
    }
    req.user = user;
    next();
  });
}`,
    expectedKeywordsOrOutputs: ['authHeader', 'split', 'jwt.verify', 'req.user', 'next()', '401', '403'],
    validationHints: [
      'Ensure you check that authHeader is truthy before calling split.',
      'Make sure you assign req.user = user and invoke next() when verification succeeds.'
    ],
    difficulty: 'Intermediate',
    proficiencyTarget: 3
  },

  // 2. AI & Machine Learning Practical Task
  {
    id: 'task-ai-1',
    domainId: 'ai-ml',
    roleTitle: 'AI/ML Engineer',
    skillName: 'Model Evaluation & Metrics',
    category: 'AI & Machine Learning',
    title: 'Diagnose Classifier Imbalance & Metric Trade-Off',
    scenario: 'A fraud detection model has 99.2% overall accuracy on a test set of 10,000 transactions, but the fraud department reports that 70% of fraudulent transactions are slipping through undetected.',
    instructions: [
      '1. Calculate the Confusion Matrix metrics: Why is Accuracy misleading when the dataset has a 99:1 class imbalance?',
      '2. Specify the target metric that directly captures the percentage of detected fraudulent cases (Recall/Sensitivity vs Precision).',
      '3. Recommend two data-level or algorithm-level remedies (e.g. SMOTE oversampling, class weighting / Focal Loss, threshold tuning).'
    ],
    taskType: 'data-pipeline',
    starterContent: `# Fraud Detection Diagnostic Analysis
# Dataset: 9,920 Legitimate (Class 0), 80 Fraudulent (Class 1)
# Predictions: Model predicted all 10,000 transactions as Class 0!

1. Flaw in Accuracy Metric:
Accuracy is 99.2% because the majority class dominates the test set. 
With high class imbalance, predicting only the majority class achieves misleadingly high accuracy while True Positives for fraud = 0.

2. Target Metric to Prioritize:
Recall (Sensitivity) = TP / (TP + FN).
We must maximize Recall for Class 1 to minimize False Negatives (missed fraud).

3. Recommended Engineering Remedies:
- Use Class Weighting (e.g., class_weight='balanced' or Focal Loss) to penalize False Negatives.
- Apply SMOTE (Synthetic Minority Over-sampling Technique) on the training set.
- Lower the decision classification threshold from 0.5 to 0.2 to capture more positive fraud candidates.`,
    expectedKeywordsOrOutputs: ['Accuracy', 'imbalance', 'Recall', 'False Negative', 'class_weight', 'threshold'],
    validationHints: [
      'Explain why accuracy fails on severe class imbalance.',
      'Identify Recall as the metric for minimizing missed fraud.',
      'Mention techniques like class weights, SMOTE, or threshold adjustment.'
    ],
    difficulty: 'Intermediate',
    proficiencyTarget: 4
  },

  // 3. Data Science Practical Task
  {
    id: 'task-ds-1',
    domainId: 'data-science',
    roleTitle: 'Data Analyst',
    skillName: 'Advanced SQL Querying',
    category: 'Data Science & Analytics',
    title: 'Customer Cohort Revenue Analysis with Window Functions',
    scenario: 'You are tasked with querying an e-commerce database to find the total revenue per customer and rank customers within each geographic country based on total spend.',
    instructions: [
      '1. Query the `orders` table joined with `customers`.',
      '2. Aggregate total spending per customer (`SUM(orders.amount)`).',
      '3. Use `DENSE_RANK() OVER (PARTITION BY customers.country ORDER BY total_spent DESC)` to rank customers by country.',
      '4. Filter only customers whose total spend exceeds $1,000 using `HAVING` or a CTE.'
    ],
    taskType: 'sql-query',
    starterContent: `-- Customer Revenue & Country Ranking Query
WITH customer_revenue AS (
  SELECT 
    c.customer_id,
    c.customer_name,
    c.country,
    SUM(o.amount) AS total_spent
  FROM customers c
  INNER JOIN orders o ON c.customer_id = o.customer_id
  GROUP BY c.customer_id, c.customer_name, c.country
  HAVING SUM(o.amount) > 1000
)
SELECT 
  customer_id,
  customer_name,
  country,
  total_spent,
  DENSE_RANK() OVER (
    PARTITION BY country 
    ORDER BY total_spent DESC
  ) AS country_rank
FROM customer_revenue
ORDER BY country, country_rank;`,
    expectedKeywordsOrOutputs: ['SUM', 'INNER JOIN', 'GROUP BY', 'HAVING', 'DENSE_RANK', 'PARTITION BY', 'ORDER BY'],
    validationHints: [
      'Include GROUP BY on customer attributes.',
      'Use DENSE_RANK() partitioned by country.',
      'Ensure the threshold filter for > 1000 spend is present.'
    ],
    difficulty: 'Intermediate',
    proficiencyTarget: 4
  },

  // 4. Cybersecurity Practical Task
  {
    id: 'task-sec-1',
    domainId: 'cybersecurity',
    roleTitle: 'Cybersecurity Analyst',
    skillName: 'Security Log Analysis & SIEM',
    category: 'Cybersecurity',
    title: 'Analyze Web Server Access Logs for Security Incidents',
    scenario: 'Review a snippet of simulated Nginx web server access logs. Identify the malicious IP, the targeted attack vector, and formulate immediate defensive firewall & application controls.',
    instructions: [
      '1. Inspect the simulated log records below.',
      '2. Identify the attacker IP address and the specific attack payloads.',
      '3. Determine which web vulnerability they attempted to exploit (SQL Injection, Directory Traversal, or Path Traversal).',
      '4. Specify the defensive action (e.g. block IP via iptables/WAF, sanitize input, parameterize SQL).'
    ],
    taskType: 'security-log',
    starterContent: `SIMULATED ACCESS LOG:
192.168.1.45 - - [10/Oct/2026:14:02:11 +0000] "GET /products?category=books HTTP/1.1" 200 4521
203.0.113.88 - - [10/Oct/2026:14:02:15 +0000] "GET /login?user=admin%27%20OR%201=1-- HTTP/1.1" 500 231
203.0.113.88 - - [10/Oct/2026:14:02:16 +0000] "GET /login?user=admin%27%20UNION%20SELECT%20null,password%20FROM%20users-- HTTP/1.1" 200 8912
192.168.1.60 - - [10/Oct/2026:14:02:18 +0000] "GET /about HTTP/1.1" 200 3120

INCIDENT ANALYSIS:
1. Malicious Source IP: 203.0.113.88
2. Attack Type: SQL Injection (SQLi) - specifically authentication bypass (' OR 1=1--) followed by UNION-based data exfiltration.
3. Impact: The HTTP 200 response code on the UNION SELECT request indicates the query executed and likely leaked user credentials.
4. Remediation:
- Immediate: Block IP 203.0.113.88 at Web Application Firewall (WAF) or cloud security group.
- Code fix: Use parameterized queries / prepared statements for authentication queries; never concatenate query strings.
- Force immediate credential rotation for compromised user accounts.`,
    expectedKeywordsOrOutputs: ['203.0.113.88', 'SQL Injection', 'UNION', 'parameterized', 'WAF'],
    validationHints: [
      'Identify 203.0.113.88 as the attacker.',
      'Identify SQL Injection as the attack type.',
      'Recommend parameterized queries and WAF rate-limiting/blocking.'
    ],
    difficulty: 'Intermediate',
    proficiencyTarget: 4
  },

  // 5. Cloud Computing & DevOps Practical Task
  {
    id: 'task-cloud-1',
    domainId: 'cloud-devops',
    roleTitle: 'DevOps Engineer',
    skillName: 'Containerization (Docker)',
    category: 'DevOps',
    title: 'Audit and Optimize Production Node.js Dockerfile',
    scenario: 'You are auditing a developer Dockerfile that runs as the root user, includes unnecessary development tools, and produces a 1.2 GB container image.',
    instructions: [
      '1. Implement a multi-stage build using a build stage and lean runtime stage (e.g. `node:20-alpine`).',
      '2. Ensure `NODE_ENV=production` is set to omit devDependencies.',
      '3. Create and switch to a non-root user (`USER node`) for container process execution.',
      '4. Use `CMD ["node", "server.js"]` for exec form.'
    ],
    taskType: 'cloud-config',
    starterContent: `# Stage 1: Build Dependencies
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production Minimal Runtime
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Security: Run as non-root user
USER node

COPY --chown=node:node --from=builder /app/package*.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/server.js"]`,
    expectedKeywordsOrOutputs: ['AS builder', 'AS runner', 'NODE_ENV=production', 'USER node', 'COPY --from=builder', 'CMD'],
    validationHints: [
      'Use multi-stage Docker syntax with AS.',
      'Set NODE_ENV to production.',
      'Ensure a non-root user like "USER node" is specified.'
    ],
    difficulty: 'Intermediate',
    proficiencyTarget: 4
  }
];

// Helper to get assessment items for a domain and target role
export const getQuestionsForDomainAndRole = (
  domainId?: string,
  _roleTitle?: string,
  categoryFilter?: string
): AssessmentQuestion[] => {
  let questions = [...assessmentQuestionsData];

  if (domainId) {
    questions = questions.filter(q => q.domainId === domainId);
  }

  if (categoryFilter && categoryFilter !== 'All') {
    questions = questions.filter(q => q.category.toLowerCase() === categoryFilter.toLowerCase());
  }

  // If questions are sparse for this domain, fallback to related domain questions rather than empty
  if (questions.length === 0) {
    questions = assessmentQuestionsData.slice(0, 5);
  }

  return questions;
};

export const getPracticalTasksForDomain = (
  domainId?: string,
  _roleTitle?: string
): PracticalTask[] => {
  if (!domainId) return [practicalTasksData[0]];

  const matched = practicalTasksData.filter(t => t.domainId === domainId);
  if (matched.length > 0) return matched;

  // Fallback to first practical task
  return [practicalTasksData[0]];
};
