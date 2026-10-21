import type { ProjectItem } from '../types/project';

export const initialStudentProjects: ProjectItem[] = [
  {
    id: 'proj-1',
    title: 'DevTracker — Developer Task & Skill Analytics',
    description: 'A responsive task tracking web app with skill analytics, productivity dashboards, drag-and-drop kanban board, and data visualization using React and Tailwind CSS.',
    technologies: ['React', 'TypeScript', 'Tailwind CSS', 'Recharts'],
    repositoryUrl: 'https://github.com/demo-student/devtracker-app',
    liveDemoUrl: 'https://devtracker-demo.vercel.app',
    skillsDemonstrated: ['React.js', 'TypeScript', 'HTML & CSS', 'Git & GitHub'],
    verificationStatus: 'verified',
    createdAt: '2026-09-10'
  },
  {
    id: 'proj-2',
    title: 'API Gateway & User Auth Service',
    description: 'Node.js and Express RESTful API gateway featuring JWT authentication, rate limiting middleware, PostgreSQL query pooling, and password encryption.',
    technologies: ['Node.js', 'Express', 'PostgreSQL', 'JWT', 'Docker'],
    repositoryUrl: 'https://github.com/demo-student/express-auth-gateway',
    liveDemoUrl: 'https://api-gateway-demo.render.com',
    skillsDemonstrated: ['Node.js & Express', 'RESTful API Design', 'SQL & PostgreSQL'],
    verificationStatus: 'evidence-submitted',
    createdAt: '2026-09-25'
  },
  {
    id: 'proj-3',
    title: 'E-Commerce Micro-Frontend Storefront',
    description: 'Modern storefront featuring dynamic product filtering, persistent shopping cart state, mock stripe checkout flow, and custom theme toggles.',
    technologies: ['React', 'JavaScript', 'CSS Modules', 'Context API'],
    repositoryUrl: 'https://github.com/demo-student/react-storefront',
    liveDemoUrl: 'https://react-storefront.vercel.app',
    skillsDemonstrated: ['HTML & CSS', 'JavaScript (ES6+)', 'React.js'],
    verificationStatus: 'assessment-completed',
    createdAt: '2026-10-02'
  }
];
