// 폴리필 먼저 로드
import './polyfills';

import React from 'react';
import { AppRegistry } from 'react-native';
import App from './App';

// 앱 이름 등록
AppRegistry.registerComponent('NavigationApp', () => App);

// 웹에서 실행할 때 사용
if (typeof window !== 'undefined') {
  AppRegistry.runApplication('NavigationApp', {
    initialProps: {},
    rootTag: document.getElementById('root')
  });
}

export default App; 