import React, { useState, useEffect, useContext, useMemo } from 'react';
import { View, Text, FlatList, RefreshControl, Modal, Alert, Pressable, ScrollView, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { useOffline } from '../context/OfflineContext';
import dataRepository from '../services/dataRepository';
import { Ionicons } from '@expo/vector-icons';

export default function MaterialsScreen() {
  const { user } = useContext(AuthContext);
  const { isOnline } = useOffline();
  const insets = useSafeAreaInsets();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showSearchModal, setShowSearchModal] = useState(false);

  useEffect(() => {
    fetchMaterials();
  }, [user?._id]);

  const fetchMaterials = async (forceRefresh = false) => {
    if (!user?._id) return;
    try {
      const mat = await dataRepository.getMaterials(user._id, forceRefresh);
      setMaterials(mat);
    } catch (error) {
      console.error('Greška pri učitavanju materijala:', error);
      if (isOnline) {
        Alert.alert('Greška', 'Neuspešno učitavanje materijala');
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMaterials(isOnline);
    setRefreshing(false);
  };

  // Kategorije sa ikonama i bojama
  const getCategoryConfig = (materialType) => {
    const type = materialType?.toLowerCase() || '';

    // Kablovi - plava
    if (type.includes('kabl') || type.includes('cable') || type.includes('adss')) {
      if (type.includes('rg-') || type.includes('koaksijalni')) {
        return { icon: 'git-branch', color: '#3b82f6', label: 'Koaksijalni kabl' };
      }
      if (type.includes('utp') || type.includes('cat')) {
        return { icon: 'git-network', color: '#06b6d4', label: 'UTP kabl' };
      }
      if (type.includes('optički') || type.includes('pigtail') || type.includes('adss')) {
        return { icon: 'flash', color: '#8b5cf6', label: 'Optički kabl' };
      }
      if (type.includes('hdmi')) {
        return { icon: 'videocam', color: '#ec4899', label: 'HDMI kabl' };
      }
      if (type.includes('telefonski') || type.includes('cinc')) {
        return { icon: 'call', color: '#10b981', label: 'Telefonski kabl' };
      }
      return { icon: 'reorder-three', color: '#3b82f6', label: 'Kabl' };
    }

    // Konektori - narandžasta
    if (type.includes('konektor') || type.includes('f ') || type.includes('f-') || type.includes('connector')) {
      if (type.includes('rj-45') || type.includes('rj45')) {
        return { icon: 'git-network-outline', color: '#f97316', label: 'RJ-45 konektor' };
      }
      if (type.includes('rj-11') || type.includes('rj11')) {
        return { icon: 'call-outline', color: '#f59e0b', label: 'RJ-11 konektor' };
      }
      if (type.includes('pct') || type.includes('kompresioni')) {
        return { icon: 'git-branch-outline', color: '#d97706', label: 'PCT konektor' };
      }
      return { icon: 'radio-button-on-outline', color: '#f97316', label: 'Konektor' };
    }

    // Spliteri - ljubičasta
    if (type.includes('spliter') || type.includes('splitter')) {
      return { icon: 'git-pull-request', color: '#a855f7', label: 'Spliter' };
    }

    // Moduli - zelena
    if (type.includes('modul')) {
      return { icon: 'albums', color: '#10b981', label: 'Modul' };
    }

    // Kutije - siva
    if (type.includes('kutija') || type.includes('zok')) {
      return { icon: 'cube', color: '#6b7280', label: 'Kutija' };
    }

    // Kanalice - braon
    if (type.includes('kanalica')) {
      return { icon: 'menu', color: '#92400e', label: 'Kanalica' };
    }

    // Cevčice i trake - žuta
    if (type.includes('cevčica') || type.includes('termoskupljajuća') || type.includes('traka') || type.includes('pib')) {
      return { icon: 'remove', color: '#eab308', label: 'Izolacija' };
    }

    // Obujmice - tirkizna
    if (type.includes('obujmica')) {
      return { icon: 'contract', color: '#14b8a6', label: 'Obujmica' };
    }

    // Filteri - crvena
    if (type.includes('filter') || type.includes('filtar') || type.includes('izolator')) {
      return { icon: 'funnel', color: '#dc2626', label: 'Filter' };
    }

    // Daljinski - roze
    if (type.includes('daljinski') || type.includes('upravljac')) {
      return { icon: 'radio', color: '#ec4899', label: 'Daljinski' };
    }

    // Default - siva
    return { icon: 'hardware-chip-outline', color: '#6b7280', label: materialType };
  };

  const categories = useMemo(() => {
    const cats = [...new Set(materials.map(item => item.type))].sort();
    console.log('📦 Material categories found:', cats);
    cats.forEach(cat => {
      const config = getCategoryConfig(cat);
      console.log(`  - ${cat}: icon=${config.icon}, color=${config.color}, label=${config.label}`);
    });
    return cats;
  }, [materials]);

  const stats = useMemo(() => {
    const byCategory = {};
    categories.forEach(cat => {
      byCategory[cat] = materials.filter(item => item.type === cat).reduce((sum, item) => sum + (item.quantity || 0), 0);
    });
    return {
      total: materials.length,
      totalQuantity: materials.reduce((sum, m) => sum + (m.quantity || 0), 0),
      byCategory
    };
  }, [materials, categories]);

  const filteredMaterials = useMemo(() => {
    return materials.filter(item => {
      const searchMatch = searchTerm === '' ||
        item.type?.toLowerCase().includes(searchTerm.toLowerCase());
      const categoryMatch = categoryFilter === 'all' || item.type === categoryFilter;
      return searchMatch && categoryMatch;
    });
  }, [materials, searchTerm, categoryFilter]);

  const sortedMaterials = useMemo(() => {
    return [...filteredMaterials].sort((a, b) => {
      if (a.type < b.type) return -1;
      if (a.type > b.type) return 1;
      return 0;
    });
  }, [filteredMaterials]);

  const renderMaterialItem = ({ item }) => {
    const config = getCategoryConfig(item.type);

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
            {/* Type */}
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 }}>
              {item.type}
            </Text>

            {/* Category Label */}
            <View style={{
              backgroundColor: `${config.color}15`,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 8,
              alignSelf: 'flex-start'
            }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: config.color }}>
                {config.label}
              </Text>
            </View>
          </View>

          {/* Quantity Badge */}
          <View style={{
            backgroundColor: `${config.color}15`,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
          }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: config.color }}>
              ×{item.quantity || 0}
            </Text>
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
              backgroundColor: '#fef3c7',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}>
              <Ionicons name="construct" size={24} color="#d97706" />
            </View>
            <View>
              <Text style={{ fontSize: 24, fontWeight: '700', color: '#111827' }}>
                Moj Materijal
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
              {stats.totalQuantity}
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
                fontSize: 11,
                fontWeight: '600',
                color: isActive ? '#ffffff' : '#6b7280',
                textAlign: 'center'
              }} numberOfLines={2}>
                {config.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Materials List */}
      <FlatList
        data={sortedMaterials}
        renderItem={renderMaterialItem}
        keyExtractor={(item) => item.id || item.type}
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
              <Ionicons name="construct-outline" size={40} color="#9ca3af" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 8 }}>
              {searchTerm || categoryFilter !== 'all' ? 'Nema rezultata' : 'Nema materijala'}
            </Text>
            <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', paddingHorizontal: 40 }}>
              {searchTerm || categoryFilter !== 'all'
                ? 'Pokušajte sa drugačijom pretragom'
                : 'Trenutno nemate zadužen materijal'}
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
                Pretraži materijal
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
                  placeholder="Tip materijala..."
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
