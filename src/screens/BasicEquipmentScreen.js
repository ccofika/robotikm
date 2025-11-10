import React, { useState, useEffect, useContext, useMemo } from 'react';
import { View, Text, FlatList, RefreshControl, Modal, Alert, Pressable, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { techniciansAPI } from '../services/api';
import { Ionicons } from '@expo/vector-icons';

export default function BasicEquipmentScreen() {
  const { user } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [typeFilter, setTypeFilter] = useState('Sve');

  useEffect(() => {
    fetchEquipment();
  }, [user?._id]);

  const fetchEquipment = async () => {
    if (!user?._id) return;
    try {
      const response = await techniciansAPI.getBasicEquipment(user._id);
      setEquipment(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju osnovne opreme:', error);
      Alert.alert('Greška', 'Neuspešno učitavanje osnovne opreme');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchEquipment();
  };

  // Smart category configuration for basic equipment
  const getCategoryConfig = (equipmentType) => {
    const type = equipmentType?.toLowerCase() || '';

    // Alati - crvena
    if (type.includes('bušilica') || type.includes('alat') || type.includes('busilica') || type.includes('odvijač') || type.includes('odvijac')) {
      return { icon: 'hammer', color: '#dc2626', label: 'Alati' };
    }

    // Merači i testeri - plava
    if (type.includes('merač') || type.includes('merac') || type.includes('tester') || type.includes('multimetar')) {
      return { icon: 'speedometer', color: '#2563eb', label: 'Merači' };
    }

    // Kablovi i spojevi - zelena
    if (type.includes('kabl') || type.includes('cable') || type.includes('patch')) {
      return { icon: 'git-network', color: '#059669', label: 'Kablovi' };
    }

    // Adapteri i napajanja - narandžasta
    if (type.includes('adapter') || type.includes('napajanje') || type.includes('punjač') || type.includes('punjac')) {
      return { icon: 'battery-charging', color: '#f97316', label: 'Napajanja' };
    }

    // Laptop/Tablet - ljubičasta
    if (type.includes('laptop') || type.includes('tablet') || type.includes('računar') || type.includes('racunar')) {
      return { icon: 'laptop', color: '#9333ea', label: 'Računari' };
    }

    // Telefon - roze
    if (type.includes('telefon') || type.includes('mobilni')) {
      return { icon: 'phone-portrait', color: '#ec4899', label: 'Telefoni' };
    }

    // Torbe i oprema - braon
    if (type.includes('torba') || type.includes('ruksak') || type.includes('kofer')) {
      return { icon: 'briefcase', color: '#92400e', label: 'Torbe' };
    }

    // Stepenik/Merdevine - tirkizna
    if (type.includes('stepenik') || type.includes('merdevine') || type.includes('ljestve')) {
      return { icon: 'trending-up', color: '#14b8a6', label: 'Stepenik' };
    }

    // Klešta i štipaljke - žuta
    if (type.includes('klešta') || type.includes('klesta') || type.includes('štipaljka') || type.includes('stipaljka')) {
      return { icon: 'contract', color: '#eab308', label: 'Klešta' };
    }

    // Default - siva
    return { icon: 'hardware-chip', color: '#6b7280', label: equipmentType };
  };

  // Extract unique types with "Sve" option
  const types = useMemo(() => {
    const uniqueTypes = [...new Set(equipment.map(item => item.type))].sort();
    return ['Sve', ...uniqueTypes];
  }, [equipment]);

  const stats = useMemo(() => {
    const byType = {};
    equipment.forEach(item => {
      const type = item.type;
      if (!byType[type]) {
        byType[type] = { count: 0, quantity: 0 };
      }
      byType[type].count += 1;
      byType[type].quantity += item.quantity || 0;
    });

    return {
      total: equipment.length,
      totalQuantity: equipment.reduce((sum, e) => sum + (e.quantity || 0), 0),
      byType
    };
  }, [equipment]);

  const filteredEquipment = useMemo(() => {
    return equipment.filter(item => {
      const matchesType = typeFilter === 'Sve' || item.type === typeFilter;
      const matchesSearch = searchTerm === '' ||
        item.type?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [equipment, typeFilter, searchTerm]);

  const renderEquipmentItem = ({ item }) => {
    const config = getCategoryConfig(item.type);

    return (
      <View style={{
        backgroundColor: '#ffffff',
        marginHorizontal: 20,
        marginBottom: 12,
        padding: 16,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Left: Icon + Info */}
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              backgroundColor: `${config.color}15`,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}>
              <Ionicons name={config.icon} size={24} color={config.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: '#111827',
                marginBottom: 4,
              }}>
                {item.type}
              </Text>
              <View style={{
                backgroundColor: `${config.color}15`,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 6,
                alignSelf: 'flex-start',
              }}>
                <Text style={{
                  fontSize: 11,
                  fontWeight: '600',
                  color: config.color,
                  textTransform: 'uppercase',
                }}>
                  {config.label}
                </Text>
              </View>
            </View>
          </View>

          {/* Right: Quantity Badge */}
          <View style={{
            backgroundColor: config.color,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 12,
            minWidth: 50,
            alignItems: 'center',
          }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '700',
              color: '#ffffff',
            }}>
              ×{item.quantity || 0}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
        <ActivityIndicator size="large" color="#9333ea" />
        <Text style={{ marginTop: 12, fontSize: 14, color: '#6b7280' }}>Učitavanje...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Header - Material Design 3 */}
      <View style={{
        backgroundColor: '#ffffff',
        paddingTop: insets.top + 12,
        paddingBottom: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: '#faf5ff',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}>
              <Ionicons name="hardware-chip" size={24} color="#9333ea" />
            </View>
            <View>
              <Text style={{ fontSize: 24, fontWeight: '700', color: '#111827' }}>
                Osnovna Oprema
              </Text>
              <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                Inventar tehničara
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => setShowSearchModal(true)}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: '#dbeafe',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="search" size={22} color="#2563eb" />
          </Pressable>
        </View>
      </View>

      {/* Filter Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16 }}
        style={{ flexGrow: 0, flexShrink: 0 }}
      >
        {/* All */}
        <Pressable
          onPress={() => setTypeFilter('Sve')}
          style={{
            backgroundColor: typeFilter === 'Sve' ? '#3b82f6' : '#ffffff',
            paddingHorizontal: 18,
            paddingVertical: 14,
            borderRadius: 20,
            borderWidth: 2,
            borderColor: typeFilter === 'Sve' ? '#3b82f6' : '#e5e7eb',
            marginRight: 10,
            minWidth: 110,
            height: 70,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Ionicons
              name="albums-outline"
              size={18}
              color={typeFilter === 'Sve' ? '#ffffff' : '#3b82f6'}
            />
            <Text style={{
              fontSize: 18,
              fontWeight: '700',
              color: typeFilter === 'Sve' ? '#ffffff' : '#111827',
              marginLeft: 6
            }}>
              {stats.total}
            </Text>
          </View>
          <Text style={{
            fontSize: 13,
            fontWeight: '600',
            color: typeFilter === 'Sve' ? '#ffffff' : '#6b7280'
          }}>
            Svi
          </Text>
        </Pressable>

        {/* Category Pills */}
        {types.filter(t => t !== 'Sve').map((type, index) => {
          const config = getCategoryConfig(type);
          const count = stats.byType[type]?.count || 0;
          const isActive = typeFilter === type;

          return (
            <Pressable
              key={type}
              onPress={() => setTypeFilter(type)}
              style={{
                backgroundColor: isActive ? config.color : '#ffffff',
                paddingHorizontal: 18,
                paddingVertical: 14,
                borderRadius: 20,
                borderWidth: 2,
                borderColor: isActive ? config.color : '#e5e7eb',
                marginRight: index < types.filter(t => t !== 'Sve').length - 1 ? 10 : 0,
                minWidth: 110,
                height: 70,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Ionicons
                  name={config.icon}
                  size={18}
                  color={isActive ? '#ffffff' : config.color}
                />
                <Text style={{
                  fontSize: 18,
                  fontWeight: '700',
                  color: isActive ? '#ffffff' : '#111827',
                  marginLeft: 6
                }}>
                  {count}
                </Text>
              </View>
              <Text style={{
                fontSize: 13,
                fontWeight: '600',
                color: isActive ? '#ffffff' : '#6b7280'
              }} numberOfLines={1}>
                {type}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Equipment List */}
      <FlatList
        data={filteredEquipment}
        renderItem={renderEquipmentItem}
        keyExtractor={(item, index) => item.id || item.type + index}
        contentContainerStyle={{
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom + 16, 24)
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#9333ea']}
            tintColor="#9333ea"
          />
        }
        ListEmptyComponent={
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: '#f3f4f6',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16
            }}>
              <Ionicons name="cube-outline" size={40} color="#9ca3af" />
            </View>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: '#374151',
              textAlign: 'center',
              marginBottom: 8
            }}>
              {searchTerm || typeFilter !== 'Sve' ? 'Nema rezultata' : 'Nema osnovne opreme'}
            </Text>
            <Text style={{
              fontSize: 14,
              color: '#6b7280',
              textAlign: 'center'
            }}>
              {searchTerm || typeFilter !== 'Sve'
                ? 'Pokušajte sa drugačijom pretragom'
                : 'Trenutno nemate zadužene osnovne opreme'}
            </Text>
          </View>
        }
      />

      {/* Search Modal - Material Design 3 */}
      <Modal
        visible={showSearchModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSearchModal(false)}
      >
        <Pressable
          onPress={() => setShowSearchModal(false)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              maxHeight: '80%'
            }}
          >
            {/* Modal Header */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 24
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: '#eff6ff',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 10
                }}>
                  <Ionicons name="search" size={20} color="#2563eb" />
                </View>
                <Text style={{ fontSize: 22, fontWeight: '700', color: '#111827' }}>
                  Pretraga
                </Text>
              </View>
              <Pressable
                onPress={() => setShowSearchModal(false)}
                style={{
                  minHeight: 44,
                  minWidth: 44,
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Ionicons name="close-circle" size={28} color="#9ca3af" />
              </Pressable>
            </View>

            {/* Search Input */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{
                fontSize: 14,
                fontWeight: '600',
                color: '#374151',
                marginBottom: 8
              }}>
                Tip opreme
              </Text>
              <View style={{
                backgroundColor: '#f9fafb',
                borderWidth: 2,
                borderColor: '#e5e7eb',
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 12
              }}>
                <TextInput
                  placeholder="Pretraži po tipu..."
                  placeholderTextColor="#9ca3af"
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                  style={{
                    fontSize: 16,
                    color: '#111827',
                    padding: 0
                  }}
                />
              </View>
            </View>

            {/* Apply Button */}
            <Pressable
              onPress={() => setShowSearchModal(false)}
              style={({ pressed }) => ({
                backgroundColor: pressed ? '#1d4ed8' : '#2563eb',
                borderRadius: 12,
                paddingVertical: 14,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center'
              })}
            >
              <Ionicons name="checkmark-circle" size={20} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={{
                fontSize: 14,
                fontWeight: '600',
                color: '#ffffff'
              }}>
                Primeni pretragu
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
