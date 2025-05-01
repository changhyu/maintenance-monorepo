
// 브라우저 환경을 위한 폴리필
if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || require('buffer').Buffer;
  window.process = window.process || require('process/browser');
  window.util = window.util || require('util');
  window.url = window.url || require('url');
}
