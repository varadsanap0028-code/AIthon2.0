import type { StudentRoadmap, RoadmapStage, RoadmapTask } from '../types/roadmap';
import type { SkillGapItem } from '../types/gap';
import type { AssessmentResult } from '../types/assessment';
import { getRoleRequirements } from './domainsCatalog';

export interface DomainTrackResolution {
  trackKey: string;
  domainId: string;
  canonicalRoleTitle: string;
  domainTitle: string;
  isFallback: boolean;
}

/**
 * Normalizes any role title, domain ID, or alias to a canonical domain track.
 * Handles aliases and casing:
 *  - ML, Machine Learning, AI/ML
 *  - AI, Artificial Intelligence
 *  - Web Development, Frontend, Backend, Full Stack
 *  - Cybersecurity
 *  - Data Science, Data Analytics
 *  - Cloud Computing, DevOps
 *  - Mobile App Development
 */
export const resolveDomainTrack = (input?: string): DomainTrackResolution => {
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

// ============================================================================
// DOMAIN-SPECIFIC ROADMAP DEFINITIONS
// ============================================================================

// 1. MACHINE LEARNING ROADMAP
export const machineLearningRoadmap: StudentRoadmap = {
  targetRole: 'Machine Learning Engineer',
  overallProgress: 0,
  recommendedNextTaskId: 'task-ml-1-1',
  stages: [
    {
      id: 'stage-ml-1',
      stageNumber: 1,
      title: 'Python, Scientific Computing & Data Handling',
      description: 'Master clean scientific Python, vector operations with NumPy, and structured data handling using Pandas.',
      tasks: [
        {
          id: 'task-ml-1-1',
          stageId: 'stage-ml-1',
          topic: 'Scientific Python & Vectorized Operations',
          description: 'Master list comprehensions, generators, NumPy multi-dimensional arrays, broadcasting, and linear indexing.',
          relevanceToRole: 'Essential core runtime powering data transformation pipelines and tensor calculations.',
          estimatedDuration: '6 hours',
          difficulty: 'Beginner',
          resourceName: 'Python for Data Analysis — Official O\'Reilly Open Resources',
          resourceUrl: 'https://wesmckinney.com/book/',
          isFreeResource: true,
          isCompleted: false
        },
        {
          id: 'task-ml-1-2',
          stageId: 'stage-ml-1',
          topic: 'Data Handling & Wrangling with Pandas',
          description: 'Ingest tabular CSV/Parquet data, manage missing records, perform groupby aggregations, and reshape multi-index tables.',
          relevanceToRole: 'Primary data manipulation library required for feature preparation and EDA.',
          estimatedDuration: '8 hours',
          difficulty: 'Beginner',
          resourceName: 'Pandas Official Community Tutorials',
          resourceUrl: 'https://pandas.pydata.org/docs/getting_started/index.html',
          isFreeResource: true,
          isCompleted: false
        }
      ]
    },
    {
      id: 'stage-ml-2',
      stageNumber: 2,
      title: 'Mathematics, Statistics & Exploratory Data Analysis',
      description: 'Grasp statistical distributions, probability theory, hypothesis testing, and exploratory visualization.',
      tasks: [
        {
          id: 'task-ml-2-1',
          stageId: 'stage-ml-2',
          topic: 'Applied Probability & Statistical Inference',
          description: 'Normal, binomial, and Poisson distributions, Central Limit Theorem, confidence intervals, and p-value significance.',
          relevanceToRole: 'Prevents false metric attribution and underpins algorithm assumptions.',
          estimatedDuration: '8 hours',
          difficulty: 'Intermediate',
          resourceName: 'Khan Academy — Probability and Statistics',
          resourceUrl: 'https://www.khanacademy.org/math/statistics-probability',
          isFreeResource: true,
          isCompleted: false
        },
        {
          id: 'task-ml-2-2',
          stageId: 'stage-ml-2',
          topic: 'Exploratory Data Analysis (EDA) & Feature Inspection',
          description: 'Analyze feature correlation matrices, detect data outliers with boxplots, and identify skewed distributions.',
          relevanceToRole: 'Critical prerequisite to choosing appropriate ML algorithms and transforms.',
          estimatedDuration: '6 hours',
          difficulty: 'Intermediate',
          resourceName: 'Seaborn Tutorial & Statistical Visualization',
          resourceUrl: 'https://seaborn.pydata.org/tutorial.html',
          isFreeResource: true,
          isCompleted: false
        }
      ]
    },
    {
      id: 'stage-ml-3',
      stageNumber: 3,
      title: 'Supervised & Unsupervised Machine Learning',
      description: 'Build predictive regression, classification, decision trees, ensemble models, and clustering pipelines.',
      tasks: [
        {
          id: 'task-ml-3-1',
          stageId: 'stage-ml-3',
          topic: 'Supervised Learning with Scikit-Learn',
          description: 'Train linear regression, logistic classification, decision trees, random forests, and gradient boosting algorithms.',
          relevanceToRole: 'Industry standard foundation for tabular and predictive modeling tasks.',
          estimatedDuration: '12 hours',
          difficulty: 'Intermediate',
          resourceName: 'Scikit-Learn User Guide & Supervised Algorithms',
          resourceUrl: 'https://scikit-learn.org/stable/user_guide.html',
          isFreeResource: true,
          isCompleted: false
        },
        {
          id: 'task-ml-3-2',
          stageId: 'stage-ml-3',
          topic: 'Unsupervised Learning & Dimensionality Reduction',
          description: 'K-Means clustering, hierarchical clustering, and Principal Component Analysis (PCA) for variance retention.',
          relevanceToRole: 'Used for customer segmentation, anomaly detection, and dense feature compression.',
          estimatedDuration: '7 hours',
          difficulty: 'Intermediate',
          resourceName: 'Scikit-Learn Unsupervised Learning Guide',
          resourceUrl: 'https://scikit-learn.org/stable/unsupervised_learning.html',
          isFreeResource: true,
          isCompleted: false
        }
      ]
    },
    {
      id: 'stage-ml-4',
      stageNumber: 4,
      title: 'Model Evaluation, Validation & Hyperparameter Tuning',
      description: 'Implement rigorous cross-validation, leak-free preprocessing pipelines, and objective performance metrics.',
      tasks: [
        {
          id: 'task-ml-4-1',
          stageId: 'stage-ml-4',
          topic: 'Evaluation Metrics: Precision, Recall & ROC-AUC',
          description: 'Diagnose classification trade-offs using confusion matrices, F1-scores, PR curves, and regression RMSE/MAE.',
          relevanceToRole: 'Ensures model decisions meet enterprise business objectives and avoid class imbalance failure.',
          estimatedDuration: '6 hours',
          difficulty: 'Advanced',
          resourceName: 'Google Developers — Machine Learning Crash Course: Classification',
          resourceUrl: 'https://developers.google.com/machine-learning/crash-course/classification/precision-and-recall',
          isFreeResource: true,
          isCompleted: false
        },
        {
          id: 'task-ml-4-2',
          stageId: 'stage-ml-4',
          topic: 'K-Fold Cross-Validation & Hyperparameter Optimization',
          description: 'Prevent train-test leakage using Scikit-Learn Pipeline and optimize model parameters with GridSearchCV and Optuna.',
          relevanceToRole: 'Standard engineering workflow to guarantee generalizability on unseen data.',
          estimatedDuration: '8 hours',
          difficulty: 'Advanced',
          resourceName: 'Optuna Documentation — Efficient Hyperparameter Tuning',
          resourceUrl: 'https://optuna.readthedocs.io/en/stable/',
          isFreeResource: true,
          isCompleted: false
        }
      ]
    },
    {
      id: 'stage-ml-5',
      stageNumber: 5,
      title: 'MLOps Pipeline Engineering & Production Deployment',
      description: 'Package reproducible pipelines, deploy inference microservices with FastAPI, and submit verified portfolio artifacts.',
      tasks: [
        {
          id: 'task-ml-5-1',
          stageId: 'stage-ml-5',
          topic: 'Model Serving with FastAPI & Docker Containers',
          description: 'Serialize trained model artifacts with joblib, build high-performance async REST API endpoints, and containerize with Docker.',
          relevanceToRole: 'Bridges offline experimental modeling with live production software engineering.',
          estimatedDuration: '10 hours',
          difficulty: 'Advanced',
          resourceName: 'FastAPI Official Tutorial — Production Model Deployment',
          resourceUrl: 'https://fastapi.tiangolo.com/tutorial/',
          isFreeResource: true,
          isCompleted: false
        },
        {
          id: 'task-ml-5-2',
          stageId: 'stage-ml-5',
          topic: 'Capstone: End-to-End Production ML Pipeline',
          description: 'Build, evaluate, and containerize a live machine learning system with feature engineering and automated inference. Submit repository to Skill Passport.',
          relevanceToRole: 'Authoritative proof-of-competency evaluated by hiring recruiters.',
          estimatedDuration: '18 hours',
          difficulty: 'Advanced',
          resourceName: 'Made With ML — Production MLOps Course',
          resourceUrl: 'https://madewithml.com/',
          isFreeResource: true,
          isCompleted: false
        }
      ]
    }
  ]
};

// 2. ARTIFICIAL INTELLIGENCE ROADMAP
export const artificialIntelligenceRoadmap: StudentRoadmap = {
  targetRole: 'AI/ML Engineer',
  overallProgress: 0,
  recommendedNextTaskId: 'task-ai-1-1',
  stages: [
    {
      id: 'stage-ai-1',
      stageNumber: 1,
      title: 'Mathematical Foundations & Python for AI',
      description: 'Master multivariable calculus, matrix algebra, and vectorized tensor calculations in Python.',
      tasks: [
        {
          id: 'task-ai-1-1',
          stageId: 'stage-ai-1',
          topic: 'Multivariable Calculus & Linear Algebra for AI',
          description: 'Matrix multiplication, eigenvalues, dot products, gradients, partial derivatives, and chain rule computations.',
          relevanceToRole: 'Essential mathematical language governing neural network weights and optimization.',
          estimatedDuration: '10 hours',
          difficulty: 'Beginner',
          resourceName: '3Blue1Brown — Essence of Linear Algebra & Neural Networks',
          resourceUrl: 'https://www.3blue1brown.com/topics/linear-algebra',
          isFreeResource: true,
          isCompleted: false
        },
        {
          id: 'task-ai-1-2',
          stageId: 'stage-ai-1',
          topic: 'PyTorch Tensor Fundamentals & GPU Acceleration',
          description: 'Initialize multi-dimensional tensors, understand autograd gradient tracking, and run tensor ops on CUDA devices.',
          relevanceToRole: 'Core modern deep learning framework across industry and research.',
          estimatedDuration: '8 hours',
          difficulty: 'Beginner',
          resourceName: 'PyTorch Official Getting Started Tutorials',
          resourceUrl: 'https://pytorch.org/tutorials/beginner/basics/intro.html',
          isFreeResource: true,
          isCompleted: false
        }
      ]
    },
    {
      id: 'stage-ai-2',
      stageNumber: 2,
      title: 'Machine Learning Fundamentals & Optimization',
      description: 'Understand objective loss functions, empirical risk minimization, and gradient descent algorithms.',
      tasks: [
        {
          id: 'task-ai-2-1',
          stageId: 'stage-ai-2',
          topic: 'Supervised Learning Algorithms & Cost Functions',
          description: 'Implement mean squared error, cross-entropy loss, regularization (L1/L2), and model bias-variance trade-offs.',
          relevanceToRole: 'Foundational principles underlying all deep learning training objectives.',
          estimatedDuration: '8 hours',
          difficulty: 'Intermediate',
          resourceName: 'Google Developers — Machine Learning Fundamentals',
          resourceUrl: 'https://developers.google.com/machine-learning/crash-course',
          isFreeResource: true,
          isCompleted: false
        },
        {
          id: 'task-ai-2-2',
          stageId: 'stage-ai-2',
          topic: 'Stochastic Gradient Descent & Optimizers',
          description: 'Master momentum, Adam, AdamW, learning rate schedules, and vanishing/exploding gradient prevention.',
          relevanceToRole: 'Crucial for training stable and convergent deep learning models.',
          estimatedDuration: '6 hours',
          difficulty: 'Intermediate',
          resourceName: 'DeepLearning.AI — Optimization Algorithms',
          resourceUrl: 'https://www.deeplearning.ai/',
          isFreeResource: true,
          isCompleted: false
        }
      ]
    },
    {
      id: 'stage-ai-3',
      stageNumber: 3,
      title: 'Neural Networks & Deep Learning Architectures',
      description: 'Design multi-layer perceptrons, convolutional neural nets, and sequential models in PyTorch.',
      tasks: [
        {
          id: 'task-ai-3-1',
          stageId: 'stage-ai-3',
          topic: 'Deep Feedforward Networks & Backpropagation',
          description: 'Construct PyTorch nn.Module architectures, apply ReLU/GELU activations, batch normalization, and dropout.',
          relevanceToRole: 'Core architecture for non-linear representation learning.',
          estimatedDuration: '10 hours',
          difficulty: 'Intermediate',
          resourceName: 'PyTorch Deep Learning with PyTorch Book',
          resourceUrl: 'https://pytorch.org/deep-learning-with-pytorch',
          isFreeResource: true,
          isCompleted: false
        },
        {
          id: 'task-ai-3-2',
          stageId: 'stage-ai-3',
          topic: 'Convolutional Networks & Computer Vision',
          description: 'Build 2D convolution filters, pooling layers, residual connections (ResNet), and transfer learning.',
          relevanceToRole: 'Standard architecture for image classification and feature extraction.',
          estimatedDuration: '10 hours',
          difficulty: 'Advanced',
          resourceName: 'CS231n — Convolutional Neural Networks for Visual Recognition',
          resourceUrl: 'https://cs231n.github.io/',
          isFreeResource: true,
          isCompleted: false
        }
      ]
    },
    {
      id: 'stage-ai-4',
      stageNumber: 4,
      title: 'Transformers, Foundation Models & Generative AI',
      description: 'Master multi-head attention, LLM prompting, vector embeddings, and Retrieval-Augmented Generation (RAG).',
      tasks: [
        {
          id: 'task-ai-4-1',
          stageId: 'stage-ai-4',
          topic: 'Transformer Architecture & Attention Mechanisms',
          description: 'Understand self-attention, positional encoding, encoder-decoder blocks, and tokenization.',
          relevanceToRole: 'The dominant architecture powering modern LLMs and vision transformers.',
          estimatedDuration: '12 hours',
          difficulty: 'Advanced',
          resourceName: 'The Illustrated Transformer by Jay Alammar',
          resourceUrl: 'https://jalammar.github.io/illustrated-transformer/',
          isFreeResource: true,
          isCompleted: false
        },
        {
          id: 'task-ai-4-2',
          stageId: 'stage-ai-4',
          topic: 'Retrieval-Augmented Generation (RAG) & Vector Databases',
          description: 'Build semantic search pipelines using vector embeddings, chunking strategies, and grounding LLMs against external knowledge.',
          relevanceToRole: 'Most in-demand enterprise generative AI engineering pattern.',
          estimatedDuration: '10 hours',
          difficulty: 'Advanced',
          resourceName: 'LangChain & LlamaIndex Official Documentation',
          resourceUrl: 'https://docs.langchain.com/',
          isFreeResource: true,
          isCompleted: false
        }
      ]
    },
    {
      id: 'stage-ai-5',
      stageNumber: 5,
      title: 'Applied AI Systems & Capstone Project',
      description: 'Engineer production AI agent workflows, model safety guardrails, and cloud deployment.',
      tasks: [
        {
          id: 'task-ai-5-1',
          stageId: 'stage-ai-5',
          topic: 'AI Agent Workflows & Function Calling',
          description: 'Construct autonomous agent loops with tool usage, structured JSON schemas, and error recovery.',
          relevanceToRole: 'Prepares engineers for agentic AI product systems.',
          estimatedDuration: '8 hours',
          difficulty: 'Advanced',
          resourceName: 'Google Gemini API Developer Guide',
          resourceUrl: 'https://ai.google.dev/gemini-api/docs',
          isFreeResource: true,
          isCompleted: false
        },
        {
          id: 'task-ai-5-2',
          stageId: 'stage-ai-5',
          topic: 'Capstone: End-to-End Enterprise AI Application',
          description: 'Deploy a multimodal or RAG-powered application with API endpoints and evaluation benchmarking. Submit repo to Skill Passport.',
          relevanceToRole: 'Provides concrete project evidence for recruiter discovery.',
          estimatedDuration: '20 hours',
          difficulty: 'Advanced',
          resourceName: 'Hugging Face Spaces & Gradio Deployment Guide',
          resourceUrl: 'https://huggingface.co/docs/hub/spaces',
          isFreeResource: true,
          isCompleted: false
        }
      ]
    }
  ]
};

// 3. CYBERSECURITY ROADMAP
export const cybersecurityRoadmap: StudentRoadmap = {
  targetRole: 'Cybersecurity Analyst',
  overallProgress: 0,
  recommendedNextTaskId: 'task-sec-1-1',
  stages: [
    {
      id: 'stage-sec-1',
      stageNumber: 1,
      title: 'Computer Networking & Linux Systems',
      description: 'Master TCP/IP protocol suite, packet inspection with Wireshark, and defensive Linux administration.',
      tasks: [
        {
          id: 'task-sec-1-1',
          stageId: 'stage-sec-1',
          topic: 'TCP/IP Architecture & Network Packet Analysis',
          description: 'Understand IP addressing, subnetting, TCP 3-way handshake, DNS, ARP, and analyze live pcap files using Wireshark.',
          relevanceToRole: 'Essential foundation for analyzing network traffic and detecting intrusions.',
          estimatedDuration: '8 hours',
          difficulty: 'Beginner',
          resourceName: 'Wireshark Official User Guide & Sample Captures',
          resourceUrl: 'https://www.wireshark.org/docs/',
          isFreeResource: true,
          isCompleted: false
        },
        {
          id: 'task-sec-1-2',
          stageId: 'stage-sec-1',
          topic: 'Linux Security Administration & Shell Scripting',
          description: 'File permissions (chmod/chown), sudo configuration, SSH key management, systemd services, and Bash automation.',
          relevanceToRole: 'Most critical infrastructure and server fleets run on hardened Linux distros.',
          estimatedDuration: '8 hours',
          difficulty: 'Beginner',
          resourceName: 'Linux Foundation — Introduction to Linux',
          resourceUrl: 'https://www.linux.org/',
          isFreeResource: true,
          isCompleted: false
        }
      ]
    },
    {
      id: 'stage-sec-2',
      stageNumber: 2,
      title: 'Security Fundamentals, Cryptography & Identity',
      description: 'Grasp symmetric/asymmetric encryption, Public Key Infrastructure (PKI), and Zero Trust access models.',
      tasks: [
        {
          id: 'task-sec-2-1',
          stageId: 'stage-sec-2',
          topic: 'Applied Cryptography & Digital Certificates',
          description: 'AES encryption, RSA key pairs, SHA-256 hashing, TLS handshake, SSL certificate validation, and digital signatures.',
          relevanceToRole: 'Underpins data at rest encryption and confidential communications.',
          estimatedDuration: '7 hours',
          difficulty: 'Intermediate',
          resourceName: 'NIST Computer Security Resource Center — Cryptography Standards',
          resourceUrl: 'https://csrc.nist.gov/',
          isFreeResource: true,
          isCompleted: false
        },
        {
          id: 'task-sec-2-2',
          stageId: 'stage-sec-2',
          topic: 'Identity & Access Management (IAM) & Zero Trust',
          description: 'Multi-Factor Authentication (MFA), OAuth2/OIDC protocols, Role-Based Access Control (RBAC), and least-privilege principles.',
          relevanceToRole: 'Mitigates identity-based lateral movements and credential stuffing.',
          estimatedDuration: '6 hours',
          difficulty: 'Intermediate',
          resourceName: 'CISA Zero Trust Maturity Model Guide',
          resourceUrl: 'https://www.cisa.gov/zero-trust-maturity-model',
          isFreeResource: true,
          isCompleted: false
        }
      ]
    },
    {
      id: 'stage-sec-3',
      stageNumber: 3,
      title: 'Threat Analysis & Vulnerability Assessment',
      description: 'Investigate OWASP Top 10 web vulnerabilities, port scanning with Nmap, and CVSS severity scoring.',
      tasks: [
        {
          id: 'task-sec-3-1',
          stageId: 'stage-sec-3',
          topic: 'OWASP Top 10 Web Application Vulnerabilities',
          description: 'Analyze SQL injection, Cross-Site Scripting (XSS), Broken Object Level Authorization (BOLA), and SSRF attacks.',
          relevanceToRole: 'Industry benchmark for application security auditing and remediation.',
          estimatedDuration: '10 hours',
          difficulty: 'Intermediate',
          resourceName: 'OWASP Top 10 Official Documentation & Cheat Sheets',
          resourceUrl: 'https://owasp.org/www-project-top-ten/',
          isFreeResource: true,
          isCompleted: false
        },
        {
          id: 'task-sec-3-2',
          stageId: 'stage-sec-3',
          topic: 'Network Reconnaissance & Vulnerability Scanning',
          description: 'Perform active network discovery using Nmap flags, enumerate service versions, and score CVE vulnerabilities.',
          relevanceToRole: 'Core routine for vulnerability management and attack surface reduction.',
          estimatedDuration: '8 hours',
          difficulty: 'Intermediate',
          resourceName: 'Nmap Network Scanning — Official Guide by Gordon Lyon',
          resourceUrl: 'https://nmap.org/book/',
          isFreeResource: true,
          isCompleted: false
        }
      ]
    },
    {
      id: 'stage-sec-4',
      stageNumber: 4,
      title: 'Defensive Security & Security Operations (SOC)',
      description: 'Configure Security Information and Event Management (SIEM), write intrusion detection rules, and incident handling.',
      tasks: [
        {
          id: 'task-sec-4-1',
          stageId: 'stage-sec-4',
          topic: 'SIEM Log Analysis & Threat Hunting',
          description: 'Parse syslog, auth logs, Windows Event Logs (4624/4625), and detect suspicious anomaly patterns with Elastic/Splunk.',
          relevanceToRole: 'Day-to-day workflow for Tier 1 & Tier 2 SOC security analysts.',
          estimatedDuration: '10 hours',
          difficulty: 'Advanced',
          resourceName: 'Splunk / Elastic Security Community Guides',
          resourceUrl: 'https://www.elastic.co/guide/en/security/current/index.html',
          isFreeResource: true,
          isCompleted: false
        },
        {
          id: 'task-sec-4-2',
          stageId: 'stage-sec-4',
          topic: 'Intrusion Detection & Incident Response',
          description: 'Author Suricata/Snort signature rules, block malicious IPs with iptables, and execute 6-step incident containment.',
          relevanceToRole: 'Essential for stopping live breach exploitation and preserving forensic chains of custody.',
          estimatedDuration: '8 hours',
          difficulty: 'Advanced',
          resourceName: 'SANS Incident Handler\'s Handbook',
          resourceUrl: 'https://www.sans.org/',
          isFreeResource: true,
          isCompleted: false
        }
      ]
    },
    {
      id: 'stage-sec-5',
      stageNumber: 5,
      title: 'Practical Security Auditing & Capstone Project',
      description: 'Perform an end-to-end security audit, generate executive remediation reports, and document verified evidence.',
      tasks: [
        {
          id: 'task-sec-5-1',
          stageId: 'stage-sec-5',
          topic: 'Capstone: Infrastructure Security Audit & Hardening Report',
          description: 'Conduct a comprehensive vulnerability assessment and CIS benchmark hardening audit of a simulated corporate network. Submit formal report to Skill Passport.',
          relevanceToRole: 'Demonstrates tangible defensive analytical capability to cybersecurity hiring teams.',
          estimatedDuration: '18 hours',
          difficulty: 'Advanced',
          resourceName: 'CIS Benchmarks & Hardening Guidelines',
          resourceUrl: 'https://www.cisecurity.org/cis-benchmarks',
          isFreeResource: true,
          isCompleted: false
        }
      ]
    }
  ]
};

// 4. DATA SCIENCE ROADMAP
export const dataScienceRoadmap: StudentRoadmap = {
  targetRole: 'Data Scientist',
  overallProgress: 0,
  recommendedNextTaskId: 'task-ds-1-1',
  stages: [
    {
      id: 'stage-ds-1',
      stageNumber: 1,
      title: 'Python Programming & SQL Data Foundations',
      description: 'Master data querying, relational database design, joins, aggregations, and scientific Python syntax.',
      tasks: [
        {
          id: 'task-ds-1-1',
          stageId: 'stage-ds-1',
          topic: 'Advanced SQL Querying & Relational Analytics',
          description: 'Master multi-table JOINs, subqueries, Common Table Expressions (CTEs), and analytical window functions (RANK, DENSE_RANK, LAG, LEAD).',
          relevanceToRole: 'Primary interface for querying analytical warehouses (BigQuery, Snowflake, PostgreSQL).',
          estimatedDuration: '8 hours',
          difficulty: 'Beginner',
          resourceName: 'Mode Analytics — Advanced SQL Tutorial',
          resourceUrl: 'https://mode.com/sql-tutorial/',
          isFreeResource: true,
          isCompleted: false
        },
        {
          id: 'task-ds-1-2',
          stageId: 'stage-ds-1',
          topic: 'Python for Data Analysis with NumPy & Pandas',
          description: 'Dataframe operations, time-series indexing, vectorized column transforms, and parsing unstructured JSON records.',
          relevanceToRole: 'Standard toolset for in-memory analytical manipulation.',
          estimatedDuration: '8 hours',
          difficulty: 'Beginner',
          resourceName: 'Python Data Science Handbook by Jake VanderPlas',
          resourceUrl: 'https://jakevdp.github.io/PythonDataScienceHandbook/',
          isFreeResource: true,
          isCompleted: false
        }
      ]
    },
    {
      id: 'stage-ds-2',
      stageNumber: 2,
      title: 'Statistical Inference & Probability Analysis',
      description: 'Learn experimental design, A/B testing methods, sampling biases, and hypothesis testing.',
      tasks: [
        {
          id: 'task-ds-2-1',
          stageId: 'stage-ds-2',
          topic: 'Hypothesis Testing & Experimental Design (A/B Testing)',
          description: 'Null hypothesis, t-tests, ANOVA, Chi-square tests, Type I & Type II error management, and sample size power calculations.',
          relevanceToRole: 'Essential for data-driven product decision-making and scientific rigor.',
          estimatedDuration: '9 hours',
          difficulty: 'Intermediate',
          resourceName: 'StatQuest with Josh Starmer — Statistics Fundamentals',
          resourceUrl: 'https://statquest.org/',
          isFreeResource: true,
          isCompleted: false
        }
      ]
    },
    {
      id: 'stage-ds-3',
      stageNumber: 3,
      title: 'Data Cleaning, Wrangling & Feature Engineering',
      description: 'Handle messy datasets, missing data imputation, outlier detection, and categorical encoders.',
      tasks: [
        {
          id: 'task-ds-3-1',
          stageId: 'stage-ds-3',
          topic: 'Data Quality & Feature Engineering Techniques',
          description: 'Target encoding, one-hot encoding, feature scaling (StandardScaler, MinMaxScaler), handling skewed data with log transforms.',
          relevanceToRole: 'Data scientists spend over 70% of their workflow preparing quality feature sets.',
          estimatedDuration: '8 hours',
          difficulty: 'Intermediate',
          resourceName: 'Feature Engineering for Machine Learning Guide',
          resourceUrl: 'https://github.com',
          isFreeResource: true,
          isCompleted: false
        }
      ]
    },
    {
      id: 'stage-ds-4',
      stageNumber: 4,
      title: 'Exploratory Data Visualization & BI Storytelling',
      description: 'Construct informative charts, communicate analytical findings, and build interactive dashboards.',
      tasks: [
        {
          id: 'task-ds-4-1',
          stageId: 'stage-ds-4',
          topic: 'Statistical Visualization with Plotly & Seaborn',
          description: 'Construct interactive choropleths, facet grids, heatmaps, and violin distributions for exploratory analysis.',
          relevanceToRole: 'Crucial for uncovering complex feature relationships.',
          estimatedDuration: '7 hours',
          difficulty: 'Intermediate',
          resourceName: 'Plotly Python Documentation & Examples',
          resourceUrl: 'https://plotly.com/python/',
          isFreeResource: true,
          isCompleted: false
        }
      ]
    },
    {
      id: 'stage-ds-5',
      stageNumber: 5,
      title: 'Predictive Modeling & Portfolio Capstone',
      description: 'Train predictive models, interpret features with SHAP, and publish end-to-end data analysis.',
      tasks: [
        {
          id: 'task-ds-5-1',
          stageId: 'stage-ds-5',
          topic: 'Capstone: End-to-End Predictive Analytics & Storytelling Case Study',
          description: 'Acquire real-world data, perform exploratory analysis, train validated predictive models, and publish an executive analytical report to Skill Passport.',
          relevanceToRole: 'Provides concrete proof of analytical acumen to hiring organizations.',
          estimatedDuration: '18 hours',
          difficulty: 'Advanced',
          resourceName: 'Kaggle Learn — Data Science Micro-Courses',
          resourceUrl: 'https://www.kaggle.com/learn',
          isFreeResource: true,
          isCompleted: false
        }
      ]
    }
  ]
};

// 5. CLOUD COMPUTING & DEVOPS ROADMAP
export const cloudDevopsRoadmap: StudentRoadmap = {
  targetRole: 'Cloud Engineer',
  overallProgress: 0,
  recommendedNextTaskId: 'task-cld-1-1',
  stages: [
    {
      id: 'stage-cld-1',
      stageNumber: 1,
      title: 'Linux Systems, Networking & Git Workflows',
      description: 'Master command-line administration, bash scripting, subnetting, and collaborative version control.',
      tasks: [
        {
          id: 'task-cld-1-1',
          stageId: 'stage-cld-1',
          topic: 'Linux Automation & Bash Shell Scripting',
          description: 'Cron jobs, process management (ps/top), pipe filtering (grep/awk/sed), and automated deployment scripts.',
          relevanceToRole: 'Core operational runtime for cloud virtual machines and container workers.',
          estimatedDuration: '8 hours',
          difficulty: 'Beginner',
          resourceName: 'Linux Command Line Book & Tutorial',
          resourceUrl: 'https://linuxcommand.org/',
          isFreeResource: true,
          isCompleted: false
        },
        {
          id: 'task-cld-1-2',
          stageId: 'stage-cld-1',
          topic: 'Cloud Networking & VPC Architecture',
          description: 'IP CIDR blocks, public vs private subnets, NAT gateways, route tables, security groups, and DNS routing.',
          relevanceToRole: 'Essential backbone connecting cloud microservices securely.',
          estimatedDuration: '8 hours',
          difficulty: 'Beginner',
          resourceName: 'AWS / GCP Cloud Networking Architecture Whitepapers',
          resourceUrl: 'https://cloud.google.com/architecture',
          isFreeResource: true,
          isCompleted: false
        }
      ]
    },
    {
      id: 'stage-cld-2',
      stageNumber: 2,
      title: 'Cloud Infrastructure & Core Services',
      description: 'Deploy scalable compute, managed databases, object storage, and IAM policies.',
      tasks: [
        {
          id: 'stage-cld-2-1',
          stageId: 'stage-cld-2',
          topic: 'Cloud Compute, Storage & Managed Services',
          description: 'Virtual machines, object storage buckets (S3/GCS), relational databases, and auto-scaling groups.',
          relevanceToRole: 'Foundational services composing cloud-native application architectures.',
          estimatedDuration: '10 hours',
          difficulty: 'Intermediate',
          resourceName: 'Google Cloud Free Tier Training & Documentation',
          resourceUrl: 'https://cloud.google.com/docs',
          isFreeResource: true,
          isCompleted: false
        }
      ]
    },
    {
      id: 'stage-cld-3',
      stageNumber: 3,
      title: 'Containerization & Microservices with Docker',
      description: 'Build lightweight, reproducible container images and orchestrate local services with Docker Compose.',
      tasks: [
        {
          id: 'task-cld-3-1',
          stageId: 'stage-cld-3',
          topic: 'Docker Containers & Multi-Stage Builds',
          description: 'Author optimized Dockerfiles, manage layers, configure container networking, volumes, and multi-stage build caching.',
          relevanceToRole: 'Standard unit of modern software packaging and cloud execution.',
          estimatedDuration: '8 hours',
          difficulty: 'Intermediate',
          resourceName: 'Docker Official Getting Started Guides',
          resourceUrl: 'https://docs.docker.com/get-started/',
          isFreeResource: true,
          isCompleted: false
        }
      ]
    },
    {
      id: 'stage-cld-4',
      stageNumber: 4,
      title: 'Infrastructure as Code (IaC) & CI/CD Automation',
      description: 'Provision reproducible cloud environments with Terraform and automate pipelines using GitHub Actions.',
      tasks: [
        {
          id: 'task-cld-4-1',
          stageId: 'stage-cld-4',
          topic: 'Infrastructure as Code (IaC) with Terraform',
          description: 'HCL syntax, state management, provider configuration, reusable modules, and plan/apply workflows.',
          relevanceToRole: 'Eliminates configuration drift and guarantees declarative cloud infrastructure.',
          estimatedDuration: '10 hours',
          difficulty: 'Advanced',
          resourceName: 'HashiCorp Terraform Tutorials',
          resourceUrl: 'https://developer.hashicorp.com/terraform/tutorials',
          isFreeResource: true,
          isCompleted: false
        },
        {
          id: 'task-cld-4-2',
          stageId: 'stage-cld-4',
          topic: 'CI/CD Pipelines with GitHub Actions',
          description: 'Build automated continuous integration workflows: linting, unit testing, container registry push, and automated deployment.',
          relevanceToRole: 'Automates deployment lifecycle and accelerates release cycles.',
          estimatedDuration: '8 hours',
          difficulty: 'Advanced',
          resourceName: 'GitHub Actions Official Documentation',
          resourceUrl: 'https://docs.github.com/en/actions',
          isFreeResource: true,
          isCompleted: false
        }
      ]
    },
    {
      id: 'stage-cld-5',
      stageNumber: 5,
      title: 'Container Orchestration & Observability Capstone',
      description: 'Deploy Kubernetes clusters, setup Prometheus & Grafana monitoring, and publish project evidence.',
      tasks: [
        {
          id: 'task-cld-5-1',
          stageId: 'stage-cld-5',
          topic: 'Capstone: Production Kubernetes Cluster & Observability Pipeline',
          description: 'Deploy a containerized microservice onto Kubernetes with ingress, secrets, health probes, and Prometheus monitoring. Submit repository to Skill Passport.',
          relevanceToRole: 'Proves enterprise cloud reliability and DevOps competence to recruiters.',
          estimatedDuration: '20 hours',
          difficulty: 'Advanced',
          resourceName: 'Kubernetes Official Documentation & Interactive Tutorials',
          resourceUrl: 'https://kubernetes.io/docs/tutorials/',
          isFreeResource: true,
          isCompleted: false
        }
      ]
    }
  ]
};

// 6. MOBILE APP DEVELOPMENT ROADMAP
export const mobileDevRoadmap: StudentRoadmap = {
  targetRole: 'Mobile App Developer',
  overallProgress: 0,
  recommendedNextTaskId: 'task-mob-1-1',
  stages: [
    {
      id: 'stage-mob-1',
      stageNumber: 1,
      title: 'Mobile Programming Fundamentals & UI Patterns',
      description: 'Master component-driven mobile UI principles, layout constraints, and mobile gestures.',
      tasks: [
        {
          id: 'task-mob-1-1',
          stageId: 'stage-mob-1',
          topic: 'Modern TypeScript & Mobile UI Design Patterns',
          description: 'Understand component lifecycles, flexbox layouts for mobile viewports, theme palettes, and touch event handling.',
          relevanceToRole: 'Fundamental basis for building clean cross-platform mobile apps.',
          estimatedDuration: '7 hours',
          difficulty: 'Beginner',
          resourceName: 'React Native Core Fundamentals',
          resourceUrl: 'https://reactnative.dev/docs/getting-started',
          isFreeResource: true,
          isCompleted: false
        }
      ]
    },
    {
      id: 'stage-mob-2',
      stageNumber: 2,
      title: 'Cross-Platform Framework & Navigation Architecture',
      description: 'Build screen hierarchies, stack navigators, tab bars, and responsive layouts.',
      tasks: [
        {
          id: 'task-mob-2-1',
          stageId: 'stage-mob-2',
          topic: 'Navigation Stacks, Tabs & Deep Linking',
          description: 'Implement React Navigation / Flutter Navigator with parameter passing, modal presentations, and deep link routing.',
          relevanceToRole: 'Essential for intuitive user flow between app screens.',
          estimatedDuration: '8 hours',
          difficulty: 'Intermediate',
          resourceName: 'React Navigation Documentation',
          resourceUrl: 'https://reactnavigation.org/docs/getting-started',
          isFreeResource: true,
          isCompleted: false
        }
      ]
    },
    {
      id: 'stage-mob-3',
      stageNumber: 3,
      title: 'REST API Integration, State & Offline Storage',
      description: 'Handle background network requests, manage global client state, and cache data in SQLite/AsyncStorage.',
      tasks: [
        {
          id: 'task-mob-3-1',
          stageId: 'stage-mob-3',
          topic: 'API Networking, Offline Caching & Local SQLite',
          description: 'Integrate REST/GraphQL endpoints, handle optimistic updates, and persist offline state with SQLite / MMKV.',
          relevanceToRole: 'Guarantees reliable app performance under intermittent network connectivity.',
          estimatedDuration: '9 hours',
          difficulty: 'Intermediate',
          resourceName: 'Expo SQLite & Storage Guides',
          resourceUrl: 'https://docs.expo.dev/versions/latest/sdk/sqlite/',
          isFreeResource: true,
          isCompleted: false
        }
      ]
    },
    {
      id: 'stage-mob-4',
      stageNumber: 4,
      title: 'Device Hardware APIs & Push Notifications',
      description: 'Integrate native device sensors: camera, geolocation, biometrics, and push notifications.',
      tasks: [
        {
          id: 'task-mob-4-1',
          stageId: 'stage-mob-4',
          topic: 'Native Sensors, Geolocation & Push Notifications',
          description: 'Request device permissions, capture camera photos, stream GPS coordinates, and handle APNs / FCM push notifications.',
          relevanceToRole: 'Differentiates rich native apps from simple mobile websites.',
          estimatedDuration: '8 hours',
          difficulty: 'Advanced',
          resourceName: 'Expo Notifications & Native Modules Guide',
          resourceUrl: 'https://docs.expo.dev/push-notifications/overview/',
          isFreeResource: true,
          isCompleted: false
        }
      ]
    },
    {
      id: 'stage-mob-5',
      stageNumber: 5,
      title: 'Mobile Testing, App Bundling & Capstone',
      description: 'Test mobile components with Jest, create production release builds, and deploy a full app.',
      tasks: [
        {
          id: 'task-mob-5-1',
          stageId: 'stage-mob-5',
          topic: 'Capstone: End-to-End Cross-Platform Mobile Application',
          description: 'Build, test, and package a feature-rich mobile app with auth, offline storage, and responsive UX. Submit repository to Skill Passport.',
          relevanceToRole: 'Authoritative proof-of-work required for mobile engineering roles.',
          estimatedDuration: '18 hours',
          difficulty: 'Advanced',
          resourceName: 'React Native Publishing Guide',
          resourceUrl: 'https://reactnative.dev/docs/publishing-to-app-store',
          isFreeResource: true,
          isCompleted: false
        }
      ]
    }
  ]
};

// 7. SOFTWARE ENGINEERING ROADMAP
export const softwareEngRoadmap: StudentRoadmap = {
  targetRole: 'Software Development Engineer (SDE)',
  overallProgress: 0,
  recommendedNextTaskId: 'task-sde-1-1',
  stages: [
    {
      id: 'stage-sde-1',
      stageNumber: 1,
      title: 'Data Structures, Algorithms & Computational Complexity',
      description: 'Master time/space complexity analysis, arrays, hash maps, trees, and graphs.',
      tasks: [
        {
          id: 'task-sde-1-1',
          stageId: 'stage-sde-1',
          topic: 'Data Structures & Algorithmic Problem Solving',
          description: 'Binary search, two-pointer arrays, recursion, dynamic programming, and Big-O computational bounds.',
          relevanceToRole: 'Standard technical benchmark for product engineering and technical interviews.',
          estimatedDuration: '12 hours',
          difficulty: 'Intermediate',
          resourceName: 'NeetCode Roadmap & DSA Practice',
          resourceUrl: 'https://neetcode.io/roadmap',
          isFreeResource: true,
          isCompleted: false
        }
      ]
    },
    {
      id: 'stage-sde-2',
      stageNumber: 2,
      title: 'Object-Oriented Design & Clean Architecture',
      description: 'Apply SOLID design principles, modular patterns, and clean code conventions.',
      tasks: [
        {
          id: 'task-sde-2-1',
          stageId: 'stage-sde-2',
          topic: 'SOLID Principles & Software Design Patterns',
          description: 'Factory pattern, singleton, strategy pattern, dependency injection, and interface segregation.',
          relevanceToRole: 'Prevents technical debt in large-scale multi-engineer software codebases.',
          estimatedDuration: '8 hours',
          difficulty: 'Intermediate',
          resourceName: 'Refactoring.Guru — Design Patterns',
          resourceUrl: 'https://refactoring.guru/design-patterns',
          isFreeResource: true,
          isCompleted: false
        }
      ]
    },
    {
      id: 'stage-sde-3',
      stageNumber: 3,
      title: 'Automated Testing, CI/CD & Systems Capstone',
      description: 'Unit testing, integration test suites, and building a scalable software application.',
      tasks: [
        {
          id: 'task-sde-3-1',
          stageId: 'stage-sde-3',
          topic: 'Capstone: High-Performance Distributed SDE System',
          description: 'Design and build an extensible software system featuring automated tests, clean architecture, and modular APIs. Submit repository to Skill Passport.',
          relevanceToRole: 'Demonstrates professional software engineering discipline to recruiters.',
          estimatedDuration: '18 hours',
          difficulty: 'Advanced',
          resourceName: 'System Design Primer by Donne Martin',
          resourceUrl: 'https://github.com/donnemartin/system-design-primer',
          isFreeResource: true,
          isCompleted: false
        }
      ]
    }
  ]
};

// 9. WEB DEVELOPMENT ROADMAP (Full-Stack Developer)
export const webDevRoadmap: StudentRoadmap = {
  targetRole: 'Full-Stack Developer',
  overallProgress: 0,
  recommendedNextTaskId: 'task-1-1',
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
          isCompleted: false
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
          isCompleted: false
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
          isCompleted: false
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
          isCompleted: false
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
          isCompleted: false
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

// ============================================================================
// REGISTRY MAP
// ============================================================================

export const canonicalDomainRoadmaps: Record<string, StudentRoadmap> = {
  'web-dev': webDevRoadmap,
  'machine-learning': machineLearningRoadmap,
  'artificial-intelligence': artificialIntelligenceRoadmap,
  'cybersecurity': cybersecurityRoadmap,
  'data-science': dataScienceRoadmap,
  'cloud-devops': cloudDevopsRoadmap,
  'mobile-dev': mobileDevRoadmap,
  'software-eng': softwareEngRoadmap
};

/**
 * Data-backed personalization engine:
 * Cross-references assessment scores, diagnostic skill gaps, and role benchmarks
 * to adapt roadmap tasks without wiping student completion progress.
 */
export const personalizeRoadmapWithAssessmentAndGaps = (
  roadmap: StudentRoadmap,
  skillGaps?: SkillGapItem[],
  assessmentHistory?: AssessmentResult[],
  activeRole?: string
): StudentRoadmap => {
  const role = activeRole || roadmap.targetRole || '';
  const resolved = resolveDomainTrack(role);

  // Find latest matching assessment attempt for this track/domain
  const matchingAssessment = assessmentHistory?.find(a => {
    if (a.domainId && (a.domainId === resolved.domainId || a.domainId === resolved.trackKey)) return true;
    if (a.targetRole && a.targetRole.toLowerCase() === role.toLowerCase()) return true;
    const aTrack = resolveDomainTrack(a.targetRole || a.domainId);
    return aTrack.trackKey === resolved.trackKey;
  });

  const highPriorityGaps = (skillGaps || []).filter(g => g.priority === 'High' || g.priority === 'Medium');
  const roleReqs = getRoleRequirements(role);
  const benchmarkMap = new Map<string, number>();
  if (roleReqs?.requiredSkills) {
    roleReqs.requiredSkills.forEach(s => {
      benchmarkMap.set(s.skillName.toLowerCase(), s.requiredProficiency * 20); // 1-5 scale -> 20-100%
    });
  }

  let foundRecommendedTaskId = '';
  let priorityGapCount = 0;
  let strongSkillsCount = 0;

  const updatedStages: RoadmapStage[] = roadmap.stages.map(stage => {
    const updatedTasks: RoadmapTask[] = stage.tasks.map(task => {
      const topicLower = task.topic.toLowerCase();
      const descLower = task.description.toLowerCase();

      // Check matched skill gap
      const matchedGap = highPriorityGaps.find(g => {
        const sName = g.skillName.toLowerCase();
        return topicLower.includes(sName) || sName.includes(topicLower) || descLower.includes(sName);
      });

      // Check assessment skill score
      let assessedScore: number | undefined;
      if (matchingAssessment?.skillScores && matchingAssessment.skillScores.length > 0) {
        const matchedScoreObj = matchingAssessment.skillScores.find(s => {
          const sName = s.skillName.toLowerCase();
          return topicLower.includes(sName) || sName.includes(topicLower) || descLower.includes(sName);
        });
        if (matchedScoreObj) assessedScore = matchedScoreObj.score;
      }

      // Check category score fallback
      if (assessedScore === undefined && matchingAssessment?.categoryScores) {
        const matchedCat = matchingAssessment.categoryScores.find(c => {
          const cName = c.category.toLowerCase();
          return topicLower.includes(cName) || descLower.includes(cName);
        });
        if (matchedCat) assessedScore = matchedCat.score;
      }

      // Check role benchmark target
      let benchmarkTarget: number | undefined;
      for (const [sKey, bVal] of benchmarkMap.entries()) {
        if (topicLower.includes(sKey) || sKey.includes(topicLower)) {
          benchmarkTarget = bVal;
          break;
        }
      }
      if (!benchmarkTarget) benchmarkTarget = 70; // baseline 70%

      const hasAssessment = Boolean(matchingAssessment);
      const isPriorityGap = Boolean(matchedGap) || (hasAssessment && assessedScore !== undefined && assessedScore < benchmarkTarget);
      const isBenchmarkMet = hasAssessment && assessedScore !== undefined && assessedScore >= benchmarkTarget;

      if (isPriorityGap) priorityGapCount++;
      if (isBenchmarkMet) strongSkillsCount++;

      if (isPriorityGap && !task.isCompleted && !foundRecommendedTaskId) {
        foundRecommendedTaskId = task.id;
      }

      // Supply hands-on practical prompt if not present
      let practicePrompt = task.practicePrompt;
      if (!practicePrompt) {
        if (topicLower.includes('html') || topicLower.includes('markup') || topicLower.includes('accessibility')) {
          practicePrompt = 'Build an accessible form adhering to WAI-ARIA authoring practices, explicit form labels, and keyboard tab order.';
        } else if (topicLower.includes('css') || topicLower.includes('flexbox') || topicLower.includes('grid')) {
          practicePrompt = 'Implement a dynamic multi-breakpoint responsive dashboard using CSS Grid auto-fit and Flexbox layouts without UI libraries.';
        } else if (topicLower.includes('javascript') || topicLower.includes('es6')) {
          practicePrompt = 'Create an async request dispatcher with Promise.allSettled and exponential backoff retry for network resilience.';
        } else if (topicLower.includes('react') || topicLower.includes('state')) {
          practicePrompt = 'Construct a state-driven component with optimistic local updates, error rollback, and custom hook encapsulation.';
        } else if (topicLower.includes('typescript')) {
          practicePrompt = 'Define generic discriminating union types and strict zod validator schemas for type-safe API communication.';
        } else if (topicLower.includes('node') || topicLower.includes('express')) {
          practicePrompt = 'Implement a REST controller with JWT bearer token verification middleware, rate limiting, and centralized error handling.';
        } else if (topicLower.includes('sql') || topicLower.includes('database')) {
          practicePrompt = 'Write a normalized relational schema with foreign key constraints, composite index, and an analytical aggregation query.';
        } else if (topicLower.includes('capstone') || topicLower.includes('project')) {
          practicePrompt = 'Develop and deploy an end-to-end full stack application, write integration tests, and submit repository URL for passport verification.';
        } else {
          practicePrompt = `Complete a practical code challenge demonstrating production-quality implementation of ${task.topic}.`;
        }
      }

      const isProjectEligible =
        task.topic.toLowerCase().includes('capstone') ||
        task.topic.toLowerCase().includes('project') ||
        stage.title.toLowerCase().includes('capstone') ||
        stage.stageNumber >= 5;

      return {
        ...task,
        prioritySkillGap: isPriorityGap,
        benchmarkMet: isBenchmarkMet,
        isStrong: isBenchmarkMet,
        diagnosticScore: assessedScore,
        benchmarkTargetScore: benchmarkTarget,
        relatedSkill: matchedGap?.skillName || task.relatedSkill,
        whyThisTask: isPriorityGap
          ? (assessedScore !== undefined ? `Verified diagnostic gap: Scored ${assessedScore}% vs ${benchmarkTarget}% benchmark.` : 'Priority skill gap identified for target role.')
          : (isBenchmarkMet ? `Demonstrated competency: Scored ${assessedScore}% (Role benchmark ${benchmarkTarget}% met).` : task.whyThisTask),
        practicePrompt,
        projectSubmissionEligible: isProjectEligible,
        resourceType: isProjectEligible ? ('project' as const) : (task.resourceUrl.includes('github') ? ('interactive' as const) : ('documentation' as const))
      };
    });

    return {
      ...stage,
      tasks: updatedTasks
    };
  });

  if (!foundRecommendedTaskId) {
    for (const stage of updatedStages) {
      const firstIncomplete = stage.tasks.find(t => !t.isCompleted);
      if (firstIncomplete) {
        foundRecommendedTaskId = firstIncomplete.id;
        break;
      }
    }
  }

  const isPersonalized = Boolean(matchingAssessment);

  return {
    ...roadmap,
    stages: updatedStages,
    recommendedNextTaskId: foundRecommendedTaskId || roadmap.recommendedNextTaskId,
    isPersonalized,
    hasAssessmentData: Boolean(matchingAssessment),
    assessmentDate: matchingAssessment?.completedAt,
    assessmentScore: matchingAssessment?.overallScore,
    assessmentId: matchingAssessment?.id,
    priorityGapCount,
    strongSkillsCount
  };
};

/**
 * Backward-compatible wrapper for prioritizeRoadmapTasksWithGaps.
 */
export const prioritizeRoadmapTasksWithGaps = (
  roadmap: StudentRoadmap,
  skillGaps?: SkillGapItem[]
): StudentRoadmap => {
  return personalizeRoadmapWithAssessmentAndGaps(roadmap, skillGaps);
};

/**
 * Returns a clean, cloned roadmap for the specified domain track or role.
 */
export const getDomainRoadmap = (
  domainOrRole: string,
  skillGaps?: SkillGapItem[]
): StudentRoadmap => {
  const resolved = resolveDomainTrack(domainOrRole);

  // Check if we have a structured domain roadmap for this track
  const baseTemplate = canonicalDomainRoadmaps[resolved.trackKey];

  if (baseTemplate) {
    const cloned: StudentRoadmap = {
      targetRole: resolved.canonicalRoleTitle,
      overallProgress: 0,
      recommendedNextTaskId: baseTemplate.stages[0]?.tasks[0]?.id || '',
      stages: baseTemplate.stages.map(stage => ({
        ...stage,
        tasks: stage.tasks.map(task => ({
          ...task,
          isCompleted: false
        }))
      }))
    };

    return prioritizeRoadmapTasksWithGaps(cloned, skillGaps);
  }

  // Dynamic tailored roadmap fallback using role requirements
  const reqs = getRoleRequirements(resolved.canonicalRoleTitle);
  const skillList = reqs.requiredSkills;

  const stage1Skills = skillList.slice(0, Math.ceil(skillList.length / 3));
  const stage2Skills = skillList.slice(Math.ceil(skillList.length / 3), Math.ceil((skillList.length * 2) / 3));
  const stage3Skills = skillList.slice(Math.ceil((skillList.length * 2) / 3));

  const roleSlug = resolved.canonicalRoleTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const stages: RoadmapStage[] = [
    {
      id: `stage-${roleSlug}-1`,
      stageNumber: 1,
      title: `${reqs.roleTitle} — Foundational Core`,
      description: `Master fundamental competencies and architectural principles required for ${reqs.roleTitle}.`,
      tasks: stage1Skills.map((s, idx) => ({
        id: `task-${roleSlug}-1-${idx + 1}`,
        stageId: `stage-${roleSlug}-1`,
        topic: s.skillName,
        description: s.whyItMatters,
        relevanceToRole: `Critical foundational skill (Target Level: ${s.requiredProficiency}/5).`,
        estimatedDuration: '6-8 hours',
        difficulty: 'Beginner' as const,
        resourceName: `Official Documentation for ${s.skillName}`,
        resourceUrl: 'https://roadmap.sh',
        isFreeResource: true,
        isCompleted: false
      }))
    },
    {
      id: `stage-${roleSlug}-2`,
      stageNumber: 2,
      title: `${reqs.roleTitle} — Advanced Systems & Engineering`,
      description: `Deepen expertise in specialized tooling, performance, and best practices.`,
      tasks: stage2Skills.map((s, idx) => ({
        id: `task-${roleSlug}-2-${idx + 1}`,
        stageId: `stage-${roleSlug}-2`,
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
      id: `stage-${roleSlug}-3`,
      stageNumber: 3,
      title: `${reqs.roleTitle} — Capstone Project & Skill Passport Verification`,
      description: `Synthesize skills into end-to-end verified portfolio artifacts and diagnostic proof.`,
      tasks: [
        ...stage3Skills.map((s, idx) => ({
          id: `task-${roleSlug}-3-${idx + 1}`,
          stageId: `stage-${roleSlug}-3`,
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
          id: `task-${roleSlug}-3-capstone`,
          stageId: `stage-${roleSlug}-3`,
          topic: `Capstone Project: Production ${reqs.roleTitle} System`,
          description: `Build and deploy an end-to-end project demonstrating key competencies required for ${reqs.roleTitle}. Submit repository link for Skill Passport evidence.`,
          relevanceToRole: `Provides verified project proof for recruiters and employers.`,
          estimatedDuration: '20-25 hours',
          difficulty: 'Advanced' as const,
          resourceName: 'SARATHI Project Verification Guide',
          resourceUrl: '/student/projects',
          isFreeResource: true,
          isCompleted: false
        }
      ]
    }
  ];

  const fallbackRoadmap: StudentRoadmap = {
    targetRole: reqs.roleTitle,
    overallProgress: 0,
    recommendedNextTaskId: stages[0]?.tasks[0]?.id || '',
    stages
  };

  return prioritizeRoadmapTasksWithGaps(fallbackRoadmap, skillGaps);
};
