import { catalogResources } from '../server/src/data/seeds/resourceCatalog.js';

const VALID_DOMAINS = new Set([
  'dom-frontend',
  'dom-backend',
  'dom-aiml',
  'dom-clouddevops',
  'dom-cybersecurity'
]);

const VALID_LEVELS = new Set(['Beginner', 'Intermediate', 'Advanced']);

const VALID_TYPES = new Set([
  'documentation',
  'handbook',
  'interactive',
  'video',
  'playlist'
]);

const VALID_SOURCES = new Set(['web', 'youtube']);

const args = process.argv.slice(2);
const skipNetwork = args.includes('--skip-network') || args.includes('--offline') || process.env.SKIP_NETWORK === 'true';

async function fetchWithTimeout(url, method = 'HEAD', timeoutMs = 12000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      signal: controller.signal,
      redirect: 'manual',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    return { ok: res.status < 400 || (res.status >= 300 && res.status < 400), status: res.status };
  } finally {
    clearTimeout(timeout);
  }
}

async function checkUrl(url) {
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const headRes = await fetchWithTimeout(url, 'HEAD', 10000);
      if (headRes.ok) return headRes;
    } catch {
      // Continue to GET
    }

    try {
      const getRes = await fetchWithTimeout(url, 'GET', 12000);
      if (getRes.ok) return getRes;
      lastError = `Status ${getRes.status}`;
    } catch (err) {
      lastError = err.message;
    }

    if (attempt < 3) {
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
  return { ok: false, error: lastError || 'Request failed' };
}

async function checkYoutubeVideo(videoId, timeoutMs = 8000) {
  const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(oEmbedUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SarathiResourceValidator/1.0' }
    });
    clearTimeout(timeout);
    if (!res.ok) {
      return { ok: false, status: res.status, error: `oEmbed returned status ${res.status}` };
    }
    const data = await res.json();
    return { ok: true, title: data.title, author: data.author_name };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function checkYoutubePlaylist(playlistId, timeoutMs = 8000) {
  const playlistUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(playlistUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SarathiResourceValidator/1.0' }
    });
    clearTimeout(timeout);
    return { ok: res.status < 400, status: res.status };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function validateResources() {
  console.log(`[validate:resources] Validating ${catalogResources.length} learning resources...`);
  if (skipNetwork) {
    console.warn('[validate:resources] Network validation SKIPPED via flag (--skip-network / --offline). Live URL and YouTube oEmbed checks NOT executed.');
  } else {
    console.log('[validate:resources] Network validation ENABLED: verifying URLs, YouTube video IDs via oEmbed, and playlist endpoints...');
  }

  const errors = [];
  const warnings = [];
  const seenSlugs = new Map();
  const seenUrls = new Map();
  const seenVideoIds = new Map();
  const domainCounts = {};
  const typeCounts = {};

  for (let i = 0; i < catalogResources.length; i++) {
    const r = catalogResources[i];
    const prefix = `[#${i + 1} ${r.slug || r.title || 'unknown'}]`;

    // 1. Required fields
    if (!r.slug || typeof r.slug !== 'string' || !/^[a-z0-9-]+$/.test(r.slug)) {
      errors.push(`${prefix} Invalid or missing slug: "${r.slug}". Must match ^[a-z0-9-]+$`);
    } else {
      if (seenSlugs.has(r.slug)) {
        errors.push(`${prefix} Duplicate slug "${r.slug}" (first seen at #${seenSlugs.get(r.slug) + 1})`);
      }
      seenSlugs.set(r.slug, i);
    }

    if (!r.title || typeof r.title !== 'string' || !r.title.trim()) {
      errors.push(`${prefix} Missing or empty title`);
    }

    if (!r.provider || typeof r.provider !== 'string' || !r.provider.trim()) {
      errors.push(`${prefix} Missing or empty provider`);
    }

    if (!VALID_DOMAINS.has(r.domain)) {
      errors.push(`${prefix} Invalid domain "${r.domain}". Must be one of: ${Array.from(VALID_DOMAINS).join(', ')}`);
    } else {
      domainCounts[r.domain] = (domainCounts[r.domain] || 0) + 1;
    }

    if (!VALID_LEVELS.has(r.level)) {
      errors.push(`${prefix} Invalid level "${r.level}". Must be one of: ${Array.from(VALID_LEVELS).join(', ')}`);
    }

    const resType = r.resource_type || r.type;
    if (!VALID_TYPES.has(resType)) {
      errors.push(`${prefix} Invalid resource_type/type "${resType}". Must be one of: ${Array.from(VALID_TYPES).join(', ')}`);
    } else {
      typeCounts[resType] = (typeCounts[resType] || 0) + 1;
    }

    if (r.source && !VALID_SOURCES.has(r.source)) {
      errors.push(`${prefix} Invalid source "${r.source}". Must be 'web' or 'youtube'`);
    }

    if (!r.url || typeof r.url !== 'string' || (!r.url.startsWith('http://') && !r.url.startsWith('https://'))) {
      errors.push(`${prefix} Missing or invalid URL "${r.url}"`);
    } else {
      if (seenUrls.has(r.url)) {
        warnings.push(`${prefix} Duplicate URL "${r.url}" (also at #${seenUrls.get(r.url) + 1})`);
      }
      seenUrls.set(r.url, i);
    }

    if (!r.description || typeof r.description !== 'string' || r.description.trim().length < 10) {
      errors.push(`${prefix} Missing or too short description (must be at least 10 chars)`);
    }

    if (!Array.isArray(r.skill_tags) || r.skill_tags.length === 0) {
      errors.push(`${prefix} Missing or empty skill_tags array`);
    }

    // Video / playlist specific checks
    if (resType === 'video') {
      if (!r.youtube_video_id || typeof r.youtube_video_id !== 'string') {
        errors.push(`${prefix} Resource type is video but missing youtube_video_id`);
      } else {
        if (seenVideoIds.has(r.youtube_video_id)) {
          errors.push(`${prefix} Duplicate youtube_video_id "${r.youtube_video_id}" (also at #${seenVideoIds.get(r.youtube_video_id) + 1})`);
        }
        seenVideoIds.set(r.youtube_video_id, i);
      }
      if (!r.channel_name) {
        errors.push(`${prefix} Video missing channel_name`);
      }
      if (!r.thumbnail_url) {
        errors.push(`${prefix} Video missing thumbnail_url`);
      }
    } else if (resType === 'playlist') {
      if (!r.youtube_playlist_id || typeof r.youtube_playlist_id !== 'string') {
        errors.push(`${prefix} Resource type is playlist but missing youtube_playlist_id`);
      }
      if (!r.channel_name) {
        errors.push(`${prefix} Playlist missing channel_name`);
      }
    }

    // Network check
    if (!skipNetwork) {
      if (resType === 'video' && r.youtube_video_id) {
        const check = await checkYoutubeVideo(r.youtube_video_id);
        if (!check.ok) {
          errors.push(`${prefix} YouTube video verification failed for ID "${r.youtube_video_id}": ${check.error || check.status}`);
        }
      } else if (resType === 'playlist' && r.youtube_playlist_id) {
        const check = await checkYoutubePlaylist(r.youtube_playlist_id);
        if (!check.ok) {
          errors.push(`${prefix} YouTube playlist verification failed for ID "${r.youtube_playlist_id}": ${check.error || check.status}`);
        }
      } else if (r.url) {
        const check = await checkUrl(r.url);
        if (!check.ok) {
          errors.push(`${prefix} Web URL check failed for "${r.url}": ${check.error || check.status}`);
        }
      }
    }
  }

  console.log('\n--- Catalog Distribution ---');
  console.log(`Total Resources: ${catalogResources.length}`);
  console.log('By Domain:');
  for (const [dom, count] of Object.entries(domainCounts)) {
    console.log(`  - ${dom}: ${count}`);
  }
  console.log('By Format/Type:');
  for (const [t, count] of Object.entries(typeCounts)) {
    console.log(`  - ${t}: ${count}`);
  }

  if (warnings.length > 0) {
    console.warn(`\n[validate:resources] Warnings (${warnings.length}):`);
    warnings.forEach(w => console.warn(`  ! ${w}`));
  }

  if (errors.length > 0) {
    console.error(`\n[validate:resources] FAILED with ${errors.length} error(s):`);
    errors.forEach(e => console.error(`  ✖ ${e}`));
    process.exit(1);
  }

  console.log('\n[validate:resources] All checks PASSED successfully! Catalog is valid.');
}

validateResources();
