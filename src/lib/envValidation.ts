/**
 * envValidation.ts
 * ────────────────
 * Environment validation utilities.
 * Ensures app has required Firebase config and other critical settings.
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate Firebase environment configuration.
 */
export function validateFirebaseConfig(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const requiredKeys = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
  ];

  const missing = requiredKeys.filter(key => !import.meta.env[key as never]);
  if (missing.length > 0) {
    errors.push(`Missing Firebase config: ${missing.join(', ')}`);
  }

  // Warn if using development/test project
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  if (projectId && projectId.includes('test')) {
    warnings.push('Using test Firebase project - switch to production before deployment');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate browser capabilities for offline support.
 */
export function validateBrowserCapabilities(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check IndexedDB support
  if (!window.indexedDB) {
    warnings.push('IndexedDB not available - offline persistence disabled');
  }

  // Check localStorage support
  try {
    localStorage.setItem('test', 'test');
    localStorage.removeItem('test');
  } catch {
    warnings.push('localStorage not available - device mode will not persist');
  }

  // Check Promise support
  if (typeof Promise === 'undefined') {
    errors.push('Promises not supported - app requires ES2015+');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Run all validation checks.
 */
export function validateEnvironment(): ValidationResult {
  const firebaseResult = validateFirebaseConfig();
  const browserResult = validateBrowserCapabilities();

  return {
    isValid: firebaseResult.isValid && browserResult.isValid,
    errors: [...firebaseResult.errors, ...browserResult.errors],
    warnings: [...firebaseResult.warnings, ...browserResult.warnings],
  };
}

/**
 * Format validation result for logging.
 */
export function logValidationResult(result: ValidationResult, context = 'Environment'): void {
  if (result.errors.length > 0) {
    console.error(`❌ ${context} Validation Failed:`);
    result.errors.forEach(err => console.error(`   - ${err}`));
  }

  if (result.warnings.length > 0) {
    console.warn(`⚠️  ${context} Warnings:`);
    result.warnings.forEach(warn => console.warn(`   - ${warn}`));
  }

  if (result.isValid && result.warnings.length === 0) {
    console.log(`✅ ${context} validation passed`);
  }
}
