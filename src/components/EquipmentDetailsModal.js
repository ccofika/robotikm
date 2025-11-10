import React from 'react';
import { Modal, Pressable, ScrollView, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: '#ffffff',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: '80%',
          }}
        >
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 24,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#f3f4f6',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: iconConfig.bgColor,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                <Ionicons name={iconConfig.name} size={22} color={iconConfig.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 18,
                  fontWeight: '700',
                  color: '#111827',
                }}>
                  {title}
                </Text>
                <Text style={{
                  fontSize: 12,
                  color: '#6b7280',
                }}>
                  {equipment.length} {equipment.length === 1 ? 'stavka' : equipment.length < 5 ? 'stavke' : 'stavki'}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              style={{
                minHeight: 44,
                minWidth: 44,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="close" size={28} color="#6b7280" />
            </Pressable>
          </View>

          {/* Equipment List */}
          <ScrollView style={{ paddingHorizontal: 24, paddingVertical: 16 }}>
            <View style={{ gap: 12 }}>
              {equipment.map((item, index) => (
                <View
                  key={item.id || item.serialNumber || index}
                  style={{
                    backgroundColor: '#f9fafb',
                    borderWidth: 1,
                    borderColor: '#e5e7eb',
                    borderRadius: 12,
                    padding: 16,
                  }}
                >
                  {/* Equipment Name */}
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
                    <View style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: '#dbeafe',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 10,
                    }}>
                      <Ionicons name="cube-outline" size={16} color="#2563eb" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: '#111827',
                        marginBottom: 2,
                      }}>
                        {item.name || 'Nepoznata oprema'}
                      </Text>
                      {item.category && (
                        <Text style={{
                          fontSize: 11,
                          color: '#6b7280',
                          textTransform: 'uppercase',
                        }}>
                          {item.category}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Serial Number */}
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#ffffff',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}>
                    <Ionicons name="barcode-outline" size={16} color="#6b7280" style={{ marginRight: 8 }} />
                    <Text style={{
                      fontSize: 13,
                      color: '#374151',
                    }}>
                      S/N: <Text style={{ fontWeight: '600' }}>{item.serialNumber}</Text>
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Footer Button */}
          <View style={{
            paddingHorizontal: 24,
            paddingVertical: 16,
            borderTopWidth: 1,
            borderTopColor: '#f3f4f6',
          }}>
            <Pressable
              onPress={onClose}
              style={{
                backgroundColor: '#2563eb',
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
              }}
            >
              <Text style={{
                fontSize: 14,
                fontWeight: '600',
                color: '#ffffff',
              }}>
                Zatvori
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
