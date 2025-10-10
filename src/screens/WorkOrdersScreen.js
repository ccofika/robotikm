import React, { useState, useEffect, useContext, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
  Linking,
  ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { workOrdersAPI } from '../services/api';
import { GlassCard } from '../components/ui/GlassCard';

export default function WorkOrdersScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchWorkOrders();
  }, [user?._id]);

  const fetchWorkOrders = async () => {
    if (!user?._id) return;

    try {
      const response = await workOrdersAPI.getTechnicianWorkOrders(user._id);
      setWorkOrders(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju radnih naloga:', error);
      Alert.alert('Greška', 'Neuspešno učitavanje radnih naloga');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchWorkOrders();
  };

  // Check if work order is new
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

  // Get display status - WEB SLATE BOJE
  const getDisplayStatus = (order) => {
    if (order.status === 'zavrsen') return { text: 'Završen', color: '#16a34a', bgColor: '#d1fae5' }; // green-600
    if (order.status === 'odlozen') return { text: 'Odložen', color: '#dc2626', bgColor: '#fee2e2' }; // red-600
    if (order.status === 'otkazan') return { text: 'Otkazan', color: '#64748b', bgColor: '#f1f5f9' }; // slate-500

    if (order.status === 'nezavrsen') {
      if (isWorkOrderNew(order)) {
        return { text: 'Nov', color: '#9333ea', bgColor: '#f3e8ff' }; // purple-600
      }
      return { text: 'Nezavršen', color: '#ca8a04', bgColor: '#fef3c7' }; // yellow-600
    }

    return { text: 'Nezavršen', color: '#ca8a04', bgColor: '#fef3c7' };
  };

  // Filter work orders
  const filteredWorkOrders = useMemo(() => {
    return workOrders.filter(order => {
      const searchMatch = searchTerm === '' ||
        order.municipality?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.type?.toLowerCase().includes(searchTerm.toLowerCase());

      const statusMatch = statusFilter === '' || order.status === statusFilter;

      // Hide completed by default
      const defaultHideCompleted = statusFilter === '' && searchTerm === '' ? order.status !== 'zavrsen' : true;

      return searchMatch && statusMatch && defaultHideCompleted;
    });
  }, [workOrders, searchTerm, statusFilter]);

  // Sort work orders
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

  // Calculate statistics
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
      <Pressable
        onPress={() => navigation.navigate('WorkOrderDetail', { orderId: item._id })}
        className="mb-4"
      >
        <GlassCard className={`border-l-4`} style={{ borderLeftColor: displayStatus.color }}>
          <View className="flex-row justify-between items-center mb-3">
            <View className="px-3 py-1.5 rounded-lg" style={{ backgroundColor: displayStatus.bgColor }}>
              <Text className="text-xs font-bold uppercase" style={{ color: displayStatus.color }}>
                {displayStatus.text}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="calendar-outline" size={14} color="#64748b" style={{ marginRight: 4 }} />
              <Text className="text-sm text-gray-600">
                {new Date(item.date).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit' })}
                {item.time && ` • ${item.time}`}
              </Text>
            </View>
          </View>

          <View className="mt-2">
            <Text className="text-lg font-bold text-slate-900 mb-1">{item.municipality}</Text>
            <View className="flex-row items-center mb-2">
              <Ionicons name="location-outline" size={14} color="#64748b" style={{ marginRight: 4 }} />
              <Text className="text-sm text-slate-600">{item.address} • {item.type}</Text>
            </View>

            {item.userPhone && (
              <Pressable
                onPress={() => makePhoneCall(item.userPhone)}
                className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mt-2 flex-row items-center"
              >
                <Ionicons name="call-outline" size={16} color="#2563eb" style={{ marginRight: 8 }} />
                <Text className="text-blue-600 text-sm font-semibold">{item.userPhone}</Text>
              </Pressable>
            )}

            {item.adminComment && (
              <View className="bg-red-50 border border-red-200 rounded-xl p-3 mt-2">
                <Text className="text-xs font-bold text-red-700 uppercase mb-1">Razlog vraćanja:</Text>
                <Text className="text-sm text-red-600">{item.adminComment}</Text>
              </View>
            )}
          </View>
        </GlassCard>
      </Pressable>
    );
  };

  const renderStatCard = (label, value, iconName, iconBgColor, iconColor) => (
    <View className="flex-1 mx-1">
      <GlassCard className="p-4">
        <View
          className="w-12 h-12 rounded-xl items-center justify-center mb-3"
          style={{ backgroundColor: iconBgColor }}
        >
          <Ionicons name={iconName} size={20} color={iconColor} />
        </View>
        <Text className="text-slate-600 text-xs font-semibold uppercase tracking-wide mb-1">{label}</Text>
        <Text className="text-slate-900 text-3xl font-bold">{value}</Text>
      </GlassCard>
    </View>
  );

  return (
    <LinearGradient
      colors={['#f8fafc', '#e2e8f0']}
      className="flex-1"
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Header */}
      <View className="flex-row justify-between items-center px-6 py-4 bg-white/85 border-b border-white/30">
        <Text className="text-2xl font-bold text-slate-900">Radni Nalozi</Text>
        <Pressable
          onPress={() => setShowFilters(true)}
          className="bg-blue-600 rounded-xl px-4 py-2.5 flex-row items-center"
        >
          <Ionicons name="filter-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
          <Text className="text-white text-sm font-semibold">Filteri</Text>
        </Pressable>
      </View>

      {/* Statistics */}
      <View className="p-4">
        <View className="flex-row mb-2">
          {renderStatCard('Ukupno', stats.total, 'apps-outline', '#dbeafe', '#1e40af')}
          {renderStatCard('Završeno', stats.completed, 'checkmark-circle-outline', '#d1fae5', '#059669')}
        </View>
        <View className="flex-row">
          {renderStatCard('Nezavršeno', stats.pending, 'time-outline', '#fef3c7', '#ca8a04')}
          {renderStatCard('Novi', stats.newOrders, 'star-outline', '#f3e8ff', '#9333ea')}
        </View>
      </View>

      {/* Work Orders List */}
      <FlatList
        data={sortedWorkOrders}
        renderItem={renderWorkOrder}
        keyExtractor={(item) => item._id}
        contentContainerClassName="px-4 pb-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View className="items-center justify-center p-12">
            <Ionicons name="document-text-outline" size={64} color="#cbd5e1" style={{ marginBottom: 16 }} />
            <Text className="text-slate-500 text-base text-center">
              {searchTerm || statusFilter
                ? 'Nema rezultata za zadatu pretragu'
                : 'Nemate dodeljenih radnih naloga'}
            </Text>
          </View>
        }
      />

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilters(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 max-h-[80%]">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-bold text-slate-900">Filteri</Text>
              <Pressable onPress={() => setShowFilters(false)} className="w-10 h-10 items-center justify-center">
                <Ionicons name="close" size={28} color="#64748b" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-sm font-semibold text-slate-700 mb-2 ml-1">Pretraga</Text>
              <TextInput
                className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900 mb-4"
                placeholder="Pretraži po opštini, adresi..."
                placeholderTextColor="#94a3b8"
                value={searchTerm}
                onChangeText={setSearchTerm}
              />

              <Text className="text-sm font-semibold text-slate-700 mb-3 ml-1 mt-2">Status naloga</Text>
              <View className="flex-row flex-wrap gap-2 mb-6">
                {[
                  { value: '', label: 'Svi', icon: 'apps-outline' },
                  { value: 'nezavrsen', label: 'Nezavršeni', icon: 'time-outline' },
                  { value: 'zavrsen', label: 'Završeni', icon: 'checkmark-circle-outline' },
                  { value: 'odlozen', label: 'Odloženi', icon: 'pause-circle-outline' }
                ].map((status) => (
                  <Pressable
                    key={status.value}
                    className={`flex-1 min-w-[45%] px-4 py-3.5 rounded-xl border flex-row items-center justify-center ${
                      statusFilter === status.value
                        ? 'bg-blue-600 border-blue-600'
                        : 'bg-white border-slate-200'
                    }`}
                    onPress={() => setStatusFilter(status.value)}
                  >
                    <Ionicons
                      name={status.icon}
                      size={16}
                      color={statusFilter === status.value ? '#fff' : '#64748b'}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      className={`text-sm font-semibold ${
                        statusFilter === status.value ? 'text-white' : 'text-slate-700'
                      }`}
                    >
                      {status.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Pressable
                onPress={() => setShowFilters(false)}
                className="bg-slate-900 rounded-xl py-4 px-8 items-center justify-center shadow-md"
              >
                <Text className="text-white text-base font-semibold">Primeni filtere</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

