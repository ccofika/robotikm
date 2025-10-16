import React, { useState, useEffect, useContext, useMemo } from 'react';
import { FlatList, Pressable, RefreshControl, Modal, Alert, Linking, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { useOffline } from '../context/OfflineContext';
import dataRepository from '../services/dataRepository';
import { SyncStatusIndicator } from '../components/offline';
import { VStack } from '../components/ui/vstack';
import { HStack } from '../components/ui/hstack';
import { Box } from '../components/ui/box';
import { Card } from '../components/ui/card';
import { Text } from '../components/ui/text';
import { Heading } from '../components/ui/heading';
import { Input, InputField } from '../components/ui/input';
import { Button, ButtonText } from '../components/ui/button';
import { Center } from '../components/ui/center';

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
        <Card variant="elevated" size="md" className="mb-4 border-l-4" style={{ borderLeftColor: displayStatus.color }}>
          <VStack space="sm">
            <HStack className="justify-between items-center">
              <Box className="px-3 py-1.5 rounded-lg" style={{ backgroundColor: displayStatus.bgColor }}>
                <Text size="xs" bold className="uppercase" style={{ color: displayStatus.color }}>
                  {displayStatus.text}
                </Text>
              </Box>
              <HStack space="xs" className="items-center">
                <Ionicons name="calendar-outline" size={14} color="#64748b" />
                <Text size="sm" className="text-slate-600">
                  {new Date(item.date).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit' })}
                  {item.time && ` • ${item.time}`}
                </Text>
              </HStack>
            </HStack>

            <VStack space="xs">
              <Text size="lg" bold className="text-slate-900">{item.municipality}</Text>
              <HStack space="xs" className="items-center">
                <Ionicons name="location-outline" size={14} color="#64748b" />
                <Text size="sm" className="text-slate-600">{item.address} • {item.type}</Text>
              </HStack>

              {item.userPhone && (
                <Pressable
                  onPress={() => makePhoneCall(item.userPhone)}
                  className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mt-1"
                >
                  <HStack space="sm" className="items-center">
                    <Ionicons name="call-outline" size={16} color="#2563eb" />
                    <Text size="sm" bold className="text-blue-600">{item.userPhone}</Text>
                  </HStack>
                </Pressable>
              )}

              {item.adminComment && (
                <Box className="bg-red-50 border border-red-200 rounded-xl p-3 mt-1">
                  <Text size="xs" bold className="text-red-700 uppercase mb-1">Razlog vraćanja:</Text>
                  <Text size="sm" className="text-red-600">{item.adminComment}</Text>
                </Box>
              )}
            </VStack>
          </VStack>
        </Card>
      </Pressable>
    );
  };

  const renderStatCard = (label, value, iconName, iconBgColor, iconColor) => (
    <Box className="flex-1 mx-1">
      <Card variant="elevated" size="md">
        <VStack space="sm">
          <Center className="w-12 h-12 rounded-xl" style={{ backgroundColor: iconBgColor }}>
            <Ionicons name={iconName} size={20} color={iconColor} />
          </Center>
          <Text size="xs" bold className="text-slate-600 uppercase tracking-wide">{label}</Text>
          <Text size="3xl" bold className="text-slate-900">{value}</Text>
        </VStack>
      </Card>
    </Box>
  );

  return (
    <LinearGradient
      colors={['#f8fafc', '#e2e8f0']}
      className="flex-1"
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Header */}
      <HStack className="px-6 py-4 bg-white/85 border-b border-white/30 justify-between items-center" style={{ paddingTop: insets.top + 16 }}>
        <Heading size="xl" className="text-slate-900">Radni Nalozi</Heading>
        <HStack space="sm" className="items-center">
          {/* Sync Status Indicator */}
          <SyncStatusIndicator onPress={() => setShowSyncModal(true)} />

          <Pressable
            onPress={() => setShowFilters(true)}
            className="bg-blue-600 rounded-xl px-4 py-2.5"
          >
            <HStack space="xs" className="items-center">
              <Ionicons name="filter-outline" size={16} color="#fff" />
              <Text size="sm" bold className="text-white">Filteri</Text>
            </HStack>
          </Pressable>
        </HStack>
      </HStack>

      {/* Statistics */}
      <Box className="p-4">
        <HStack className="mb-2">
          {renderStatCard('Ukupno', stats.total, 'apps-outline', '#dbeafe', '#1e40af')}
          {renderStatCard('Završeno', stats.completed, 'checkmark-circle-outline', '#d1fae5', '#059669')}
        </HStack>
        <HStack>
          {renderStatCard('Nezavršeno', stats.pending, 'time-outline', '#fef3c7', '#ca8a04')}
          {renderStatCard('Novi', stats.newOrders, 'star-outline', '#f3e8ff', '#9333ea')}
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
          <Center className="p-12">
            <Ionicons name="document-text-outline" size={64} color="#cbd5e1" style={{ marginBottom: 16 }} />
            <Text size="md" className="text-slate-500 text-center">
              {searchTerm || statusFilter
                ? 'Nema rezultata za zadatu pretragu'
                : 'Nemate dodeljenih radnih naloga'}
            </Text>
          </Center>
        }
      />

      {/* Filter Modal */}
      <Modal visible={showFilters} animationType="slide" transparent onRequestClose={() => setShowFilters(false)}>
        <Pressable onPress={() => setShowFilters(false)} className="flex-1 bg-black/50 justify-end">
          <Pressable onPress={(e) => e.stopPropagation()} className="bg-white rounded-t-3xl p-6 max-h-[80%]">
            <HStack className="justify-between items-center mb-6">
              <Heading size="lg" className="text-slate-900">Filteri</Heading>
              <Pressable onPress={() => setShowFilters(false)} className="w-10 h-10 items-center justify-center">
                <Ionicons name="close" size={28} color="#64748b" />
              </Pressable>
            </HStack>

            <ScrollView showsVerticalScrollIndicator={false}>
              <VStack space="md">
                <VStack space="xs">
                  <Text size="sm" bold className="text-slate-700">Pretraga</Text>
                  <Input variant="outline" size="lg">
                    <InputField
                      placeholder="Pretraži po opštini, adresi..."
                      value={searchTerm}
                      onChangeText={setSearchTerm}
                    />
                  </Input>
                </VStack>

                <VStack space="xs">
                  <Text size="sm" bold className="text-slate-700">Status naloga</Text>
                  <Box className="flex-row flex-wrap gap-2">
                    {[
                      { value: '', label: 'Svi', icon: 'apps-outline' },
                      { value: 'nezavrsen', label: 'Nezavršeni', icon: 'time-outline' },
                      { value: 'zavrsen', label: 'Završeni', icon: 'checkmark-circle-outline' },
                      { value: 'odlozen', label: 'Odloženi', icon: 'pause-circle-outline' }
                    ].map((status) => (
                      <Pressable
                        key={status.value}
                        className={`flex-1 min-w-[45%] px-4 py-3.5 rounded-xl border ${
                          statusFilter === status.value
                            ? 'bg-blue-600 border-blue-600'
                            : 'bg-white border-slate-200'
                        }`}
                        onPress={() => setStatusFilter(status.value)}
                      >
                        <HStack space="xs" className="items-center justify-center">
                          <Ionicons
                            name={status.icon}
                            size={16}
                            color={statusFilter === status.value ? '#fff' : '#64748b'}
                          />
                          <Text
                            size="sm"
                            bold
                            className={statusFilter === status.value ? 'text-white' : 'text-slate-700'}
                          >
                            {status.label}
                          </Text>
                        </HStack>
                      </Pressable>
                    ))}
                  </Box>
                </VStack>

                <Button action="primary" size="lg" onPress={() => setShowFilters(false)} className="mt-2">
                  <ButtonText>Primeni filtere</ButtonText>
                </Button>
              </VStack>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </LinearGradient>
  );
}
