import React, { useState, useEffect } from 'react';
import { Modal, Pressable, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOffline } from '../../context/OfflineContext';
import { VStack } from '../ui/vstack';
import { HStack } from '../ui/hstack';
import { Box } from '../ui/box';
import { Text } from '../ui/text';
import { Heading } from '../ui/heading';
import { Button, ButtonText, ButtonSpinner } from '../ui/button';

/**
 * Sync Error Modal
 * Prikazuje greške pri sinhronizaciji i omogućava retry/dismiss
 */

export const SyncErrorModal = ({ visible, onClose }) => {
  const {
    syncErrors,
    retrySingleSync,
    dismissError,
    retryFailedSync
  } = useOffline();

  const [retrying, setRetrying] = useState(null);

  if (syncErrors.length === 0 && visible) {
    // Automatski zatvori modal ako nema grešaka
    onClose?.();
  }

  const handleRetry = async (itemId) => {
    try {
      setRetrying(itemId);
      await retrySingleSync(itemId);
      Alert.alert('Pokušaj u toku', 'Akcija je ponovo dodata u red za sinhronizaciju');
    } catch (error) {
      console.error('[SyncErrorModal] Error retrying sync:', error);
      Alert.alert('Greška', error.message || 'Neuspešno ponovno pokušavanje');
    } finally {
      setRetrying(null);
    }
  };

  const handleDismiss = async (itemId) => {
    Alert.alert(
      'Odbaci grešku',
      'Da li ste sigurni da želite da odbacite ovu akciju? Promena će biti trajno izgubljena.',
      [
        { text: 'Otkaži', style: 'cancel' },
        {
          text: 'Odbaci',
          style: 'destructive',
          onPress: async () => {
            try {
              await dismissError(itemId);
              Alert.alert('Odbačeno', 'Akcija je uklonjena iz reda');
            } catch (error) {
              console.error('[SyncErrorModal] Error dismissing error:', error);
              Alert.alert('Greška', 'Neuspešno odbacivanje');
            }
          }
        }
      ]
    );
  };

  const handleRetryAll = async () => {
    try {
      setRetrying('all');
      await retryFailedSync();
      Alert.alert('Pokušaj u toku', 'Sve neuspešne akcije su ponovo dodate u red');
    } catch (error) {
      console.error('[SyncErrorModal] Error retrying all:', error);
      Alert.alert('Greška', error.message || 'Neuspešno ponovno pokušavanje');
    } finally {
      setRetrying(null);
    }
  };

  const getActionLabel = (type) => {
    switch (type) {
      case 'UPDATE_WORK_ORDER':
        return 'Ažuriranje radnog naloga';
      case 'UPDATE_USED_MATERIALS':
        return 'Ažuriranje materijala';
      case 'ADD_USER_EQUIPMENT':
        return 'Dodavanje opreme';
      case 'REMOVE_USER_EQUIPMENT':
        return 'Uklanjanje opreme';
      case 'UPLOAD_IMAGE':
        return 'Upload slike';
      case 'DELETE_IMAGE':
        return 'Brisanje slike';
      default:
        return type || 'Nepoznata akcija';
    }
  };

  const renderErrorItem = (error) => {
    const isRetrying = retrying === error.id;

    return (
      <Box key={error.id} className="mb-4 bg-red-50 rounded-xl p-4 border border-red-200">
        <VStack space="sm">
          {/* Header */}
          <HStack className="items-start justify-between">
            <HStack space="xs" className="items-start flex-1">
              <Ionicons name="close-circle" size={24} color="#ef4444" style={{ marginTop: 2 }} />
              <VStack className="flex-1" space="xs">
                <Text size="md" bold className="text-gray-900">
                  {getActionLabel(error.type)}
                </Text>
                <Text size="sm" className="text-red-600">
                  {error.error || 'Nepoznata greška'}
                </Text>
              </VStack>
            </HStack>
          </HStack>

          {/* Details */}
          {error.data && (
            <Box className="bg-white rounded-lg p-3 mt-2">
              <Text size="xs" bold className="text-gray-500 uppercase mb-1">
                Detalji:
              </Text>
              <Text size="xs" className="text-gray-600">
                {error.data.workOrderId && `Radni nalog: ${error.data.workOrderId}`}
                {error.data.equipmentId && ` | Oprema: ${error.data.equipmentId}`}
              </Text>
            </Box>
          )}

          {/* Retry Info */}
          <HStack space="xs" className="items-center">
            <Ionicons name="refresh" size={14} color="#9ca3af" />
            <Text size="xs" className="text-gray-500">
              Pokušaja: {error.retryCount}/{error.maxRetries}
            </Text>
            <Text size="xs" className="text-gray-400 ml-auto">
              {new Date(error.lastAttempt || error.timestamp).toLocaleString('sr-RS')}
            </Text>
          </HStack>

          {/* Actions */}
          <HStack space="sm" className="mt-2">
            <Button
              action="primary"
              size="sm"
              onPress={() => handleRetry(error.id)}
              isDisabled={isRetrying}
              className="flex-1 rounded-lg"
            >
              {isRetrying ? (
                <ButtonSpinner />
              ) : (
                <HStack space="xs" className="items-center">
                  <Ionicons name="refresh" size={16} color="#fff" />
                  <ButtonText>Pokušaj ponovo</ButtonText>
                </HStack>
              )}
            </Button>

            <Button
              action="secondary"
              size="sm"
              onPress={() => handleDismiss(error.id)}
              isDisabled={isRetrying}
              className="rounded-lg"
            >
              <HStack space="xs" className="items-center">
                <Ionicons name="trash-outline" size={16} color="#666" />
                <ButtonText>Odbaci</ButtonText>
              </HStack>
            </Button>
          </HStack>
        </VStack>
      </Box>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Box className="flex-1 bg-black/50">
        <Box className="flex-1 mt-20 bg-white rounded-t-3xl">
          {/* Header */}
          <VStack className="p-6 border-b border-gray-200">
            <HStack className="items-center justify-between mb-2">
              <HStack space="sm" className="items-center flex-1">
                <Box className="w-10 h-10 bg-red-100 rounded-full items-center justify-center">
                  <Ionicons name="alert-circle" size={24} color="#ef4444" />
                </Box>
                <VStack className="flex-1">
                  <Heading size="xl" className="text-gray-900">
                    Greške pri sinhronizaciji
                  </Heading>
                  <Text size="sm" className="text-gray-600">
                    {syncErrors.length} {syncErrors.length === 1 ? 'greška' : 'grešaka'}
                  </Text>
                </VStack>
              </HStack>
              <Pressable onPress={onClose}>
                <Ionicons name="close" size={28} color="#9ca3af" />
              </Pressable>
            </HStack>

            {/* Retry All Button */}
            {syncErrors.length > 1 && (
              <Button
                action="primary"
                size="md"
                onPress={handleRetryAll}
                isDisabled={retrying === 'all'}
                className="mt-3 rounded-xl"
              >
                {retrying === 'all' ? (
                  <ButtonSpinner />
                ) : (
                  <HStack space="sm" className="items-center">
                    <Ionicons name="refresh" size={18} color="#fff" />
                    <ButtonText>Pokušaj sve ponovo</ButtonText>
                  </HStack>
                )}
              </Button>
            )}
          </VStack>

          {/* Error List */}
          <ScrollView className="flex-1 p-6" showsVerticalScrollIndicator={false}>
            {syncErrors.length === 0 ? (
              <Box className="flex-1 items-center justify-center p-12">
                <Ionicons name="checkmark-circle-outline" size={64} color="#10b981" />
                <Text size="lg" bold className="text-gray-900 mt-4">
                  Sve je sinhronizovano!
                </Text>
                <Text size="sm" className="text-gray-500 text-center mt-2">
                  Nema grešaka pri sinhronizaciji
                </Text>
              </Box>
            ) : (
              syncErrors.map(renderErrorItem)
            )}
          </ScrollView>
        </Box>
      </Box>
    </Modal>
  );
};

export default SyncErrorModal;
