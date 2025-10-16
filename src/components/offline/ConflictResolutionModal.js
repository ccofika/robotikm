import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOffline } from '../../context/OfflineContext';
import { VStack } from '../ui/vstack';
import { HStack } from '../ui/hstack';
import { Box } from '../ui/box';
import { Text } from '../ui/text';
import { Heading } from '../ui/heading';
import { Button, ButtonText } from '../ui/button';

/**
 * Conflict Resolution Modal
 * Prikazuje konflikte i omogućava tehničaru da ih reši
 */

export const ConflictResolutionModal = ({ visible, onClose }) => {
  const { conflicts, resolveConflict } = useOffline();
  const [selectedConflict, setSelectedConflict] = useState(null);
  const [resolving, setResolving] = useState(false);

  if (conflicts.length === 0) {
    return null;
  }

  const handleResolve = async (strategy) => {
    if (!selectedConflict) return;

    try {
      setResolving(true);

      await resolveConflict(selectedConflict.id, strategy);

      Alert.alert('Uspešno', 'Konflikt je rešen');
      setSelectedConflict(null);
      onClose?.();
    } catch (error) {
      console.error('[ConflictResolutionModal] Error resolving conflict:', error);
      Alert.alert('Greška', 'Neuspešno rešavanje konflikta');
    } finally {
      setResolving(false);
    }
  };

  const renderConflictItem = (conflict) => {
    const conflictData = conflict.conflictData || {};
    const { type, message, serverVersion, localUpdates, conflictingFields } = conflictData;

    return (
      <Pressable
        key={conflict.id}
        onPress={() => setSelectedConflict(conflict)}
        className="mb-3"
      >
        <Box
          className={`rounded-xl p-4 border-2 ${
            selectedConflict?.id === conflict.id
              ? 'bg-red-50 border-red-500'
              : 'bg-gray-50 border-gray-200'
          }`}
        >
          <VStack space="sm">
            <HStack className="items-center justify-between">
              <HStack space="xs" className="items-center flex-1">
                <Ionicons name="warning" size={20} color="#ef4444" />
                <Text size="md" bold className="text-gray-900 flex-1">
                  {conflict.type || 'Konflikt pri sinhronizaciji'}
                </Text>
              </HStack>
              {selectedConflict?.id === conflict.id && (
                <Ionicons name="checkmark-circle" size={24} color="#ef4444" />
              )}
            </HStack>

            {message && (
              <Text size="sm" className="text-gray-600">
                {message}
              </Text>
            )}

            {conflictingFields && conflictingFields.length > 0 && (
              <Box className="mt-2">
                <Text size="xs" bold className="text-gray-500 uppercase mb-1">
                  Konfliktna polja:
                </Text>
                {conflictingFields.map((field, index) => (
                  <Text key={index} size="xs" className="text-gray-600">
                    • {field.field}
                  </Text>
                ))}
              </Box>
            )}

            <Text size="xs" className="text-gray-400">
              {new Date(conflict.timestamp).toLocaleString('sr-RS')}
            </Text>
          </VStack>
        </Box>
      </Pressable>
    );
  };

  const renderConflictDetails = () => {
    if (!selectedConflict) {
      return (
        <Box className="flex-1 items-center justify-center p-8">
          <Ionicons name="hand-left-outline" size={48} color="#d1d5db" />
          <Text size="sm" className="text-gray-400 mt-4 text-center">
            Izaberite konflikt da vidite detalje
          </Text>
        </Box>
      );
    }

    const conflictData = selectedConflict.conflictData || {};
    const { serverVersion, localUpdates, conflictingFields } = conflictData;

    return (
      <VStack space="md" className="flex-1">
        <Box className="bg-blue-50 rounded-xl p-4">
          <VStack space="xs">
            <HStack space="xs" className="items-center">
              <Ionicons name="cloud" size={16} color="#3b82f6" />
              <Text size="sm" bold className="text-blue-700">
                Serverska verzija
              </Text>
            </HStack>
            {serverVersion && conflictingFields && conflictingFields.map((field, index) => (
              <Box key={index} className="mt-2">
                <Text size="xs" className="text-blue-600 uppercase">
                  {field.field}:
                </Text>
                <Text size="sm" className="text-blue-900">
                  {typeof field.serverValue === 'object'
                    ? JSON.stringify(field.serverValue)
                    : String(field.serverValue || 'N/A')}
                </Text>
              </Box>
            ))}
          </VStack>
        </Box>

        <Box className="bg-green-50 rounded-xl p-4">
          <VStack space="xs">
            <HStack space="xs" className="items-center">
              <Ionicons name="phone-portrait" size={16} color="#10b981" />
              <Text size="sm" bold className="text-green-700">
                Tvoja verzija
              </Text>
            </HStack>
            {localUpdates && conflictingFields && conflictingFields.map((field, index) => (
              <Box key={index} className="mt-2">
                <Text size="xs" className="text-green-600 uppercase">
                  {field.field}:
                </Text>
                <Text size="sm" className="text-green-900">
                  {typeof field.localValue === 'object'
                    ? JSON.stringify(field.localValue)
                    : String(field.localValue || 'N/A')}
                </Text>
              </Box>
            ))}
          </VStack>
        </Box>

        <VStack space="sm" className="mt-4">
          <Text size="sm" bold className="text-gray-700">
            Kako želite da rešite konflikt?
          </Text>

          <Button
            action="primary"
            size="lg"
            onPress={() => handleResolve('use_local')}
            isDisabled={resolving}
            className="rounded-xl"
          >
            <HStack space="sm" className="items-center">
              <Ionicons name="phone-portrait" size={20} color="#fff" />
              <ButtonText>Zadrži moju verziju</ButtonText>
            </HStack>
          </Button>

          <Button
            action="secondary"
            size="lg"
            onPress={() => handleResolve('use_server')}
            isDisabled={resolving}
            className="rounded-xl"
          >
            <HStack space="sm" className="items-center">
              <Ionicons name="cloud-download" size={20} color="#666" />
              <ButtonText>Prihvati serversku verziju</ButtonText>
            </HStack>
          </Button>
        </VStack>
      </VStack>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Box className="flex-1 bg-black/50">
        <Box className="flex-1 mt-20 bg-white rounded-t-3xl">
          {/* Header */}
          <VStack className="p-6 border-b border-gray-200">
            <HStack className="items-center justify-between mb-2">
              <Heading size="xl" className="text-gray-900">
                Rešavanje konflikata
              </Heading>
              <Pressable onPress={onClose}>
                <Ionicons name="close" size={28} color="#9ca3af" />
              </Pressable>
            </HStack>
            <Text size="sm" className="text-gray-600">
              {conflicts.length} {conflicts.length === 1 ? 'konflikt' : 'konflikta'} detektovano
            </Text>
          </VStack>

          {/* Content */}
          <Box className="flex-1 flex-row">
            {/* Left: Conflict List */}
            <Box className="flex-1 border-r border-gray-200">
              <ScrollView className="p-4" showsVerticalScrollIndicator={false}>
                {conflicts.map(renderConflictItem)}
              </ScrollView>
            </Box>

            {/* Right: Conflict Details */}
            <Box className="flex-1 p-4">
              {renderConflictDetails()}
            </Box>
          </Box>
        </Box>
      </Box>
    </Modal>
  );
};

export default ConflictResolutionModal;
