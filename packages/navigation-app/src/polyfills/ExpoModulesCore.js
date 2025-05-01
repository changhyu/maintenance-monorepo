/**
 * Mock implementation of expo-modules-core for web environment
 */

// Simple UUID v4 generator
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Base error class with error code
class CodedError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'CodedError';
    this.code = code;
  }
}

// Error thrown when a native module is not available
class UnavailabilityError extends CodedError {
  constructor(moduleName, functionName) {
    super(
      'ERR_UNAVAILABLE',
      `The method or property ${functionName || ''} is not available on ${moduleName}. ` +
      'This feature is only available in native environments.'
    );
    this.name = 'UnavailabilityError';
  }
}

// Dummy event subscription
class EventSubscription {
  remove() {}
}

// Platform detection utility
const Platform = {
  OS: 'web',
  Version: 1,
  select: (obj) => obj.web || obj.default || {},
  isWeb: true,
  isIOS: false,
  isAndroid: false
};

// Permission status enum
const PermissionStatus = {
  GRANTED: 'granted',
  DENIED: 'denied',
  UNDETERMINED: 'undetermined'
};

// EventEmitter class implementation
class EventEmitter {
  constructor() {
    this._listeners = {};
  }

  addListener(eventName, listener) {
    if (!this._listeners[eventName]) {
      this._listeners[eventName] = [];
    }
    this._listeners[eventName].push(listener);
    
    return {
      remove: () => this.removeListener(eventName, listener)
    };
  }

  removeListener(eventName, listener) {
    if (!this._listeners[eventName]) return;
    const index = this._listeners[eventName].indexOf(listener);
    if (index !== -1) {
      this._listeners[eventName].splice(index, 1);
    }
  }
  
  removeAllListeners(eventName) {
    if (eventName === undefined) {
      this._listeners = {};
    } else {
      delete this._listeners[eventName];
    }
  }
  
  emit(eventName, ...args) {
    const listeners = this._listeners[eventName];
    if (!listeners) return;
    
    listeners.forEach(listener => {
      try {
        listener(...args);
      } catch (e) {
        console.error(`Error in listener for event ${eventName}:`, e);
      }
    });
  }
}

// Mock native module implementation
const nativeModules = {};

// Mock requireNativeModule function
const requireNativeModule = (moduleName) => {
  if (nativeModules[moduleName]) {
    return nativeModules[moduleName];
  }

  // Create a proxy object that throws UnavailabilityError when methods are called
  return new Proxy({}, {
    get: (target, prop) => {
      if (prop in target) return target[prop];
      
      // Return a function that throws an error when called
      return () => {
        throw new UnavailabilityError(moduleName, prop);
      };
    }
  });
};

// Mock requireOptionalNativeModule function - returns null instead of throwing
const requireOptionalNativeModule = (moduleName) => {
  if (nativeModules[moduleName]) {
    return nativeModules[moduleName];
  }

  return null;
};

// Mock for createPermissionHook that was removed in newer versions
const createPermissionHook = (permissionName) => {
  return () => ({
    granted: true,
    status: PermissionStatus.GRANTED,
    canAskAgain: true,
    expires: 'never',
    get: async () => ({ granted: true, status: PermissionStatus.GRANTED, canAskAgain: true, expires: 'never' }),
    request: async () => ({ granted: true, status: PermissionStatus.GRANTED, canAskAgain: true, expires: 'never' })
  });
};

// Mock for module event emitter
const createModuleEventEmitter = () => ({
  addListener: () => new EventSubscription(),
  removeAllListeners: () => {},
});

export { 
  EventSubscription, 
  UnavailabilityError, 
  uuid, 
  Platform, 
  CodedError, 
  PermissionStatus,
  createPermissionHook,
  createModuleEventEmitter,
  EventEmitter,
  requireNativeModule,
  requireOptionalNativeModule
};