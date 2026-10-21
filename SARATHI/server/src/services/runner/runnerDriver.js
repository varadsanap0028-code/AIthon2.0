import { assessmentV2 } from '../../config/index.js';
import { LocalDevDriver } from './localDevDriver.js';
import { SqlDriver } from './sqlDriver.js';
import { PythonDriver } from './pythonDriver.js';
import { IsolatedVmDriver } from './isolatedVmDriver.js';
import { Judge0Driver } from './judge0Driver.js';

export class RunnerDriver {
  /**
   * Factory: selects appropriate driver based on language and configuration
   */
  static getDriver(language = 'javascript', forcedDriver = null) {
    if (language === 'sql') {
      return new SqlDriver();
    }

    if (language === 'python') {
      return new PythonDriver();
    }

    const driverType = forcedDriver || assessmentV2.runnerDriver;

    switch (driverType) {
      case 'judge0':
        return new Judge0Driver();
      case 'isolated-vm':
        return new IsolatedVmDriver();
      case 'local-dev':
        return new LocalDevDriver();
      default:
        // When V2.1 is enabled, candidate code never runs in server process -> IsolatedVmDriver
        if (assessmentV2.v2_1Enabled) {
          return new IsolatedVmDriver();
        }
        return new LocalDevDriver();
    }
  }

  /**
   * Universal execution interface
   * @param {Object} options
   * @param {string} options.language - 'javascript' | 'python' | 'sql'
   * @param {string} options.code - submitted source code
   * @param {Array} options.tests - array of { id, kind, input, expectedOutput, timeoutMs }
   * @param {Object} options.limits - { timeoutMs, maxMemoryMb }
   */
  static async run({ language, code, tests = [], limits = {} }) {
    const driver = this.getDriver(language);
    return driver.run({ language, code, tests, limits });
  }
}
