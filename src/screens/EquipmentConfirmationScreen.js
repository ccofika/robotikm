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
    if (!currentEquipment) return;

    try {
      setLoading(true);
      await confirmEquipment(currentEquipment._id);
      Alert.alert('Uspešno', 'Oprema je potvrđena!');
    } catch (error) {
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

    if (!currentEquipment) return;

    try {
      setLoading(true);
      await rejectEquipment(currentEquipment._id, rejectionReason.trim());
      Alert.alert('Uspešno', 'Oprema je odbijena i vraćena u magacin.');
      setShowRejectModal(false);
      setRejectionReason('');
    } catch (error) {
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
      <StatusBar barStyle="light-content" backgroundColor="#10b981" />
      <LinearGradient
        colors={['#059669', '#10b981', '#34d399']}
        className="flex-1"
      >
        <Box className="flex-1" style={{ paddingTop: insets.top }}>
          {/* Header */}
          <VStack space="md" className="px-6 py-5 border-b border-white/20">
            <Center>
              <Box className="w-16 h-16 rounded-full items-center justify-center mb-3" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                <Ionicons name="checkmark-done-circle" size={36} color="#fff" />
              </Box>
            </Center>
            <Heading size="2xl" className="text-white text-center">
              Potvrda Opreme
            </Heading>
            <Text size="md" className="text-green-50 text-center">
              Molimo vas da potvrdite prijem opreme
            </Text>
          </VStack>

          {/* Progress Bar */}
          <VStack space="sm" className="px-6 py-4">
            <Box className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
              <Box
                className="h-full rounded-full bg-white"
                style={{ width: `${((currentIndex + 1) / totalEquipment) * 100}%` }}
              />
            </Box>
            <Text size="md" bold className="text-white text-center">
              {currentIndex + 1} od {totalEquipment}
            </Text>
          </VStack>

          {/* Equipment Card */}
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 16) }}
          >
            <Card variant="elevated" size="lg" className="bg-white">
              <VStack space="md">
                {/* Category Badge */}
                <Box className="px-4 py-2 rounded-full bg-blue-600 self-start">
                  <Text size="sm" bold className="text-white">
                    {currentEquipment.category || 'Oprema'}
                  </Text>
                </Box>

                {/* Description */}
                <VStack space="xs">
                  <Text size="xs" bold className="text-slate-600 uppercase tracking-wide">
                    OPIS
                  </Text>
                  <Text size="lg" bold className="text-slate-900">
                    {currentEquipment.description || 'N/A'}
                  </Text>
                </VStack>

                {/* Serial Number */}
                <VStack space="xs">
                  <Text size="xs" bold className="text-slate-600 uppercase tracking-wide">
                    SERIJSKI BROJ
                  </Text>
                  <HStack space="xs" className="items-center">
                    <Ionicons name="barcode-outline" size={18} color="#475569" />
                    <Text size="md" bold className="text-slate-700">
                      {currentEquipment.serialNumber || 'N/A'}
                    </Text>
                  </HStack>
                </VStack>

                {/* Location */}
                {currentEquipment.location && (
                  <VStack space="xs">
                    <Text size="xs" bold className="text-slate-600 uppercase tracking-wide">
                      LOKACIJA
                    </Text>
                    <HStack space="xs" className="items-center">
                      <Ionicons name="location-outline" size={18} color="#475569" />
                      <Text size="md" className="text-slate-700">
                        {currentEquipment.location}
                      </Text>
                    </HStack>
                  </VStack>
                )}

                {/* Status */}
                <VStack space="xs">
                  <Text size="xs" bold className="text-slate-600 uppercase tracking-wide">
                    STATUS
                  </Text>
                  <Box className="px-3 py-2 rounded-xl bg-yellow-100 self-start">
                    <HStack space="xs" className="items-center">
                      <Ionicons name="time-outline" size={16} color="#92400e" />
                      <Text size="sm" bold className="text-yellow-800">
                        Čeka potvrdu
                      </Text>
                    </HStack>
                  </Box>
                </VStack>
              </VStack>
            </Card>

            {/* Navigation Buttons */}
            {totalEquipment > 1 && (
              <HStack space="sm" className="mt-5">
                <Pressable
                  onPress={handlePrevious}
                  disabled={currentIndex === 0}
                  className="flex-1"
                >
                  <Box
                    className="py-3.5 rounded-xl items-center"
                    style={{
                      backgroundColor: currentIndex === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.9)',
                    }}
                  >
                    <HStack space="xs" className="items-center">
                      <Ionicons
                        name="chevron-back"
                        size={18}
                        color={currentIndex === 0 ? '#94a3b8' : '#1e293b'}
                      />
                      <Text
                        size="md"
                        bold
                        style={{ color: currentIndex === 0 ? '#94a3b8' : '#1e293b' }}
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
                    className="py-3.5 rounded-xl items-center"
                    style={{
                      backgroundColor: currentIndex === totalEquipment - 1 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.9)',
                    }}
                  >
                    <HStack space="xs" className="items-center">
                      <Text
                        size="md"
                        bold
                        style={{ color: currentIndex === totalEquipment - 1 ? '#94a3b8' : '#1e293b' }}
                      >
                        Sledeće
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={currentIndex === totalEquipment - 1 ? '#94a3b8' : '#1e293b'}
                      />
                    </HStack>
                  </Box>
                </Pressable>
              </HStack>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <VStack space="sm" className="px-6 py-4 border-t border-white/20" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
            <Pressable onPress={handleConfirm} disabled={loading}>
              <Box className="bg-white py-4 rounded-xl items-center shadow-lg">
                {loading ? (
                  <ActivityIndicator color="#10b981" />
                ) : (
                  <HStack space="xs" className="items-center">
                    <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                    <Text size="lg" bold className="text-green-600">
                      Potvrdi Opremu
                    </Text>
                  </HStack>
                )}
              </Box>
            </Pressable>

            <Pressable onPress={openRejectModal} disabled={loading}>
              <Box className="bg-red-600 py-4 rounded-xl items-center shadow-lg">
                <HStack space="xs" className="items-center">
                  <Ionicons name="close-circle" size={20} color="#fff" />
                  <Text size="lg" bold className="text-white">
                    Odbij Opremu
                  </Text>
                </HStack>
              </Box>
            </Pressable>
          </VStack>
        </Box>
      </LinearGradient>

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
            className="w-full max-w-md"
          >
            <Card variant="elevated" size="lg" className="bg-white">
              <VStack space="md">
                <HStack className="justify-between items-center">
                  <Heading size="xl" className="text-slate-900">
                    Razlog Odbijanja
                  </Heading>
                  <Pressable onPress={closeRejectModal} className="w-10 h-10 items-center justify-center">
                    <Ionicons name="close" size={28} color="#64748b" />
                  </Pressable>
                </HStack>

                <Text size="sm" className="text-slate-600">
                  Molimo vas da navedete razlog zašto odbijate ovu opremu:
                </Text>

                <TextInput
                  value={rejectionReason}
                  onChangeText={setRejectionReason}
                  placeholder="Unesite razlog..."
                  multiline
                  numberOfLines={4}
                  style={{
                    borderWidth: 1,
                    borderColor: '#cbd5e1',
                    borderRadius: 12,
                    padding: 12,
                    fontSize: 16,
                    color: '#1e293b',
                    textAlignVertical: 'top',
                    minHeight: 100,
                  }}
                />

                <HStack space="sm">
                  <Pressable onPress={closeRejectModal} disabled={loading} className="flex-1">
                    <Box className="bg-slate-200 py-3.5 rounded-xl items-center">
                      <Text size="md" bold className="text-slate-700">
                        Otkaži
                      </Text>
                    </Box>
                  </Pressable>

                  <Pressable
                    onPress={handleReject}
                    disabled={loading || !rejectionReason.trim()}
                    className="flex-1"
                  >
                    <Box
                      className="py-3.5 rounded-xl items-center"
                      style={{
                        backgroundColor: loading || !rejectionReason.trim() ? '#fca5a5' : '#ef4444',
                      }}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text size="md" bold className="text-white">
                          Odbij Opremu
                        </Text>
                      )}
                    </Box>
                  </Pressable>
                </HStack>
              </VStack>
            </Card>
          </Pressable>
        </Pressable>
      </Modal>
    </Modal>
  );
};

export default EquipmentConfirmationScreen;
