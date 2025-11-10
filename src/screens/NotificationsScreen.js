import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl, Modal, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotifications } from '../context/NotificationContext';
import EquipmentDetailsModal from '../components/EquipmentDetailsModal';

export default function NotificationsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    deleteNotification,
  } = useNotifications();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [selectedEquipmentDetails, setSelectedEquipmentDetails] = useState(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalType, setModalType] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'

  useEffect(() => {
    fetchNotifications();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const handleNotificationPress = (notification) => {
    // Označi kao pročitanu ako nije
    if (!notification.isRead) {
      markAsRead(notification._id);
    }

    // Navigacija na osnovu tipa notifikacije
    if (notification.type === 'work_order' && notification.relatedId) {
      navigation.navigate('WorkOrders');
    } else if ((notification.type === 'equipment_add' || notification.type === 'equipment_remove')
               && notification.relatedData?.equipment) {
      // Prikaži modal sa detaljima opreme
      setSelectedEquipmentDetails(notification.relatedData.equipment);
      setModalTitle(notification.title);
      setModalType(notification.type);
      setShowEquipmentModal(true);
    } else if (notification.type === 'equipment_add' || notification.type === 'equipment_remove') {
      navigation.navigate('Equipment');
    }
  };

  const handleDeletePress = (notification) => {
    setSelectedNotification(notification);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedNotification) return;

    try {
      await deleteNotification(selectedNotification._id);
      setShowDeleteModal(false);
      setSelectedNotification(null);
    } catch (err) {
      Alert.alert('Greška', 'Nije moguće obrisati notifikaciju');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'work_order':
        return { name: 'document-text', color: '#2563eb', bgColor: '#eff6ff' };
      case 'equipment_add':
        return { name: 'add-circle', color: '#059669', bgColor: '#d1fae5' };
      case 'equipment_remove':
        return { name: 'remove-circle', color: '#dc2626', bgColor: '#fee2e2' };
      default:
        return { name: 'notifications', color: '#6b7280', bgColor: '#f3f4f6' };
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      return diffInMinutes < 1 ? 'Upravo sada' : `Pre ${diffInMinutes} min`;
    } else if (diffInHours < 24) {
      return `Pre ${diffInHours}h`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return diffInDays === 1 ? 'Juče' : `Pre ${diffInDays} dana`;
    }
  };

  // Filter notifications
  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'unread') return !notif.isRead;
    if (filter === 'read') return notif.isRead;
    return true; // 'all'
  });

  const stats = {
    total: notifications.length,
    unread: unreadCount,
    read: notifications.length - unreadCount,
  };

  const renderNotification = ({ item }) => {
    const iconConfig = getNotificationIcon(item.type);

    return (
      <Pressable
        onPress={() => handleNotificationPress(item)}
        onLongPress={() => handleDeletePress(item)}
        style={{
          backgroundColor: item.isRead ? '#ffffff' : '#eff6ff',
          marginHorizontal: 20,
          marginBottom: 12,
          padding: 16,
          borderRadius: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 2,
          borderWidth: 1,
          borderColor: item.isRead ? '#f3f4f6' : '#dbeafe',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          {/* Icon */}
          <View style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: iconConfig.bgColor,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}>
            <Ionicons name={iconConfig.name} size={22} color={iconConfig.color} />
          </View>

          {/* Content */}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <Text style={{
                fontSize: 15,
                fontWeight: '600',
                color: item.isRead ? '#111827' : '#1e40af',
                flex: 1,
                marginRight: 8,
              }}>
                {item.title}
              </Text>
              {!item.isRead && (
                <View style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: '#2563eb',
                }} />
              )}
            </View>

            <Text style={{
              fontSize: 14,
              color: item.isRead ? '#6b7280' : '#3b82f6',
              marginBottom: 8,
              lineHeight: 20,
            }}>
              {item.message}
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="time-outline" size={14} color="#9ca3af" />
              <Text style={{
                fontSize: 12,
                color: '#9ca3af',
                marginLeft: 4,
              }}>
                {formatDate(item.createdAt)}
              </Text>
            </View>
          </View>

          {/* Delete Button */}
          <Pressable
            onPress={() => handleDeletePress(item)}
            style={{
              minHeight: 44,
              minWidth: 44,
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: 8,
            }}
          >
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </Pressable>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Header - Material Design 3 */}
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
              backgroundColor: '#faf5ff',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}>
              <Ionicons name="notifications" size={24} color="#9333ea" />
            </View>
            <View>
              <Text style={{ fontSize: 24, fontWeight: '700', color: '#111827' }}>
                Notifikacije
              </Text>
              <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                Radni nalozi i oprema
              </Text>
            </View>
          </View>
          {unreadCount > 0 && (
            <View style={{
              backgroundColor: '#9333ea',
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 6,
              minWidth: 40,
              alignItems: 'center',
            }}>
              <Text style={{
                fontSize: 14,
                fontWeight: '700',
                color: '#ffffff',
              }}>
                {unreadCount}
              </Text>
            </View>
          )}
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
          onPress={() => setFilter('all')}
          style={{
            backgroundColor: filter === 'all' ? '#3b82f6' : '#ffffff',
            paddingHorizontal: 18,
            paddingVertical: 14,
            borderRadius: 20,
            borderWidth: 2,
            borderColor: filter === 'all' ? '#3b82f6' : '#e5e7eb',
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
              color={filter === 'all' ? '#ffffff' : '#3b82f6'}
            />
            <Text style={{
              fontSize: 18,
              fontWeight: '700',
              color: filter === 'all' ? '#ffffff' : '#111827',
              marginLeft: 6
            }}>
              {stats.total}
            </Text>
          </View>
          <Text style={{
            fontSize: 13,
            fontWeight: '600',
            color: filter === 'all' ? '#ffffff' : '#6b7280'
          }}>
            Sve
          </Text>
        </Pressable>

        {/* Unread */}
        <Pressable
          onPress={() => setFilter('unread')}
          style={{
            backgroundColor: filter === 'unread' ? '#9333ea' : '#ffffff',
            paddingHorizontal: 18,
            paddingVertical: 14,
            borderRadius: 20,
            borderWidth: 2,
            borderColor: filter === 'unread' ? '#9333ea' : '#e5e7eb',
            marginRight: 10,
            minWidth: 110,
            height: 70,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Ionicons
              name="mail-unread"
              size={18}
              color={filter === 'unread' ? '#ffffff' : '#9333ea'}
            />
            <Text style={{
              fontSize: 18,
              fontWeight: '700',
              color: filter === 'unread' ? '#ffffff' : '#111827',
              marginLeft: 6
            }}>
              {stats.unread}
            </Text>
          </View>
          <Text style={{
            fontSize: 13,
            fontWeight: '600',
            color: filter === 'unread' ? '#ffffff' : '#6b7280'
          }}>
            Nepročitano
          </Text>
        </Pressable>

        {/* Read */}
        <Pressable
          onPress={() => setFilter('read')}
          style={{
            backgroundColor: filter === 'read' ? '#059669' : '#ffffff',
            paddingHorizontal: 18,
            paddingVertical: 14,
            borderRadius: 20,
            borderWidth: 2,
            borderColor: filter === 'read' ? '#059669' : '#e5e7eb',
            minWidth: 110,
            height: 70,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={filter === 'read' ? '#ffffff' : '#059669'}
            />
            <Text style={{
              fontSize: 18,
              fontWeight: '700',
              color: filter === 'read' ? '#ffffff' : '#111827',
              marginLeft: 6
            }}>
              {stats.read}
            </Text>
          </View>
          <Text style={{
            fontSize: 13,
            fontWeight: '600',
            color: filter === 'read' ? '#ffffff' : '#6b7280'
          }}>
            Pročitano
          </Text>
        </Pressable>
      </ScrollView>

      {/* Info Banner */}
      {notifications.length > 0 && (
        <View style={{
          marginHorizontal: 20,
          marginBottom: 12,
          backgroundColor: '#faf5ff',
          borderWidth: 1,
          borderColor: '#e9d5ff',
          borderRadius: 12,
          padding: 12,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: '#f3e8ff',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 10,
            }}>
              <Ionicons name="information-circle" size={18} color="#9333ea" />
            </View>
            <Text style={{
              flex: 1,
              fontSize: 12,
              color: '#7c3aed',
            }}>
              Pritisnite i držite notifikaciju da biste je obrisali
            </Text>
          </View>
        </View>
      )}

      {/* Notifications List */}
      <FlatList
        data={filteredNotifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom + 16, 24),
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#9333ea']}
            tintColor="#9333ea"
          />
        }
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
              <Ionicons name="notifications-outline" size={40} color="#9ca3af" />
            </View>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: '#374151',
              textAlign: 'center',
              marginBottom: 8,
            }}>
              {filter === 'all' ? 'Nemate notifikacija' :
               filter === 'unread' ? 'Nema nepročitanih notifikacija' :
               'Nema pročitanih notifikacija'}
            </Text>
            <Text style={{
              fontSize: 14,
              color: '#6b7280',
              textAlign: 'center',
            }}>
              Notifikacije o radnim nalozima i opremi će se prikazati ovde
            </Text>
          </View>
        }
      />

      {/* Equipment Details Modal */}
      <EquipmentDetailsModal
        visible={showEquipmentModal}
        onClose={() => setShowEquipmentModal(false)}
        equipment={selectedEquipmentDetails}
        title={modalTitle}
        type={modalType}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
          <View style={{ backgroundColor: '#ffffff', borderRadius: 24, padding: 24, width: '100%', maxWidth: 400 }}>

            {/* Icon */}
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 16 }}>
              <Ionicons name="trash" size={24} color="#dc2626" />
            </View>

            {/* Title */}
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 8 }}>
              Obriši notifikaciju?
            </Text>
            <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24 }}>
              Ova akcija se ne može poništiti
            </Text>

            {/* Buttons */}
            <View style={{ width: '100%' }}>
              <Pressable
                onPress={confirmDelete}
                style={{
                  backgroundColor: '#dc2626',
                  height: 50,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                  width: '100%',
                }}
              >
                <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 16 }}>
                  Obriši
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setShowDeleteModal(false)}
                style={{
                  backgroundColor: '#f3f4f6',
                  height: 50,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                }}
              >
                <Text style={{ color: '#111827', fontWeight: 'bold', fontSize: 16 }}>
                  Otkaži
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
