import React, { useState, useEffect, useContext, useMemo } from 'react';
import { FlatList, RefreshControl, Modal, Alert, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { useOffline } from '../context/OfflineContext';
import { useEquipmentConfirmation } from '../context/EquipmentConfirmationContext';
import dataRepository from '../services/dataRepository';
import { VStack } from '../components/ui/vstack';
import { HStack } from '../components/ui/hstack';
import { Box } from '../components/ui/box';
import { Card } from '../components/ui/card';
import { Text } from '../components/ui/text';
import { Heading } from '../components/ui/heading';
import { Input, InputField } from '../components/ui/input';
import { Button, ButtonText } from '../components/ui/button';
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
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchEquipment();
  }, [user?._id]);

  const fetchEquipment = async (forceRefresh = false) => {
    if (!user?._id) return;
    try {
      // Koristi dataRepository za offline-first pristup
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
    // Proveri i pending equipment i fetch equipment
    await Promise.all([
      fetchEquipment(isOnline), // Force refresh samo ako je online
      checkPendingEquipment()
    ]);
    setRefreshing(false);
  };

  const categories = useMemo(() => {
    return [...new Set(equipment.map(item => item.category))];
  }, [equipment]);

  const filteredEquipment = useMemo(() => {
    return equipment.filter(item => {
      const searchMatch = searchTerm === '' ||
        item.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const categoryMatch = categoryFilter === '' || item.category === categoryFilter;
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

  const stats = useMemo(() => ({
    total: equipment.length,
    byCategory: categories.reduce((acc, cat) => ({
      ...acc,
      [cat]: equipment.filter(item => item.category === cat).length
    }), {})
  }), [equipment, categories]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedEquipment.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedEquipment.length / itemsPerPage);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('sr-RS');
  };

  const renderEquipmentItem = ({ item }) => (
    <Box className="bg-white mb-3 p-4 rounded-2xl shadow-sm border border-gray-100">
      <HStack space="sm" className="items-center">
        <Box className="w-12 h-12 rounded-full bg-green-50 items-center justify-center">
          <Ionicons name="hardware-chip" size={24} color="#059669" />
        </Box>
        <VStack className="flex-1" space="xs">
          <HStack className="justify-between items-center mb-1">
            <Box className="bg-green-100 rounded-full px-3 py-1">
              <Text size="xs" bold className="text-green-700">
                {item.category}
              </Text>
            </Box>
            <HStack space="xs" className="items-center">
              <Ionicons name="calendar-outline" size={12} color="#6b7280" />
              <Text size="xs" className="text-gray-500">
                {formatDate(item.assignedAt)}
              </Text>
            </HStack>
          </HStack>
          <Text size="md" bold className="text-gray-900">
            {item.description}
          </Text>
          <HStack space="xs">
            <Text size="xs" bold className="text-gray-600">S/N:</Text>
            <Text size="xs" className="text-gray-700 font-mono">
              {item.serialNumber}
            </Text>
          </HStack>
        </VStack>
      </HStack>
    </Box>
  );

  return (
    <Box className="flex-1 bg-gray-50">
      {/* Header - Material Design 3 */}
      <HStack className="bg-white px-4 py-3 border-b border-gray-100 justify-between items-center" style={{ paddingTop: insets.top + 12 }}>
        <HStack space="sm" className="items-center">
          <Box className="w-10 h-10 rounded-full bg-green-50 items-center justify-center">
            <Ionicons name="hardware-chip" size={20} color="#059669" />
          </Box>
          <Heading size="lg" className="text-gray-900">Moja Oprema</Heading>
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
              <Text size="xs" className="text-blue-600 uppercase tracking-wide">Ukupno</Text>
            </VStack>
          </Box>
          {Object.entries(stats.byCategory).slice(0, 2).map(([category, count]) => (
            <Box key={category} className="flex-1 bg-green-50 p-4 rounded-2xl border border-green-100">
              <VStack space="xs">
                <HStack space="xs" className="items-center mb-1">
                  <Box className="w-6 h-6 rounded-full bg-green-100 items-center justify-center">
                    <Ionicons name="checkmark-circle" size={14} color="#059669" />
                  </Box>
                </HStack>
                <Text size="2xl" bold className="text-green-700">{count}</Text>
                <Text size="xs" className="text-green-600 uppercase tracking-wide" numberOfLines={1}>{category}</Text>
              </VStack>
            </Box>
          ))}
        </HStack>
      </Box>

      <FlatList
        data={currentItems}
        renderItem={renderEquipmentItem}
        keyExtractor={(item) => item.id || item.serialNumber}
        contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 16) }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <Box className="flex-1 items-center justify-center p-12">
            <Box className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-4">
              <Ionicons name="hardware-chip-outline" size={40} color="#9ca3af" />
            </Box>
            <Text size="md" bold className="text-gray-700 text-center mb-2">
              {searchTerm || categoryFilter ? 'Nema rezultata' : 'Nema opreme'}
            </Text>
            <Text size="sm" className="text-gray-500 text-center">
              {searchTerm || categoryFilter ? 'Pokušajte sa drugačijom pretragom' : 'Trenutno nemate zadužene opreme'}
            </Text>
          </Box>
        }
        ListFooterComponent={
          sortedEquipment.length > itemsPerPage ? (
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

      {/* Filters Modal - Material Design 3 */}
      <Modal visible={showFilters} animationType="slide" transparent onRequestClose={() => setShowFilters(false)}>
        <Pressable onPress={() => setShowFilters(false)} className="flex-1 bg-black/50 justify-end">
          <Pressable onPress={(e) => e.stopPropagation()} className="bg-white rounded-t-3xl p-6 max-h-[80%]">
            <HStack className="justify-between items-center mb-6">
              <HStack space="sm" className="items-center">
                <Box className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center">
                  <Ionicons name="options" size={20} color="#2563eb" />
                </Box>
                <Heading size="lg" className="text-gray-900">Filteri i pretraga</Heading>
              </HStack>
              <Pressable
                onPress={() => setShowFilters(false)}
                style={{ minHeight: 44, minWidth: 44 }}
                className="items-center justify-center"
              >
                <Ionicons name="close-circle" size={28} color="#9ca3af" />
              </Pressable>
            </HStack>

            <VStack space="md">
              <VStack space="sm">
                <Text size="sm" bold className="text-gray-700">Pretraga</Text>
                <Input variant="outline" size="lg" className="bg-gray-50 border-2 border-gray-200">
                  <InputField
                    placeholder="Pretraži po S/N ili opisu..."
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
                    <Text size="sm" bold className="text-white">Primeni filtere</Text>
                  </HStack>
                </Box>
              </Pressable>
            </VStack>
          </Pressable>
        </Pressable>
      </Modal>
    </Box>
  );
}
