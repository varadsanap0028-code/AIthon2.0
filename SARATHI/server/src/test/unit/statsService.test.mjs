/**
 * SARATHI Admin Portal — Phase 8: Pure Stats Module Unit Tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  mean,
  variance,
  std,
  median,
  mad,
  quantile,
  movingAverage,
  linearRegression,
  predictionInterval,
  modifiedZScore,
  pearson,
  wilsonInterval,
  jaccard,
  sigmoid,
  clamp,
} from '../../services/stats/statsService.js';

describe('Phase 8: Stats Module Pure Functions', () => {
  describe('Basic Descriptive Stats', () => {
    it('1. Calculates mean, variance, and std correctly', () => {
      const data = [2, 4, 4, 4, 5, 5, 7, 9];
      assert.equal(mean(data), 5);
      assert.equal(variance(data), 4.571428571428571);
      assert.equal(Math.round(std(data) * 1000) / 1000, 2.138);
    });

    it('2. Handles degenerate and empty inputs safely without throwing', () => {
      assert.equal(mean([]), null);
      assert.equal(mean([NaN, null]), null);
      assert.equal(variance([5]), null); // n < 2 for sample variance
      assert.equal(std([]), null);
    });

    it('3. Computes median and MAD accurately', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      assert.equal(median(data), 5);
      assert.equal(mad(data), 2);

      const even = [1, 2, 3, 4];
      assert.equal(median(even), 2.5);
    });

    it('4. Computes moving averages with proper window', () => {
      const series = [10, 20, 30, 40, 50];
      const ma = movingAverage(series, 3);
      assert.equal(ma.length, 5);
      assert.equal(ma[0], 10);
      assert.equal(ma[1], 15);
      assert.equal(ma[2], 20);
      assert.equal(ma[3], 30);
      assert.equal(ma[4], 40);
    });
  });

  describe('Regression & Intervals', () => {
    it('5. Computes linear regression (OLS) with slope, intercept, r2, residualStd', () => {
      const xs = [1, 2, 3, 4, 5];
      const ys = [2, 4, 6, 8, 10]; // Perfect line y = 2x
      const model = linearRegression(xs, ys);
      assert.ok(model);
      assert.equal(Math.round(model.slope * 100) / 100, 2);
      assert.equal(Math.round(model.intercept * 100) / 100, 0);
      assert.equal(model.r2, 1);
      assert.equal(model.residualStd, 0);
    });

    it('6. Handles zero variance or degenerate pairs in regression', () => {
      const xs = [3, 3, 3];
      const ys = [1, 2, 3];
      assert.equal(linearRegression(xs, ys), null);
      assert.equal(linearRegression([], []), null);
    });

    it('7. Calculates 95% prediction interval with widening bands', () => {
      const xs = [1, 2, 3, 4, 5, 6, 7, 8];
      const ys = [2.1, 3.9, 6.2, 8.1, 9.9, 12.1, 14.0, 16.2];
      const model = linearRegression(xs, ys);
      assert.ok(model);

      const predNear = predictionInterval(9, model);
      const predFar = predictionInterval(25, model);

      assert.ok(predNear.margin > 0);
      assert.ok(predFar.margin > predNear.margin, 'Uncertainty band widens farther into the future');
      assert.ok(predNear.lower <= predNear.fitted);
      assert.ok(predNear.upper >= predNear.fitted);
    });
  });

  describe('Modified Z-Score & Anomalies', () => {
    it('8. Flags outliers when modified z-score |mz| > 3.5', () => {
      const baseline = [10, 11, 10, 12, 11, 10, 10, 11];
      const med = median(baseline);
      const m = mad(baseline);

      const normalVal = 12;
      const normalMz = modifiedZScore(normalVal, med, m);
      assert.ok(Math.abs(normalMz) < 3.5);

      const extremeSpike = 50;
      const spikeMz = modifiedZScore(extremeSpike, med, m);
      assert.ok(Math.abs(spikeMz) > 3.5);
    });
  });

  describe('Pearson Correlation & Wilson Intervals', () => {
    it('9. Computes Pearson r accurately with t and p approximation', () => {
      const xs = [10, 20, 30, 40, 50];
      const ys = [15, 25, 35, 45, 55];
      const res = pearson(xs, ys);
      assert.equal(res.r, 1);
      assert.equal(res.p, 0);

      const zeroVar = [1, 1, 1];
      const zeroVarRes = pearson(zeroVar, [1, 2, 3]);
      assert.equal(zeroVarRes.r, 0);
    });

    it('10. Computes Wilson score interval for binomial proportions', () => {
      const res = wilsonInterval(10, 100);
      assert.equal(res.center, 0.115);
      assert.ok(res.lower < 0.1);
      assert.ok(res.upper > 0.1);
      assert.ok(res.lower >= 0);
      assert.ok(res.upper <= 1);
    });

    it('11. Jaccard similarity and utility functions', () => {
      assert.equal(jaccard(['react', 'node'], ['react', 'python']), 1 / 3);
      assert.equal(clamp(150, 0, 100), 100);
      assert.equal(clamp(-10, 0, 100), 0);
      assert.equal(sigmoid(0), 0.5);
    });
  });
});
