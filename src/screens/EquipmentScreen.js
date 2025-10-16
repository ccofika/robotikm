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
    <Card variant="elevated" size="md" className="mb-3 border-l-4 border-l-green-600">
      <VStack space="sm">
        <HStack className="justify-between items-center">
          <Box className="bg-green-50 px-3 py-1 rounded-md">
            <Text size="xs" bold className="text-green-600">
              {item.category}
            </Text>
          </Box>
          <HStack space="xs" className="items-center">
            <Ionicons name="calendar-outline" size={12} color="#64748b" />
            <Text size="xs" className="text-slate-600">
              {formatDate(item.assignedAt)}
            </Text>
          </HStack>
        </HStack>
        <VStack space="xs">
          <Text size="md" bold className="text-slate-900">
            {item.description}
          </Text>
          <HStack space="xs">
            <Text size="sm" bold className="text-slate-600">S/N:</Text>
            <Text size="sm" className="text-slate-700 font-mono">
              {item.serialNumber}
            </Text>
          </HStack>
        </VStack>
      </VStack>
    </Card>
  );

  return (
    <Box className="flex-1 bg-slate-50">
      {/* Header */}
      <HStack className="bg-white px-6 py-4 border-b border-slate-200 justify-between items-center" style={{ paddingTop: insets.top + 16 }}>
        <Heading size="xl" className="text-slate-900">Moja Oprema</Heading>
        <Pressable
          onPress={() => setShowFilters(true)}
          className="bg-blue-600 p-3 rounded-lg active:bg-blue-700"
        >
          <Ionicons name="search-outline" size={20} color="#fff" />
        </Pressable>
      </HStack>

      {/* Stats */}
      <Box className="bg-white p-4 mb-2">
        <HStack space="sm">
          <Card size="sm" className="flex-1 border-l-4 border-l-blue-600">
            <VStack space="xs">
              <Text size="2xl" bold className="text-slate-900">{stats.total}</Text>
              <Text size="xs" className="text-slate-600 uppercase">Ukupno</Text>
            </VStack>
          </Card>
          {Object.entries(stats.byCategory).slice(0, 2).map(([category, count]) => (
            <Card key={category} size="sm" className="flex-1 border-l-4 border-l-green-600">
              <VStack space="xs">
                <Text size="2xl" bold className="text-slate-900">{count}</Text>
                <Text size="xs" className="text-slate-600 uppercase" numberOfLines={1}>{category}</Text>
              </VStack>
            </Card>
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
            <Text size="md" className="text-slate-500 text-center">
              {searchTerm || categoryFilter ? 'Nema rezultata' : 'Nemate zadužene opreme'}
            </Text>
          </Box>
        }
        ListFooterComponent={
          sortedEquipment.length > itemsPerPage ? (
            <HStack space="md" className="py-6 px-4 mt-4 justify-between items-center">
              <Pressable
                onPress={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                className={`w-11 h-11 rounded-lg items-center justify-center ${
                  currentPage === 1 ? 'bg-slate-300' : 'bg-blue-600 active:bg-blue-700'
                }`}
              >
                <Text size="xl" bold className={currentPage === 1 ? 'text-slate-500' : 'text-white'}>
                  ‹
                </Text>
              </Pressable>

              <Box className="flex-1 items-center">
                <Text size="sm" className="text-slate-600 font-semibold">
                  Stranica {currentPage} od {totalPages}
                </Text>
              </Box>

              <Pressable
                onPress={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`w-11 h-11 rounded-lg items-center justify-center ${
                  currentPage === totalPages ? 'bg-slate-300' : 'bg-blue-600 active:bg-blue-700'
                }`}
              >
                <Text size="xl" bold className={currentPage === totalPages ? 'text-slate-500' : 'text-white'}>
                  ›
                </Text>
              </Pressable>
            </HStack>
          ) : null
        }
      />

      <Modal visible={showFilters} animationType="slide" transparent onRequestClose={() => setShowFilters(false)}>
        <Pressable onPress={() => setShowFilters(false)} className="flex-1 bg-black/50 justify-end">
          <Pressable onPress={(e) => e.stopPropagation()} className="bg-white rounded-t-3xl p-6 max-h-[80%]">
            <HStack className="justify-between items-center mb-6">
              <Heading size="lg" className="text-slate-900">Filteri</Heading>
              <Pressable onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={28} color="#64748b" />
              </Pressable>
            </HStack>

            <VStack space="md">
              <VStack space="xs">
                <Text size="sm" bold className="text-slate-700">Pretraga</Text>
                <Input variant="outline" size="lg">
                  <InputField
                    placeholder="Pretraži po S/N ili opisu..."
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                  />
                </Input>
              </VStack>

              <Button action="primary" size="lg" onPress={() => setShowFilters(false)}>
                <ButtonText>Primeni</ButtonText>
              </Button>
            </VStack>
          </Pressable>
        </Pressable>
      </Modal>
    </Box>
  );
}
