import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useOfflineManager } from '../context/OfflineContext';
import { colors, spacing, typography } from '../theme';

const OfflineNotice: React.FC = () => {
  const { isOffline, lastSyncTime } = useOfflineManager();
  const [fadeAnim] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    if (isOffline) {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOffline]);

  if (!isOffline) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [
            {
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-20, 0],
              }),
            },
          ],
        },
      ]}
    >
      <Text style={styles.text}>
        오프라인 모드입니다. 마지막 동기화: {lastSyncTime}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.warning,
    padding: spacing.s,
    zIndex: 1000,
  },
  text: {
    ...typography.caption,
    color: colors.surface,
    textAlign: 'center',
  },
});

export default OfflineNotice; 