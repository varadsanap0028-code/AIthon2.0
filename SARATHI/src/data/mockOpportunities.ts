import type { OpportunityItem } from '../types/opportunity';

export const mockOpportunitiesData: OpportunityItem[] = [
  {
    id: 'opp-1',
    title: 'Junior Full-Stack Web Developer',
    companyName: 'NexTech Innovations',
    location: 'Bengaluru, India',
    isRemote: true,
    opportunityType: 'Full-time',
    experienceLevel: 'Junior',
    stipendOrSalary: '₹6.5 - ₹9.0 LPA',
    deadline: '2026-11-15',
    postedDate: '2026-10-01',
    description: 'We are seeking an enthusiastic Junior Full-Stack Developer to build scalable React frontends and Node.js microservices for cloud applications.',
    requiredSkills: ['React.js', 'JavaScript (ES6+)', 'Node.js & Express', 'SQL & PostgreSQL', 'Git & GitHub', 'RESTful API Design']
  },
  {
    id: 'opp-2',
    title: 'Frontend React Engineering Intern',
    companyName: 'CloudPulse Software',
    location: 'Hyderabad, India',
    isRemote: true,
    opportunityType: 'Internship',
    experienceLevel: 'Student',
    stipendOrSalary: '₹25,000 / month',
    deadline: '2026-10-30',
    postedDate: '2026-10-05',
    description: 'Join our UI team to convert Figma designs into pixel-perfect React components with TypeScript and Tailwind CSS.',
    requiredSkills: ['HTML & CSS', 'JavaScript (ES6+)', 'React.js', 'TypeScript', 'Git & GitHub']
  },
  {
    id: 'opp-3',
    title: 'Backend API Developer (Node / Express)',
    companyName: 'Apex Data Systems',
    location: 'Pune, India',
    isRemote: false,
    opportunityType: 'Full-time',
    experienceLevel: 'Entry-level',
    stipendOrSalary: '₹7.0 - ₹10.0 LPA',
    deadline: '2026-11-20',
    postedDate: '2026-10-08',
    description: 'Develop high-performance REST APIs, database models, and serverless background tasks in Node.js & PostgreSQL.',
    requiredSkills: ['Node.js & Express', 'SQL & PostgreSQL', 'RESTful API Design', 'Docker Basics', 'Git & GitHub']
  },
  {
    id: 'opp-4',
    title: 'Full-Stack Product Engineering Intern',
    companyName: 'Veloce AI Labs',
    location: 'Remote',
    isRemote: true,
    opportunityType: 'Internship',
    experienceLevel: 'Student',
    stipendOrSalary: '₹30,000 / month',
    deadline: '2026-11-01',
    postedDate: '2026-10-09',
    description: 'Work directly with founders to prototype AI product interfaces using React, TypeScript, Supabase, and Tailwind CSS.',
    requiredSkills: ['React.js', 'TypeScript', 'Node.js & Express', 'HTML & CSS', 'Git & GitHub']
  }
];
