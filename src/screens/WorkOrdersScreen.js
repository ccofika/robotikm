import React, { useState, useEffect, useContext, useMemo } from 'react';
import { FlatList, Pressable, RefreshControl, Modal, Alert, Linking, ScrollView, View } from 'react-native';
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
  const { user, logout } = useContext(AuthContext);
  const { isOnline, isSyncing } = useOffline();
  const insets = useSafeAreaInsets();
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('new');
  const [showFilters, setShowFilters] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);

  useEffect(() => {
    fetchWorkOrders();
  }, [user?._id]);

  const fetchWorkOrders = async (forceRefresh = false) => {
    if (!user?._id) return;
    try {
      const orders = await dataRepository.getWorkOrders(user._id, forceRefresh);
      setWorkOrders(orders);
    } catch (error) {
      console.error('Greška pri učitavanju radnih naloga:', error);
      if (isOnline) {
        Alert.alert('Greška', 'Neuspešno učitavanje radnih naloga');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
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
    if (order.status === 'zavrsen') return { text: 'Završen', color: '#059669', bgColor: '#d1fae5', icon: 'checkmark-circle' };
    if (order.status === 'odlozen') return { text: 'Odložen', color: '#f59e0b', bgColor: '#fef3c7', icon: 'pause-circle' };
    if (order.status === 'otkazan') return { text: 'Otkazan', color: '#64748b', bgColor: '#e2e8f0', icon: 'close-circle' };
    if (order.status === 'nezavrsen') {
      if (isWorkOrderNew(order)) {
        return { text: 'Nov', color: '#8b5cf6', bgColor: '#ede9fe', icon: 'star' };
      }
      return { text: 'U toku', color: '#3b82f6', bgColor: '#dbeafe', icon: 'play-circle' };
    }
    return { text: 'U toku', color: '#3b82f6', bgColor: '#dbeafe', icon: 'play-circle' };
  };

  const filteredWorkOrders = useMemo(() => {
    return workOrders.filter(order => {
      const searchMatch = searchTerm === '' ||
        order.municipality?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.type?.toLowerCase().includes(searchTerm.toLowerCase());

      let statusMatch = true;
      if (statusFilter === 'all') {
        statusMatch = order.status !== 'zavrsen';
      } else if (statusFilter === 'new') {
        statusMatch = order.status === 'nezavrsen' && isWorkOrderNew(order);
      } else if (statusFilter === 'nezavrsen') {
        statusMatch = order.status === 'nezavrsen' && !isWorkOrderNew(order);
      } else if (statusFilter !== '') {
        statusMatch = order.status === statusFilter;
      }

      return searchMatch && statusMatch;
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
    const allTotal = workOrders.length;
    const completed = workOrders.filter(o => o.status === 'zavrsen').length;
    const pending = workOrders.filter(o => o.status === 'nezavrsen' && !isWorkOrderNew(o)).length;
    const newOrders = workOrders.filter(o => o.status === 'nezavrsen' && isWorkOrderNew(o)).length;
    const postponed = workOrders.filter(o => o.status === 'odlozen').length;
    const cancelled = workOrders.filter(o => o.status === 'otkazan').length;
    const total = allTotal - completed;
    return {
      total,
      completed,
      pending,
      newOrders,
      postponed,
      cancelled,
      completionRate: allTotal > 0 ? Math.round((completed / allTotal) * 100) : 0
    };
  }, [workOrders]);

  const makePhoneCall = (phoneNumber) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleLogout = () => {
    Alert.alert(
      'Odjava',
      'Da li ste sigurni da želite da se odjavite?',
      [
        { text: 'Otkaži', style: 'cancel' },
        { text: 'Odjavi se', style: 'destructive', onPress: () => logout() }
      ]
    );
  };

  const renderWorkOrder = ({ item }) => {
    const displayStatus = getDisplayStatus(item);
    return (
      <Pressable
        onPress={() => navigation.navigate('WorkOrderDetail', { orderId: item._id })}
        style={{ marginBottom: 12 }}
      >
        <View style={{
          backgroundColor: '#ffffff',
          borderRadius: 16,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 3,
        }}>
          {/* Status Accent Bar */}
          <View style={{ height: 4, backgroundColor: displayStatus.color }} />

          <View style={{ padding: 16 }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 6 }}>
                  {item.municipality}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="location-sharp" size={14} color="#6b7280" />
                  <Text style={{ fontSize: 14, color: '#6b7280', marginLeft: 6, fontWeight: '500' }}>
                    {item.address}
                  </Text>
                </View>
              </View>

              {/* Status Badge */}
              <View style={{
                backgroundColor: displayStatus.bgColor,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
              }}>
                <Ionicons name={displayStatus.icon} size={14} color={displayStatus.color} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: displayStatus.color, marginLeft: 4 }}>
                  {displayStatus.text}
                </Text>
              </View>
            </View>

            {/* Metadata */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
                <Ionicons name="calendar-outline" size={14} color="#9ca3af" />
                <Text style={{ fontSize: 13, color: '#6b7280', marginLeft: 4, fontWeight: '500' }}>
                  {new Date(item.date).toLocaleDateString('sr-RS', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
              {item.time && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
                  <Ionicons name="time-outline" size={14} color="#9ca3af" />
                  <Text style={{ fontSize: 13, color: '#6b7280', marginLeft: 4, fontWeight: '500' }}>
                    {item.time}
                  </Text>
                </View>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="construct-outline" size={14} color="#9ca3af" />
                <Text style={{ fontSize: 13, color: '#6b7280', marginLeft: 4, fontWeight: '500' }}>
                  {item.type}
                </Text>
              </View>
            </View>

            {/* Details */}
            {item.details && (
              <View style={{
                backgroundColor: '#f9fafb',
                borderRadius: 12,
                padding: 12,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: '#e5e7eb'
              }}>
                <Text style={{ fontSize: 13, color: '#374151', lineHeight: 20 }} numberOfLines={2}>
                  {item.details}
                </Text>
              </View>
            )}

            {/* Phone Button */}
            {item.userPhone && (
              <Pressable
                onPress={() => makePhoneCall(item.userPhone)}
                style={{
                  backgroundColor: '#2563eb',
                  borderRadius: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  marginBottom: item.adminComment ? 12 : 0,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="call" size={18} color="#ffffff" />
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#ffffff', marginLeft: 8 }}>
                    {item.userPhone}
                  </Text>
                </View>
              </Pressable>
            )}

            {/* Admin Comment */}
            {item.adminComment && (
              <View style={{
                backgroundColor: '#fffbeb',
                borderRadius: 12,
                padding: 12,
                flexDirection: 'row',
                borderWidth: 1,
                borderColor: '#fde68a'
              }}>
                <Ionicons name="alert-circle" size={16} color="#f59e0b" style={{ marginTop: 2, marginRight: 8 }} />
                <Text style={{ fontSize: 13, color: '#92400e', lineHeight: 18, flex: 1 }}>
                  {item.adminComment}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <View style={{
        backgroundColor: '#ffffff',
        paddingTop: insets.top + 16,
        paddingBottom: 16,
        paddingHorizontal: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 3,
      }}>
        {/* Title Row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <View>
            <Text style={{ fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 4 }}>
              Nalozi
            </Text>
            <Text style={{ fontSize: 14, color: '#6b7280', fontWeight: '500' }}>
              {stats.total} aktivnih
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ marginRight: 12 }}>
              <SyncStatusIndicator onPress={() => setShowSyncModal(true)} />
            </View>
            <Pressable
              onPress={() => setShowFilters(true)}
              style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}
            >
              <Ionicons name="options-outline" size={24} color="#111827" />
            </Pressable>
            <Pressable
              onPress={handleLogout}
              style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="log-out-outline" size={24} color="#111827" />
            </Pressable>
          </View>
        </View>

        {/* Search Bar */}
        <View style={{
          backgroundColor: '#f3f4f6',
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          flexDirection: 'row',
          alignItems: 'center'
        }}>
          <Ionicons name="search" size={20} color="#6b7280" />
          <InputField
            placeholder="Pretraži naloge..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            style={{
              flex: 1,
              fontSize: 15,
              color: '#111827',
              fontWeight: '500',
              marginLeft: 10,
              padding: 0
            }}
            placeholderTextColor="#9ca3af"
          />
          {searchTerm ? (
            <Pressable onPress={() => setSearchTerm('')} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Filter Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16 }}
        style={{ flexGrow: 0, flexShrink: 0 }}
      >
        {[
          { value: 'all', label: 'Svi', count: stats.total, icon: 'albums-outline', color: '#3b82f6' },
          { value: 'new', label: 'Novi', count: stats.newOrders, icon: 'star', color: '#8b5cf6' },
          { value: 'nezavrsen', label: 'U toku', count: stats.pending, icon: 'play-circle', color: '#3b82f6' },
          { value: 'zavrsen', label: 'Završeni', count: stats.completed, icon: 'checkmark-circle', color: '#059669' },
          { value: 'odlozen', label: 'Odloženi', count: stats.postponed, icon: 'pause-circle', color: '#f59e0b' },
          { value: 'otkazan', label: 'Otkazani', count: stats.cancelled, icon: 'close-circle', color: '#64748b' },
        ].map((filter, index) => (
          <Pressable
            key={filter.value}
            onPress={() => setStatusFilter(filter.value)}
            style={{
              backgroundColor: statusFilter === filter.value ? filter.color : '#ffffff',
              paddingHorizontal: 18,
              paddingVertical: 14,
              borderRadius: 20,
              borderWidth: 2,
              borderColor: statusFilter === filter.value ? filter.color : '#e5e7eb',
              marginRight: index < 5 ? 10 : 0,
              minWidth: 110,
              height: 70,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Ionicons
                name={filter.icon}
                size={18}
                color={statusFilter === filter.value ? '#ffffff' : filter.color}
              />
              <Text style={{
                fontSize: 18,
                fontWeight: '700',
                color: statusFilter === filter.value ? '#ffffff' : '#111827',
                marginLeft: 6
              }}>
                {filter.count}
              </Text>
            </View>
            <Text style={{
              fontSize: 13,
              fontWeight: '600',
              color: statusFilter === filter.value ? '#ffffff' : '#6b7280'
            }}>
              {filter.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Work Orders List */}
      <FlatList
        data={sortedWorkOrders}
        renderItem={renderWorkOrder}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: Math.max(insets.bottom + 20, 40)
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: '#f3f4f6',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16
            }}>
              <Ionicons name="document-text-outline" size={40} color="#9ca3af" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
              {searchTerm || statusFilter !== 'new' ? 'Nema rezultata' : 'Nema naloga'}
            </Text>
            <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', paddingHorizontal: 40 }}>
              {searchTerm || statusFilter !== 'new'
                ? 'Pokušajte sa drugačijom pretragom'
                : 'Trenutno nemate dodeljenih radnih naloga'}
            </Text>
          </View>
        }
      />

      {/* Filter Modal */}
      <Modal visible={showFilters} animationType="slide" transparent onRequestClose={() => setShowFilters(false)}>
        <Pressable onPress={() => setShowFilters(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={{
              backgroundColor: '#ffffff',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingTop: 24,
              paddingBottom: Math.max(insets.bottom + 24, 40),
              paddingHorizontal: 20
            }}>
              {/* Handle */}
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <View style={{ width: 40, height: 5, backgroundColor: '#e5e7eb', borderRadius: 3 }} />
              </View>

              {/* Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Text style={{ fontSize: 24, fontWeight: '700', color: '#111827' }}>Filteri</Text>
                <Pressable onPress={() => setShowFilters(false)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="close" size={28} color="#6b7280" />
                </Pressable>
              </View>

              {/* Status */}
              <View style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12 }}>Status</Text>
                {[
                  { value: 'all', label: 'Svi nalozi', icon: 'albums-outline' },
                  { value: 'zavrsen', label: 'Završeni', icon: 'checkmark-circle' },
                  { value: 'new', label: 'Novi', icon: 'star' },
                  { value: 'nezavrsen', label: 'U toku', icon: 'play-circle' },
                  { value: 'odlozen', label: 'Odloženi', icon: 'pause-circle' },
                  { value: 'otkazan', label: 'Otkazani', icon: 'close-circle' }
                ].map((status, index) => (
                  <Pressable
                    key={status.value}
                    onPress={() => setStatusFilter(status.value)}
                    style={{
                      backgroundColor: statusFilter === status.value ? '#2563eb' : '#f9fafb',
                      borderRadius: 12,
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      marginBottom: index < 5 ? 10 : 0,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons
                        name={status.icon}
                        size={22}
                        color={statusFilter === status.value ? '#ffffff' : '#6b7280'}
                      />
                      <Text style={{
                        fontSize: 16,
                        fontWeight: '600',
                        color: statusFilter === status.value ? '#ffffff' : '#111827',
                        marginLeft: 12
                      }}>
                        {status.label}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>

              {/* Apply Button */}
              <Pressable
                onPress={() => setShowFilters(false)}
                style={{
                  backgroundColor: '#2563eb',
                  borderRadius: 12,
                  paddingVertical: 16,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#ffffff', textAlign: 'center' }}>
                  Primeni filtere
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
