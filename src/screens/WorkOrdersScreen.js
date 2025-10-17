import React, { useState, useEffect, useContext, useMemo } from 'react';
import { FlatList, Pressable, RefreshControl, Modal, Alert, Linking, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { useOffline } from '../context/OfflineContext';
import dataRepository from '../services/dataRepository';
import { SyncStatusIndicator } from '../components/offline';
import { VStack } from '../components/ui/vstack';
import { HStack } from '../components/ui/hstack';
import { Box } from '../components/ui/box';
import { Text } from '../components/ui/text';
import { Heading } from '../components/ui/heading';
import { Input, InputField } from '../components/ui/input';

export default function WorkOrdersScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const { isOnline, isSyncing } = useOffline();
  const insets = useSafeAreaInsets();
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);

  useEffect(() => {
    fetchWorkOrders();
  }, [user?._id]);

  const fetchWorkOrders = async (forceRefresh = false) => {
    if (!user?._id) return;
    try {
      // Koristi dataRepository umesto direktno workOrdersAPI
      const orders = await dataRepository.getWorkOrders(user._id, forceRefresh);
      setWorkOrders(orders);
    } catch (error) {
      console.error('Greška pri učitavanju radnih naloga:', error);
      if (isOnline) {
        Alert.alert('Greška', 'Neuspešno učitavanje radnih naloga');
      }
      // Ako je offline, podaci su možda i dalje dostupni iz cache-a
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    // Force refresh samo ako je online
    fetchWorkOrders(isOnline);
  };

  const isWorkOrderNew = (order) => {
    if (order.status !== 'nezavrsen') return false;
    try {
      const now = new Date();
      const orderDate = new Date(order.date);
      const orderTime = order.time || '09:00';
      const [hours, minutes] = orderTime.split(':');
      const orderDateTime = new Date(orderDate);
      orderDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      return orderDateTime > now;
    } catch (error) {
      return false;
    }
  };

  const getDisplayStatus = (order) => {
    if (order.status === 'zavrsen') return { text: 'Završen', color: '#16a34a', bgColor: '#d1fae5' };
    if (order.status === 'odlozen') return { text: 'Odložen', color: '#dc2626', bgColor: '#fee2e2' };
    if (order.status === 'otkazan') return { text: 'Otkazan', color: '#64748b', bgColor: '#f1f5f9' };
    if (order.status === 'nezavrsen') {
      if (isWorkOrderNew(order)) {
        return { text: 'Nov', color: '#9333ea', bgColor: '#f3e8ff' };
      }
      return { text: 'Nezavršen', color: '#ca8a04', bgColor: '#fef3c7' };
    }
    return { text: 'Nezavršen', color: '#ca8a04', bgColor: '#fef3c7' };
  };

  const filteredWorkOrders = useMemo(() => {
    return workOrders.filter(order => {
      const searchMatch = searchTerm === '' ||
        order.municipality?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.type?.toLowerCase().includes(searchTerm.toLowerCase());
      const statusMatch = statusFilter === '' || order.status === statusFilter;
      const defaultHideCompleted = statusFilter === '' && searchTerm === '' ? order.status !== 'zavrsen' : true;
      return searchMatch && statusMatch && defaultHideCompleted;
    });
  }, [workOrders, searchTerm, statusFilter]);

  const sortedWorkOrders = useMemo(() => {
    return [...filteredWorkOrders].sort((a, b) => {
      const aIsIncomplete = a.status === 'nezavrsen';
      const bIsIncomplete = b.status === 'nezavrsen';
      if (aIsIncomplete && !bIsIncomplete) return -1;
      if (!aIsIncomplete && bIsIncomplete) return 1;
      const aDateTime = new Date(`${a.date}T${a.time || '09:00'}:00`);
      const bDateTime = new Date(`${b.date}T${b.time || '09:00'}:00`);
      return bDateTime - aDateTime;
    });
  }, [filteredWorkOrders]);

  const stats = useMemo(() => {
    const total = workOrders.length;
    const completed = workOrders.filter(o => o.status === 'zavrsen').length;
    const pending = workOrders.filter(o => o.status === 'nezavrsen' && !isWorkOrderNew(o)).length;
    const newOrders = workOrders.filter(o => o.status === 'nezavrsen' && isWorkOrderNew(o)).length;
    const postponed = workOrders.filter(o => o.status === 'odlozen').length;
    return {
      total,
      completed,
      pending,
      newOrders,
      postponed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }, [workOrders]);

  const makePhoneCall = (phoneNumber) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const renderWorkOrder = ({ item }) => {
    const displayStatus = getDisplayStatus(item);
    return (
      <Pressable onPress={() => navigation.navigate('WorkOrderDetail', { orderId: item._id })}>
        <Box className="bg-white mb-2.5 p-3 rounded-xl shadow-sm border-l-4" style={{ borderLeftColor: displayStatus.color }}>
          <VStack space="xs">
            <HStack className="justify-between items-center">
              <Box className="px-2.5 py-1 rounded-full" style={{ backgroundColor: displayStatus.bgColor }}>
                <Text style={{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: displayStatus.color }}>
                  {displayStatus.text}
                </Text>
              </Box>
              <HStack space="xs" className="items-center">
                <Ionicons name="calendar-outline" size={12} color="#6b7280" />
                <Text style={{ fontSize: 12, color: '#4b5563' }}>
                  {new Date(item.date).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit' })}
                  {item.time && ` • ${item.time}`}
                </Text>
              </HStack>
            </HStack>

            <VStack space="xs">
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>{item.municipality}</Text>
              <HStack space="xs" className="items-center">
                <Ionicons name="location-outline" size={13} color="#6b7280" />
                <Text style={{ fontSize: 12, color: '#4b5563' }}>{item.address} • {item.type}</Text>
              </HStack>

              {item.userPhone && (
                <Pressable
                  onPress={() => makePhoneCall(item.userPhone)}
                  className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mt-0.5 active:bg-blue-100"
                >
                  <HStack space="sm" className="items-center">
                    <Box className="w-6 h-6 rounded-full bg-blue-100 items-center justify-center">
                      <Ionicons name="call" size={13} color="#2563eb" />
                    </Box>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#1d4ed8' }}>{item.userPhone}</Text>
                  </HStack>
                </Pressable>
              )}

              {item.adminComment && (
                <Box className="bg-red-50 border border-red-200 rounded-lg p-2.5 mt-0.5">
                  <HStack space="xs" className="items-center mb-0.5">
                    <Box className="w-4 h-4 rounded-full bg-red-100 items-center justify-center">
                      <Ionicons name="alert-circle" size={10} color="#dc2626" />
                    </Box>
                    <Text style={{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: '#b91c1c' }}>Razlog vraćanja:</Text>
                  </HStack>
                  <Text style={{ fontSize: 12, color: '#dc2626' }}>{item.adminComment}</Text>
                </Box>
              )}
            </VStack>
          </VStack>
        </Box>
      </Pressable>
    );
  };


  return (
    <Box className="flex-1 bg-gray-50">
      {/* Header - Material Design 3 */}
      <HStack className="bg-white px-4 py-3 border-b border-gray-100 justify-between items-center" style={{ paddingTop: insets.top + 12 }}>
        <HStack space="sm" className="items-center">
          <Box className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center">
            <Ionicons name="document-text" size={20} color="#2563eb" />
          </Box>
          <Heading size="lg" className="text-gray-900">Radni Nalozi</Heading>
        </HStack>
        <HStack space="xs" className="items-center">
          <SyncStatusIndicator onPress={() => setShowSyncModal(true)} />
          <Pressable
            onPress={() => setShowFilters(true)}
            style={{ minHeight: 44, minWidth: 44 }}
            className="bg-blue-50 rounded-xl items-center justify-center active:bg-blue-100"
          >
            <Ionicons name="filter-outline" size={22} color="#2563eb" />
          </Pressable>
        </HStack>
      </HStack>

      {/* Stats Cards - Material Design 3 */}
      <Box className="px-2 py-1.5 bg-white mb-2">
        <HStack space="xs">
          <Box className="flex-1 bg-blue-50 rounded-lg border border-blue-100" style={{ minHeight: 42, paddingVertical: 6, paddingHorizontal: 4, justifyContent: 'center', alignItems: 'center' }}>
            <HStack space="xs" className="items-center" style={{ marginBottom: 2 }}>
              <Box className="w-3.5 h-3.5 rounded-full bg-blue-100 items-center justify-center">
                <Ionicons name="apps" size={9} color="#2563eb" />
              </Box>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1d4ed8' }}>{stats.total}</Text>
            </HStack>
            <Text style={{ fontSize: 8, color: '#2563eb' }}>UKUPNO</Text>
          </Box>
          <Box className="flex-1 bg-green-50 rounded-lg border border-green-100" style={{ minHeight: 42, paddingVertical: 6, paddingHorizontal: 4, justifyContent: 'center', alignItems: 'center' }}>
            <HStack space="xs" className="items-center" style={{ marginBottom: 2 }}>
              <Box className="w-3.5 h-3.5 rounded-full bg-green-100 items-center justify-center">
                <Ionicons name="checkmark-circle" size={9} color="#059669" />
              </Box>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#047857' }}>{stats.completed}</Text>
            </HStack>
            <Text style={{ fontSize: 8, color: '#059669' }}>ZAVRŠENO</Text>
          </Box>
          <Box className="flex-1 bg-yellow-50 rounded-lg border border-yellow-100" style={{ minHeight: 42, paddingVertical: 6, paddingHorizontal: 4, justifyContent: 'center', alignItems: 'center' }}>
            <HStack space="xs" className="items-center" style={{ marginBottom: 2 }}>
              <Box className="w-3.5 h-3.5 rounded-full bg-yellow-100 items-center justify-center">
                <Ionicons name="time" size={9} color="#ca8a04" />
              </Box>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#a16207' }}>{stats.pending}</Text>
            </HStack>
            <Text style={{ fontSize: 8, color: '#ca8a04' }}>NEZAVRŠENO</Text>
          </Box>
          <Box className="flex-1 bg-purple-50 rounded-lg border border-purple-100" style={{ minHeight: 42, paddingVertical: 6, paddingHorizontal: 4, justifyContent: 'center', alignItems: 'center' }}>
            <HStack space="xs" className="items-center" style={{ marginBottom: 2 }}>
              <Box className="w-3.5 h-3.5 rounded-full bg-purple-100 items-center justify-center">
                <Ionicons name="star" size={9} color="#9333ea" />
              </Box>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#7e22ce' }}>{stats.newOrders}</Text>
            </HStack>
            <Text style={{ fontSize: 8, color: '#9333ea' }}>NOVI</Text>
          </Box>
        </HStack>
      </Box>

      {/* Work Orders List */}
      <FlatList
        data={sortedWorkOrders}
        renderItem={renderWorkOrder}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 16) }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <Box className="flex-1 items-center justify-center p-12">
            <Box className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-4">
              <Ionicons name="document-text-outline" size={40} color="#9ca3af" />
            </Box>
            <Text size="md" bold className="text-gray-700 text-center mb-2">
              {searchTerm || statusFilter ? 'Nema rezultata' : 'Nema radnih naloga'}
            </Text>
            <Text size="sm" className="text-gray-500 text-center">
              {searchTerm || statusFilter
                ? 'Pokušajte sa drugačijom pretragom'
                : 'Trenutno nemate dodeljenih radnih naloga'}
            </Text>
          </Box>
        }
      />

      {/* Filter Modal - Material Design 3 */}
      <Modal visible={showFilters} animationType="slide" transparent onRequestClose={() => setShowFilters(false)}>
        <Pressable onPress={() => setShowFilters(false)} className="flex-1 bg-black/50 justify-end">
          <Pressable onPress={(e) => e.stopPropagation()} className="bg-white rounded-t-3xl p-6 max-h-[80%]">
            <HStack className="justify-between items-center mb-6">
              <HStack space="sm" className="items-center">
                <Box className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center">
                  <Ionicons name="filter" size={20} color="#2563eb" />
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

            <ScrollView showsVerticalScrollIndicator={false}>
              <VStack space="md">
                <VStack space="sm">
                  <Text size="sm" bold className="text-gray-700">Pretraga</Text>
                  <Input variant="outline" size="lg" className="bg-gray-50 border-2 border-gray-200">
                    <InputField
                      placeholder="Pretraži po opštini, adresi..."
                      value={searchTerm}
                      onChangeText={setSearchTerm}
                    />
                  </Input>
                </VStack>

                <VStack space="sm">
                  <Text size="sm" bold className="text-gray-700">Status naloga</Text>
                  <VStack space="xs">
                    {[
                      { value: '', label: 'Svi nalozi', icon: 'apps' },
                      { value: 'nezavrsen', label: 'Nezavršeni', icon: 'time' },
                      { value: 'zavrsen', label: 'Završeni', icon: 'checkmark-circle' },
                      { value: 'odlozen', label: 'Odloženi', icon: 'pause-circle' }
                    ].map((status) => (
                      <Pressable
                        key={status.value}
                        className={`px-4 py-3.5 rounded-xl border-2 ${
                          statusFilter === status.value
                            ? 'bg-blue-50 border-blue-600'
                            : 'bg-white border-gray-200'
                        }`}
                        onPress={() => setStatusFilter(status.value)}
                      >
                        <HStack space="sm" className="items-center">
                          <Box className={`w-8 h-8 rounded-full items-center justify-center ${
                            statusFilter === status.value ? 'bg-blue-100' : 'bg-gray-100'
                          }`}>
                            <Ionicons
                              name={status.icon}
                              size={18}
                              color={statusFilter === status.value ? '#2563eb' : '#6b7280'}
                            />
                          </Box>
                          <Text
                            size="sm"
                            bold
                            className={statusFilter === status.value ? 'text-blue-700' : 'text-gray-700'}
                          >
                            {status.label}
                          </Text>
                        </HStack>
                      </Pressable>
                    ))}
                  </VStack>
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
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </Box>
  );
}
