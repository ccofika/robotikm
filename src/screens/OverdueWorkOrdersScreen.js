import React, { useState, useEffect } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOverdueWorkOrders } from '../context/OverdueWorkOrdersContext';
import { VStack } from '../components/ui/vstack';
import { HStack } from '../components/ui/hstack';
import { Box } from '../components/ui/box';
import { Text } from '../components/ui/text';
import { Heading } from '../components/ui/heading';
import { Center } from '../components/ui/center';

const OverdueWorkOrdersScreen = ({ visible, onNavigateToWorkOrder }) => {
  const { overdueOrders, loading, checkOverdueOrders } = useOverdueWorkOrders();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await checkOverdueOrders();
    setRefreshing(false);
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year}. ${hours}:${minutes}`;
  };

  const getOverdueHours = (appointmentDateTime) => {
    if (!appointmentDateTime) return 0;
    const now = new Date();
    const appointment = new Date(appointmentDateTime);
    const diffMs = now.getTime() - appointment.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    return Math.max(0, diffHours);
  };

  const handleWorkOrderClick = (orderId) => {
    if (onNavigateToWorkOrder) {
      onNavigateToWorkOrder(orderId);
    }
  };

  // Blokiraj hardware back button na Android
  useEffect(() => {
    if (!visible) return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Blokiraj back button - vrati true da spreči default behavior
      return true;
    });

    return () => backHandler.remove();
  }, [visible]);

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={() => {}}
    >
      <StatusBar barStyle="light-content" backgroundColor="#dc2626" />
      <Box className="flex-1 bg-gray-50">
        {/* Header - Material Design 3 */}
        <Box className="bg-red-600 px-4 py-6" style={{ paddingTop: insets.top + 24 }}>
          <VStack space="md" className="items-center">
            <Box className="w-20 h-20 rounded-full bg-white/20 items-center justify-center">
              <Ionicons name="alert-circle" size={48} color="#fff" />
            </Box>
            <Heading size="xl" className="text-white text-center">
              Prekoračeni Radni Nalozi
            </Heading>
            <Text size="sm" className="text-red-100 text-center max-w-[320px]">
              Imate {overdueOrders.length} {overdueOrders.length === 1 ? 'nalog' : 'naloga'} koji {overdueOrders.length === 1 ? 'je prekoračio' : 'su prekoračili'} rok.
              {'\n'}Molimo vas da ih završite pre pristupa drugim funkcionalnostima.
            </Text>
          </VStack>
        </Box>

        {/* Content */}
        {loading ? (
          <Center className="flex-1">
            <ActivityIndicator size="large" color="#dc2626" />
            <Text size="md" className="text-gray-600 mt-4">
              Učitavanje naloga...
            </Text>
          </Center>
        ) : overdueOrders.length === 0 ? (
          <Center className="flex-1 px-6">
            <Box className="w-24 h-24 rounded-full bg-green-100 items-center justify-center mb-4">
              <Ionicons name="checkmark-circle" size={56} color="#059669" />
            </Box>
            <Heading size="xl" className="text-gray-900 mb-2">
              Nema Prekoračenih Naloga
            </Heading>
            <Text size="md" className="text-gray-500 text-center">
              Svi vaši radni nalozi su u redu!
            </Text>
          </Center>
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 16) }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#dc2626"
                colors={['#dc2626']}
              />
            }
          >
            {overdueOrders.map((workOrder, index) => (
              <Pressable
                key={workOrder._id}
                onPress={() => handleWorkOrderClick(workOrder._id)}
              >
                <Box className="bg-white mb-3 p-4 rounded-2xl shadow-sm border-l-4 border-red-600">
                  <VStack space="sm">
                    {/* Header with Badge */}
                    <HStack className="justify-between items-start mb-2">
                      <VStack className="flex-1 pr-3" space="xs">
                        <Text size="md" bold className="text-gray-900">
                          {workOrder.address}
                        </Text>
                        <HStack space="xs" className="items-center">
                          <Ionicons name="location-outline" size={14} color="#6b7280" />
                          <Text size="xs" className="text-gray-500">
                            {workOrder.municipality}
                          </Text>
                        </HStack>
                      </VStack>
                      <Box className="px-3 py-1 rounded-full bg-red-600">
                        <Text size="xs" bold className="text-white">
                          #{index + 1}
                        </Text>
                      </Box>
                    </HStack>

                    {/* Appointment Date & Time */}
                    <HStack space="sm" className="items-center bg-gray-50 rounded-xl px-3 py-2">
                      <Box className="w-8 h-8 rounded-full bg-red-100 items-center justify-center">
                        <Ionicons name="calendar" size={16} color="#dc2626" />
                      </Box>
                      <VStack className="flex-1" space="xs">
                        <Text size="xs" className="text-gray-500">Zakazano za</Text>
                        <Text size="sm" bold className="text-gray-900">
                          {formatDateTime(workOrder.appointmentDateTime)}
                        </Text>
                      </VStack>
                    </HStack>

                    {/* Overdue Hours - Alert */}
                    <Box className="bg-red-50 border-2 border-red-200 rounded-xl px-3 py-2">
                      <HStack space="sm" className="items-center">
                        <Box className="w-8 h-8 rounded-full bg-red-100 items-center justify-center">
                          <Ionicons name="time" size={16} color="#dc2626" />
                        </Box>
                        <VStack className="flex-1" space="xs">
                          <Text size="xs" className="text-red-600">Prekoračeno</Text>
                          <Text size="sm" bold className="text-red-700">
                            {getOverdueHours(workOrder.appointmentDateTime)} {getOverdueHours(workOrder.appointmentDateTime) === 1 ? 'sat' : 'sati'}
                          </Text>
                        </VStack>
                      </HStack>
                    </Box>

                    {/* Type */}
                    {workOrder.type && (
                      <HStack space="xs" className="items-center">
                        <Ionicons name="document-text-outline" size={14} color="#6b7280" />
                        <Text size="xs" className="text-gray-500">Tip:</Text>
                        <Text size="xs" className="text-gray-700">{workOrder.type}</Text>
                      </HStack>
                    )}

                    {/* Comment */}
                    {workOrder.comment && (
                      <Box className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                        <HStack space="xs" className="items-center mb-1">
                          <Box className="w-5 h-5 rounded-full bg-blue-100 items-center justify-center">
                            <Ionicons name="information-circle" size={12} color="#2563eb" />
                          </Box>
                          <Text size="xs" bold className="text-blue-700 uppercase">
                            Napomena
                          </Text>
                        </HStack>
                        <Text size="sm" className="text-gray-700">
                          {workOrder.comment}
                        </Text>
                      </Box>
                    )}

                    {/* Admin Comment */}
                    {workOrder.adminComment && (
                      <Box className="bg-red-50 border border-red-200 rounded-xl p-3">
                        <HStack space="xs" className="items-center mb-1">
                          <Box className="w-5 h-5 rounded-full bg-red-100 items-center justify-center">
                            <Ionicons name="alert-circle" size={12} color="#dc2626" />
                          </Box>
                          <Text size="xs" bold className="text-red-700 uppercase">
                            Razlog vraćanja
                          </Text>
                        </HStack>
                        <Text size="sm" className="text-red-700">
                          {workOrder.adminComment}
                        </Text>
                      </Box>
                    )}

                    {/* Tap Indicator */}
                    <Box className="border-t border-gray-200 pt-3 items-center">
                      <HStack space="xs" className="items-center">
                        <Text size="xs" bold className="text-gray-500">
                          Dodirnite za otvaranje
                        </Text>
                        <Ionicons name="chevron-forward" size={14} color="#9ca3af" />
                      </HStack>
                    </Box>
                  </VStack>
                </Box>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </Box>
    </Modal>
  );
};

export default OverdueWorkOrdersScreen;
