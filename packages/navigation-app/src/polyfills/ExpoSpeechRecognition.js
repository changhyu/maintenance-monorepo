/**
 * Mock implementation of expo-speech-recognition for web environment
 */

// Basic result type for speech recognition
const RecognitionResult = {
  ERROR: 'ERROR',
  NO_MATCH: 'NO_MATCH',
  RECORDING: 'RECORDING',
  RECOGNIZED: 'RECOGNIZED'
};

// Status types for speech recognition
const RecognitionStatus = {
  STARTED: 'STARTED',
  STOPPED: 'STOPPED',
  ERROR: 'ERROR'
};

// Mock of the speech recognition module
const SpeechRecognition = {
  isAvailableAsync: async () => true,
  startListeningAsync: async (options = {}) => ({
    status: RecognitionStatus.STARTED,
  }),
  stopListeningAsync: async () => ({
    status: RecognitionStatus.STOPPED,
  }),
  getPermissionsAsync: async () => ({
    granted: true,
    status: 'granted',
    canAskAgain: true,
    expires: 'never'
  }),
  requestPermissionsAsync: async () => ({
    granted: true,
    status: 'granted',
    canAskAgain: true,
    expires: 'never'
  }),
  addListener: (eventName, listener) => ({
    remove: () => {}
  }),
  removeAllListeners: () => {}
};

export default SpeechRecognition;
export { RecognitionResult, RecognitionStatus };
