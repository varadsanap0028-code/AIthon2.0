/**
 * SARATHI Admin Portal — Request Metrics & Error Ring Buffer Middleware
 * PRD Phase 10
 * Bounded in-memory telemetry with < 0.2ms overhead.
 */

const WINDOW_MINUTES = 15;
const MAX_LATENCY_SAMPLES = 200;
const MAX_STORED_ERRORS = 100;

class MetricsCollector {
  constructor() {
    this.buckets = new Map(); // minuteTimestamp -> Bucket
    this.recentErrors = []; // Array capped at 100
  }

  getMinuteKey(now = Date.now()) {
    return Math.floor(now / 60000) * 60000;
  }

  getOrCreateBucket(minuteKey) {
    this.pruneOldBuckets(minuteKey);
    let bucket = this.buckets.get(minuteKey);
    if (!bucket) {
      bucket = {
        minuteKey,
        requestCount: 0,
        errorCount: 0,
        latencies: [],
        byGroup: {},
      };
      this.buckets.set(minuteKey, bucket);
    }
    return bucket;
  }

  pruneOldBuckets(currentMinuteKey) {
    const cutoff = currentMinuteKey - WINDOW_MINUTES * 60000;
    for (const key of this.buckets.keys()) {
      if (key < cutoff) {
        this.buckets.delete(key);
      }
    }
  }

  record(req, res, latencyMs) {
    const now = Date.now();
    const minuteKey = this.getMinuteKey(now);
    const bucket = this.getOrCreateBucket(minuteKey);

    bucket.requestCount++;
    if (res.statusCode >= 400) {
      bucket.errorCount++;
    }

    if (bucket.latencies.length < MAX_LATENCY_SAMPLES) {
      bucket.latencies.push(latencyMs);
    }

    // Route grouping
    const path = req.baseUrl || req.path || '/';
    const group = path.split('/')[2] || 'root';
    bucket.byGroup[group] = (bucket.byGroup[group] || 0) + 1;

    // Record server error (5xx or unhandled 4xx)
    if (res.statusCode >= 500) {
      this.recentErrors.unshift({
        id: `err-${now}-${Math.floor(Math.random() * 1000)}`,
        route: req.originalUrl || req.url,
        method: req.method,
        status: res.statusCode,
        message: res.statusMessage || 'Internal Server Error',
        timestamp: new Date(now).toISOString(),
      });
      if (this.recentErrors.length > MAX_STORED_ERRORS) {
        this.recentErrors.pop();
      }
    }
  }

  getMetrics() {
    const now = Date.now();
    const currentKey = this.getMinuteKey(now);
    this.pruneOldBuckets(currentKey);

    const series = [];
    for (let i = WINDOW_MINUTES - 1; i >= 0; i--) {
      const targetKey = currentKey - i * 60000;
      const b = this.buckets.get(targetKey) || {
        minuteKey: targetKey,
        requestCount: 0,
        errorCount: 0,
        latencies: [],
        byGroup: {},
      };

      const sorted = [...b.latencies].sort((a, b) => a - b);
      const p50 = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.5)] : 0;
      const p95 = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.95)] : 0;

      series.push({
        time: new Date(targetKey).toISOString().slice(11, 16),
        requests: b.requestCount,
        errors: b.errorCount,
        p50: Math.round(p50 * 10) / 10,
        p95: Math.round(p95 * 10) / 10,
        byGroup: b.byGroup,
      });
    }

    return {
      windowMinutes: WINDOW_MINUTES,
      series,
      totalRequestsLast15m: series.reduce((sum, s) => sum + s.requests, 0),
      totalErrorsLast15m: series.reduce((sum, s) => sum + s.errors, 0),
    };
  }

  getRecentErrors() {
    return this.recentErrors;
  }
}

export const metricsCollector = new MetricsCollector();

export function requestMetricsMiddleware(req, res, next) {
  const start = performance.now();
  res.on('finish', () => {
    const latencyMs = performance.now() - start;
    metricsCollector.record(req, res, latencyMs);
  });
  next();
}
