import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LocationPoint } from '../../../services/LocationService';

interface RouteHeaderProps {
  origin: LocationPoint | null;
  destination: LocationPoint | null;
  onSelectOrigin: () => void;
  onSelectDestination: () => void;
}

/**
 * 출발지와 목적지를 표시하고 선택할 수 있는 컴포넌트
 */
const RouteHeader: React.FC<RouteHeaderProps> = ({
  origin,
  destination,
  onSelectOrigin,
  onSelectDestination,
}) => {
  return (
    <View style={styles.routeHeaderContainer}>
      <View style={styles.locationContainer}>
        <MaterialIcons name="trip-origin" size={24} color="#4CAF50" />
        <TouchableOpacity
          style={styles.locationButton}
          onPress={onSelectOrigin}
        >
          <Text style={styles.locationText} numberOfLines={1}>
            {origin?.name ?? '출발지 선택'}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.locationContainer}>
        <MaterialIcons name="place" size={24} color="#F44336" />
        <TouchableOpacity
          style={styles.locationButton}
          onPress={onSelectDestination}
        >
          <Text style={styles.locationText} numberOfLines={1}>
            {destination?.name ?? '목적지 선택'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  routeHeaderContainer: {
    marginBottom: 12,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  locationButton: {
    flex: 1,
    marginLeft: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  locationText: {
    fontSize: 16,
    color: '#333',
  },
});

export default RouteHeader;