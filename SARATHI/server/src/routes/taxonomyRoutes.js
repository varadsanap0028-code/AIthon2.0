import { Router } from 'express';
import { taxonomyService } from '../services/taxonomyService.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/domains', (req, res, next) => {
  try {
    const domains = taxonomyService.getDomains();
    res.json(domains);
  } catch (err) {
    next(err);
  }
});

router.get('/skills', (req, res, next) => {
  try {
    const { domainId, query } = req.query;
    if (query) {
      const skills = taxonomyService.searchSkills(query);
      return res.json(skills);
    }
    if (domainId) {
      const skills = taxonomyService.getSkillsByDomain(domainId);
      return res.json(skills);
    }
    const skills = taxonomyService.getAllSkills();
    res.json(skills);
  } catch (err) {
    next(err);
  }
});

router.post('/skills', requireAuth, requireRole(['platform_admin', 'org_owner', 'recruiter']), (req, res, next) => {
  try {
    const skill = taxonomyService.addSkill(req.body);
    res.status(201).json(skill);
  } catch (err) {
    next(err);
  }
});

export default router;
