import React, { useState, useEffect } from 'react';
import { FlatList, Pressable, RefreshControl, Modal, Alert, Text as RNText, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotifications } from '../context/NotificationContext';
import { VStack } from '../components/ui/vstack';
import { HStack } from '../components/ui/hstack';
import { Box } from '../components/ui/box';
import { Text } from '../components/ui/text';
import { Heading } from '../components/ui/heading';
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

  const renderNotification = ({ item }) => {
    const iconConfig = getNotificationIcon(item.type);

    return (
      <Pressable
        onPress={() => handleNotificationPress(item)}
        onLongPress={() => handleDeletePress(item)}
      >
        <Box
          className={`mb-3 p-4 rounded-2xl shadow-sm border ${
            item.isRead ? 'bg-white border-gray-100' : 'bg-blue-50 border-blue-200'
          }`}
        >
          <HStack space="sm">
            {/* Icon */}
            <Box
              className="w-12 h-12 rounded-full items-center justify-center"
              style={{ backgroundColor: iconConfig.bgColor }}
            >
              <Ionicons name={iconConfig.name} size={22} color={iconConfig.color} />
            </Box>

            {/* Content */}
            <Box className="flex-1">
              <VStack space="xs">
                <HStack className="justify-between items-start">
                  <Text size="sm" bold className={item.isRead ? 'text-gray-900' : 'text-blue-900'}>
                    {item.title}
                  </Text>
                  {!item.isRead && (
                    <Box className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  )}
                </HStack>

                <Text size="sm" className={item.isRead ? 'text-gray-600' : 'text-blue-800'}>
                  {item.message}
                </Text>

                <HStack space="xs" className="items-center mt-1">
                  <Ionicons name="time-outline" size={14} color="#9ca3af" />
                  <Text size="xs" className="text-gray-500">
                    {formatDate(item.createdAt)}
                  </Text>
                </HStack>
              </VStack>
            </Box>

            {/* Delete Button */}
            <Pressable
              onPress={() => handleDeletePress(item)}
              style={{ minHeight: 44, minWidth: 44 }}
              className="items-center justify-center"
            >
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </Pressable>
          </HStack>
        </Box>
      </Pressable>
    );
  };

  return (
    <Box className="flex-1 bg-gray-50">
      {/* Header - Material Design 3 */}
      <HStack
        className="bg-white px-4 py-3 border-b border-gray-100 justify-between items-center"
        style={{ paddingTop: insets.top + 12 }}
      >
        <HStack space="sm" className="items-center">
          <Box className="w-10 h-10 rounded-full bg-purple-50 items-center justify-center">
            <Ionicons name="notifications" size={20} color="#9333ea" />
          </Box>
          <Heading size="lg" className="text-gray-900">Notifikacije</Heading>
        </HStack>
        {unreadCount > 0 && (
          <Box className="bg-purple-600 rounded-full px-3 py-1">
            <Text size="xs" bold className="text-white">
              {unreadCount}
            </Text>
          </Box>
        )}
      </HStack>

      {/* Stats Card */}
      {notifications.length > 0 && (
        <Box className="px-4 py-4 bg-white mb-2">
          <HStack space="sm">
            <Box className="flex-1 bg-purple-50 p-4 rounded-2xl border border-purple-100">
              <VStack space="xs">
                <HStack space="xs" className="items-center mb-1">
                  <Box className="w-6 h-6 rounded-full bg-purple-100 items-center justify-center">
                    <Ionicons name="notifications" size={14} color="#9333ea" />
                  </Box>
                </HStack>
                <Text size="2xl" bold className="text-purple-700">{notifications.length}</Text>
                <Text size="xs" className="text-purple-600 uppercase tracking-wide">Ukupno</Text>
              </VStack>
            </Box>
            <Box className="flex-1 bg-blue-50 p-4 rounded-2xl border border-blue-100">
              <VStack space="xs">
                <HStack space="xs" className="items-center mb-1">
                  <Box className="w-6 h-6 rounded-full bg-blue-100 items-center justify-center">
                    <Ionicons name="mail-unread" size={14} color="#2563eb" />
                  </Box>
                </HStack>
                <Text size="2xl" bold className="text-blue-700">{unreadCount}</Text>
                <Text size="xs" className="text-blue-600 uppercase tracking-wide">Nepročitano</Text>
              </VStack>
            </Box>
          </HStack>
        </Box>
      )}

      {/* Info Banner */}
      <Box className="mx-4 mb-3 bg-purple-50 border border-purple-200 rounded-2xl p-4">
        <HStack space="sm" className="items-center">
          <Box className="w-8 h-8 rounded-full bg-purple-100 items-center justify-center">
            <Ionicons name="information-circle" size={18} color="#9333ea" />
          </Box>
          <Box className="flex-1">
            <Text size="xs" className="text-purple-800">
              Pritisnite i držite notifikaciju da biste je obrisali
            </Text>
          </Box>
        </HStack>
      </Box>

      {/* Notifications List */}
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: Math.max(insets.bottom, 16),
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <Box className="flex-1 items-center justify-center p-12">
            <Box className="w-20 h-20 rounded-full bg-purple-100 items-center justify-center mb-4">
              <Ionicons name="notifications-outline" size={40} color="#9333ea" />
            </Box>
            <Text size="md" bold className="text-gray-700 text-center mb-2">
              Nemate notifikacija
            </Text>
            <Text size="sm" className="text-gray-500 text-center">
              Notifikacije o radnim nalozima i opremi će se prikazati ovde
            </Text>
          </Box>
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
            <RNText style={{ fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 8 }}>
              Obriši notifikaciju?
            </RNText>
            <RNText style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24 }}>
              Ova akcija se ne može poništiti
            </RNText>

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
                <RNText style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 16 }}>
                  Obriši
                </RNText>
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
                <RNText style={{ color: '#111827', fontWeight: 'bold', fontSize: 16 }}>
                  Otkaži
                </RNText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Box>
  );
}
