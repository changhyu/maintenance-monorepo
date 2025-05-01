import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// 실제 구현에서는 '@react-native-picker/picker' 패키지 사용 권장

interface PickerItem {
  label: string;
  value: any;
}

interface PickerComponentProps {
  selectedValue: any;
  onValueChange: (value: any) => void;
  items: PickerItem[];
  style?: any;
  enabled?: boolean;
}

export const PickerComponent: React.FC<PickerComponentProps> = ({
  selectedValue,
  onValueChange,
  items,
  style,
  enabled = true
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  // 현재 선택된 항목의 레이블 찾기
  const selectedItem = items.find(item => item.value === selectedValue);
  const selectedLabel = selectedItem ? selectedItem.label : '선택';

  return (
    <View style={[styles.container, style, !enabled && styles.disabled]}>
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => enabled && setModalVisible(true)}
      >
        <Text style={[styles.selectedText, !enabled && styles.disabledText]}>
          {selectedLabel}
        </Text>
        <Ionicons name="chevron-down" size={16} color={enabled ? "#333" : "#999"} />
      </TouchableOpacity>

      <Modal
        transparent={true}
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>선택하세요</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={items}
              keyExtractor={(item) => item.value.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    selectedValue === item.value && styles.selectedItem
                  ]}
                  onPress={() => {
                    onValueChange(item.value);
                    setModalVisible(false);
                  }}
                >
                  <Text 
                    style={[
                      styles.optionText,
                      selectedValue === item.value && styles.selectedItemText
                    ]}
                  >
                    {item.label}
                  </Text>
                  {selectedValue === item.value && (
                    <Ionicons name="checkmark" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    minWidth: 120,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  selectedText: {
    fontSize: 16,
    marginRight: 8,
    color: '#333',
  },
  disabled: {
    opacity: 0.6,
  },
  disabledText: {
    color: '#999',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  selectedItem: {
    backgroundColor: '#f0f8ff',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  selectedItemText: {
    fontWeight: 'bold',
    color: '#007AFF',
  },
});