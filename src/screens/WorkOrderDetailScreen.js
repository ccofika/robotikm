import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, Alert, Image,
  ActivityIndicator, Linking, Platform, Modal, FlatList
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../context/AuthContext';
import { workOrdersAPI, techniciansAPI } from '../services/api';
import { GlassCard } from '../components/ui/GlassCard';

export default function WorkOrderDetailScreen({ route, navigation }) {
  const { orderId } = route.params;
  const { user } = useContext(AuthContext);
  const [workOrder, setWorkOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [comment, setComment] = useState('');
  const [images, setImages] = useState([]);

  // Equipment & Materials
  const [technicianEquipment, setTechnicianEquipment] = useState([]);
  const [userEquipment, setUserEquipment] = useState([]);
  const [removedEquipment, setRemovedEquipment] = useState([]);
  const [availableMaterials, setAvailableMaterials] = useState([]);
  const [usedMaterials, setUsedMaterials] = useState([]);

  // Modals
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [showMaterialsModal, setShowMaterialsModal] = useState(false);
  const [showRemoveEquipmentModal, setShowRemoveEquipmentModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  // Form states
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [materialQuantity, setMaterialQuantity] = useState('');
  const [removeEquipmentId, setRemoveEquipmentId] = useState('');
  const [removeReason, setRemoveReason] = useState('');
  const [postponeComment, setPostponeComment] = useState('');
  const [cancelComment, setCancelComment] = useState('');

  useEffect(() => {
    fetchWorkOrder();
    requestPermissions();
  }, [orderId]);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Dozvola', 'Potrebna je dozvola za pristup kameri');
      }
    }
  };

  const fetchWorkOrder = async () => {
    try {
      const response = await workOrdersAPI.getOne(orderId);
      const order = response.data;

      const technicianId = order.technicianId?._id || order.technicianId;
      const technician2Id = order.technician2Id?._id || order.technician2Id;
      const userId = user._id?.toString() || user._id;

      if (technicianId !== userId && technician2Id !== userId) {
        Alert.alert('Greška', 'Nemate pristup ovom radnom nalogu');
        navigation.goBack();
        return;
      }

      setWorkOrder(order);
      setComment(order.comment || '');
      setUsedMaterials(order.materials || []);

      // Fetch equipment and materials
      const [techEqRes, userEqRes, materialsRes] = await Promise.all([
        techniciansAPI.getEquipment(user._id),
        workOrdersAPI.getUserEquipment(orderId),
        techniciansAPI.getMaterials(user._id)
      ]);

      setTechnicianEquipment(techEqRes.data);
      setUserEquipment(userEqRes.data);
      setAvailableMaterials(materialsRes.data);
    } catch (error) {
      console.error('Greška pri učitavanju radnog naloga:', error);
      Alert.alert('Greška', 'Neuspešno učitavanje radnog naloga');
    } finally {
      setLoading(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled) {
        setImages([...images, result.assets[0]]);
      }
    } catch (error) {
      Alert.alert('Greška', 'Neuspešno snimanje fotografije');
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });
      if (!result.canceled) {
        setImages([...images, ...result.assets]);
      }
    } catch (error) {
      Alert.alert('Greška', 'Neuspešno učitavanje slike');
    }
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleAddEquipment = async () => {
    if (!selectedEquipment) {
      Alert.alert('Greška', 'Morate odabrati opremu');
      return;
    }

    try {
      await workOrdersAPI.updateUsedEquipment(orderId, {
        userId: workOrder.tisId,
        equipmentId: selectedEquipment,
        workOrderId: orderId,
        technicianId: user._id
      });

      Alert.alert('Uspešno', 'Oprema je dodata');
      setShowEquipmentModal(false);
      setSelectedEquipment('');
      fetchWorkOrder();
    } catch (error) {
      Alert.alert('Greška', 'Neuspešno dodavanje opreme');
    }
  };

  const handleRemoveEquipment = async () => {
    if (!removeEquipmentId || !removeReason) {
      Alert.alert('Greška', 'Unesite razlog uklanjanja');
      return;
    }

    try {
      await workOrdersAPI.updateUsedEquipment(orderId, {
        action: 'remove',
        equipmentId: removeEquipmentId,
        reason: removeReason,
        workOrderId: orderId
      });

      Alert.alert('Uspešno', 'Oprema je uklonjena');
      setShowRemoveEquipmentModal(false);
      setRemoveEquipmentId('');
      setRemoveReason('');
      fetchWorkOrder();
    } catch (error) {
      Alert.alert('Greška', 'Neuspešno uklanjanje opreme');
    }
  };

  const handleAddMaterial = async () => {
    if (!selectedMaterial || !materialQuantity) {
      Alert.alert('Greška', 'Unesite materijal i količinu');
      return;
    }

    try {
      await workOrdersAPI.updateUsedMaterials(orderId, {
        materialId: selectedMaterial,
        quantity: parseInt(materialQuantity),
        workOrderId: orderId
      });

      Alert.alert('Uspešno', 'Materijal je dodat');
      setShowMaterialsModal(false);
      setSelectedMaterial('');
      setMaterialQuantity('');
      fetchWorkOrder();
    } catch (error) {
      Alert.alert('Greška', 'Neuspešno dodavanje materijala');
    }
  };

  const handleComplete = async () => {
    Alert.alert(
      'Završavanje naloga',
      'Da li ste sigurni da želite da završite ovaj radni nalog?',
      [
        { text: 'Otkaži', style: 'cancel' },
        {
          text: 'Završi',
          onPress: async () => {
            setSaving(true);
            try {
              await workOrdersAPI.updateByTechnician(orderId, {
                status: 'zavrsen',
                comment,
                completedAt: new Date().toISOString()
              });
              Alert.alert('Uspešno', 'Radni nalog je završen', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (error) {
              Alert.alert('Greška', 'Neuspešno završavanje radnog naloga');
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  const handlePostpone = async () => {
    if (!postponeComment) {
      Alert.alert('Greška', 'Unesite razlog odlaganja');
      return;
    }

    setSaving(true);
    try {
      await workOrdersAPI.updateByTechnician(orderId, {
        status: 'odlozen',
        postponeComment,
        comment
      });
      Alert.alert('Uspešno', 'Radni nalog je odložen', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Greška', 'Neuspešno odlaganje radnog naloga');
    } finally {
      setSaving(false);
      setShowStatusModal(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelComment) {
      Alert.alert('Greška', 'Unesite razlog otkazivanja');
      return;
    }

    setSaving(true);
    try {
      await workOrdersAPI.updateByTechnician(orderId, {
        status: 'otkazan',
        cancelComment,
        comment
      });
      Alert.alert('Uspešno', 'Radni nalog je otkazan', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Greška', 'Neuspešno otkazivanje radnog naloga');
    } finally {
      setSaving(false);
      setShowStatusModal(false);
    }
  };

  const makePhoneCall = (phoneNumber) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const openMaps = (address, municipality) => {
    const destination = encodeURIComponent(`${address}, ${municipality}`);
    const url = Platform.select({
      ios: `maps://app?daddr=${destination}`,
      android: `geo:0,0?q=${destination}`,
      default: `https://www.google.com/maps/search/?api=1&query=${destination}`
    });
    Linking.openURL(url);
  };

  if (loading) {
    return (
      <LinearGradient
        colors={['#f8fafc', '#e2e8f0']}
        className="flex-1 items-center justify-center"
      >
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="mt-4 text-base text-slate-600">Učitavanje...</Text>
      </LinearGradient>
    );
  }

  if (!workOrder) {
    return (
      <LinearGradient colors={['#f8fafc', '#e2e8f0']} className="flex-1 items-center justify-center p-6">
        <Ionicons name="alert-circle-outline" size={64} color="#dc2626" style={{ marginBottom: 16 }} />
        <Text className="text-lg text-red-600 mb-6 text-center">Radni nalog nije pronađen</Text>
        <Pressable
          onPress={() => navigation.goBack()}
          className="bg-blue-600 rounded-xl py-3 px-6"
        >
          <Text className="text-white text-base font-semibold">Nazad</Text>
        </Pressable>
      </LinearGradient>
    );
  }

  const isCompleted = workOrder.status === 'zavrsen';
  const statusColors = {
    zavrsen: { bg: '#d1fae5', text: '#16a34a' },
    nezavrsen: { bg: '#fef3c7', text: '#ca8a04' },
    odlozen: { bg: '#fee2e2', text: '#dc2626' },
    otkazan: { bg: '#f1f5f9', text: '#64748b' },
  };

  const availableEquipment = technicianEquipment.filter(
    eq => eq.assignedTo === user._id && eq.status === 'assigned' && !eq.assignedToUser
  );

  const currentStatus = statusColors[workOrder.status];

  return (
    <LinearGradient colors={['#f8fafc', '#e2e8f0']} className="flex-1">
      <ScrollView className="flex-1" contentContainerClassName="p-4 pb-24">
        {/* Header Card */}
        <GlassCard className="border-l-4 mb-4" style={{ borderLeftColor: currentStatus.text }}>
          <View className="px-3 py-1.5 rounded-lg self-start mb-3" style={{ backgroundColor: currentStatus.bg }}>
            <Text className="text-xs font-bold uppercase" style={{ color: currentStatus.text }}>
              {workOrder.status === 'zavrsen' ? 'ZAVRŠEN' :
               workOrder.status === 'odlozen' ? 'ODLOŽEN' :
               workOrder.status === 'otkazan' ? 'OTKAZAN' : 'NEZAVRŠEN'}
            </Text>
          </View>
          <Text className="text-2xl font-bold text-slate-900 mb-1">{workOrder.municipality}</Text>
          <Text className="text-lg text-slate-700 mb-1">{workOrder.address}</Text>
          <Text className="text-base text-slate-600 mb-3">{workOrder.type}</Text>
          <View className="flex-row justify-between mt-2">
            <View className="flex-row items-center">
              <Ionicons name="calendar-outline" size={16} color="#64748b" style={{ marginRight: 4 }} />
              <Text className="text-sm text-slate-600">
                {new Date(workOrder.date).toLocaleDateString('sr-RS')}
              </Text>
            </View>
            {workOrder.time && (
              <View className="flex-row items-center">
                <Ionicons name="time-outline" size={16} color="#64748b" style={{ marginRight: 4 }} />
                <Text className="text-sm text-slate-600">{workOrder.time}</Text>
              </View>
            )}
          </View>
        </GlassCard>

        {/* Contact Info */}
        {(workOrder.userName || workOrder.userPhone) && (
          <GlassCard className="mb-4">
            <Text className="text-lg font-bold text-slate-900 mb-3">Informacije o korisniku</Text>
            {workOrder.userName && (
              <View className="flex-row items-center mb-2">
                <Ionicons name="person-outline" size={16} color="#64748b" style={{ marginRight: 6 }} />
                <Text className="text-base text-slate-700">{workOrder.userName}</Text>
              </View>
            )}
            {workOrder.userPhone && (
              <Pressable
                onPress={() => makePhoneCall(workOrder.userPhone)}
                className="bg-blue-600 rounded-xl py-3 px-4 mt-2 flex-row items-center justify-center"
              >
                <Ionicons name="call-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                <Text className="text-white text-base font-semibold">Pozovi: {workOrder.userPhone}</Text>
              </Pressable>
            )}
          </GlassCard>
        )}

        {/* Location */}
        <GlassCard className="mb-4">
          <Text className="text-lg font-bold text-slate-900 mb-3">Lokacija</Text>
          <View className="flex-row items-start mb-2">
            <Ionicons name="location-outline" size={16} color="#64748b" style={{ marginRight: 6, marginTop: 2 }} />
            <Text className="text-base text-slate-700 flex-1">{workOrder.address}</Text>
          </View>
          <View className="flex-row items-center mb-3">
            <Ionicons name="business-outline" size={16} color="#64748b" style={{ marginRight: 6 }} />
            <Text className="text-base text-slate-700">{workOrder.municipality}</Text>
          </View>
          <Pressable
            onPress={() => openMaps(workOrder.address, workOrder.municipality)}
            className="bg-green-600 rounded-xl py-3 px-4 flex-row items-center justify-center mt-2"
          >
            <Ionicons name="map-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text className="text-white text-base font-semibold">Otvori u mapama</Text>
          </Pressable>
        </GlassCard>

        {/* Installed Equipment */}
        {!isCompleted && (
          <GlassCard className="mb-4">
            <Text className="text-lg font-bold text-slate-900 mb-3">Instalirana oprema</Text>
            {userEquipment.length > 0 ? (
              userEquipment.map((eq, index) => (
                <View key={index} className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-2">
                  <Text className="text-base font-semibold text-slate-900">{eq.description}</Text>
                  <Text className="text-sm text-slate-600 mt-1">S/N: {eq.serialNumber}</Text>
                  <Pressable
                    onPress={() => {
                      setRemoveEquipmentId(eq._id);
                      setShowRemoveEquipmentModal(true);
                    }}
                    className="bg-red-600 rounded-lg py-2 px-4 mt-2"
                  >
                    <Text className="text-white text-sm text-center font-semibold">Ukloni</Text>
                  </Pressable>
                </View>
              ))
            ) : (
              <Text className="text-sm text-slate-500 italic">Nema instalirane opreme</Text>
            )}
            <Pressable
              onPress={() => setShowEquipmentModal(true)}
              className="bg-blue-600 rounded-xl py-3 px-4 mt-3 flex-row items-center justify-center"
            >
              <Ionicons name="add-circle-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text className="text-white text-base font-semibold">Dodaj opremu</Text>
            </Pressable>
          </GlassCard>
        )}

        {/* Used Materials */}
        {!isCompleted && (
          <GlassCard className="mb-4">
            <Text className="text-lg font-bold text-slate-900 mb-3">Utrošeni materijali</Text>
            {usedMaterials.length > 0 ? (
              usedMaterials.map((mat, index) => (
                <View key={index} className="flex-row justify-between items-center bg-slate-50 border border-slate-200 rounded-xl p-4 mb-2">
                  <Text className="text-base text-slate-900">{mat.name}</Text>
                  <Text className="text-base font-bold text-blue-600">x{mat.quantity}</Text>
                </View>
              ))
            ) : (
              <Text className="text-sm text-slate-500 italic">Nema utrošenih materijala</Text>
            )}
            <Pressable
              onPress={() => setShowMaterialsModal(true)}
              className="bg-blue-600 rounded-xl py-3 px-4 mt-3 flex-row items-center justify-center"
            >
              <Ionicons name="add-circle-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text className="text-white text-base font-semibold">Dodaj materijal</Text>
            </Pressable>
          </GlassCard>
        )}

        {/* Comment */}
        {!isCompleted && (
          <GlassCard className="mb-4">
            <Text className="text-lg font-bold text-slate-900 mb-3">Komentar</Text>
            <TextInput
              className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900 min-h-[100px]"
              placeholder="Dodaj komentar..."
              placeholderTextColor="#94a3b8"
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </GlassCard>
        )}

        {/* Photos */}
        {!isCompleted && (
          <GlassCard className="mb-4">
            <Text className="text-lg font-bold text-slate-900 mb-3">Fotografije</Text>
            <View className="flex-row gap-2 mb-3">
              <Pressable onPress={handleTakePhoto} className="flex-1 bg-blue-600 rounded-xl py-3 px-4 flex-row items-center justify-center">
                <Ionicons name="camera-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                <Text className="text-white text-base font-semibold">Uslikaj</Text>
              </Pressable>
              <Pressable onPress={handlePickImage} className="flex-1 bg-green-600 rounded-xl py-3 px-4 flex-row items-center justify-center">
                <Ionicons name="images-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                <Text className="text-white text-base font-semibold">Izaberi</Text>
              </Pressable>
            </View>
            {images.length > 0 && (
              <View className="flex-row flex-wrap gap-2">
                {images.map((image, index) => (
                  <View key={index} className="relative w-24 h-24">
                    <Image source={{ uri: image.uri }} className="w-full h-full rounded-xl" />
                    <Pressable
                      className="absolute -top-2 -right-2 bg-red-600 rounded-full w-6 h-6 items-center justify-center"
                      onPress={() => removeImage(index)}
                    >
                      <Ionicons name="close" size={16} color="#fff" />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </GlassCard>
        )}

        {workOrder.adminComment && (
          <GlassCard className="mb-4 border-l-4 border-red-600 bg-red-50/85">
            <Text className="text-lg font-bold text-red-700 mb-3">Komentar administracije</Text>
            <Text className="text-base text-red-600">{workOrder.adminComment}</Text>
          </GlassCard>
        )}
      </ScrollView>

      {/* Action Buttons */}
      {!isCompleted && (
        <View className="absolute bottom-0 left-0 right-0 flex-row p-4 bg-white/95 border-t border-slate-200 gap-2">
          <Pressable
            onPress={() => setShowStatusModal(true)}
            disabled={saving}
            className={`flex-1 bg-slate-600 rounded-xl py-4 px-6 flex-row items-center justify-center ${saving && 'opacity-50'}`}
          >
            <Ionicons name="settings-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text className="text-white text-base font-semibold">Status</Text>
          </Pressable>
          <Pressable
            onPress={handleComplete}
            disabled={saving}
            className={`flex-1 bg-green-600 rounded-xl py-4 px-6 flex-row items-center justify-center ${saving && 'opacity-50'}`}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                <Text className="text-white text-base font-semibold">Završi</Text>
              </>
            )}
          </Pressable>
        </View>
      )}

      {/* Equipment Modal */}
      <Modal visible={showEquipmentModal} animationType="slide" transparent onRequestClose={() => setShowEquipmentModal(false)}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 max-h-[80%]">
            <Text className="text-2xl font-bold text-slate-900 mb-4">Dodaj opremu</Text>
            <FlatList
              data={availableEquipment}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <Pressable
                  className={`p-4 border-b border-slate-200 ${selectedEquipment === item._id ? 'bg-blue-50' : ''}`}
                  onPress={() => setSelectedEquipment(item._id)}
                >
                  <Text className="text-base font-semibold text-slate-900">{item.description}</Text>
                  <Text className="text-sm text-slate-600 mt-1">S/N: {item.serialNumber}</Text>
                </Pressable>
              )}
              ListEmptyComponent={<Text className="text-sm text-slate-500 italic text-center p-4">Nema dostupne opreme</Text>}
            />
            <View className="flex-row gap-2 mt-4">
              <Pressable onPress={() => setShowEquipmentModal(false)} className="flex-1 bg-slate-400 rounded-xl py-3 px-6">
                <Text className="text-white text-base font-semibold text-center">Otkaži</Text>
              </Pressable>
              <Pressable onPress={handleAddEquipment} className="flex-1 bg-blue-600 rounded-xl py-3 px-6">
                <Text className="text-white text-base font-semibold text-center">Dodaj</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Materials Modal */}
      <Modal visible={showMaterialsModal} animationType="slide" transparent onRequestClose={() => setShowMaterialsModal(false)}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 max-h-[80%]">
            <Text className="text-2xl font-bold text-slate-900 mb-4">Dodaj materijal</Text>
            <FlatList
              data={availableMaterials}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <Pressable
                  className={`p-4 border-b border-slate-200 ${selectedMaterial === item._id ? 'bg-blue-50' : ''}`}
                  onPress={() => setSelectedMaterial(item._id)}
                >
                  <Text className="text-base font-semibold text-slate-900">{item.name}</Text>
                  <Text className="text-sm text-slate-600 mt-1">Dostupno: {item.quantity}</Text>
                </Pressable>
              )}
            />
            <TextInput
              className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900 mt-4"
              placeholder="Količina"
              placeholderTextColor="#94a3b8"
              value={materialQuantity}
              onChangeText={setMaterialQuantity}
              keyboardType="numeric"
            />
            <View className="flex-row gap-2 mt-4">
              <Pressable onPress={() => setShowMaterialsModal(false)} className="flex-1 bg-slate-400 rounded-xl py-3 px-6">
                <Text className="text-white text-base font-semibold text-center">Otkaži</Text>
              </Pressable>
              <Pressable onPress={handleAddMaterial} className="flex-1 bg-blue-600 rounded-xl py-3 px-6">
                <Text className="text-white text-base font-semibold text-center">Dodaj</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Remove Equipment Modal */}
      <Modal visible={showRemoveEquipmentModal} animationType="slide" transparent onRequestClose={() => setShowRemoveEquipmentModal(false)}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            <Text className="text-2xl font-bold text-slate-900 mb-4">Ukloni opremu</Text>
            <TextInput
              className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900 min-h-[100px]"
              placeholder="Razlog uklanjanja"
              placeholderTextColor="#94a3b8"
              value={removeReason}
              onChangeText={setRemoveReason}
              multiline
              textAlignVertical="top"
            />
            <View className="flex-row gap-2 mt-4">
              <Pressable onPress={() => setShowRemoveEquipmentModal(false)} className="flex-1 bg-slate-400 rounded-xl py-3 px-6">
                <Text className="text-white text-base font-semibold text-center">Otkaži</Text>
              </Pressable>
              <Pressable onPress={handleRemoveEquipment} className="flex-1 bg-red-600 rounded-xl py-3 px-6">
                <Text className="text-white text-base font-semibold text-center">Ukloni</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Status Modal */}
      <Modal visible={showStatusModal} animationType="slide" transparent onRequestClose={() => setShowStatusModal(false)}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            <Text className="text-2xl font-bold text-slate-900 mb-6">Promeni status</Text>
            <Pressable
              onPress={() => {
                setShowStatusModal(false);
                setTimeout(() => Alert.prompt('Odlaganje', 'Razlog:', text => {
                  setPostponeComment(text);
                  handlePostpone();
                }), 300);
              }}
              className="bg-yellow-600 rounded-xl py-4 px-6 flex-row items-center justify-center mb-3"
            >
              <Ionicons name="pause-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text className="text-white text-base font-semibold">Odloži</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setShowStatusModal(false);
                setTimeout(() => Alert.prompt('Otkazivanje', 'Razlog:', text => {
                  setCancelComment(text);
                  handleCancel();
                }), 300);
              }}
              className="bg-red-600 rounded-xl py-4 px-6 flex-row items-center justify-center mb-3"
            >
              <Ionicons name="close-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text className="text-white text-base font-semibold">Otkaži</Text>
            </Pressable>
            <Pressable onPress={() => setShowStatusModal(false)} className="bg-slate-400 rounded-xl py-4 px-6">
              <Text className="text-white text-base font-semibold text-center">Zatvori</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

