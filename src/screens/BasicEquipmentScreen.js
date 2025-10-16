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
import { Input, InputField } from '../components/ui/input';
import { Button, ButtonText } from '../components/ui/button';
import { Ionicons } from '@expo/vector-icons';

export default function BasicEquipmentScreen() {
  const { user } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

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

  const filteredEquipment = useMemo(() => {
    return equipment.filter(item =>
      searchTerm === '' ||
      item.type?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [equipment, searchTerm]);

  const types = useMemo(() => [...new Set(equipment.map(item => item.type))], [equipment]);

  const stats = useMemo(() => ({
    total: equipment.length,
    totalQuantity: equipment.reduce((sum, e) => sum + (e.quantity || 0), 0),
    byType: types.reduce((acc, type) => {
      const typeItems = equipment.filter(item => item.type === type);
      acc[type] = {
        count: typeItems.length,
        quantity: typeItems.reduce((sum, item) => sum + item.quantity, 0)
      };
      return acc;
    }, {})
  }), [equipment, types]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredEquipment.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredEquipment.length / itemsPerPage);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const renderEquipmentItem = ({ item }) => (
    <Card variant="elevated" size="md" className="mb-3 border-l-4 border-l-purple-600">
      <VStack space="sm">
        <Box className="bg-purple-50 px-3 py-1 rounded-md self-start">
          <Text size="sm" bold className="text-purple-600">
            x{item.quantity || 0}
          </Text>
        </Box>
        <VStack space="xs">
          <Text size="lg" bold className="text-slate-900">
            {item.type}
          </Text>
          <Text size="sm" className="text-slate-600">
            Osnovna oprema
          </Text>
        </VStack>
      </VStack>
    </Card>
  );

  return (
    <Box className="flex-1 bg-slate-50">
      {/* Header */}
      <HStack className="bg-white px-6 py-4 border-b border-slate-200 justify-between items-center" style={{ paddingTop: insets.top + 16 }}>
        <Heading size="xl" className="text-slate-900">Osnovna Oprema</Heading>
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
              <Text size="xs" className="text-slate-600 uppercase">Tipova</Text>
            </VStack>
          </Card>
          <Card size="sm" className="flex-1 border-l-4 border-l-green-600">
            <VStack space="xs">
              <Text size="2xl" bold className="text-slate-900">{stats.totalQuantity}</Text>
              <Text size="xs" className="text-slate-600 uppercase">Ukupno</Text>
            </VStack>
          </Card>
          {Object.entries(stats.byType).slice(0, 1).map(([type, data]) => (
            <Card key={type} size="sm" className="flex-1 border-l-4 border-l-purple-600">
              <VStack space="xs">
                <Text size="2xl" bold className="text-slate-900">{data.quantity}</Text>
                <Text size="xs" className="text-slate-600 uppercase" numberOfLines={1}>{type}</Text>
              </VStack>
            </Card>
          ))}
        </HStack>
      </Box>

      <FlatList
        data={currentItems}
        renderItem={renderEquipmentItem}
        keyExtractor={(item) => item.id || item.type}
        contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 16) }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <Box className="flex-1 items-center justify-center p-12">
            <Text size="md" className="text-slate-500 text-center">
              {searchTerm ? 'Nema rezultata' : 'Nemate zadužene osnovne opreme'}
            </Text>
          </Box>
        }
        ListFooterComponent={
          filteredEquipment.length > itemsPerPage ? (
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
              <Heading size="lg" className="text-slate-900">Pretraga</Heading>
              <Pressable onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={28} color="#64748b" />
              </Pressable>
            </HStack>

            <Input variant="outline" size="lg" className="mb-6">
              <InputField
                placeholder="Pretraži opremu..."
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
            </Input>

            <Button action="primary" size="lg" onPress={() => setShowFilters(false)}>
              <ButtonText>Primeni</ButtonText>
            </Button>
          </Pressable>
        </Pressable>
      </Modal>
    </Box>
  );
}
