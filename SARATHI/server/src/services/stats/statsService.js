/**
 * SARATHI Admin Portal — Pure Statistics Module
 * Zero external ML/stat dependencies.
 * All functions return null or safe values on degenerate input; never produces NaN or Infinity.
 */

export function clamp(val, min, max) {
  if (val === null || val === undefined || Number.isNaN(val)) return min;
  return Math.min(Math.max(val, min), max);
}

export function sigmoid(z) {
  if (z === null || z === undefined || Number.isNaN(z)) return 0.5;
  if (z > 40) return 1;
  if (z < -40) return 0;
  return 1 / (1 + Math.exp(-z));
}

export function mean(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const valid = arr.filter((x) => typeof x === 'number' && !Number.isNaN(x));
  if (valid.length === 0) return null;
  const sum = valid.reduce((acc, v) => acc + v, 0);
  const m = sum / valid.length;
  return Number.isFinite(m) ? m : null;
}

export function variance(arr, isSample = true) {
  if (!Array.isArray(arr)) return null;
  const valid = arr.filter((x) => typeof x === 'number' && !Number.isNaN(x));
  const n = valid.length;
  if (isSample ? n < 2 : n < 1) return null;
  const m = mean(valid);
  if (m === null) return null;
  const sumSq = valid.reduce((acc, v) => acc + (v - m) ** 2, 0);
  const denom = isSample ? n - 1 : n;
  const v = sumSq / denom;
  return Number.isFinite(v) ? Math.max(0, v) : null;
}

export function std(arr, isSample = true) {
  const v = variance(arr, isSample);
  if (v === null) return null;
  return Math.sqrt(v);
}

export function quantile(arr, q) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  if (q < 0 || q > 1) return null;
  const valid = arr.filter((x) => typeof x === 'number' && !Number.isNaN(x)).sort((a, b) => a - b);
  if (valid.length === 0) return null;
  if (valid.length === 1) return valid[0];

  const pos = (valid.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (valid[base + 1] !== undefined) {
    return valid[base] + rest * (valid[base + 1] - valid[base]);
  }
  return valid[base];
}

export function median(arr) {
  return quantile(arr, 0.5);
}

export function mad(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const med = median(arr);
  if (med === null) return null;
  const diffs = arr
    .filter((x) => typeof x === 'number' && !Number.isNaN(x))
    .map((x) => Math.abs(x - med));
  return median(diffs);
}

export function movingAverage(arr, window = 7) {
  if (!Array.isArray(arr) || window < 1) return [];
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = arr.slice(start, i + 1).filter((x) => typeof x === 'number' && !Number.isNaN(x));
    result.push(slice.length > 0 ? mean(slice) : null);
  }
  return result;
}

export function linearRegression(xs, ys) {
  if (!Array.isArray(xs) || !Array.isArray(ys) || xs.length !== ys.length || xs.length < 2) {
    return null;
  }

  // Filter pairs
  const pairs = [];
  for (let i = 0; i < xs.length; i++) {
    if (
      typeof xs[i] === 'number' &&
      typeof ys[i] === 'number' &&
      !Number.isNaN(xs[i]) &&
      !Number.isNaN(ys[i])
    ) {
      pairs.push([xs[i], ys[i]]);
    }
  }

  const n = pairs.length;
  if (n < 2) return null;

  const validXs = pairs.map((p) => p[0]);
  const validYs = pairs.map((p) => p[1]);

  const xbar = mean(validXs);
  const ybar = mean(validYs);
  if (xbar === null || ybar === null) return null;

  let sxx = 0;
  let sxy = 0;
  let syy = 0;

  for (let i = 0; i < n; i++) {
    const dx = validXs[i] - xbar;
    const dy = validYs[i] - ybar;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }

  if (sxx === 0) {
    // Zero variance in X
    return null;
  }

  const slope = sxy / sxx;
  const intercept = ybar - slope * xbar;

  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const yHat = intercept + slope * validXs[i];
    ssRes += (validYs[i] - yHat) ** 2;
  }

  const r2 = syy > 0 ? Math.max(0, Math.min(1, 1 - ssRes / syy)) : 0;
  const residualStd = n > 2 ? Math.sqrt(ssRes / (n - 2)) : 0;

  return {
    slope: Number.isFinite(slope) ? slope : 0,
    intercept: Number.isFinite(intercept) ? intercept : 0,
    r2: Number.isFinite(r2) ? r2 : 0,
    residualStd: Number.isFinite(residualStd) ? residualStd : 0,
    n,
    xbar,
    sxx,
  };
}

export function predictionInterval(x, model, alpha = 0.05) {
  if (!model || typeof x !== 'number' || Number.isNaN(x)) return null;
  const { slope, intercept, residualStd, n, xbar, sxx } = model;
  if (!n || n < 3 || !residualStd || sxx <= 0) {
    const yHat = intercept + slope * x;
    return {
      fitted: yHat,
      lower: yHat,
      upper: yHat,
      margin: 0,
    };
  }

  const yHat = intercept + slope * x;
  // Approximation of t-critical for 95% interval
  const zCrit = 1.96;
  const leverage = 1 + 1 / n + ((x - xbar) ** 2) / sxx;
  const sePred = residualStd * Math.sqrt(Math.max(0, leverage));
  const margin = zCrit * sePred;

  return {
    fitted: yHat,
    lower: Math.max(0, yHat - margin),
    upper: yHat + margin,
    margin,
  };
}

export function modifiedZScore(x, med, madVal) {
  if (
    typeof x !== 'number' ||
    typeof med !== 'number' ||
    typeof madVal !== 'number' ||
    Number.isNaN(x) ||
    Number.isNaN(med) ||
    Number.isNaN(madVal) ||
    madVal <= 0
  ) {
    return 0;
  }
  const mz = (0.6745 * (x - med)) / madVal;
  return Number.isFinite(mz) ? mz : 0;
}

export function pearson(xs, ys) {
  if (!Array.isArray(xs) || !Array.isArray(ys) || xs.length !== ys.length || xs.length < 2) {
    return null;
  }

  const pairs = [];
  for (let i = 0; i < xs.length; i++) {
    if (
      typeof xs[i] === 'number' &&
      typeof ys[i] === 'number' &&
      !Number.isNaN(xs[i]) &&
      !Number.isNaN(ys[i])
    ) {
      pairs.push([xs[i], ys[i]]);
    }
  }

  const n = pairs.length;
  if (n < 2) return null;

  const validXs = pairs.map((p) => p[0]);
  const validYs = pairs.map((p) => p[1]);

  const mx = mean(validXs);
  const my = mean(validYs);
  if (mx === null || my === null) return null;

  let sxx = 0;
  let syy = 0;
  let sxy = 0;

  for (let i = 0; i < n; i++) {
    const dx = validXs[i] - mx;
    const dy = validYs[i] - my;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }

  if (sxx === 0 || syy === 0) return { r: 0, n, t: 0, p: 1 };

  const r = sxy / Math.sqrt(sxx * syy);
  const clampedR = Math.max(-1, Math.min(1, r));

  // Student's t approximation: t = r * sqrt((n - 2) / (1 - r^2))
  let t = 0;
  let p = 1;
  if (n > 2 && Math.abs(clampedR) < 1) {
    t = clampedR * Math.sqrt((n - 2) / (1 - clampedR * clampedR));
    // Simple 2-tailed p-value approximation via standard normal erf
    const z = Math.abs(t);
    p = 2 * (1 - normalCdf(z));
  } else if (Math.abs(clampedR) === 1) {
    p = 0;
  }

  return {
    r: Number.isFinite(clampedR) ? Math.round(clampedR * 1000) / 1000 : 0,
    n,
    t: Number.isFinite(t) ? Math.round(t * 100) / 100 : 0,
    p: Number.isFinite(p) ? Math.max(0, Math.min(1, Math.round(p * 1000) / 1000)) : 1,
  };
}

function normalCdf(x) {
  // Abramowitz & Stegun formula 7.1.26
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x) / Math.SQRT2;

  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-absX * absX);

  return 0.5 * (1.0 + sign * y);
}

export function wilsonInterval(successes, n, z = 1.96) {
  if (typeof successes !== 'number' || typeof n !== 'number' || n <= 0 || successes < 0) {
    return { center: 0, lower: 0, upper: 0 };
  }
  const p = clamp(successes / n, 0, 1);
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denom;
  const margin = (z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n)) / denom;

  return {
    center: Math.round(center * 1000) / 1000,
    lower: Math.max(0, Math.round((center - margin) * 1000) / 1000),
    upper: Math.min(1, Math.round((center + margin) * 1000) / 1000),
  };
}

export function jaccard(setA, setB) {
  if (!setA || !setB) return 0;
  const a = new Set(setA);
  const b = new Set(setB);
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;

  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
