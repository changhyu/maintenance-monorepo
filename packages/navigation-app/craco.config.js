const path = require('path');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // 기존 fallback 설정 유지
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        "path": require.resolve("path-browserify"),
        "fs": false,
        "stream": require.resolve("stream-browserify"),
        "buffer": require.resolve("buffer/"),
        "util": require.resolve("util/"),
        "url": require.resolve("url/"),
        "crypto": require.resolve("crypto-browserify")
      };
      
      // 아이콘 폴리필 경로
      const iconPolyfillPath = path.resolve(__dirname, 'src/polyfills/MaterialIcons.js');
      
      // React Native 웹 호환성 설정 강화
      webpackConfig.resolve.alias = {
        ...webpackConfig.resolve.alias,
        'react-native$': 'react-native-web',
        
        // React Native 모듈 폴리필
        '@react-native-async-storage/async-storage': require.resolve('./src/polyfills/AsyncStorage'),
        'react-native-maps': require.resolve('./src/polyfills/ReactNativeMaps.js'),
        'react-native-svg': require.resolve('./src/polyfills/ReactNativeSVG'),
        '@react-native-community/datetimepicker': require.resolve('./src/polyfills/DateTimePicker'),
        '@react-native-community/netinfo': require.resolve('./src/polyfills/NetInfo'),
        
        // React Navigation 폴리필
        '@react-navigation/native': require.resolve('./src/polyfills/ReactNavigation'),
        '@react-navigation/stack': require.resolve('./src/polyfills/ReactNavigation'),
        '@react-navigation/bottom-tabs': require.resolve('./src/polyfills/ReactNavigation'),
        '@react-navigation/native-stack': require.resolve('./src/polyfills/ReactNavigation'),
        'react-native-safe-area-context': require.resolve('./src/polyfills/ReactNavigation'),
        'react-native-screens': 'react-native-web',
        
        // TurboModuleRegistry polyfill
        'react-native/Libraries/TurboModule/TurboModuleRegistry': require.resolve('./src/polyfills/TurboModuleRegistry'),
        
        // Expo 모듈 폴리필
        'expo-modules-core': require.resolve('./src/polyfills/ExpoModulesCore'),
        'expo-speech-recognition': require.resolve('./src/polyfills/ExpoSpeechRecognition'),
        'expo-file-system': require.resolve('./src/polyfills/ExpoFileSystem'),
        'expo-location': require.resolve('./src/polyfills/ExpoLocation'),
        'expo-status-bar': require.resolve('./src/polyfills/ExpoStatusBar'),
        '@expo/vector-icons': require.resolve('./src/polyfills/ExpoVectorIcons'),
        
        // Vector Icons 폴리필 - 모든 아이콘 세트를 단일 폴리필로 처리
        'react-native-vector-icons': require.resolve('./src/polyfills/ReactNativeVectorIcons'),
        'react-native-vector-icons/MaterialIcons': iconPolyfillPath,
        'react-native-vector-icons/FontAwesome': iconPolyfillPath,
        'react-native-vector-icons/MaterialCommunityIcons': iconPolyfillPath,
        'react-native-vector-icons/Ionicons': iconPolyfillPath,
        'react-native-vector-icons/Octicons': iconPolyfillPath,
        'react-native-vector-icons/AntDesign': iconPolyfillPath,
        'react-native-vector-icons/Entypo': iconPolyfillPath,
        'react-native-vector-icons/Feather': iconPolyfillPath,
        'react-native-vector-icons/FontAwesome5': iconPolyfillPath,
        'react-native-vector-icons/Foundation': iconPolyfillPath,
        'react-native-vector-icons/SimpleLineIcons': iconPolyfillPath,
        'react-native-vector-icons/Zocial': iconPolyfillPath,
        
        // 기타 Native 모듈 폴리필
        'react-native-fs': require.resolve('./src/polyfills/ReactNativeFS'),
        
        // 추가 React Native 모듈 처리
        'react-native-gesture-handler': 'react-native-web',
        'react-native-reanimated': 'react-native-web',
        'react-native/Libraries/Utilities/codegenNativeCommands': require.resolve('./src/polyfills/codegenNativeCommands'),
        'react-native/Libraries/Components/View/ViewNativeComponent': 'react-native-web/dist/vendor/react-native/NativeComponent/index',
      };
      
      // 확장자 처리 강화
      webpackConfig.resolve.extensions = [
        '.web.js', 
        '.web.jsx', 
        '.web.ts', 
        '.web.tsx', 
        ...webpackConfig.resolve.extensions
      ];

      // TypeScript 변환을 위한 처리 추가
      const tsRule = webpackConfig.module.rules.find(
        rule => rule.test && rule.test.toString().includes('tsx')
      );

      if (tsRule) {
        // TypeScript 로더 강화 - type import 키워드 지원
        if (Array.isArray(tsRule.use)) {
          tsRule.use.forEach(loader => {
            if (loader.loader && loader.loader.includes('babel-loader')) {
              if (!loader.options) loader.options = {};
              if (!loader.options.plugins) loader.options.plugins = [];
              // TypeScript 관련 플러그인 추가
              loader.options.plugins.push('@babel/plugin-transform-typescript');
            }
          });
        }
      }
      
      // Vector Icons 및 기타 문제가 되는 모듈을 위한 webpack 규칙 추가
      webpackConfig.module.rules = [
        ...webpackConfig.module.rules,
        {
          test: /\.(js|jsx|ts|tsx)$/,
          include: [
            /node_modules\/@react-native-async-storage\/async-storage/,
            /node_modules\/react-native-maps/,
            /node_modules\/react-native-gesture-handler/,
            /node_modules\/react-native-reanimated/,
            /node_modules\/@expo\/vector-icons/,
            /node_modules\/@react-native\/assets-registry/,
            /node_modules\/react-native-document-picker/,
            /node_modules\/expo-modules-core/,
            /node_modules\/expo-speech-recognition/,
            /node_modules\/expo-file-system/,
            /node_modules\/expo-location/,
            /node_modules\/expo-status-bar/,
            /node_modules\/@react-navigation\//,
            /node_modules\/react-native-safe-area-context/,
            /node_modules\/react-native-screens/,
            /node_modules\/@react-native-community\/netinfo/,
            /node_modules\/@react-native-community\/datetimepicker/,
            /node_modules\/react-native-vector-icons/, // 추가: Vector Icons에 대한 처리
          ],
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                '@babel/preset-env', 
                '@babel/preset-react',
                '@babel/preset-typescript', 
                '@babel/preset-flow'
              ],
              plugins: [
                '@babel/plugin-proposal-class-properties',
                '@babel/plugin-syntax-flow',
                '@babel/plugin-transform-typescript'
              ]
            }
          }
        },
        // Vector Icons의 글꼴 파일 처리 규칙 추가
        {
          test: /\.(ttf|eot|svg|woff|woff2)$/,
          use: {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
              outputPath: 'fonts/',
            }
          }
        }
      ];

      // Add resolve.mainFields to prioritize the correct entry points
      webpackConfig.resolve.mainFields = ['browser', 'module', 'main'];
      
      return webpackConfig;
    }
  },
  plugins: [],
  babel: {
    presets: [
      '@babel/preset-react',
      '@babel/preset-typescript',
      '@babel/preset-flow'
    ],
    // 통일된 loose 모드 설정으로 플러그인 구성
    plugins: [
      ['@babel/plugin-proposal-class-properties', { loose: true }],
      ['@babel/plugin-proposal-private-methods', { loose: true }],
      ['@babel/plugin-proposal-private-property-in-object', { loose: true }],
      '@babel/plugin-syntax-jsx',
      '@babel/plugin-syntax-flow',
      '@babel/plugin-transform-typescript'
    ],
    loaderOptions: {
      ignore: ['./node_modules/react-native/']
    }
  },
  jest: {
    configure: {
      moduleNameMapper: {
        '^react-native$': 'react-native-web'
      }
    }
  }
};