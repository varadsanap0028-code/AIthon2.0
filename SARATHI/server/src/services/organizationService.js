import { randomUUID as uuidv4 } from 'node:crypto';
import { repository } from '../data/repository.js';

export const organizationService = {
  getOrganizationById(orgId) {
    const org = repository.queryOne('SELECT * FROM organisations WHERE id = ?;', [orgId]);
    if (!org) return null;
    return {
      ...org,
      settings: JSON.parse(org.settings || '{}'),
    };
  },

  getOrganizationMembers(orgId) {
    return repository.query(
      `SELECT m.*, u.full_name, u.email, u.avatar_url
       FROM organisation_memberships m
       JOIN users u ON u.id = m.user_id
       WHERE m.org_id = ? AND u.deleted_at IS NULL
       ORDER BY m.created_at ASC;`,
      [orgId]
    );
  },

  updateOrganizationSettings(orgId, settings) {
    const org = this.getOrganizationById(orgId);
    if (!org) throw new Error('Organization not found');

    const merged = { ...org.settings, ...settings };
    const now = new Date().toISOString();

    repository.execute(
      'UPDATE organisations SET settings = ?, updated_at = ? WHERE id = ?;',
      [JSON.stringify(merged), now, orgId]
    );

    return this.getOrganizationById(orgId);
  },

  addMember(orgId, { email, fullName, role = 'recruiter', invitedBy = null }) {
    let user = repository.queryOne('SELECT * FROM users WHERE email = ?;', [email.toLowerCase().trim()]);
    const now = new Date().toISOString();

    return repository.transaction((repo) => {
      if (!user) {
        const userId = `usr-${uuidv4().slice(0, 8)}`;
        repo.execute(
          `INSERT INTO users (id, email, full_name, role, created_at, updated_at)
           VALUES (?, ?, ?, 'recruiter', ?, ?);`,
          [userId, email.toLowerCase().trim(), fullName.trim(), now, now]
        );
        user = { id: userId, email, full_name: fullName };
      }

      const membershipId = `mem-${uuidv4().slice(0, 8)}`;
      repo.execute(
        `INSERT INTO organisation_memberships (id, org_id, user_id, role, status, invited_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'active', ?, ?, ?)
         ON CONFLICT(org_id, user_id) DO UPDATE SET role = excluded.role, status = 'active', updated_at = excluded.updated_at;`,
        [membershipId, orgId, user.id, role, invitedBy, now, now]
      );

      return {
        id: membershipId,
        orgId,
        userId: user.id,
        email: user.email,
        fullName: user.full_name,
        role,
        status: 'active',
      };
    });
  },

  updateMemberRole(orgId, membershipId, newRole) {
    const allowed = ['platform_admin', 'org_owner', 'recruiter', 'assessor', 'reviewer'];
    if (!allowed.includes(newRole)) {
      throw new Error(`Invalid role: ${newRole}`);
    }

    const now = new Date().toISOString();
    repository.execute(
      'UPDATE organisation_memberships SET role = ?, updated_at = ? WHERE id = ? AND org_id = ?;',
      [newRole, now, membershipId, orgId]
    );

    return { success: true, membershipId, newRole };
  }
};
