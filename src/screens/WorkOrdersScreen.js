import React, { useState, useEffect, useContext, useMemo } from 'react';
import { FlatList, Pressable, RefreshControl, Modal, Alert, Linking, ScrollView, View, Platform, ActivityIndicator } from 'react-native';
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
import ACRPhoneRecordingWatcher from '../services/ACRPhoneRecordingWatcher';

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
  const [safStatus, setSafStatus] = useState({ required: false, enabled: false });
  const [isSyncingRecordings, setIsSyncingRecordings] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [processedCount, setProcessedCount] = useState(0);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [syncPassword, setSyncPassword] = useState('');

  // Proveri SAF status na mount
  useEffect(() => {
    checkSAFStatus();
  }, []);

  const checkSAFStatus = async () => {
    if (Platform.OS === 'android') {
      const status = await ACRPhoneRecordingWatcher.checkSAFStatus();
      setSafStatus(status);
      setProcessedCount(ACRPhoneRecordingWatcher.getProcessedFilesCount());
    }
  };

  const handleSetupSAF = async () => {
    setIsSyncingRecordings(true);
    setSyncResult(null);
    try {
      const granted = await ACRPhoneRecordingWatcher.requestSAFFolderAccess();
      if (granted) {
        setSafStatus({ required: true, enabled: true });
        setSyncResult({ success: true, message: 'Pristup folderu omogućen!' });
      } else {
        setSyncResult({ success: false, message: 'Pristup folderu nije odobren' });
      }
    } catch (error) {
      setSyncResult({ success: false, message: error.message });
    } finally {
      setIsSyncingRecordings(false);
    }
  };

  const handleSyncRecordings = async () => {
    setIsSyncingRecordings(true);
    setSyncResult(null);
    try {
      const result = await ACRPhoneRecordingWatcher.manualSync();
      if (result.needsSAFSetup) {
        // SAF nije podešen - korisnik će biti upitan da izabere folder
        checkSAFStatus();
      }
      setSyncResult(result);
      setProcessedCount(ACRPhoneRecordingWatcher.getProcessedFilesCount());
    } catch (error) {
      setSyncResult({ success: false, message: error.message });
    } finally {
      setIsSyncingRecordings(false);
    }
  };

  const handleResetProcessedFiles = async () => {
    Alert.alert(
      'Resetuj obrađene fajlove',
      'Ovo će omogućiti da se svi snimci ponovo procesiraju. Da li ste sigurni?',
      [
        { text: 'Otkaži', style: 'cancel' },
        {
          text: 'Resetuj',
          style: 'destructive',
          onPress: async () => {
            const result = await ACRPhoneRecordingWatcher.resetProcessedFiles();
            setSyncResult(result);
            setProcessedCount(0);
          }
        }
      ]
    );
  };

  const handleSyncButtonPress = () => {
    setShowPasswordModal(true);
    setSyncPassword('');
  };

  const handlePasswordSubmit = () => {
    if (syncPassword === 'Robotik2023!') {
      setShowPasswordModal(false);
      setSyncPassword('');
      setShowSyncModal(true);
    } else {
      Alert.alert('Greška', 'Pogrešna šifra');
      setSyncPassword('');
    }
  };

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
        order.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.tisId?.toLowerCase().includes(searchTerm.toLowerCase());

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
              <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
                <Ionicons name="construct-outline" size={14} color="#9ca3af" />
                <Text style={{ fontSize: 13, color: '#6b7280', marginLeft: 4, fontWeight: '500' }}>
                  {item.type}
                </Text>
              </View>
              {item.tisId && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
                  <Ionicons name="finger-print-outline" size={14} color="#9ca3af" />
                  <Text style={{ fontSize: 13, color: '#6b7280', marginLeft: 4, fontWeight: '500' }}>
                    TIS: {item.tisId}
                  </Text>
                </View>
              )}
              {item.installationType && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="settings-outline" size={14} color="#9ca3af" />
                  <Text style={{ fontSize: 13, color: '#6b7280', marginLeft: 4, fontWeight: '500' }}>
                    {item.installationType}
                  </Text>
                </View>
              )}
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
              <SyncStatusIndicator onPress={handleSyncButtonPress} />
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

      {/* Password Modal */}
      <Modal visible={showPasswordModal} animationType="fade" transparent onRequestClose={() => setShowPasswordModal(false)}>
        <Pressable onPress={() => setShowPasswordModal(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={{
              backgroundColor: '#ffffff',
              borderRadius: 20,
              padding: 24,
              width: 300,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 5
            }}>
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <Ionicons name="lock-closed" size={40} color="#2563eb" />
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginTop: 12 }}>
                  Unesi šifru
                </Text>
              </View>

              <View style={{
                backgroundColor: '#f3f4f6',
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                marginBottom: 16
              }}>
                <InputField
                  placeholder="Šifra..."
                  value={syncPassword}
                  onChangeText={setSyncPassword}
                  secureTextEntry={true}
                  style={{
                    fontSize: 16,
                    color: '#111827',
                    fontWeight: '500',
                    padding: 0
                  }}
                  placeholderTextColor="#9ca3af"
                  onSubmitEditing={handlePasswordSubmit}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable
                  onPress={() => setShowPasswordModal(false)}
                  style={{
                    flex: 1,
                    backgroundColor: '#f3f4f6',
                    borderRadius: 12,
                    paddingVertical: 14
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#6b7280', textAlign: 'center' }}>
                    Otkaži
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handlePasswordSubmit}
                  style={{
                    flex: 1,
                    backgroundColor: '#2563eb',
                    borderRadius: 12,
                    paddingVertical: 14
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#ffffff', textAlign: 'center' }}>
                    Potvrdi
                  </Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Sync Modal */}
      <Modal visible={showSyncModal} animationType="slide" transparent onRequestClose={() => setShowSyncModal(false)}>
        <Pressable onPress={() => setShowSyncModal(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
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
                <Text style={{ fontSize: 24, fontWeight: '700', color: '#111827' }}>Sinhronizacija</Text>
                <Pressable onPress={() => setShowSyncModal(false)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="close" size={28} color="#6b7280" />
                </Pressable>
              </View>

              {/* SAF Setup Section - samo za Android 11+ */}
              {Platform.OS === 'android' && safStatus.required && (
                <View style={{
                  backgroundColor: safStatus.enabled ? '#d1fae5' : '#fef3c7',
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: safStatus.enabled ? '#6ee7b7' : '#fde68a'
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <Ionicons
                      name={safStatus.enabled ? 'checkmark-circle' : 'folder-open-outline'}
                      size={24}
                      color={safStatus.enabled ? '#059669' : '#f59e0b'}
                    />
                    <Text style={{
                      fontSize: 16,
                      fontWeight: '700',
                      color: safStatus.enabled ? '#065f46' : '#92400e',
                      marginLeft: 10
                    }}>
                      {safStatus.enabled ? 'Pristup folderu omogućen' : 'Potreban pristup folderu'}
                    </Text>
                  </View>

                  {!safStatus.enabled && (
                    <>
                      <Text style={{ fontSize: 14, color: '#92400e', marginBottom: 12, lineHeight: 20 }}>
                        Za automatsku sinhronizaciju snimaka poziva potrebno je odobriti pristup ACRPhone folderu.
                      </Text>
                      <Pressable
                        onPress={handleSetupSAF}
                        disabled={isSyncingRecordings}
                        style={{
                          backgroundColor: '#f59e0b',
                          borderRadius: 12,
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: isSyncingRecordings ? 0.7 : 1
                        }}
                      >
                        <Ionicons name="folder-open" size={20} color="#ffffff" />
                        <Text style={{ fontSize: 15, fontWeight: '600', color: '#ffffff', marginLeft: 8 }}>
                          Izaberi ACRPhone folder
                        </Text>
                      </Pressable>
                    </>
                  )}
                </View>
              )}

              {/* Sync Recordings Section */}
              <View style={{
                backgroundColor: '#f0f9ff',
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: '#bae6fd'
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Ionicons name="mic-outline" size={24} color="#0284c7" />
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#0c4a6e', marginLeft: 10 }}>
                    Sinhronizacija snimaka poziva
                  </Text>
                </View>

                <Text style={{ fontSize: 14, color: '#0c4a6e', marginBottom: 16, lineHeight: 20 }}>
                  Pronađi i uploaduj nove snimke poziva sa ACR Phone aplikacije na server.
                </Text>

                <Pressable
                  onPress={handleSyncRecordings}
                  disabled={isSyncingRecordings || (safStatus.required && !safStatus.enabled)}
                  style={{
                    backgroundColor: (safStatus.required && !safStatus.enabled) ? '#9ca3af' : '#0284c7',
                    borderRadius: 12,
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: isSyncingRecordings ? 0.7 : 1
                  }}
                >
                  {isSyncingRecordings ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Ionicons name="sync" size={20} color="#ffffff" />
                  )}
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#ffffff', marginLeft: 8 }}>
                    {isSyncingRecordings ? 'Sinhronizacija...' : 'Sinhronizuj snimke'}
                  </Text>
                </Pressable>

                {safStatus.required && !safStatus.enabled && (
                  <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 8, textAlign: 'center' }}>
                    Prvo omogućite pristup folderu iznad
                  </Text>
                )}
              </View>

              {/* Reset Processed Files Section */}
              {processedCount > 0 && (
                <View style={{
                  backgroundColor: '#fefce8',
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: '#fde047'
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Ionicons name="refresh-circle-outline" size={24} color="#ca8a04" />
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#713f12', marginLeft: 10 }}>
                      Obrađeni fajlovi: {processedCount}
                    </Text>
                  </View>

                  <Text style={{ fontSize: 13, color: '#a16207', marginBottom: 12, lineHeight: 18 }}>
                    Ako snimci nisu uspešno uploadovani, resetujte listu da biste ih ponovo procesirali.
                  </Text>

                  <Pressable
                    onPress={handleResetProcessedFiles}
                    style={{
                      backgroundColor: '#eab308',
                      borderRadius: 12,
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ffffff" />
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#ffffff', marginLeft: 8 }}>
                      Resetuj i pokušaj ponovo
                    </Text>
                  </Pressable>
                </View>
              )}

              {/* Sync Result */}
              {syncResult && (
                <View style={{ marginBottom: 16 }}>
                  {/* Status Header */}
                  <View style={{
                    backgroundColor: syncResult.success ? '#d1fae5' : (syncResult.failedFiles > 0 ? '#fef3c7' : '#fee2e2'),
                    borderRadius: 12,
                    padding: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 8
                  }}>
                    <Ionicons
                      name={syncResult.success ? 'checkmark-circle' : (syncResult.failedFiles > 0 ? 'warning' : 'alert-circle')}
                      size={22}
                      color={syncResult.success ? '#059669' : (syncResult.failedFiles > 0 ? '#f59e0b' : '#dc2626')}
                    />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: syncResult.success ? '#065f46' : (syncResult.failedFiles > 0 ? '#92400e' : '#991b1b')
                      }}>
                        {syncResult.success ? 'Uspešno!' : (syncResult.failedFiles > 0 ? 'Delimično uspešno' : 'Greška')}
                      </Text>
                      <Text style={{
                        fontSize: 13,
                        color: syncResult.success ? '#047857' : (syncResult.failedFiles > 0 ? '#b45309' : '#b91c1c'),
                        marginTop: 2
                      }}>
                        {syncResult.message}
                      </Text>
                    </View>
                  </View>

                  {/* Statistics */}
                  {syncResult.scannedFiles !== undefined && (
                    <View style={{
                      backgroundColor: '#f3f4f6',
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 8
                    }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                        Statistika:
                      </Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        <View style={{ width: '50%', marginBottom: 4 }}>
                          <Text style={{ fontSize: 12, color: '#6b7280' }}>
                            Skenirano: <Text style={{ fontWeight: '600', color: '#111827' }}>{syncResult.scannedFiles}</Text>
                          </Text>
                        </View>
                        <View style={{ width: '50%', marginBottom: 4 }}>
                          <Text style={{ fontSize: 12, color: '#6b7280' }}>
                            Novih: <Text style={{ fontWeight: '600', color: '#8b5cf6' }}>{syncResult.newFiles}</Text>
                          </Text>
                        </View>
                        {syncResult.uploadedFiles !== undefined && (
                          <View style={{ width: '50%', marginBottom: 4 }}>
                            <Text style={{ fontSize: 12, color: '#6b7280' }}>
                              Uploadovano: <Text style={{ fontWeight: '600', color: '#059669' }}>{syncResult.uploadedFiles}</Text>
                            </Text>
                          </View>
                        )}
                        {syncResult.failedFiles !== undefined && syncResult.failedFiles > 0 && (
                          <View style={{ width: '50%', marginBottom: 4 }}>
                            <Text style={{ fontSize: 12, color: '#6b7280' }}>
                              Neuspešno: <Text style={{ fontWeight: '600', color: '#dc2626' }}>{syncResult.failedFiles}</Text>
                            </Text>
                          </View>
                        )}
                        {syncResult.skippedFiles !== undefined && syncResult.skippedFiles > 0 && (
                          <View style={{ width: '50%', marginBottom: 4 }}>
                            <Text style={{ fontSize: 12, color: '#6b7280' }}>
                              Preskočeno: <Text style={{ fontWeight: '600', color: '#6b7280' }}>{syncResult.skippedFiles}</Text>
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )}

                  {/* Details Log */}
                  {syncResult.details && syncResult.details.length > 0 && (
                    <View style={{
                      backgroundColor: '#f9fafb',
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 8,
                      maxHeight: 150
                    }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                        Detalji:
                      </Text>
                      <ScrollView style={{ maxHeight: 110 }} nestedScrollEnabled={true}>
                        {syncResult.details.map((detail, index) => (
                          <Text key={index} style={{ fontSize: 12, color: '#4b5563', marginBottom: 4, lineHeight: 16 }}>
                            {detail}
                          </Text>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {/* Errors */}
                  {syncResult.errors && syncResult.errors.length > 0 && (
                    <View style={{
                      backgroundColor: '#fef2f2',
                      borderRadius: 12,
                      padding: 12,
                      borderWidth: 1,
                      borderColor: '#fecaca',
                      maxHeight: 150
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <Ionicons name="warning" size={16} color="#dc2626" />
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#991b1b', marginLeft: 6 }}>
                          Greške ({syncResult.errors.length}):
                        </Text>
                      </View>
                      <ScrollView style={{ maxHeight: 100 }} nestedScrollEnabled={true}>
                        {syncResult.errors.map((error, index) => (
                          <Text key={index} style={{ fontSize: 12, color: '#b91c1c', marginBottom: 4, lineHeight: 16 }}>
                            {error}
                          </Text>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              )}

              {/* Info */}
              <View style={{
                backgroundColor: '#f9fafb',
                borderRadius: 12,
                padding: 14,
                flexDirection: 'row'
              }}>
                <Ionicons name="information-circle-outline" size={20} color="#6b7280" style={{ marginTop: 2 }} />
                <Text style={{ fontSize: 13, color: '#6b7280', marginLeft: 10, flex: 1, lineHeight: 18 }}>
                  Snimci poziva se automatski sinhronizuju svakih 5 minuta i u 12:00 / 00:00.
                  Ovde možete pokrenuti ručnu sinhronizaciju.
                </Text>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
