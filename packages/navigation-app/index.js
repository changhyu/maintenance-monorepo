/**
 * @format
 */

// SECURITY: IP 패키지 취약점(CVE-2023-42282, CVE-2023-42283) 패치 적용
// 앱 초기화 전에 가장 먼저 로드하여 취약점을 해결
// (기존 ipSafePatch는 효과적이지 않아 새로운 패치 모듈로 교체)
require('./src/utils/applyIpPatch');

import {AppRegistry} from 'react-native';
import App from './src/App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);