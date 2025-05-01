/**
 * Expo modules core patch
 * 
 * This file provides mocks/patches for APIs that have changed or been removed
 * in newer versions of expo-modules-core.
 */

// Mock for createPermissionHook that was removed in newer versions
export const createPermissionHook = () => {
  return () => ({
    granted: true,
    status: 'granted',
    canAskAgain: true,
    expires: 'never',
    get: async () => ({ granted: true, status: 'granted', canAskAgain: true, expires: 'never' }),
    request: async () => ({ granted: true, status: 'granted', canAskAgain: true, expires: 'never' })
  });
};

// Export other required functions that may be used
export const createModuleEventEmitter = () => ({
  addListener: () => ({ remove: () => {} }),
  removeAllListeners: () => {},
});
