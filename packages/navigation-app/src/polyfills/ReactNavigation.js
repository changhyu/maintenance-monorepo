/**
 * React Navigation 패키지들을 위한 폴리필
 * 웹 환경에서 React Navigation (@react-navigation/native, @react-navigation/stack 등)의 
 * 기본 기능을 제공합니다.
 */

import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { View } from 'react-native-web';

// =============== 네비게이션 컨텍스트 ===============
const NavigationContext = createContext(null);
const NavigationStateContext = createContext(null);

// =============== 유틸리티 함수 ===============
const createNavigatorFactory = (Navigator) => {
  return (options = {}) => {
    return (props) => {
      return React.createElement(Navigator, { ...options, ...props });
    };
  };
};

const useNavigation = () => {
  const navigation = useContext(NavigationContext);
  if (navigation === null) {
    throw new Error("Couldn't find a navigation object. Is your component inside NavigationContainer?");
  }
  return navigation;
};

const useRoute = () => {
  const navigation = useNavigation();
  return navigation.route || { name: 'Unknown', key: 'unknown', params: {} };
};

const useFocusEffect = (callback) => {
  const navigation = useNavigation();
  
  useEffect(() => {
    const unsubscribeFocus = navigation.addListener?.('focus', () => {
      callback();
    });
    
    return () => {
      unsubscribeFocus?.();
    };
  }, [callback, navigation]);
};

// 스크린 옵션 설정
const createScreenOptions = (options) => {
  return options;
};

// =============== 네비게이션 컨테이너 ===============
const NavigationContainer = ({ children, theme, onReady, onStateChange, initialState }) => {
  const [state, setState] = useState(initialState || { routes: [], index: 0 });
  
  useEffect(() => {
    if (onReady) {
      onReady();
    }
  }, [onReady]);

  useEffect(() => {
    if (onStateChange) {
      onStateChange(state);
    }
  }, [onStateChange, state]);

  // 공통 네비게이션 객체 생성
  const navigation = {
    navigate: (name, params) => {
      console.log(`Navigation requested to: ${name} with params:`, params);
      // 네비게이션 로직은 웹 환경에서 window.location 등으로 구현 가능
    },
    goBack: () => {
      console.log('Navigation goBack requested');
      if (typeof window !== 'undefined') {
        window.history.back();
      }
    },
    reset: (newState) => {
      console.log('Navigation reset with new state:', newState);
      setState(newState);
    },
    setParams: (params) => {
      console.log('Navigation setParams:', params);
    },
    addListener: (event, callback) => {
      return { remove: () => {} };
    },
    isFocused: () => true,
    dispatch: (action) => {
      console.log('Navigation dispatch action:', action);
      return true;
    },
    getParent: () => null,
    route: { name: 'Home', key: 'home', params: {} },
  };

  const navigationStateValue = {
    getState: () => state,
    setState,
  };

  return React.createElement(
    NavigationContext.Provider,
    { value: navigation },
    React.createElement(
      NavigationStateContext.Provider,
      { value: navigationStateValue },
      children
    )
  );
};

// =============== Native Stack Navigator ===============
const createNativeStackNavigator = () => {
  const NativeStackContext = createContext(null);

  const NativeStackNavigator = ({ initialRouteName, screenOptions, children }) => {
    const screens = React.Children.toArray(children);
    const [activeRouteName, setActiveRouteName] = useState(initialRouteName || (screens[0]?.props?.name || 'Home'));

    // 화면 렌더링 기능
    const renderScreen = () => {
      const activeScreen = screens.find(screen => screen.props.name === activeRouteName);
      if (!activeScreen) {
        return null;
      }

      const { component: Component, options } = activeScreen.props;
      
      // 화면 옵션 병합
      const mergedOptions = {
        ...(typeof screenOptions === 'function' ? screenOptions({ route: { name: activeRouteName } }) : screenOptions),
        ...(typeof options === 'function' ? options({ route: { name: activeRouteName } }) : options),
      };

      // 네비게이션 객체 확장
      const navigation = useNavigation();
      const stackNavigation = {
        ...navigation,
        // Stack 특화 메서드 추가
        replace: (name, params) => {
          console.log(`Stack replace to: ${name}`);
          setActiveRouteName(name);
        },
        push: (name, params) => {
          console.log(`Stack push to: ${name}`);
          setActiveRouteName(name);
        },
        pop: (count = 1) => {
          console.log(`Stack pop ${count} screens`);
          // 실제 pop 로직은 스택 히스토리에 따라 다름
        },
        popToTop: () => {
          console.log('Stack popToTop');
          // 첫 화면으로 돌아가는 로직
        },
      };

      return (
        <NavigationContext.Provider value={stackNavigation}>
          <View style={{ flex: 1 }}>
            {mergedOptions.header && (
              <View style={{ height: 56, backgroundColor: mergedOptions.headerStyle?.backgroundColor || '#f8f8f8', padding: 10 }}>
                {typeof mergedOptions.header === 'function' 
                  ? mergedOptions.header({ navigation: stackNavigation })
                  : mergedOptions.headerTitle || activeRouteName}
              </View>
            )}
            <Component navigation={stackNavigation} route={{ name: activeRouteName, key: activeRouteName }} />
          </View>
        </NavigationContext.Provider>
      );
    };

    // Stack 네비게이션 컨텍스트 값
    const stackContextValue = {
      navigate: (name) => setActiveRouteName(name),
    };

    return (
      <NativeStackContext.Provider value={stackContextValue}>
        {renderScreen()}
      </NativeStackContext.Provider>
    );
  };

  const Screen = ({ name, component, options }) => {
    // 이 컴포넌트는 직접 렌더링되지 않고 네비게이터에서 참조됨
    return null;
  };

  return {
    Navigator: NativeStackNavigator,
    Screen,
    Group: ({ children }) => children,
  };
};

// =============== Tab Navigator ===============
const createBottomTabNavigator = () => {
  const TabContext = createContext(null);
  
  const BottomTabNavigator = ({ initialRouteName, screenOptions, children }) => {
    const screens = React.Children.toArray(children);
    const [activeRouteName, setActiveRouteName] = useState(initialRouteName || (screens[0]?.props?.name || 'Home'));

    // 바텀 탭 스타일 옵션 기본값
    const defaultTabBarOptions = {
      activeTintColor: '#1976d2',
      inactiveTintColor: '#757575',
      showLabel: true,
      showIcon: true,
      allowFontScaling: true,
      adaptive: true,
      keyboardHidesTabBar: false,
      style: { height: 60 },
    };

    // 합쳐진 옵션
    const mergedOptions = {
      ...defaultTabBarOptions,
      ...(typeof screenOptions === 'function' ? screenOptions({ route: { name: activeRouteName } }) : screenOptions),
    };

    // 탭 렌더링
    const renderTabs = () => {
      return (
        <View style={{ 
          flexDirection: 'row', 
          height: 60, 
          borderTopWidth: 1, 
          borderTopColor: '#e0e0e0', 
          backgroundColor: '#fff',
          ...mergedOptions.style 
        }}>
          {screens.map(screen => {
            const { name, options } = screen.props;
            const isActive = name === activeRouteName;
            const tintColor = isActive ? mergedOptions.activeTintColor : mergedOptions.inactiveTintColor;
            
            // 개별 탭 옵션
            const tabOptions = typeof options === 'function' ? options({ route: { name } }) : (options || {});
            
            return (
              <View 
                key={name} 
                style={{ 
                  flex: 1, 
                  alignItems: 'center', 
                  justifyContent: 'center',
                }}
                onClick={() => setActiveRouteName(name)}
              >
                {tabOptions.tabBarIcon && mergedOptions.showIcon && (
                  tabOptions.tabBarIcon({ focused: isActive, color: tintColor, size: 24 })
                )}
                {mergedOptions.showLabel && (
                  <View>
                    {tabOptions.tabBarLabel || name}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      );
    };

    // 활성 화면 컴포넌트 렌더링
    const renderScreen = () => {
      const activeScreen = screens.find(screen => screen.props.name === activeRouteName);
      if (!activeScreen) return null;

      const { component: Component, name } = activeScreen.props;
      
      // 네비게이션 객체
      const navigation = useNavigation();
      const tabNavigation = {
        ...navigation,
        jumpTo: (routeName) => {
          console.log(`Tab jumpTo: ${routeName}`);
          setActiveRouteName(routeName);
        },
      };

      return (
        <NavigationContext.Provider value={tabNavigation}>
          <Component navigation={tabNavigation} route={{ name, key: name }} />
        </NavigationContext.Provider>
      );
    };

    return (
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          {renderScreen()}
        </View>
        {renderTabs()}
      </View>
    );
  };

  const Screen = ({ name, component, options }) => {
    // 이 컴포넌트는 직접 렌더링되지 않고 네비게이터에서 참조됨
    return null;
  };

  return {
    Navigator: BottomTabNavigator,
    Screen,
  };
};

// =============== Stack Navigator ===============
const createStackNavigator = () => {
  // 구현은 NativeStackNavigator와 유사하므로 재사용
  const implementation = createNativeStackNavigator();
  
  // 변경된 옵션 키 등 호환성을 위해 래퍼 제공
  const StackNavigator = (props) => {
    // StackNavigator에 특화된 프로퍼티 변환
    const translatedProps = { ...props };
    return React.createElement(implementation.Navigator, translatedProps);
  };
  
  return {
    Navigator: StackNavigator,
    Screen: implementation.Screen,
    Group: implementation.Group,
  };
};

// =============== 안전 영역 컨텍스트 ===============
const SafeAreaContext = createContext({
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
});

const SafeAreaProvider = ({ children, initialMetrics }) => {
  const metrics = initialMetrics || {
    frame: { x: 0, y: 0, width: 0, height: 0 },
    insets: { top: 0, left: 0, right: 0, bottom: 0 },
  };
  
  return React.createElement(
    SafeAreaContext.Provider,
    { value: metrics.insets },
    children
  );
};

const SafeAreaView = ({ children, style }) => {
  const insets = useContext(SafeAreaContext);
  
  const safeAreaStyle = {
    paddingTop: insets.top,
    paddingRight: insets.right,
    paddingBottom: insets.bottom,
    paddingLeft: insets.left,
  };
  
  return React.createElement(
    View,
    { style: [style, safeAreaStyle] },
    children
  );
};

const useSafeAreaInsets = () => {
  return useContext(SafeAreaContext);
};

// =============== 모듈 내보내기 ===============

// @react-navigation/native 호환 내보내기
const NativeNavigation = {
  NavigationContainer,
  useNavigation,
  useRoute,
  useFocusEffect,
  useNavigationState: () => {
    const { getState } = useContext(NavigationStateContext);
    return getState;
  },
  CommonActions: {
    navigate: (name, params) => ({ type: 'NAVIGATE', payload: { name, params } }),
    goBack: () => ({ type: 'GO_BACK' }),
    reset: (state) => ({ type: 'RESET', payload: state }),
    setParams: (params) => ({ type: 'SET_PARAMS', payload: { params } }),
  },
  StackActions: {
    push: (name, params) => ({ type: 'PUSH', payload: { name, params } }),
    pop: (count = 1) => ({ type: 'POP', payload: { count } }),
    popToTop: () => ({ type: 'POP_TO_TOP' }),
  },
};

// @react-navigation/native-stack 호환 내보내기
const NativeStackNavigation = {
  createNativeStackNavigator,
};

// @react-navigation/stack 호환 내보내기
const StackNavigation = {
  createStackNavigator,
  TransitionPresets: {
    SlideFromRightIOS: {},
    ModalSlideFromBottomIOS: {},
    ModalPresentationIOS: {},
    DefaultTransition: {},
    ModalTransition: {},
  },
  HeaderStyleInterpolators: {
    forUIKit: () => {},
    forFade: () => {},
    forStatic: () => {},
  },
  CardStyleInterpolators: {
    forHorizontalIOS: () => {},
    forVerticalIOS: () => {},
    forModalPresentationIOS: () => {},
    forFadeFromBottomAndroid: () => {},
    forFade: () => {},
  },
};

// @react-navigation/bottom-tabs 호환 내보내기
const BottomTabsNavigation = {
  createBottomTabNavigator,
};

// react-native-safe-area-context 호환 내보내기
const SafeAreaNavigation = {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
};

export {
  NativeNavigation,
  NativeStackNavigation,
  StackNavigation,
  BottomTabsNavigation,
  SafeAreaNavigation,
};