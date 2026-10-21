/**
 * Skill Dependency Graph Service
 * Validates prerequisite relationships, detects dependency cycles,
 * calculates unmet prerequisites, and prioritizes foundational blockers.
 * Complies with Section 11 of the Skill Intelligence Engine specification.
 */

export class DependencyGraphService {
  /**
   * Builds an adjacency list and in-degree map for a set of competency definitions.
   * @param {Array<{ skillName: string, prerequisites?: string[] }>} skills
   */
  static buildGraph(skills) {
    const adjList = new Map(); // prereq -> dependents
    const reverseList = new Map(); // skill -> prereqs
    const allSkills = new Set();

    for (const skill of skills) {
      const name = skill.skillName;
      allSkills.add(name);
      if (!adjList.has(name)) adjList.set(name, new Set());
      if (!reverseList.has(name)) reverseList.set(name, new Set());

      const prereqs = skill.prerequisites || [];
      for (const p of prereqs) {
        allSkills.add(p);
        if (!adjList.has(p)) adjList.set(p, new Set());
        if (!reverseList.has(name)) reverseList.set(name, new Set());

        adjList.get(p).add(name);
        reverseList.get(name).add(p);
      }
    }

    return { adjList, reverseList, allSkills };
  }

  /**
   * Validates that the graph is a Directed Acyclic Graph (DAG).
   * Throws Error with the specific cycle path if any cycle exists.
   */
  static validateAcyclic(skills) {
    const { adjList, allSkills } = this.buildGraph(skills);
    const visited = new Map(); // 0 = unvisited, 1 = visiting, 2 = visited
    const parentMap = new Map();

    for (const node of allSkills) {
      visited.set(node, 0);
    }

    const dfs = (node, path) => {
      visited.set(node, 1);
      path.push(node);

      const neighbors = adjList.get(node) || [];
      for (const next of neighbors) {
        if (visited.get(next) === 1) {
          // Cycle detected! Extract cycle path
          const cycleStartIdx = path.indexOf(next);
          const cyclePath = path.slice(cycleStartIdx).concat(next).join(' -> ');
          throw new Error(`Dependency cycle detected: ${cyclePath}`);
        }
        if (visited.get(next) === 0) {
          parentMap.set(next, node);
          dfs(next, path);
        }
      }

      visited.set(node, 2);
      path.pop();
    };

    for (const node of allSkills) {
      if (visited.get(node) === 0) {
        dfs(node, []);
      }
    }

    return true;
  }

  /**
   * Computes topological sort of competencies so prerequisites always precede dependents.
   */
  static getTopologicalOrder(skills) {
    this.validateAcyclic(skills);
    const { adjList, allSkills } = this.buildGraph(skills);

    const inDegree = new Map();
    for (const node of allSkills) {
      inDegree.set(node, 0);
    }

    for (const [, neighbors] of adjList) {
      for (const dest of neighbors) {
        inDegree.set(dest, (inDegree.get(dest) || 0) + 1);
      }
    }

    const queue = [];
    for (const [node, deg] of inDegree) {
      if (deg === 0) queue.push(node);
    }

    const order = [];
    while (queue.length > 0) {
      const curr = queue.shift();
      order.push(curr);

      const neighbors = adjList.get(curr) || [];
      for (const next of neighbors) {
        const newDeg = inDegree.get(next) - 1;
        inDegree.set(next, newDeg);
        if (newDeg === 0) queue.push(next);
      }
    }

    return order;
  }

  /**
   * Resolves unmet prerequisites for a given competency based on student's current proficiencies.
   * A prerequisite is considered MET if candidate has demonstratedProficiency >= 3 and is not unassessed.
   *
   * @param {string} skillName
   * @param {Array<{ skillName: string, prerequisites?: string[] }>} benchmarkSkills
   * @param {Map<string, { proficiency: number, status: string }>} candidateSkillMap
   * @returns {{ hasUnmetPrerequisites: boolean, unmetPrerequisites: string[], blockerCount: number }}
   */
  static checkPrerequisites(skillName, benchmarkSkills, candidateSkillMap) {
    const { reverseList, adjList } = this.buildGraph(benchmarkSkills);
    const prereqs = Array.from(reverseList.get(skillName) || []);

    const unmet = [];
    for (const p of prereqs) {
      const cSkill = candidateSkillMap.get(p.toLowerCase());
      const isSatisfied = cSkill && cSkill.proficiency >= 3 && cSkill.status !== 'INSUFFICIENT_EVIDENCE';
      if (!isSatisfied) {
        unmet.push(p);
      }
    }

    // Direct and indirect downstream dependents blocked by this skill
    const downstream = adjList.get(skillName) || [];
    const blockerCount = downstream.size;

    return {
      hasUnmetPrerequisites: unmet.length > 0,
      unmetPrerequisites: unmet,
      blockerCount
    };
  }

  /**
   * Calculates the number of downstream dependent competencies blocked by this skill.
   */
  static calculateBlockerImpact(skillName, benchmarkSkills) {
    const { adjList } = this.buildGraph(benchmarkSkills);
    const dependents = adjList.get(skillName) || [];
    return dependents.size || 0;
  }

  /**
   * Scores and prioritizes competencies to ensure foundational blockers are addressed first.
   */
  static prioritizeCompetencies(benchmarkSkills, candidateSkillMap) {
    const { adjList } = this.buildGraph(benchmarkSkills);

    return benchmarkSkills.map(s => {
      const cSkill = candidateSkillMap.get(s.skillName.toLowerCase());
      const candProf = cSkill ? cSkill.proficiency : 0;
      const isMet = candProf >= s.requiredProficiency;
      const gap = Math.max(0, s.requiredProficiency - candProf);

      const prereqCheck = this.checkPrerequisites(s.skillName, benchmarkSkills, candidateSkillMap);
      const dependentCount = (adjList.get(s.skillName) || []).size;

      let priorityScore = 0;
      let priorityLevel = 'Low';
      let rationale = '';

      if (isMet) {
        priorityLevel = 'Low';
        rationale = 'Competency benchmark goal met.';
      } else if (prereqCheck.hasUnmetPrerequisites) {
        // This skill is blocked by foundational requirements
        priorityScore = 30 + gap * 5;
        priorityLevel = 'Medium';
        rationale = `Blocked by foundational prerequisites: ${prereqCheck.unmetPrerequisites.join(', ')}. Resolve those first.`;
      } else if (dependentCount > 0) {
        // This skill is a foundational blocker for downstream competencies!
        priorityScore = 100 + dependentCount * 20 + gap * 10;
        priorityLevel = 'High';
        rationale = `Foundational blocker: required before mastering ${dependentCount} dependent competencies.`;
      } else if (s.isMandatory) {
        priorityScore = 80 + gap * 10;
        priorityLevel = gap >= 2 ? 'High' : 'Medium';
        rationale = `Mandatory core competency with a ${gap}-level gap.`;
      } else {
        priorityScore = 40 + gap * 10;
        priorityLevel = gap >= 3 ? 'High' : 'Medium';
        rationale = `Demonstrated proficiency is ${gap} levels below target benchmark.`;
      }

      return {
        ...s,
        candidateProficiency: candProf,
        gap,
        priorityLevel,
        priorityScore,
        hasUnmetPrerequisites: prereqCheck.hasUnmetPrerequisites,
        unmetPrerequisites: prereqCheck.unmetPrerequisites,
        dependentCount,
        rationale
      };
    }).sort((a, b) => b.priorityScore - a.priorityScore);
  }
}
