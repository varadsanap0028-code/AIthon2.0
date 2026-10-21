import { canonicalResources } from '../server/src/data/resourceSeeder.js';

console.log(`Checking ${canonicalResources.length} canonical resource links...`);

const results = [];

for (const res of canonicalResources) {
  const url = res.url;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    
    let response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Sarathi-Link-Checker/1.0',
        Accept: '*/*'
      },
      signal: controller.signal
    }).catch(() => null);

    clearTimeout(timeout);

    // If server rejects HEAD with 405 Method Not Allowed, fallback to GET
    if (!response || response.status === 405) {
      const getController = new AbortController();
      const getTimeout = setTimeout(() => getController.abort(), 6000);
      response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Sarathi-Link-Checker/1.0',
          Accept: '*/*'
        },
        signal: getController.signal
      }).catch(() => null);
      clearTimeout(getTimeout);
    }

    const ok = response && response.status >= 200 && response.status < 400;
    results.push({
      id: res.id,
      title: res.title,
      url,
      status: response ? response.status : 'TIMEOUT/NETWORK_ERR',
      ok
    });
  } catch (err) {
    results.push({
      id: res.id,
      title: res.title,
      url,
      status: err.message,
      ok: false
    });
  }
}

console.log('\n--- Link Check Results ---');
let deadCount = 0;
for (const r of results) {
  const symbol = r.ok ? '✓' : '✖';
  console.log(`${symbol} [${r.status}] ${r.title} (${r.url})`);
  if (!r.ok) deadCount++;
}

console.log(`\nSummary: ${results.length - deadCount} live links, ${deadCount} dead/unreachable.`);

if (deadCount > 0) {
  console.warn(`Warning: ${deadCount} links need manual verification or are rate-limiting bots.`);
} else {
  console.log('All canonical links successfully verified!');
}
