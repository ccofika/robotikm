import React, { useState, useEffect } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  StatusBar,
  BackHandler,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEquipmentConfirmation } from '../context/EquipmentConfirmationContext';
import { VStack } from '../components/ui/vstack';
import { HStack } from '../components/ui/hstack';
import { Box } from '../components/ui/box';
import { Card } from '../components/ui/card';
import { Text } from '../components/ui/text';
import { Heading } from '../components/ui/heading';
import { Button, ButtonText } from '../components/ui/button';
import { Center } from '../components/ui/center';

const EquipmentConfirmationScreen = ({ visible, onComplete }) => {
  const { pendingEquipment, confirmEquipment, rejectEquipment } = useEquipmentConfirmation();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);

  const currentEquipment = pendingEquipment[currentIndex];
  const totalEquipment = pendingEquipment.length;

  useEffect(() => {
    // Reset index kada se promeni lista opreme
    if (currentIndex >= pendingEquipment.length && pendingEquipment.length > 0) {
      setCurrentIndex(0);
    }
  }, [pendingEquipment]);

  useEffect(() => {
    // Pozovi onComplete kada nema više pending opreme
    if (pendingEquipment.length === 0 && visible) {
      onComplete();
    }
  }, [pendingEquipment, visible, onComplete]);

  // Blokiraj hardware back button na Android
  useEffect(() => {
    if (!visible) return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Blokiraj back button - vrati true da spreči default behavior
      return true;
    });

    return () => backHandler.remove();
  }, [visible]);

  const handleConfirm = async () => {
    if (!currentEquipment) {
      console.log('EquipmentConfirmation: No current equipment');
      return;
    }

    console.log('EquipmentConfirmation: Confirming equipment:', currentEquipment._id);
    try {
      setLoading(true);
      await confirmEquipment(currentEquipment._id);
      console.log('EquipmentConfirmation: Equipment confirmed successfully');
      Alert.alert('Uspešno', 'Oprema je potvrđena!');
    } catch (error) {
      console.error('EquipmentConfirmation: Error confirming equipment:', error);
      Alert.alert('Greška', 'Došlo je do greške pri potvrđivanju opreme.');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      Alert.alert('Obavezno polje', 'Molimo vas da unesete razlog odbijanja.');
      return;
    }

    if (!currentEquipment) {
      console.log('EquipmentConfirmation: No current equipment for rejection');
      return;
    }

    console.log('EquipmentConfirmation: Rejecting equipment:', currentEquipment._id, 'Reason:', rejectionReason.trim());
    try {
      setLoading(true);
      await rejectEquipment(currentEquipment._id, rejectionReason.trim());
      console.log('EquipmentConfirmation: Equipment rejected successfully');
      Alert.alert('Uspešno', 'Oprema je odbijena i vraćena u magacin.');
      setShowRejectModal(false);
      setRejectionReason('');
    } catch (error) {
      console.error('EquipmentConfirmation: Error rejecting equipment:', error);
      Alert.alert('Greška', 'Došlo je do greške pri odbijanju opreme.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < totalEquipment - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const openRejectModal = () => {
    setShowRejectModal(true);
  };

  const closeRejectModal = () => {
    setShowRejectModal(false);
    setRejectionReason('');
  };

  if (!visible || !currentEquipment) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={() => {}}
    >
      <StatusBar barStyle="light-content" backgroundColor="#059669" />
      <Box className="flex-1 bg-gray-50">
        {/* Header - Material Design 3 */}
        <Box className="bg-green-600 px-4 py-6" style={{ paddingTop: insets.top + 24 }}>
          <VStack space="md" className="items-center">
            <Box className="w-20 h-20 rounded-full bg-white/20 items-center justify-center">
              <Ionicons name="checkmark-done-circle" size={48} color="#fff" />
            </Box>
            <Heading size="xl" className="text-white text-center">
              Potvrda Opreme
            </Heading>
            <Text size="sm" className="text-green-100 text-center max-w-[280px]">
              Molimo vas da potvrdite prijem opreme
            </Text>
          </VStack>
        </Box>

        {/* Progress Bar */}
        <Box className="bg-white px-6 py-4 border-b border-gray-100">
          <VStack space="sm">
            <Box className="h-2 rounded-full bg-gray-200 overflow-hidden">
              <Box
                className="h-full rounded-full bg-green-600"
                style={{ width: `${((currentIndex + 1) / totalEquipment) * 100}%` }}
              />
            </Box>
            <Text size="sm" bold className="text-gray-700 text-center">
              {currentIndex + 1} od {totalEquipment}
            </Text>
          </VStack>
        </Box>

        {/* Equipment Card */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 16) }}
        >
          <Box className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <VStack space="md">
              {/* Category Badge */}
              <Box className="px-4 py-2 rounded-full bg-blue-600 self-start">
                <Text size="sm" bold className="text-white">
                  {currentEquipment.category || 'Oprema'}
                </Text>
              </Box>

              {/* Description */}
              <VStack space="sm">
                <Text size="xs" bold className="text-gray-500 uppercase">
                  Opis
                </Text>
                <Text size="lg" bold className="text-gray-900">
                  {currentEquipment.description || 'N/A'}
                </Text>
              </VStack>

              {/* Serial Number */}
              <VStack space="sm">
                <Text size="xs" bold className="text-gray-500 uppercase">
                  Serijski Broj
                </Text>
                <HStack space="sm" className="items-center bg-gray-50 rounded-xl px-3 py-2">
                  <Box className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
                    <Ionicons name="barcode" size={16} color="#6b7280" />
                  </Box>
                  <Text size="md" bold className="text-gray-900 font-mono">
                    {currentEquipment.serialNumber || 'N/A'}
                  </Text>
                </HStack>
              </VStack>

              {/* Status */}
              <VStack space="sm">
                <Text size="xs" bold className="text-gray-500 uppercase">
                  Status
                </Text>
                <Box className="px-3 py-2 rounded-xl bg-yellow-100 border border-yellow-200 self-start">
                  <HStack space="xs" className="items-center">
                    <Ionicons name="time" size={16} color="#d97706" />
                    <Text size="sm" bold className="text-yellow-800">
                      Čeka potvrdu
                    </Text>
                  </HStack>
                </Box>
              </VStack>
            </VStack>
          </Box>

          {/* Navigation Buttons */}
          {totalEquipment > 1 && (
            <HStack space="sm" className="mt-4">
              <Pressable
                onPress={handlePrevious}
                disabled={currentIndex === 0}
                className="flex-1"
              >
                <Box
                  className={`py-3 rounded-xl items-center ${
                    currentIndex === 0 ? 'bg-gray-100' : 'bg-white border border-gray-200'
                  }`}
                >
                  <HStack space="xs" className="items-center">
                    <Ionicons
                      name="chevron-back"
                      size={18}
                      color={currentIndex === 0 ? '#9ca3af' : '#374151'}
                    />
                    <Text
                      size="sm"
                      bold
                      className={currentIndex === 0 ? 'text-gray-400' : 'text-gray-700'}
                    >
                      Prethodno
                    </Text>
                  </HStack>
                </Box>
              </Pressable>

              <Pressable
                onPress={handleNext}
                disabled={currentIndex === totalEquipment - 1}
                className="flex-1"
              >
                <Box
                  className={`py-3 rounded-xl items-center ${
                    currentIndex === totalEquipment - 1 ? 'bg-gray-100' : 'bg-white border border-gray-200'
                  }`}
                >
                  <HStack space="xs" className="items-center">
                    <Text
                      size="sm"
                      bold
                      className={currentIndex === totalEquipment - 1 ? 'text-gray-400' : 'text-gray-700'}
                    >
                      Sledeće
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={currentIndex === totalEquipment - 1 ? '#9ca3af' : '#374151'}
                    />
                  </HStack>
                </Box>
              </Pressable>
            </HStack>
          )}
        </ScrollView>

        {/* Action Buttons */}
        <Box className="bg-white px-4 py-4 border-t border-gray-100" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
          <VStack space="sm">
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Box className="bg-green-600 py-4 rounded-xl items-center">
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <HStack space="sm" className="items-center">
                    <Ionicons name="checkmark-circle" size={22} color="#fff" />
                    <Text size="md" bold className="text-white">
                      Potvrdi Opremu
                    </Text>
                  </HStack>
                )}
              </Box>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={openRejectModal}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Box className="bg-red-600 py-4 rounded-xl items-center">
                <HStack space="sm" className="items-center">
                  <Ionicons name="close-circle" size={22} color="#fff" />
                  <Text size="md" bold className="text-white">
                    Odbij Opremu
                  </Text>
                </HStack>
              </Box>
            </TouchableOpacity>
          </VStack>
        </Box>
      </Box>

      {/* Reject Modal */}
      <Modal
        visible={showRejectModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeRejectModal}
      >
        <Pressable
          onPress={closeRejectModal}
          className="flex-1 justify-center items-center px-5"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-3xl p-6"
          >
            <VStack space="md">
              {/* Header with Icon Circle */}
              <HStack className="justify-between items-center mb-2">
                <HStack space="sm" className="items-center flex-1">
                  <Box className="w-12 h-12 rounded-full bg-red-50 items-center justify-center">
                    <Ionicons name="close-circle" size={24} color="#dc2626" />
                  </Box>
                  <Heading size="xl" className="text-gray-900">
                    Razlog Odbijanja
                  </Heading>
                </HStack>
                <Pressable
                  onPress={closeRejectModal}
                  style={{ minHeight: 44, minWidth: 44 }}
                  className="items-center justify-center -mr-2"
                >
                  <Ionicons name="close" size={28} color="#9ca3af" />
                </Pressable>
              </HStack>

              {/* Description */}
              <Text size="sm" className="text-gray-600">
                Molimo vas da navedete razlog zašto odbijate ovu opremu:
              </Text>

              {/* Text Input */}
              <TextInput
                value={rejectionReason}
                onChangeText={setRejectionReason}
                placeholder="Unesite razlog..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={4}
                style={{
                  borderWidth: 2,
                  borderColor: '#e5e7eb',
                  borderRadius: 16,
                  padding: 16,
                  fontSize: 16,
                  color: '#111827',
                  textAlignVertical: 'top',
                  minHeight: 120,
                  backgroundColor: '#f9fafb',
                }}
              />

              {/* Action Buttons */}
              <HStack space="sm" className="mt-2">
                <TouchableOpacity
                  onPress={closeRejectModal}
                  disabled={loading}
                  activeOpacity={0.7}
                  style={{ flex: 1 }}
                >
                  <Box className="bg-gray-200 py-3.5 rounded-xl items-center">
                    <Text size="md" bold className="text-gray-700">
                      Otkaži
                    </Text>
                  </Box>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleReject}
                  disabled={loading || !rejectionReason.trim()}
                  activeOpacity={0.7}
                  style={{ flex: 1 }}
                >
                  <Box
                    className="py-3.5 rounded-xl items-center"
                    style={{
                      backgroundColor: loading || !rejectionReason.trim() ? '#fca5a5' : '#dc2626',
                    }}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <HStack space="xs" className="items-center">
                        <Ionicons name="close-circle" size={18} color="#fff" />
                        <Text size="md" bold className="text-white">
                          Odbij
                        </Text>
                      </HStack>
                    )}
                  </Box>
                </TouchableOpacity>
              </HStack>
            </VStack>
          </Pressable>
        </Pressable>
      </Modal>
    </Modal>
  );
};

export default EquipmentConfirmationScreen;
