/**
 * Mobile API Package
 * 
 * This package provides API endpoints specifically for mobile applications.
 */

export interface MobileApiConfig {
  port: number;
  host: string;
  apiVersion: string;
}

/**
 * Default configuration for mobile API
 */
export const defaultConfig: MobileApiConfig = {
  port: 8002,
  host: '0.0.0.0',
  apiVersion: 'v1',
};

/**
 * Initialize mobile API server
 */
export function initializeMobileApi(config: MobileApiConfig = defaultConfig): void {
  // eslint-disable-next-line no-console
  console.log(`Mobile API initialized with config:`, config);
}