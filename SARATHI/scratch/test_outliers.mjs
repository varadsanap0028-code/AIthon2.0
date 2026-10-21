import { PythonDriver } from '../server/src/services/runner/pythonDriver.js';
import { RunnerDriver } from '../server/src/services/runner/runnerDriver.js';

const driver = new PythonDriver();

const code = `
def detect_outliers_iqr(data):
    if not data or len(data) < 4:
        return []
    sorted_data = sorted(data)
    n = len(sorted_data)
    
    def median(lst):
        m = len(lst)
        if m % 2 == 1:
            return lst[m // 2]
        return (lst[m // 2 - 1] + lst[m // 2]) / 2.0

    if n % 2 == 0:
        lower_half = sorted_data[:n // 2]
        upper_half = sorted_data[n // 2:]
    else:
        lower_half = sorted_data[:n // 2]
        upper_half = sorted_data[n // 2 + 1:]

    q1 = median(lower_half)
    q3 = median(upper_half)
    iqr = q3 - q1
    lower_bound = q1 - 1.5 * iqr
    upper_bound = q3 + 1.5 * iqr

    return [x for x in data if x < lower_bound or x > upper_bound]
`;

const tests = [
  { id: 'v1', kind: 'visible', input: 'from solution import detect_outliers_iqr\nprint(detect_outliers_iqr([10, 12, 12, 13, 12, 11, 100]))\n', expectedOutput: '[100]' },
  { id: 'v2', kind: 'visible', input: 'from solution import detect_outliers_iqr\nprint(detect_outliers_iqr([1, 2, 3, 4, 5]))\n', expectedOutput: '[]' },
  { id: 'v3', kind: 'visible', input: 'from solution import detect_outliers_iqr\nprint(detect_outliers_iqr([]))\n', expectedOutput: '[]' },
  { id: 'h1', kind: 'hidden', input: 'from solution import detect_outliers_iqr\nprint(detect_outliers_iqr([-50, 10, 11, 12, 13, 14, 50]))\n', expectedOutput: '[-50, 50]' },
  { id: 'h2', kind: 'hidden', input: 'from solution import detect_outliers_iqr\nprint(detect_outliers_iqr([5, 5, 5, 5]))\n', expectedOutput: '[]' }
];

console.log('Testing RunnerDriver with detect_outliers_iqr...');
const res = await RunnerDriver.run({ language: 'python', code, tests });
console.log('Status:', res.status);
console.log('Passed:', res.passed, '/', res.total);
console.log('Results:', JSON.stringify(res.results, null, 2));
