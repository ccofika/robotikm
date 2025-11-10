import React, { useState, useEffect, useContext, useMemo } from 'react';
import { View, Text, FlatList, RefreshControl, Modal, Alert, Pressable, ScrollView, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { useOffline } from '../context/OfflineContext';
import { useEquipmentConfirmation } from '../context/EquipmentConfirmationContext';
import dataRepository from '../services/dataRepository';
import { Ionicons } from '@expo/vector-icons';

export default function EquipmentScreen() {
  const { user } = useContext(AuthContext);
  const { isOnline } = useOffline();
  const { checkPendingEquipment } = useEquipmentConfirmation();
  const insets = useSafeAreaInsets();
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showSearchModal, setShowSearchModal] = useState(false);

  useEffect(() => {
    fetchEquipment();
  }, [user?._id]);

  const fetchEquipment = async (forceRefresh = false) => {
    if (!user?._id) return;
    try {
      const eq = await dataRepository.getEquipment(user._id, forceRefresh);
      setEquipment(eq);
    } catch (error) {
      console.error('Greška pri učitavanju opreme:', error);
      if (isOnline) {
        Alert.alert('Greška', 'Neuspešno učitavanje opreme');
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchEquipment(isOnline),
      checkPendingEquipment()
    ]);
    setRefreshing(false);
  };

  // Kategorije sa ikonama i bojama
  const getCategoryConfig = (category) => {
    const cat = category?.toLowerCase() || '';

    // HFC/GPON/PON Modemi - plava
    if (cat.includes('hfc') || cat.includes('modem') || cat.includes('gpon') || cat.includes('pon')) {
      return { icon: 'wifi', color: '#3b82f6', label: 'Modem' };
    }

    // Hybrid - ljubičasta
    if (cat.includes('hybrid') || cat.includes('hibrid')) {
      return { icon: 'swap-horizontal', color: '#8b5cf6', label: 'Hybrid' };
    }

    // STB (Set-Top Box) - roze
    if (cat.includes('stb') || cat.includes('dtv') || cat.includes('atv') || cat.includes('ott') || cat.includes('tv po tvom') || cat.includes('smart') || cat.includes('skaymaster')) {
      return { icon: 'videocam', color: '#ec4899', label: 'Set-Top Box' };
    }

    // CAM (Conditional Access Module) - crvena
    if (cat.includes('cam') && !cat.includes('stb')) {
      return { icon: 'lock-closed', color: '#dc2626', label: 'CAM' };
    }

    // SIM Kartica - narandžasta
    if (cat.includes('sim')) {
      return { icon: 'cellular', color: '#f59e0b', label: 'SIM' };
    }

    // Smartcard/Kartica - žuta
    if (cat.includes('kartica') || cat.includes('card')) {
      return { icon: 'card-outline', color: '#eab308', label: 'Kartica' };
    }

    // Move - zelena
    if (cat.includes('move')) {
      return { icon: 'swap-horizontal-outline', color: '#10b981', label: 'Move' };
    }

    // Box - siva
    if (cat.includes('box') || cat.includes('can') || cat.includes('test')) {
      return { icon: 'cube-outline', color: '#6b7280', label: 'Ostalo' };
    }

    // Default - siva
    return { icon: 'hardware-chip', color: '#6b7280', label: category };
  };

  const categories = useMemo(() => {
    const cats = [...new Set(equipment.map(item => item.category))].sort();
    console.log('📦 Equipment categories found:', cats);
    cats.forEach(cat => {
      const config = getCategoryConfig(cat);
      console.log(`  - ${cat}: icon=${config.icon}, color=${config.color}, label=${config.label}`);
    });
    return cats;
  }, [equipment]);

  const stats = useMemo(() => {
    const byCategory = {};
    categories.forEach(cat => {
      byCategory[cat] = equipment.filter(item => item.category === cat).length;
    });
    return {
      total: equipment.length,
      byCategory
    };
  }, [equipment, categories]);

  const filteredEquipment = useMemo(() => {
    return equipment.filter(item => {
      const searchMatch = searchTerm === '' ||
        item.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const categoryMatch = categoryFilter === 'all' || item.category === categoryFilter;
      return searchMatch && categoryMatch;
    });
  }, [equipment, searchTerm, categoryFilter]);

  const sortedEquipment = useMemo(() => {
    return [...filteredEquipment].sort((a, b) => {
      if (a.category < b.category) return -1;
      if (a.category > b.category) return 1;
      return a.serialNumber.localeCompare(b.serialNumber);
    });
  }, [filteredEquipment]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('sr-RS', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const renderEquipmentItem = ({ item }) => {
    const config = getCategoryConfig(item.category);

    return (
      <View style={{
        backgroundColor: '#ffffff',
        marginHorizontal: 20,
        marginBottom: 12,
        padding: 16,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#f3f4f6',
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Icon */}
          <View style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: `${config.color}15`,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}>
            <Ionicons name={config.icon} size={24} color={config.color} />
          </View>

          {/* Content */}
          <View style={{ flex: 1 }}>
            {/* Category Badge & Date */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <View style={{
                backgroundColor: `${config.color}15`,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 12
              }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: config.color }}>
                  {item.category}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="calendar-outline" size={12} color="#9ca3af" />
                <Text style={{ fontSize: 11, color: '#9ca3af', marginLeft: 4 }}>
                  {formatDate(item.assignedAt)}
                </Text>
              </View>
            </View>

            {/* Description */}
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 }}>
              {item.description}
            </Text>

            {/* Serial Number */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280' }}>S/N: </Text>
              <Text style={{ fontSize: 12, color: '#374151', fontFamily: 'monospace' }}>
                {item.serialNumber}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Header - Modern Design */}
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
              backgroundColor: '#dbeafe',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}>
              <Ionicons name="cube" size={24} color="#2563eb" />
            </View>
            <View>
              <Text style={{ fontSize: 24, fontWeight: '700', color: '#111827' }}>
                Moja Oprema
              </Text>
              <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                {isOnline ? 'Online' : 'Offline mod'}
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
          onPress={() => setCategoryFilter('all')}
          style={{
            backgroundColor: categoryFilter === 'all' ? '#3b82f6' : '#ffffff',
            paddingHorizontal: 18,
            paddingVertical: 14,
            borderRadius: 20,
            borderWidth: 2,
            borderColor: categoryFilter === 'all' ? '#3b82f6' : '#e5e7eb',
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
              color={categoryFilter === 'all' ? '#ffffff' : '#3b82f6'}
            />
            <Text style={{
              fontSize: 18,
              fontWeight: '700',
              color: categoryFilter === 'all' ? '#ffffff' : '#111827',
              marginLeft: 6
            }}>
              {stats.total}
            </Text>
          </View>
          <Text style={{
            fontSize: 13,
            fontWeight: '600',
            color: categoryFilter === 'all' ? '#ffffff' : '#6b7280'
          }}>
            Svi
          </Text>
        </Pressable>

        {/* Category Pills */}
        {categories.map((category, index) => {
          const config = getCategoryConfig(category);
          const count = stats.byCategory[category] || 0;
          const isActive = categoryFilter === category;

          return (
            <Pressable
              key={category}
              onPress={() => setCategoryFilter(category)}
              style={{
                backgroundColor: isActive ? config.color : '#ffffff',
                paddingHorizontal: 18,
                paddingVertical: 14,
                borderRadius: 20,
                borderWidth: 2,
                borderColor: isActive ? config.color : '#e5e7eb',
                marginRight: index < categories.length - 1 ? 10 : 0,
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
                {category}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Equipment List */}
      <FlatList
        data={sortedEquipment}
        renderItem={renderEquipmentItem}
        keyExtractor={(item) => item.id || item.serialNumber}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: Math.max(insets.bottom + 16, 24) }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: '#f3f4f6',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}>
              <Ionicons name="cube-outline" size={40} color="#9ca3af" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 8 }}>
              {searchTerm || categoryFilter !== 'all' ? 'Nema rezultata' : 'Nema opreme'}
            </Text>
            <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', paddingHorizontal: 40 }}>
              {searchTerm || categoryFilter !== 'all'
                ? 'Pokušajte sa drugačijom pretragom'
                : 'Trenutno nemate zaduženu opremu'}
            </Text>
          </View>
        }
      />

      {/* Search Modal */}
      <Modal
        visible={showSearchModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSearchModal(false)}
      >
        <Pressable
          onPress={() => setShowSearchModal(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'flex-end',
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              maxHeight: '60%',
            }}
          >
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <Text style={{ fontSize: 24, fontWeight: '700', color: '#111827' }}>Pretraga</Text>
              <Pressable onPress={() => setShowSearchModal(false)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="close" size={28} color="#6b7280" />
              </Pressable>
            </View>

            {/* Search Input */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                Pretraži opremu
              </Text>
              <View style={{
                backgroundColor: '#f9fafb',
                borderWidth: 1,
                borderColor: '#d1d5db',
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
              }}>
                <Ionicons name="search" size={20} color="#9ca3af" />
                <TextInput
                  placeholder="S/N ili opis opreme..."
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                  style={{
                    flex: 1,
                    padding: 16,
                    fontSize: 15,
                    color: '#111827',
                  }}
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>

            {/* Apply Button */}
            <Pressable
              onPress={() => setShowSearchModal(false)}
              style={{
                backgroundColor: '#2563eb',
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="checkmark-circle" size={20} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#ffffff' }}>
                Primeni
              </Text>
            </Pressable>

            {/* Clear Button */}
            {searchTerm !== '' && (
              <Pressable
                onPress={() => {
                  setSearchTerm('');
                  setShowSearchModal(false);
                }}
                style={{
                  marginTop: 12,
                  paddingVertical: 16,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#6b7280' }}>
                  Obriši pretragu
                </Text>
              </Pressable>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
