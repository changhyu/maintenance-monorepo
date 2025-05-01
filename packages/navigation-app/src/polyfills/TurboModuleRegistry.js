/**
 * Mock implementation of TurboModuleRegistry for web environment
 */
const TurboModuleRegistry = {
  get: (name) => {
    console.warn(`TurboModuleRegistry.get('${name}') called in web environment. Using empty mock.`);
    return {};
  },
  getEnforcing: (name) => {
    console.warn(`TurboModuleRegistry.getEnforcing('${name}') called in web environment. Using empty mock.`);
    return {
      getConstants: () => ({}),
      pick: () => Promise.resolve([]),
      pickDirectory: () => Promise.resolve([]),
      pickSingle: () => Promise.resolve({}),
      pickMultiple: () => Promise.resolve([])
    };
  }
};

export default { TurboModuleRegistry };