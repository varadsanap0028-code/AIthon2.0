import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { roadmapService, DOMAIN_MILESTONES } from '../../services/roadmapService.js';

describe('Career Domain Roadmap Synchronization & Isolation', () => {
  test('1. Selecting ML displays the ML roadmap and canonical milestones', () => {
    const mlAliases = ['ML', 'Machine Learning', 'Machine Learning Engineer', 'machine-learning'];

    mlAliases.forEach(alias => {
      const resolved = roadmapService.resolveDomainTrack(alias);
      assert.strictEqual(resolved.trackKey, 'machine-learning', `Expected trackKey for ${alias} to be machine-learning`);
      assert.strictEqual(resolved.domainId, 'ai-ml');
      assert.strictEqual(resolved.canonicalRoleTitle, 'Machine Learning Engineer');
      assert.strictEqual(resolved.isFallback, false);

      const milestones = roadmapService.getMilestonesForDomain(alias);
      assert.ok(milestones.some(m => m.includes('Python, Scientific Computing')));
      assert.ok(milestones.some(m => m.includes('Supervised & Unsupervised Machine Learning')));
      assert.ok(milestones.some(m => m.includes('MLOps Pipeline Engineering')));
      assert.strictEqual(milestones.some(m => m.includes('HTML')), false, 'ML roadmap must not contain HTML web tasks');
    });
  });

  test('2. Selecting Web Development displays the Web Development roadmap', () => {
    const webAliases = ['Web Development', 'Frontend', 'Backend', 'Full Stack', 'Full-Stack Developer'];

    webAliases.forEach(alias => {
      const resolved = roadmapService.resolveDomainTrack(alias);
      assert.strictEqual(resolved.trackKey, 'web-dev', `Expected trackKey for ${alias} to be web-dev`);
      assert.strictEqual(resolved.domainId, 'web-dev');
      assert.strictEqual(resolved.isFallback, false);

      const milestones = roadmapService.getMilestonesForDomain(alias);
      assert.ok(milestones.some(m => m.includes('Foundations of Modern Web') || m.includes('Frontend')));
      assert.ok(milestones.some(m => m.includes('Backend') || m.includes('Full-Stack')));
    });
  });

  test('3. Selecting Cybersecurity displays the Cybersecurity roadmap', () => {
    const cyberAliases = ['Cybersecurity', 'Cybersecurity Analyst', 'SOC Analyst', 'Penetration Tester'];

    cyberAliases.forEach(alias => {
      const resolved = roadmapService.resolveDomainTrack(alias);
      assert.strictEqual(resolved.trackKey, 'cybersecurity', `Expected trackKey for ${alias} to be cybersecurity`);
      assert.strictEqual(resolved.domainId, 'cybersecurity');
      assert.strictEqual(resolved.isFallback, false);

      const milestones = roadmapService.getMilestonesForDomain(alias);
      assert.ok(milestones.some(m => m.includes('Networking & Linux Systems')));
      assert.ok(milestones.some(m => m.includes('Threat Analysis')));
      assert.ok(milestones.some(m => m.includes('Security Operations')));
      assert.strictEqual(milestones.some(m => m.includes('React')), false, 'Cybersecurity roadmap must not contain React');
    });
  });

  test('4. Correctly distinguishes AI and Machine Learning domains', () => {
    const mlResolved = roadmapService.resolveDomainTrack('Machine Learning');
    const aiResolved = roadmapService.resolveDomainTrack('Artificial Intelligence');
    const genAiResolved = roadmapService.resolveDomainTrack('Generative AI Application Developer');

    assert.strictEqual(mlResolved.trackKey, 'machine-learning');
    assert.strictEqual(mlResolved.canonicalRoleTitle, 'Machine Learning Engineer');

    assert.strictEqual(aiResolved.trackKey, 'artificial-intelligence');
    assert.strictEqual(aiResolved.canonicalRoleTitle, 'AI/ML Engineer');

    assert.strictEqual(genAiResolved.trackKey, 'artificial-intelligence');
    assert.strictEqual(genAiResolved.canonicalRoleTitle, 'Generative AI Application Developer');

    // Milestones differ
    const mlMilestones = roadmapService.getMilestonesForDomain('Machine Learning');
    const aiMilestones = roadmapService.getMilestonesForDomain('Artificial Intelligence');
    assert.ok(mlMilestones.some(m => m.includes('MLOps Pipeline')));
    assert.ok(aiMilestones.some(m => m.includes('Transformers, Foundation Models')));
  });

  test('5. Changing domains updates the roadmap and milestones immediately', () => {
    const userSequence = ['Web Development', 'Machine Learning', 'Cybersecurity', 'Data Science', 'Cloud Computing and DevOps', 'Mobile App Development'];

    const tracksObserved = userSequence.map(domain => {
      const res = roadmapService.resolveDomainTrack(domain);
      const milestones = roadmapService.getMilestonesForDomain(domain);
      return { track: res.trackKey, role: res.canonicalRoleTitle, firstMilestone: milestones[0] };
    });

    assert.strictEqual(tracksObserved[0].track, 'web-dev');
    assert.strictEqual(tracksObserved[1].track, 'machine-learning');
    assert.strictEqual(tracksObserved[2].track, 'cybersecurity');
    assert.strictEqual(tracksObserved[3].track, 'data-science');
    assert.strictEqual(tracksObserved[4].track, 'cloud-devops');
    assert.strictEqual(tracksObserved[5].track, 'mobile-dev');

    // Verify all 6 are distinct
    const distinctTracks = new Set(tracksObserved.map(t => t.track));
    assert.strictEqual(distinctTracks.size, 6, 'All 6 selected domains must produce distinct tracks');
  });

  test('6. Refreshing the page preserves the selected domain and roadmap without reverting', () => {
    const mockStorage = roadmapService.createMockStorage();
    const userId = 'usr-student-test';

    // Student selects Machine Learning
    const selectedDomain = 'Machine Learning';
    const resolved = roadmapService.resolveDomainTrack(selectedDomain);

    // Save state simulating page session
    mockStorage.setItem(`sarathi_${userId}_targetRole`, resolved.canonicalRoleTitle);
    mockStorage.setItem(`sarathi_${userId}_targetDomain`, resolved.domainId);
    mockStorage.setItem(
      `sarathi_${userId}_roadmap_${resolved.trackKey}`,
      JSON.stringify({
        targetRole: resolved.canonicalRoleTitle,
        overallProgress: 25,
        stages: [{ id: 'stage-ml-1', title: 'Python for ML', tasks: [] }]
      })
    );

    // Simulate page reload: read from storage
    const restoredRole = mockStorage.getItem(`sarathi_${userId}_targetRole`);
    const restoredDomain = mockStorage.getItem(`sarathi_${userId}_targetDomain`);
    const reResolved = roadmapService.resolveDomainTrack(restoredRole || restoredDomain);
    const restoredRoadmapRaw = mockStorage.getItem(`sarathi_${userId}_roadmap_${reResolved.trackKey}`);
    const restoredRoadmap = JSON.parse(restoredRoadmapRaw);

    assert.strictEqual(restoredRole, 'Machine Learning Engineer');
    assert.strictEqual(restoredDomain, 'ai-ml');
    assert.strictEqual(reResolved.trackKey, 'machine-learning');
    assert.strictEqual(restoredRoadmap.targetRole, 'Machine Learning Engineer');
    assert.strictEqual(restoredRoadmap.overallProgress, 25);
    assert.notStrictEqual(restoredRoadmap.targetRole, 'Full-Stack Developer', 'Must NOT revert to Web Development');
  });

  test('7. Progress from one domain does not leak into another', () => {
    const mockStorage = roadmapService.createMockStorage();
    const userId = 'usr-student-multitrack';

    // 1. Student has progress in Web Development
    const webRoadmap = {
      targetRole: 'Full-Stack Developer',
      overallProgress: 45,
      completedTaskIds: ['task-1-1', 'task-1-2']
    };
    mockStorage.setItem(`sarathi_${userId}_roadmap_web-dev`, JSON.stringify(webRoadmap));

    // 2. Student switches to Machine Learning track
    const mlRoadmap = {
      targetRole: 'Machine Learning Engineer',
      overallProgress: 0,
      completedTaskIds: []
    };
    mockStorage.setItem(`sarathi_${userId}_roadmap_machine-learning`, JSON.stringify(mlRoadmap));

    // 3. Complete task in ML
    mlRoadmap.completedTaskIds.push('task-ml-1-1');
    mlRoadmap.overallProgress = 20;
    mockStorage.setItem(`sarathi_${userId}_roadmap_machine-learning`, JSON.stringify(mlRoadmap));

    // 4. Verify ML progress is isolated
    const readMl = JSON.parse(mockStorage.getItem(`sarathi_${userId}_roadmap_machine-learning`));
    assert.strictEqual(readMl.overallProgress, 20);
    assert.deepStrictEqual(readMl.completedTaskIds, ['task-ml-1-1']);

    // 5. Verify Web Dev progress was preserved and unaffected
    const readWeb = JSON.parse(mockStorage.getItem(`sarathi_${userId}_roadmap_web-dev`));
    assert.strictEqual(readWeb.overallProgress, 45);
    assert.deepStrictEqual(readWeb.completedTaskIds, ['task-1-1', 'task-1-2']);
    assert.ok(!readWeb.completedTaskIds.includes('task-ml-1-1'), 'Web dev must not contain ML task IDs');
    assert.ok(!readMl.completedTaskIds.includes('task-1-1'), 'ML must not contain Web Dev task IDs');
  });

  test('8. Missing or unsupported domains are handled gracefully with fallback', () => {
    const invalidInputs = ['', null, undefined, 'Unknown Future Tech Nonexistent', '   '];

    invalidInputs.forEach(input => {
      const resolved = roadmapService.resolveDomainTrack(input);
      assert.strictEqual(resolved.isFallback, true);
      assert.strictEqual(resolved.trackKey, 'web-dev');
      assert.strictEqual(resolved.canonicalRoleTitle, 'Full-Stack Developer');

      const milestones = roadmapService.getMilestonesForDomain(input);
      assert.ok(Array.isArray(milestones));
      assert.ok(milestones.length >= 3);
    });
  });
});
