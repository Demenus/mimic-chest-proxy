/**
 * Utility to silence console logs from specific packages
 * This is useful for third-party libraries that output excessive logs
 */

// Store original console methods
const originalConsole = {
  log: console.log.bind(console),
  debug: console.debug.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

/**
 * Helper function to check if a log comes from a specific package
 * @param packageName - The name of the package to filter (e.g., 'http-mitm-proxy')
 * @returns true if the log originates from the specified package
 */
function isFromPackage(packageName: string): boolean {
  const stack = new Error().stack;
  if (!stack) return false;
  return stack.includes(packageName) || stack.includes(`node_modules/${packageName}`);
}

/**
 * Silence console logs from a specific package
 * @param packageName - The name of the package to silence (default: 'http-mitm-proxy')
 * @param options - Options to configure which console methods to silence
 */
export function silencePackageLogs(
  packageName: string = 'http-mitm-proxy',
  options: {
    silenceLog?: boolean;
    silenceDebug?: boolean;
    silenceInfo?: boolean;
    silenceWarn?: boolean;
    silenceError?: boolean;
  } = {}
): void {
  const {
    silenceLog = true,
    silenceDebug = true,
    silenceInfo = true,
    silenceWarn = false,
    silenceError = false,
  } = options;

  if (silenceLog) {
    console.log = function (...args: unknown[]) {
      if (!isFromPackage(packageName)) {
        originalConsole.log(...args);
      }
    };
  }

  if (silenceDebug) {
    console.debug = function (...args: unknown[]) {
      if (!isFromPackage(packageName)) {
        originalConsole.debug(...args);
      }
    };
  }

  if (silenceInfo) {
    console.info = function (...args: unknown[]) {
      if (!isFromPackage(packageName)) {
        originalConsole.info(...args);
      }
    };
  }

  if (silenceWarn) {
    console.warn = function (...args: unknown[]) {
      if (!isFromPackage(packageName)) {
        originalConsole.warn(...args);
      }
    };
  }

  if (silenceError) {
    console.error = function (...args: unknown[]) {
      if (!isFromPackage(packageName)) {
        originalConsole.error(...args);
      }
    };
  }
}

/**
 * Restore original console methods
 */
export function restoreConsole(): void {
  console.log = originalConsole.log;
  console.debug = originalConsole.debug;
  console.info = originalConsole.info;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
}

