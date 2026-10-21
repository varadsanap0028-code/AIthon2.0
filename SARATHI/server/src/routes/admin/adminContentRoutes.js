import express from 'express';
import { AdminContentService } from '../../services/admin/adminContentService.js';

const router = express.Router();

// =================== DOMAINS ===================
router.get('/domains', (req, res) => {
  try {
    const domains = AdminContentService.listDomains();
    res.json({ domains });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

router.post('/domains', (req, res) => {
  try {
    const adminId = req.user?.id || 'usr-admin-seed';
    const domain = AdminContentService.createDomain(req.body, adminId, req);
    res.status(201).json({ domain });
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

router.put('/domains/:id', (req, res) => {
  try {
    const adminId = req.user?.id || 'usr-admin-seed';
    const domain = AdminContentService.updateDomain(req.params.id, req.body, adminId, req);
    res.json({ domain });
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

router.delete('/domains/:id', (req, res) => {
  try {
    const adminId = req.user?.id || 'usr-admin-seed';
    const domain = AdminContentService.archiveDomain(req.params.id, adminId, req);
    res.json({ domain });
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// =================== SKILLS ===================
router.get('/skills/duplicates', (req, res) => {
  try {
    const duplicates = AdminContentService.findDuplicateSkills();
    res.json({ duplicates });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

router.get('/skills', (req, res) => {
  try {
    const result = AdminContentService.listSkills(req.query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

router.get('/skills/:id', (req, res) => {
  try {
    const skill = AdminContentService.getSkill(req.params.id);
    if (!skill) return res.status(404).json({ error: { message: 'Skill not found' } });
    res.json({ skill });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

router.get('/skills/:id/usage', (req, res) => {
  try {
    const usage = AdminContentService.getSkillUsageCount(req.params.id);
    res.json(usage);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

router.post('/skills', (req, res) => {
  try {
    const adminId = req.user?.id || 'usr-admin-seed';
    const skill = AdminContentService.createSkill(req.body, adminId, req);
    res.status(201).json({ skill });
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

router.put('/skills/:id', (req, res) => {
  try {
    const adminId = req.user?.id || 'usr-admin-seed';
    const skill = AdminContentService.updateSkill(req.params.id, req.body, adminId, req);
    res.json({ skill });
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

router.post('/skills/:id/archive', (req, res) => {
  try {
    const adminId = req.user?.id || 'usr-admin-seed';
    const skill = AdminContentService.archiveSkill(req.params.id, adminId, req);
    res.json({ skill });
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

router.delete('/skills/:id', (req, res) => {
  try {
    const adminId = req.user?.id || 'usr-admin-seed';
    if (req.query.archive === 'true') {
      const skill = AdminContentService.archiveSkill(req.params.id, adminId, req);
      return res.json({ skill });
    }
    const result = AdminContentService.deleteSkill(req.params.id, adminId, req);
    res.json(result);
  } catch (err) {
    res.status(err.status || 400).json({ error: { message: err.message, usage: err.usage } });
  }
});

router.post('/skills/:id/aliases', (req, res) => {
  try {
    const adminId = req.user?.id || 'usr-admin-seed';
    const result = AdminContentService.addSkillAlias(req.params.id, req.body.alias, adminId, req);
    res.status(201).json(result);
  } catch (err) {
    res.status(err.status || 400).json({ error: { message: err.message } });
  }
});

router.delete('/skills/:id/aliases/:aliasId', (req, res) => {
  try {
    const adminId = req.user?.id || 'usr-admin-seed';
    const result = AdminContentService.removeSkillAlias(req.params.id, req.params.aliasId, adminId, req);
    res.json(result);
  } catch (err) {
    res.status(err.status || 400).json({ error: { message: err.message } });
  }
});

router.post('/skills/merge', (req, res) => {
  try {
    const adminId = req.user?.id || 'usr-admin-seed';
    const result = AdminContentService.mergeSkills(req.body, adminId, req);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// =================== BENCHMARKS ===================
router.get('/benchmarks', (req, res) => {
  try {
    const benchmarks = AdminContentService.listBenchmarks();
    res.json({ benchmarks });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

router.get('/benchmarks/:id', (req, res) => {
  try {
    const benchmark = AdminContentService.getBenchmark(req.params.id);
    if (!benchmark) return res.status(404).json({ error: { message: 'Benchmark not found' } });
    res.json({ benchmark });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

router.post('/benchmarks', (req, res) => {
  try {
    const adminId = req.user?.id || 'usr-admin-seed';
    const benchmark = AdminContentService.saveBenchmark(req.body, adminId, req);
    res.status(201).json({ benchmark });
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

router.put('/benchmarks/:id', (req, res) => {
  try {
    const adminId = req.user?.id || 'usr-admin-seed';
    const benchmark = AdminContentService.saveBenchmark({ ...req.body, id: req.params.id }, adminId, req);
    res.json({ benchmark });
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// =================== RESOURCES ===================
router.get('/resources/export.json', (req, res) => {
  try {
    const resources = AdminContentService.exportResources();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="learning-resources.json"');
    res.json(resources);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

router.get('/resources', (req, res) => {
  try {
    const result = AdminContentService.listResources(req.query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

router.post('/resources/check-links', async (req, res) => {
  try {
    const adminId = req.user?.id || 'usr-admin-seed';
    const result = await AdminContentService.checkAllLinks(adminId, req);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

router.post('/resources/:id/check-link', async (req, res) => {
  try {
    const adminId = req.user?.id || 'usr-admin-seed';
    const result = await AdminContentService.checkResourceLink(req.params.id, adminId, req);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

router.post('/resources/import', (req, res) => {
  try {
    const adminId = req.user?.id || 'usr-admin-seed';
    const previewOnly = req.query.preview === 'true' || req.body.preview === true;
    const items = Array.isArray(req.body) ? req.body : req.body.items;
    const result = AdminContentService.importResources(items, adminId, req, previewOnly);
    res.json(result);
  } catch (err) {
    res.status(err.status || 400).json({ error: { message: err.message, rowErrors: err.rowErrors } });
  }
});

export default router;
