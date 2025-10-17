import React from 'react';
import { Modal, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VStack } from './ui/vstack';
import { HStack } from './ui/hstack';
import { Box } from './ui/box';
import { Text } from './ui/text';
import { Heading } from './ui/heading';

export default function EquipmentDetailsModal({ visible, onClose, equipment, title, type }) {
  if (!equipment || equipment.length === 0) {
    return null;
  }

  // Ikona i boja na osnovu tipa
  const getIconConfig = () => {
    if (type === 'equipment_add') {
      return { name: 'add-circle', color: '#059669', bgColor: '#d1fae5' };
    } else if (type === 'equipment_remove') {
      return { name: 'remove-circle', color: '#dc2626', bgColor: '#fee2e2' };
    }
    return { name: 'cube', color: '#2563eb', bgColor: '#eff6ff' };
  };

  const iconConfig = getIconConfig();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        className="flex-1 bg-black/50 justify-end"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="bg-white rounded-t-3xl max-h-[80%]"
        >
          {/* Header */}
          <HStack className="justify-between items-center px-6 py-4 border-b border-gray-100">
            <HStack space="sm" className="items-center flex-1">
              <Box
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: iconConfig.bgColor }}
              >
                <Ionicons name={iconConfig.name} size={22} color={iconConfig.color} />
              </Box>
              <Box className="flex-1">
                <Heading size="md" className="text-gray-900">
                  {title}
                </Heading>
                <Text size="xs" className="text-gray-500">
                  {equipment.length} {equipment.length === 1 ? 'stavka' : equipment.length < 5 ? 'stavke' : 'stavki'}
                </Text>
              </Box>
            </HStack>
            <Pressable
              onPress={onClose}
              style={{ minHeight: 44, minWidth: 44 }}
              className="items-center justify-center"
            >
              <Ionicons name="close" size={28} color="#6b7280" />
            </Pressable>
          </HStack>

          {/* Equipment List */}
          <ScrollView className="px-6 py-4">
            <VStack space="sm">
              {equipment.map((item, index) => (
                <Box
                  key={item.id || item.serialNumber || index}
                  className="bg-gray-50 border border-gray-200 rounded-xl p-4"
                >
                  <VStack space="xs">
                    {/* Equipment Name */}
                    <HStack space="xs" className="items-start">
                      <Box className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center">
                        <Ionicons name="cube-outline" size={16} color="#2563eb" />
                      </Box>
                      <Box className="flex-1">
                        <Text size="sm" bold className="text-gray-900">
                          {item.name || 'Nepoznata oprema'}
                        </Text>
                        {item.category && (
                          <Text size="xs" className="text-gray-500 uppercase">
                            {item.category}
                          </Text>
                        )}
                      </Box>
                    </HStack>

                    {/* Serial Number */}
                    <HStack space="xs" className="items-center bg-white rounded-lg px-3 py-2 mt-2">
                      <Ionicons name="barcode-outline" size={16} color="#6b7280" />
                      <Text size="sm" className="text-gray-700">
                        S/N: <Text bold>{item.serialNumber}</Text>
                      </Text>
                    </HStack>
                  </VStack>
                </Box>
              ))}
            </VStack>
          </ScrollView>

          {/* Footer Button */}
          <Box className="px-6 py-4 border-t border-gray-100">
            <Pressable onPress={onClose} className="rounded-xl">
              <Box className="bg-blue-600 rounded-xl py-3.5 active:bg-blue-700">
                <Text size="sm" bold className="text-white text-center">
                  Zatvori
                </Text>
              </Box>
            </Pressable>
          </Box>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
