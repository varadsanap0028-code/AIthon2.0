export interface CandidateProfile {
  id: string;
  name: string;
  avatarUrl: string;
  targetRole: string;
  institution: string;
  degree: string;
  graduationYear: string;
  readinessScore: number;
  assessedSkills: { name: string; level: number; verified: boolean }[];
  verifiedProjectsCount: number;
  matchScoreForSelectedJob?: number;
}

export const mockCandidatesData: CandidateProfile[] = [
  {
    id: 'cand-1',
    name: 'Aarav Sharma',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    targetRole: 'Full-Stack Developer',
    institution: 'National Institute of Technology, Surathkal',
    degree: 'B.Tech Computer Science',
    graduationYear: '2026',
    readinessScore: 84,
    assessedSkills: [
      { name: 'React.js', level: 4, verified: true },
      { name: 'JavaScript (ES6+)', level: 4, verified: true },
      { name: 'Node.js & Express', level: 3, verified: true },
      { name: 'SQL & PostgreSQL', level: 3, verified: false },
      { name: 'Git & GitHub', level: 4, verified: true }
    ],
    verifiedProjectsCount: 3
  },
  {
    id: 'cand-2',
    name: 'Priya Patel',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    targetRole: 'Frontend Developer',
    institution: 'BITS Pilani',
    degree: 'B.E. Information Systems',
    graduationYear: '2026',
    readinessScore: 91,
    assessedSkills: [
      { name: 'HTML & CSS', level: 5, verified: true },
      { name: 'JavaScript (ES6+)', level: 5, verified: true },
      { name: 'React.js', level: 4, verified: true },
      { name: 'TypeScript', level: 4, verified: true },
      { name: 'Git & GitHub', level: 4, verified: true }
    ],
    verifiedProjectsCount: 4
  },
  {
    id: 'cand-3',
    name: 'Rohan Mehta',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    targetRole: 'Backend Developer',
    institution: 'Vellore Institute of Technology',
    degree: 'B.Tech Information Technology',
    graduationYear: '2025',
    readinessScore: 78,
    assessedSkills: [
      { name: 'Node.js & Express', level: 4, verified: true },
      { name: 'SQL & PostgreSQL', level: 4, verified: true },
      { name: 'RESTful API Design', level: 4, verified: true },
      { name: 'Docker Basics', level: 3, verified: false },
      { name: 'Unit Testing (Jest)', level: 2, verified: false }
    ],
    verifiedProjectsCount: 2
  }
];

export const mockCollegeAnalyticsData = {
  institutionName: 'Apex Institute of Technology',
  totalStudentsEnrolled: 420,
  assessmentsCompleted: 345,
  avgReadinessScore: 76,
  roadmapCompletionRate: 68,
  topSkillsAssessed: [
    { skill: 'HTML & CSS', studentCount: 320, avgScore: 88 },
    { skill: 'JavaScript (ES6+)', studentCount: 295, avgScore: 82 },
    { skill: 'React.js', studentCount: 240, avgScore: 74 },
    { skill: 'Node.js & Express', studentCount: 190, avgScore: 69 },
    { skill: 'SQL & PostgreSQL', studentCount: 165, avgScore: 65 }
  ],
  commonSkillGaps: [
    { skill: 'TypeScript', gapPercentage: 62, priority: 'High' },
    { skill: 'Unit Testing (Jest)', gapPercentage: 58, priority: 'High' },
    { skill: 'Docker & DevOps', gapPercentage: 54, priority: 'Medium' },
    { skill: 'RESTful API Design', gapPercentage: 41, priority: 'Medium' }
  ],
  readinessTrends: [
    { month: 'May', avgScore: 62 },
    { month: 'Jun', avgScore: 65 },
    { month: 'Jul', avgScore: 69 },
    { month: 'Aug', avgScore: 72 },
    { month: 'Sep', avgScore: 75 },
    { month: 'Oct', avgScore: 78 }
  ]
};
