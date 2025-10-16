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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOverdueWorkOrders } from '../context/OverdueWorkOrdersContext';
import { VStack } from '../components/ui/vstack';
import { HStack } from '../components/ui/hstack';
import { Box } from '../components/ui/box';
import { Card } from '../components/ui/card';
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
      <LinearGradient
        colors={['#dc2626', '#ef4444', '#f87171']}
        className="flex-1"
      >
        <Box className="flex-1" style={{ paddingTop: insets.top }}>
          {/* Header */}
          <VStack space="md" className="px-6 py-5 border-b border-white/20">
            <Center>
              <Box className="w-16 h-16 rounded-full items-center justify-center mb-3" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                <Ionicons name="alert-circle" size={36} color="#fff" />
              </Box>
            </Center>
            <Heading size="2xl" className="text-white text-center">
              Prekoračeni Radni Nalozi
            </Heading>
            <Text size="md" className="text-red-100 text-center leading-6">
              Imate {overdueOrders.length} {overdueOrders.length === 1 ? 'nalog' : 'naloga'} koji {overdueOrders.length === 1 ? 'je prekoračio' : 'su prekoračili'} rok.{'\n'}
              Molimo vas da ih završite pre pristupa drugim funkcionalnostima.
            </Text>
          </VStack>

          {/* Content */}
          {loading ? (
            <Center className="flex-1">
              <ActivityIndicator size="large" color="#fff" />
              <Text size="md" className="text-white mt-4">
                Učitavanje naloga...
              </Text>
            </Center>
          ) : overdueOrders.length === 0 ? (
            <Center className="flex-1 px-6">
              <Ionicons name="checkmark-circle" size={64} color="#fff" style={{ marginBottom: 16 }} />
              <Heading size="xl" className="text-white mb-2">
                Nema Prekoračenih Naloga
              </Heading>
              <Text size="md" className="text-red-100 text-center">
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
                  tintColor="#fff"
                  colors={['#fff']}
                />
              }
            >
              {overdueOrders.map((workOrder, index) => (
                <Pressable
                  key={workOrder._id}
                  onPress={() => handleWorkOrderClick(workOrder._id)}
                >
                  <Card variant="elevated" size="md" className="mb-4 bg-white border-l-4 border-red-600">
                    <VStack space="md">
                      {/* Order Number Badge */}
                      <HStack className="justify-between items-start">
                        <Box className="flex-1 pr-16">
                          <Text size="xs" bold className="text-slate-600 uppercase tracking-wide mb-1">
                            ADRESA
                          </Text>
                          <Text size="lg" bold className="text-slate-900 leading-6">
                            {workOrder.address}
                          </Text>
                        </Box>
                        <Box className="px-3 py-1.5 rounded-full bg-red-600 absolute top-0 right-0">
                          <Text size="xs" bold className="text-white">
                            #{index + 1}
                          </Text>
                        </Box>
                      </HStack>

                      {/* Appointment Date */}
                      <VStack space="xs">
                        <Text size="xs" bold className="text-slate-600 uppercase tracking-wide">
                          ZAKAZANO ZA
                        </Text>
                        <HStack space="xs" className="items-center">
                          <Ionicons name="calendar-outline" size={16} color="#dc2626" />
                          <Text size="sm" bold className="text-slate-700">
                            {formatDateTime(workOrder.appointmentDateTime)}
                          </Text>
                        </HStack>
                      </VStack>

                      {/* Overdue Hours */}
                      <VStack space="xs">
                        <Text size="xs" bold className="text-slate-600 uppercase tracking-wide">
                          PREKORAČENO
                        </Text>
                        <HStack space="xs" className="items-center">
                          <Box className="bg-red-100 px-3 py-2 rounded-xl">
                            <HStack space="xs" className="items-center">
                              <Ionicons name="time-outline" size={18} color="#991b1b" />
                              <Text size="sm" bold className="text-red-800">
                                {getOverdueHours(workOrder.appointmentDateTime)} {getOverdueHours(workOrder.appointmentDateTime) === 1 ? 'sat' : 'sati'}
                              </Text>
                            </HStack>
                          </Box>
                        </HStack>
                      </VStack>

                      {/* Type */}
                      {workOrder.type && (
                        <VStack space="xs">
                          <Text size="xs" bold className="text-slate-600 uppercase tracking-wide">
                            TIP
                          </Text>
                          <Text size="sm" className="text-slate-700">
                            {workOrder.type}
                          </Text>
                        </VStack>
                      )}

                      {/* Comment */}
                      {workOrder.comment && (
                        <Box className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                          <HStack space="xs" className="items-start mb-1">
                            <Ionicons name="information-circle-outline" size={16} color="#2563eb" />
                            <Text size="xs" bold className="text-blue-700 uppercase tracking-wide">
                              NAPOMENA
                            </Text>
                          </HStack>
                          <Text size="sm" className="text-slate-700 leading-5">
                            {workOrder.comment}
                          </Text>
                        </Box>
                      )}

                      {/* Admin Comment */}
                      {workOrder.adminComment && (
                        <Box className="bg-red-50 border border-red-200 rounded-xl p-3">
                          <HStack space="xs" className="items-start mb-1">
                            <Ionicons name="warning-outline" size={16} color="#dc2626" />
                            <Text size="xs" bold className="text-red-700 uppercase tracking-wide">
                              RAZLOG VRAĆANJA
                            </Text>
                          </HStack>
                          <Text size="sm" className="text-red-700 leading-5">
                            {workOrder.adminComment}
                          </Text>
                        </Box>
                      )}

                      {/* Tap to Open Indicator */}
                      <Box className="border-t border-slate-200 pt-3 items-center">
                        <HStack space="xs" className="items-center">
                          <Text size="sm" bold className="text-slate-600">
                            Dodirnite za otvaranje
                          </Text>
                          <Ionicons name="chevron-forward" size={16} color="#64748b" />
                        </HStack>
                      </Box>
                    </VStack>
                  </Card>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </Box>
      </LinearGradient>
    </Modal>
  );
};

export default OverdueWorkOrdersScreen;
