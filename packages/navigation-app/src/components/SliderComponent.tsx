import React from 'react';
import { View, StyleSheet } from 'react-native';

// 임시 슬라이더 컴포넌트 - 실제 구현에서는 'npm install @react-native-community/slider' 설치 후
// import Slider from '@react-native-community/slider'; 사용 권장

interface SliderComponentProps {
  minimumValue: number;
  maximumValue: number;
  value: number;
  onValueChange: (value: number) => void;
  minimumTrackTintColor?: string;
  maximumTrackTintColor?: string;
  thumbTintColor?: string;
  step?: number;
  style?: any;
}

export const SliderComponent: React.FC<SliderComponentProps> = (props) => {
  // 실제 슬라이더 대신 임시 UI
  return (
    <View style={[styles.container, props.style]}>
      <View style={[styles.track, { backgroundColor: props.maximumTrackTintColor || '#e0e0e0' }]}>
        <View
          style={[
            styles.fill,
            {
              backgroundColor: props.minimumTrackTintColor || '#007AFF',
              width: `${((props.value - props.minimumValue) / (props.maximumValue - props.minimumValue)) * 100}%`
            }
          ]}
        />
        <View
          style={[
            styles.thumb,
            {
              backgroundColor: props.thumbTintColor || '#007AFF',
              left: `${((props.value - props.minimumValue) / (props.maximumValue - props.minimumValue)) * 100}%`
            }
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 40,
    justifyContent: 'center',
  },
  track: {
    height: 4,
    borderRadius: 2,
    position: 'relative',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    top: -8,
    marginLeft: -10,
  }
});