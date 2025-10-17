import React, { useState, useEffect, useContext, useMemo } from 'react';
import { FlatList, RefreshControl, Modal, Alert, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { techniciansAPI } from '../services/api';
import { VStack } from '../components/ui/vstack';
import { HStack } from '../components/ui/hstack';
import { Box } from '../components/ui/box';
import { Card } from '../components/ui/card';
import { Text } from '../components/ui/text';
import { Heading } from '../components/ui/heading';
import { Input, InputField, InputSlot } from '../components/ui/input';
import { Button, ButtonText } from '../components/ui/button';
import { Ionicons } from '@expo/vector-icons';

export default function MaterialsScreen() {
  const { user } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchMaterials();
  }, [user?._id]);

  const fetchMaterials = async () => {
    if (!user?._id) return;
    try {
      const response = await techniciansAPI.getMaterials(user._id);
      setMaterials(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju materijala:', error);
      Alert.alert('Greška', 'Neuspešno učitavanje materijala');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchMaterials();
  };

  const filteredMaterials = useMemo(() => {
    return materials.filter(item =>
      searchTerm === '' ||
      item.type?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [materials, searchTerm]);

  // Types for statistics
  const types = useMemo(() => [...new Set(materials.map(item => item.type))], [materials]);

  const stats = useMemo(() => ({
    total: materials.length,
    totalQuantity: materials.reduce((sum, m) => sum + (m.quantity || 0), 0),
    byType: types.reduce((acc, type) => {
      const typeItems = materials.filter(item => item.type === type);
      acc[type] = {
        count: typeItems.length,
        quantity: typeItems.reduce((sum, item) => sum + item.quantity, 0)
      };
      return acc;
    }, {})
  }), [materials, types]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredMaterials.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredMaterials.length / itemsPerPage);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const renderMaterialItem = ({ item }) => (
    <Box className="bg-white mb-3 p-4 rounded-2xl shadow-sm border border-gray-100">
      <HStack space="sm" className="items-center">
        <Box className="w-12 h-12 rounded-full bg-amber-50 items-center justify-center">
          <Ionicons name="cube" size={24} color="#d97706" />
        </Box>
        <VStack className="flex-1" space="xs">
          <Text size="md" bold className="text-gray-900">
            {item.type}
          </Text>
          <Text size="xs" className="text-gray-500">
            Material
          </Text>
        </VStack>
        <Box className="bg-amber-100 rounded-full px-4 py-2">
          <Text size="sm" bold className="text-amber-700">
            ×{item.quantity || 0}
          </Text>
        </Box>
      </HStack>
    </Box>
  );

  return (
    <Box className="flex-1 bg-gray-50">
      {/* Header - Material Design 3 */}
      <HStack className="bg-white px-4 py-3 border-b border-gray-100 justify-between items-center" style={{ paddingTop: insets.top + 12 }}>
        <HStack space="sm" className="items-center">
          <Box className="w-10 h-10 rounded-full bg-amber-50 items-center justify-center">
            <Ionicons name="cube" size={20} color="#d97706" />
          </Box>
          <Heading size="lg" className="text-gray-900">Moj Materijal</Heading>
        </HStack>
        <Pressable
          onPress={() => setShowFilters(true)}
          style={{ minHeight: 44, minWidth: 44 }}
          className="bg-blue-50 rounded-xl items-center justify-center active:bg-blue-100"
        >
          <Ionicons name="search-outline" size={22} color="#2563eb" />
        </Pressable>
      </HStack>

      {/* Stats Cards - Material Design 3 */}
      <Box className="px-4 py-4 bg-white mb-2">
        <HStack space="sm">
          <Box className="flex-1 bg-blue-50 p-4 rounded-2xl border border-blue-100">
            <VStack space="xs">
              <HStack space="xs" className="items-center mb-1">
                <Box className="w-6 h-6 rounded-full bg-blue-100 items-center justify-center">
                  <Ionicons name="layers" size={14} color="#2563eb" />
                </Box>
              </HStack>
              <Text size="2xl" bold className="text-blue-700">{stats.total}</Text>
              <Text size="xs" className="text-blue-600 uppercase tracking-wide">Tipova</Text>
            </VStack>
          </Box>
          <Box className="flex-1 bg-green-50 p-4 rounded-2xl border border-green-100">
            <VStack space="xs">
              <HStack space="xs" className="items-center mb-1">
                <Box className="w-6 h-6 rounded-full bg-green-100 items-center justify-center">
                  <Ionicons name="checkmark-circle" size={14} color="#059669" />
                </Box>
              </HStack>
              <Text size="2xl" bold className="text-green-700">{stats.totalQuantity}</Text>
              <Text size="xs" className="text-green-600 uppercase tracking-wide">Ukupno</Text>
            </VStack>
          </Box>
          {Object.entries(stats.byType).slice(0, 1).map(([type, data]) => (
            <Box key={type} className="flex-1 bg-amber-50 p-4 rounded-2xl border border-amber-100">
              <VStack space="xs">
                <HStack space="xs" className="items-center mb-1">
                  <Box className="w-6 h-6 rounded-full bg-amber-100 items-center justify-center">
                    <Ionicons name="cube" size={14} color="#d97706" />
                  </Box>
                </HStack>
                <Text size="2xl" bold className="text-amber-700">{data.quantity}</Text>
                <Text size="xs" className="text-amber-600 uppercase tracking-wide" numberOfLines={1}>{type}</Text>
              </VStack>
            </Box>
          ))}
        </HStack>
      </Box>

      <FlatList
        data={currentItems}
        renderItem={renderMaterialItem}
        keyExtractor={(item) => item.id || item.type}
        contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 16) }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <Box className="flex-1 items-center justify-center p-12">
            <Box className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-4">
              <Ionicons name="cube-outline" size={40} color="#9ca3af" />
            </Box>
            <Text size="md" bold className="text-gray-700 text-center mb-2">
              {searchTerm ? 'Nema rezultata' : 'Nema materijala'}
            </Text>
            <Text size="sm" className="text-gray-500 text-center">
              {searchTerm ? 'Pokušajte sa drugačijom pretragom' : 'Trenutno nemate zaduženih materijala'}
            </Text>
          </Box>
        }
        ListFooterComponent={
          filteredMaterials.length > itemsPerPage ? (
            <Box className="bg-white mx-4 mt-4 p-4 rounded-2xl shadow-sm border border-gray-100">
              <HStack space="sm" className="justify-between items-center">
                <Pressable
                  onPress={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  style={{ minHeight: 44, minWidth: 44 }}
                  className={`rounded-xl items-center justify-center ${
                    currentPage === 1 ? 'bg-gray-100' : 'bg-blue-50 active:bg-blue-100'
                  }`}
                >
                  <Ionicons
                    name="chevron-back"
                    size={20}
                    color={currentPage === 1 ? '#9ca3af' : '#2563eb'}
                  />
                </Pressable>

                <Box className="flex-1 items-center">
                  <Text size="sm" bold className="text-gray-700">
                    Stranica {currentPage} od {totalPages}
                  </Text>
                </Box>

                <Pressable
                  onPress={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  style={{ minHeight: 44, minWidth: 44 }}
                  className={`rounded-xl items-center justify-center ${
                    currentPage === totalPages ? 'bg-gray-100' : 'bg-blue-50 active:bg-blue-100'
                  }`}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={currentPage === totalPages ? '#9ca3af' : '#2563eb'}
                  />
                </Pressable>
              </HStack>
            </Box>
          ) : null
        }
      />

      {/* Search Modal - Material Design 3 */}
      <Modal visible={showFilters} animationType="slide" transparent onRequestClose={() => setShowFilters(false)}>
        <Pressable onPress={() => setShowFilters(false)} className="flex-1 bg-black/50 justify-end">
          <Pressable onPress={(e) => e.stopPropagation()} className="bg-white rounded-t-3xl p-6 max-h-[80%]">
            <HStack className="justify-between items-center mb-6">
              <HStack space="sm" className="items-center">
                <Box className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center">
                  <Ionicons name="search" size={20} color="#2563eb" />
                </Box>
                <Heading size="lg" className="text-gray-900">Pretraga</Heading>
              </HStack>
              <Pressable
                onPress={() => setShowFilters(false)}
                style={{ minHeight: 44, minWidth: 44 }}
                className="items-center justify-center"
              >
                <Ionicons name="close-circle" size={28} color="#9ca3af" />
              </Pressable>
            </HStack>

            <VStack space="sm" className="mb-6">
              <Text size="sm" bold className="text-gray-700">Tip materijala</Text>
              <Input variant="outline" size="lg" className="bg-gray-50 border-2 border-gray-200">
                <InputField
                  placeholder="Pretraži po tipu..."
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                />
              </Input>
            </VStack>

            <Pressable
              onPress={() => setShowFilters(false)}
              className="rounded-xl"
            >
              <Box className="bg-blue-600 rounded-xl py-3.5 active:bg-blue-700">
                <HStack space="sm" className="items-center justify-center">
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text size="sm" bold className="text-white">Primeni pretragu</Text>
                </HStack>
              </Box>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </Box>
  );
}
