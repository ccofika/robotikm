



import React, { useState, useEffect, useContext } from 'react';
import { ScrollView, Pressable, Alert, Image, Linking, Platform, Modal, FlatList, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { useOffline } from '../context/OfflineContext';
import dataRepository from '../services/dataRepository';
import { userEquipmentAPI } from '../services/api';
import syncService from '../services/syncService';
import { VStack } from '../components/ui/vstack';
import { HStack } from '../components/ui/hstack';
import { Box } from '../components/ui/box';
import { Card } from '../components/ui/card';
import { Text } from '../components/ui/Text';
import { Heading } from '../components/ui/heading';
import { Center } from '../components/ui/center';
import { Spinner } from '../components/ui/spinner';
import { Input, InputField } from '../components/ui/input';
import { Button, ButtonText, ButtonSpinner } from '../components/ui/button';

export default function WorkOrderDetailScreen({ route, navigation }) {
  const { orderId } = route.params;
  const { user } = useContext(AuthContext);
  const { isOnline } = useOffline();
  const insets = useSafeAreaInsets();
  const [workOrder, setWorkOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [comment, setComment] = useState('');
  const [images, setImages] = useState([]); // Local images ready to upload
  const [pendingSyncImages, setPendingSyncImages] = useState([]); // Images waiting for sync (offline)
  const [uploadedImages, setUploadedImages] = useState([]); // Images from backend

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
  const [showRemoveBySerialModal, setShowRemoveBySerialModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  // Form states
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [materialQuantity, setMaterialQuantity] = useState('');
  const [removeEquipmentId, setRemoveEquipmentId] = useState('');
  const [removeReason, setRemoveReason] = useState('');
  const [postponeComment, setPostponeComment] = useState('');
  const [cancelComment, setCancelComment] = useState('');

  // Serial removal states
  const [removalEquipmentName, setRemovalEquipmentName] = useState('');
  const [removalSerialNumber, setRemovalSerialNumber] = useState('');
  const [removalCondition, setRemovalCondition] = useState('ispravna');

  // Image upload states
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    fetchWorkOrder();
    requestPermissions();
  }, [orderId]);

  // Subscribe to sync completion events to auto-refresh data
  useEffect(() => {
    console.log('[WorkOrderDetail] Setting up sync completion listener');

    const unsubscribe = syncService.addSyncCompletionListener((syncItem) => {
      console.log('[WorkOrderDetail] Sync completed:', syncItem.type, syncItem.data);

      // Refresh data kada se sinhronizuje bilo šta za ovaj work order
      if (syncItem.data?.workOrderId === orderId) {
        console.log('[WorkOrderDetail] Refreshing work order data after sync');

        // Ako je sinhronizovan image upload, očisti pending sync slike
        if (syncItem.type === 'UPLOAD_IMAGE') {
          console.log('[WorkOrderDetail] Clearing pending sync images after successful image sync');
          setPendingSyncImages([]);
        }

        // Osvežava sve podatke sa servera
        fetchWorkOrder();
      }
    });

    // Cleanup listener kada se komponenta unmount-uje
    return () => {
      console.log('[WorkOrderDetail] Cleaning up sync completion listener');
      unsubscribe();
    };
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
      // Koristi dataRepository za offline-first pristup
      const order = await dataRepository.getWorkOrder(user._id, orderId, false);

      if (!order) {
        Alert.alert('Greška', 'Radni nalog nije pronađen');
        navigation.goBack();
        return;
      }

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
      setUploadedImages(order.images || []);

      // Fetch equipment and materials using dataRepository
      const [techEq, userEq, materials, removedEq] = await Promise.all([
        dataRepository.getEquipment(user._id),
        dataRepository.getUserEquipment(orderId),
        dataRepository.getMaterials(user._id),
        dataRepository.getRemovedEquipment(orderId)
      ]);

      console.log('[WorkOrderDetail] Loaded data:', {
        techEqCount: techEq.length,
        userEqCount: userEq.length,
        materialsCount: materials.length,
        removedEqCount: removedEq.length,
        techEqSample: techEq[0]
      });

      setTechnicianEquipment(techEq);
      setUserEquipment(userEq);
      setAvailableMaterials(materials);
      setRemovedEquipment(removedEq);
    } catch (error) {
      console.error('Greška pri učitavanju radnog naloga:', error);
      if (isOnline) {
        Alert.alert('Greška', 'Neuspešno učitavanje radnog naloga');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
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

  const removePendingSyncImage = (index) => {
    setPendingSyncImages(pendingSyncImages.filter((_, i) => i !== index));
  };

  const handleImageUpload = async () => {
    if (images.length === 0) {
      Alert.alert('Greška', 'Molimo izaberite slike');
      return;
    }

    setUploadingImages(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < images.length; i++) {
        const image = images[i];

        // Koristi dataRepository za offline-first upload
        await dataRepository.uploadWorkOrderImage(orderId, image.uri, user._id);

        // Update progress
        setUploadProgress(Math.round(((i + 1) / images.length) * 100));
      }

      // Ako je offline, prebaci slike u pendingSyncImages
      if (!isOnline) {
        setPendingSyncImages([...pendingSyncImages, ...images]);
      }

      // Clear local images koji su sada u upload procesu
      setImages([]);

      const message = isOnline
        ? 'Sve slike su uspešno uploadovane!'
        : 'Slike će biti uploadovane kada se povežete na internet';

      Alert.alert('Uspešno', message);

      // Refresh work order data
      await fetchWorkOrder();
    } catch (error) {
      console.error('Greška pri upload-u slika:', error);
      Alert.alert('Greška', 'Neuspešno uploadovanje slika. Pokušajte ponovo.');
    } finally {
      setUploadingImages(false);
      setUploadProgress(0);
    }
  };

  const handleImageDelete = async (imageUrl) => {
    Alert.alert(
      'Brisanje slike',
      'Da li ste sigurni da želite da obrišete ovu sliku?',
      [
        { text: 'Otkaži', style: 'cancel' },
        {
          text: 'Obriši',
          style: 'destructive',
          onPress: async () => {
            try {
              // Handle both string URLs and objects with url/uri properties
              const imageUri = typeof imageUrl === 'string' ? imageUrl : (imageUrl.url || imageUrl.uri);
              await api.delete(`/api/workorders/${orderId}/images`, {
                data: { imageUrl: imageUri }
              });

              // Refresh work order data
              await fetchWorkOrder();

              Alert.alert('Uspešno', 'Slika je obrisana');
            } catch (error) {
              console.error('Greška pri brisanju slike:', error);
              Alert.alert('Greška', 'Neuspešno brisanje slike');
            }
          }
        }
      ]
    );
  };

  const handleAddEquipment = async () => {
    if (!selectedEquipment) {
      Alert.alert('Greška', 'Morate odabrati opremu');
      return;
    }

    try {
      // Koristi dataRepository za offline-first dodavanje
      await dataRepository.addUserEquipment(orderId, {
        userId: workOrder.tisId,
        equipmentId: selectedEquipment,
        workOrderId: orderId,
        technicianId: user._id
      });

      const message = isOnline
        ? 'Oprema je dodata'
        : 'Oprema je dodata i biće sinhronizovana kada se povežete na internet';

      Alert.alert('Uspešno', message);
      setShowEquipmentModal(false);
      setSelectedEquipment('');
      fetchWorkOrder();
    } catch (error) {
      console.error('Greška pri dodavanju opreme:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Neuspešno dodavanje opreme';
      Alert.alert('Greška', errorMessage);
    }
  };

  const handleRemoveEquipment = async () => {
    if (!removeEquipmentId || !removeReason) {
      Alert.alert('Greška', 'Unesite razlog uklanjanja');
      return;
    }

    try {
      // Koristi dataRepository za offline-first uklanjanje
      await dataRepository.removeUserEquipment(orderId, removeEquipmentId, {
        workOrderId: orderId,
        technicianId: user._id,
        removalReason: removeReason,
        isWorking: true
      });

      const message = isOnline
        ? 'Oprema je uklonjena'
        : 'Oprema je uklonjena i biće sinhronizovano kada se povežete na internet';

      Alert.alert('Uspešno', message);
      setShowRemoveEquipmentModal(false);
      setRemoveEquipmentId('');
      setRemoveReason('');
      fetchWorkOrder();
    } catch (error) {
      console.error('Greška pri uklanjanju opreme:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Neuspešno uklanjanje opreme';
      Alert.alert('Greška', errorMessage);
    }
  };

  const handleRemoveBySerial = async () => {
    if (!removalEquipmentName.trim() || !removalSerialNumber.trim()) {
      Alert.alert('Greška', 'Morate popuniti naziv opreme i serijski broj');
      return;
    }

    setSaving(true);

    try {
      // Koristi dataRepository za offline-first uklanjanje opreme po serijskom broju
      await dataRepository.removeEquipmentBySerial(orderId, {
        technicianId: user._id,
        equipmentName: removalEquipmentName,
        serialNumber: removalSerialNumber,
        condition: removalCondition
      });

      const message = isOnline
        ? 'Oprema je uspešno uklonjena'
        : 'Oprema je uklonjena i biće sinhronizovana kada se povežete na internet';

      Alert.alert('Uspešno', message);

      // Reset form
      setRemovalEquipmentName('');
      setRemovalSerialNumber('');
      setRemovalCondition('ispravna');
      setShowRemoveBySerialModal(false);

      // Refresh data
      fetchWorkOrder();
    } catch (error) {
      console.error('Greška pri uklanjanju opreme:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Neuspešno uklanjanje opreme';
      Alert.alert('Greška', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleAddMaterial = async () => {
    if (!selectedMaterial || !materialQuantity) {
      Alert.alert('Greška', 'Unesite materijal i količinu');
      return;
    }

    try {
      // Pronađi postojeći materijal ili dodaj novi
      const existingMaterialIndex = usedMaterials.findIndex(
        mat => mat.material === selectedMaterial || mat.materialId === selectedMaterial
      );

      let updatedMaterials;
      if (existingMaterialIndex !== -1) {
        updatedMaterials = [...usedMaterials];
        updatedMaterials[existingMaterialIndex] = {
          material: selectedMaterial,
          quantity: updatedMaterials[existingMaterialIndex].quantity + parseInt(materialQuantity)
        };
      } else {
        updatedMaterials = [
          ...usedMaterials,
          {
            material: selectedMaterial,
            quantity: parseInt(materialQuantity)
          }
        ];
      }

      // Koristi dataRepository za offline-first ažuriranje
      await dataRepository.updateUsedMaterials(user._id, orderId, updatedMaterials);

      const message = isOnline
        ? 'Materijal je dodat'
        : 'Materijal je dodat i biće sinhronizovan kada se povežete na internet';

      Alert.alert('Uspešno', message);
      setShowMaterialsModal(false);
      setSelectedMaterial('');
      setMaterialQuantity('');
      fetchWorkOrder();
    } catch (error) {
      console.error('Greška pri dodavanju materijala:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Neuspešno dodavanje materijala';
      Alert.alert('Greška', errorMessage);
    }
  };

  const handleRemoveMaterial = async (materialToRemove) => {
    Alert.alert(
      'Uklanjanje materijala',
      'Da li ste sigurni da želite da uklonite ovaj materijal?',
      [
        { text: 'Otkaži', style: 'cancel' },
        {
          text: 'Ukloni',
          style: 'destructive',
          onPress: async () => {
            try {
              // Ukloni materijal iz liste
              const updatedMaterials = usedMaterials.filter(
                mat => (mat.material || mat.materialId) !== (materialToRemove.material || materialToRemove.materialId)
              );

              // Koristi dataRepository za offline-first ažuriranje
              await dataRepository.updateUsedMaterials(user._id, orderId, updatedMaterials);

              const message = isOnline
                ? 'Materijal je uklonjen'
                : 'Materijal je uklonjen i biće sinhronizovano kada se povežete na internet';

              Alert.alert('Uspešno', message);
              fetchWorkOrder();
            } catch (error) {
              console.error('Greška pri uklanjanju materijala:', error);
              const errorMessage = error.response?.data?.error || error.message || 'Neuspešno uklanjanje materijala';
              Alert.alert('Greška', errorMessage);
            }
          }
        }
      ]
    );
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
              // Koristi dataRepository za offline-first ažuriranje
              await dataRepository.updateWorkOrder(user._id, orderId, {
                status: 'zavrsen',
                comment,
                completedAt: new Date().toISOString()
              });

              const message = isOnline
                ? 'Radni nalog je završen'
                : 'Radni nalog je označen kao završen i biće sinhronizovan kada se povežete na internet';

              Alert.alert('Uspešno', message, [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (error) {
              console.error('Greška pri završavanju radnog naloga:', error);
              const errorMessage = error.response?.data?.error || error.message || 'Neuspešno završavanje radnog naloga';
              Alert.alert('Greška', errorMessage);
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
      await dataRepository.updateWorkOrder(user._id, orderId, {
        status: 'odlozen',
        postponeComment,
        comment
      });

      const message = isOnline
        ? 'Radni nalog je odložen'
        : 'Radni nalog je označen kao odložen i biće sinhronizovan kada se povežete na internet';

      Alert.alert('Uspešno', message, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Greška pri odlaganju radnog naloga:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Neuspešno odlaganje radnog naloga';
      Alert.alert('Greška', errorMessage);
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
      await dataRepository.updateWorkOrder(user._id, orderId, {
        status: 'otkazan',
        cancelComment,
        comment
      });

      const message = isOnline
        ? 'Radni nalog je otkazan'
        : 'Radni nalog je označen kao otkazan i biće sinhronizovan kada se povežete na internet';

      Alert.alert('Uspešno', message, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Greška pri otkazivanju radnog naloga:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Neuspešno otkazivanje radnog naloga';
      Alert.alert('Greška', errorMessage);
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
      <Box className="flex-1 bg-white" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <Center className="flex-1">
          <Spinner size="large" color="#2563eb" />
          <Text size="sm" className="text-gray-500 mt-4">Učitavanje...</Text>
        </Center>
      </Box>
    );
  }

  if (!workOrder) {
    return (
      <Box className="flex-1 bg-white" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <Center className="flex-1 p-6">
          <Box className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-4">
            <Ionicons name="alert-circle-outline" size={40} color="#6b7280" />
          </Box>
          <Text size="lg" bold className="text-gray-900 mb-2">Radni nalog nije pronađen</Text>
          <Text size="sm" className="text-gray-500 text-center mb-6">
            Ne možemo pronaći traženi radni nalog
          </Text>
          <Button action="primary" size="lg" onPress={() => navigation.goBack()} className="min-w-[140px]">
            <ButtonText>Nazad</ButtonText>
          </Button>
        </Center>
      </Box>
    );
  }

  const isCompleted = workOrder.status === 'zavrsen';
  const getStatusInfo = () => {
    switch (workOrder.status) {
      case 'zavrsen':
        return { label: 'Završen', icon: 'checkmark-circle', color: '#10b981' };
      case 'odlozen':
        return { label: 'Odložen', icon: 'pause-circle', color: '#f59e0b' };
      case 'otkazan':
        return { label: 'Otkazan', icon: 'close-circle', color: '#ef4444' };
      default:
        return { label: 'U toku', icon: 'time', color: '#3b82f6' };
    }
  };

  const statusInfo = getStatusInfo();

  const availableEquipment = technicianEquipment.filter(eq => {
    const assignedToMatch = eq.assignedTo === user._id || eq.assignedTo?._id === user._id;
    const statusMatch = eq.status === 'assigned';
    const notAssignedToUser = !eq.assignedToUser;

    console.log('[WorkOrderDetail] Equipment filter:', {
      description: eq.description,
      assignedTo: eq.assignedTo,
      userId: user._id,
      assignedToMatch,
      statusMatch,
      notAssignedToUser,
      passes: assignedToMatch && statusMatch && notAssignedToUser
    });

    return assignedToMatch && statusMatch && notAssignedToUser;
  });

  return (
    <Box className="flex-1 bg-gray-50">
      {/* Header with Status - Compact */}
      <Box className="bg-white border-b border-gray-200 px-4 py-2">
        <HStack space="sm" className="items-center">
          <Box className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
            <Ionicons name={statusInfo.icon} size={16} color={statusInfo.color} />
          </Box>
          <VStack className="flex-1" space="xs">
            <HStack className="items-center" space="xs">
              <Text size="xs" className="text-gray-500 uppercase tracking-wide">{statusInfo.label}</Text>
              <Text size="xs" className="text-gray-400">•</Text>
              <Heading size="sm" className="text-gray-900">{workOrder.municipality}</Heading>
            </HStack>
            <HStack space="sm" className="items-center">
              <HStack space="xs" className="items-center">
                <Ionicons name="calendar-outline" size={12} color="#9ca3af" />
                <Text size="xs" className="text-gray-500">
                  {new Date(workOrder.date).toLocaleDateString('sr-RS', { day: '2-digit', month: 'short' })}
                </Text>
              </HStack>
              {workOrder.time && (
                <>
                  <Text size="xs" className="text-gray-400">•</Text>
                  <HStack space="xs" className="items-center">
                    <Ionicons name="time-outline" size={12} color="#9ca3af" />
                    <Text size="xs" className="text-gray-500">{workOrder.time}</Text>
                  </HStack>
                </>
              )}
            </HStack>
          </VStack>
        </HStack>
      </Box>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: isCompleted ? 20 : 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Location Section */}
        <Box className="bg-white p-4 border-b border-gray-200">
          <VStack space="md">
            <Text size="xs" bold className="text-gray-500 uppercase tracking-wide">Lokacija</Text>
            <VStack space="sm">
              <HStack space="sm" className="items-start">
                <Ionicons name="location" size={20} color="#3b82f6" style={{ marginTop: 2 }} />
                <VStack className="flex-1" space="xs">
                  <Text size="md" className="text-gray-900">{workOrder.address}</Text>
                  <Text size="sm" className="text-gray-500">{workOrder.type}</Text>
                </VStack>
              </HStack>
              <Pressable
                onPress={() => openMaps(workOrder.address, workOrder.municipality)}
                className="bg-blue-600 rounded-2xl py-4 active:bg-blue-700"
              >
                <HStack space="sm" className="items-center justify-center">
                  <Ionicons name="navigate" size={20} color="#fff" />
                  <Text size="md" bold className="text-white">Otvori navigaciju</Text>
                </HStack>
              </Pressable>
            </VStack>
          </VStack>
        </Box>

        {/* Contact Section */}
        {(workOrder.userName || workOrder.userPhone) && (
          <Box className="bg-white mt-3 p-4 border-b border-gray-200">
            <VStack space="md">
              <Text size="xs" bold className="text-gray-500 uppercase tracking-wide">Kontakt</Text>
              {workOrder.userName && (
                <HStack space="sm" className="items-center">
                  <Ionicons name="person-circle-outline" size={20} color="#9ca3af" />
                  <Text size="md" className="text-gray-900">{workOrder.userName}</Text>
                </HStack>
              )}
              {workOrder.userPhone && (
                <Pressable
                  onPress={() => makePhoneCall(workOrder.userPhone)}
                  className="bg-green-600 rounded-2xl py-4 active:bg-green-700"
                >
                  <HStack space="sm" className="items-center justify-center">
                    <Ionicons name="call" size={20} color="#fff" />
                    <Text size="md" bold className="text-white">{workOrder.userPhone}</Text>
                  </HStack>
                </Pressable>
              )}
            </VStack>
          </Box>
        )}

        {/* Equipment Section */}
        {!isCompleted && (
          <Box className="bg-white mt-3 p-4 border-b border-gray-200">
            <VStack space="md">
              <HStack className="items-center justify-between">
                <Text size="xs" bold className="text-gray-500 uppercase tracking-wide">Oprema</Text>
                <HStack space="xs">
                  <Pressable
                    onPress={() => setShowRemoveBySerialModal(true)}
                    className="bg-red-50 rounded-full px-3 py-1.5 active:bg-red-100"
                  >
                    <HStack space="xs" className="items-center">
                      <Ionicons name="remove-circle" size={16} color="#ef4444" />
                      <Text size="xs" bold className="text-red-600">Ukloni</Text>
                    </HStack>
                  </Pressable>
                  <Pressable
                    onPress={() => setShowEquipmentModal(true)}
                    className="bg-blue-50 rounded-full px-3 py-1.5 active:bg-blue-100"
                  >
                    <HStack space="xs" className="items-center">
                      <Ionicons name="add" size={16} color="#3b82f6" />
                      <Text size="xs" bold className="text-blue-600">Dodaj</Text>
                    </HStack>
                  </Pressable>
                </HStack>
              </HStack>
              {userEquipment.length > 0 ? (
                <VStack space="sm">
                  {userEquipment.map((eq, index) => (
                    <HStack key={index} className="bg-gray-50 rounded-xl p-3 items-center justify-between">
                      <VStack className="flex-1" space="xs">
                        <Text size="sm" bold className="text-gray-900">{eq.description}</Text>
                        <Text size="xs" className="text-gray-500">S/N: {eq.serialNumber}</Text>
                      </VStack>
                      <Pressable
                        onPress={() => {
                          setRemoveEquipmentId(eq.id);
                          setShowRemoveEquipmentModal(true);
                        }}
                        className="ml-2"
                      >
                        <Ionicons name="close-circle" size={24} color="#ef4444" />
                      </Pressable>
                    </HStack>
                  ))}
                </VStack>
              ) : (
                <Text size="sm" className="text-gray-400 italic">Nije dodata oprema</Text>
              )}
            </VStack>
          </Box>
        )}

        {/* Removed Equipment Section */}
        {removedEquipment.length > 0 && (
          <Box className="bg-orange-50 mt-3 p-4 border-l-4 border-orange-500">
            <VStack space="md">
              <HStack space="xs" className="items-center">
                <Ionicons name="warning" size={18} color="#f97316" />
                <Text size="xs" bold className="text-orange-700 uppercase tracking-wide">Uklonjena Oprema</Text>
              </HStack>
              <VStack space="sm">
                {removedEquipment.map((eq, index) => {
                  // Backend vraća equipmentType (enum) i notes
                  // Pokušaj da ekstraktuješ naziv iz notes ili koristi equipmentType
                  let equipmentName = eq.equipmentType || 'Nepoznata oprema';

                  // Ako postoji notes i sadrži " - ", izvuci deo posle " - "
                  if (eq.notes && eq.notes.includes(' - ')) {
                    const noteParts = eq.notes.split(' - ');
                    if (noteParts.length > 1) {
                      equipmentName = noteParts[1];
                    }
                  }

                  const serialNumber = eq.serialNumber || 'N/A';
                  const removalDate = eq.removedAt || eq.removalDate;

                  return (
                    <Box key={index} className="bg-white rounded-xl p-3 border border-orange-200">
                      <VStack space="xs">
                        <HStack className="items-center justify-between">
                          <Text size="sm" bold className="text-gray-900">{equipmentName}</Text>
                          <Box className={`px-2 py-1 rounded-md ${eq.condition === 'neispravna' ? 'bg-red-100' : 'bg-green-100'}`}>
                            <Text size="xs" bold className={eq.condition === 'neispravna' ? 'text-red-700' : 'text-green-700'}>
                              {eq.condition === 'neispravna' ? 'Neispravna' : 'Ispravna'}
                            </Text>
                          </Box>
                        </HStack>
                        <Text size="xs" className="text-gray-600">S/N: {serialNumber}</Text>
                        {removalDate && (
                          <Text size="xs" className="text-gray-500">
                            {new Date(removalDate).toLocaleDateString('sr-RS')}
                          </Text>
                        )}
                      </VStack>
                    </Box>
                  );
                })}
              </VStack>
            </VStack>
          </Box>
        )}

        {/* Materials Section */}
        {!isCompleted && (
          <Box className="bg-white mt-3 p-4 border-b border-gray-200">
            <VStack space="md">
              <HStack className="items-center justify-between">
                <Text size="xs" bold className="text-gray-500 uppercase tracking-wide">Materijali</Text>
                <Pressable
                  onPress={() => setShowMaterialsModal(true)}
                  className="bg-blue-50 rounded-full px-3 py-1.5 active:bg-blue-100"
                >
                  <HStack space="xs" className="items-center">
                    <Ionicons name="add" size={16} color="#3b82f6" />
                    <Text size="xs" bold className="text-blue-600">Dodaj</Text>
                  </HStack>
                </Pressable>
              </HStack>
              {usedMaterials.length > 0 ? (
                <VStack space="sm">
                  {usedMaterials.map((mat, index) => {
                    // Handle different ways material data can be structured
                    const materialName = mat.name || mat.type || mat.material?.name || mat.material?.type || 'Nepoznat materijal';
                    return (
                      <HStack key={index} className="bg-gray-50 rounded-xl p-3 items-center justify-between">
                        <Text size="sm" className="text-gray-900 flex-1">{materialName}</Text>
                        <HStack space="sm" className="items-center">
                          <Box className="bg-blue-100 rounded-full px-3 py-1">
                            <Text size="sm" bold className="text-blue-700">×{mat.quantity}</Text>
                          </Box>
                          <Pressable
                            onPress={() => handleRemoveMaterial(mat)}
                            className="ml-1"
                          >
                            <Ionicons name="close-circle" size={24} color="#ef4444" />
                          </Pressable>
                        </HStack>
                      </HStack>
                    );
                  })}
                </VStack>
              ) : (
                <Text size="sm" className="text-gray-400 italic">Nisu dodati materijali</Text>
              )}
            </VStack>
          </Box>
        )}

        {/* Comment Section */}
        {!isCompleted && (
          <Box className="bg-white mt-3 p-4 border-b border-gray-200">
            <VStack space="sm">
              <Text size="xs" bold className="text-gray-500 uppercase tracking-wide">Napomena</Text>
              <Box className="bg-gray-50 border border-gray-300 rounded-xl p-3" style={{ minHeight: 124 }}>
                <InputField
                  placeholder="Dodaj napomenu o radu..."
                  value={comment}
                  onChangeText={setComment}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  style={{ minHeight: 100, height: 100 }}
                />
              </Box>
            </VStack>
          </Box>
        )}

        {/* Photos Section */}
        {!isCompleted && (
          <Box className="bg-white mt-3 p-4 border-b border-gray-200">
            <VStack space="md">
              <Text size="xs" bold className="text-gray-500 uppercase tracking-wide">Fotografije</Text>

              {/* Capture Buttons */}
              <HStack space="sm">
                <Pressable
                  onPress={handleTakePhoto}
                  className="flex-1 bg-gray-100 rounded-2xl py-4 active:bg-gray-200"
                  disabled={uploadingImages}
                >
                  <VStack space="xs" className="items-center">
                    <Ionicons name="camera" size={24} color="#6b7280" />
                    <Text size="xs" className="text-gray-600">Uslikaj</Text>
                  </VStack>
                </Pressable>
                <Pressable
                  onPress={handlePickImage}
                  className="flex-1 bg-gray-100 rounded-2xl py-4 active:bg-gray-200"
                  disabled={uploadingImages}
                >
                  <VStack space="xs" className="items-center">
                    <Ionicons name="images" size={24} color="#6b7280" />
                    <Text size="xs" className="text-gray-600">Galerija</Text>
                  </VStack>
                </Pressable>
              </HStack>

              {/* Local Images (not yet uploaded) */}
              {images.length > 0 && (
                <VStack space="sm">
                  <Text size="xs" className="text-gray-600">Za upload:</Text>
                  <HStack className="flex-wrap gap-2">
                    {images.map((image, index) => (
                      <Box key={index} className="relative w-20 h-20">
                        <Image source={{ uri: image.uri }} className="w-full h-full rounded-lg" />
                        <Pressable
                          className="absolute -top-1 -right-1 bg-red-500 rounded-full w-5 h-5 items-center justify-center"
                          onPress={() => removeImage(index)}
                        >
                          <Ionicons name="close" size={14} color="#fff" />
                        </Pressable>
                      </Box>
                    ))}
                  </HStack>

                  {/* Upload Button */}
                  <Button
                    action="primary"
                    size="md"
                    onPress={handleImageUpload}
                    isDisabled={uploadingImages}
                    className="rounded-2xl"
                  >
                    {uploadingImages ? (
                      <HStack space="sm" className="items-center">
                        <ActivityIndicator size="small" color="#fff" />
                        <ButtonText>{uploadProgress}%</ButtonText>
                      </HStack>
                    ) : (
                      <HStack space="sm" className="items-center">
                        <Ionicons name="cloud-upload" size={18} color="#fff" />
                        <ButtonText>Upload ({images.length})</ButtonText>
                      </HStack>
                    )}
                  </Button>
                </VStack>
              )}

              {/* Pending Sync Images (waiting for internet connection) */}
              {pendingSyncImages.length > 0 && (
                <VStack space="sm" className="bg-amber-50 rounded-xl p-3 border border-amber-200">
                  <HStack space="xs" className="items-center">
                    <Ionicons name="cloud-offline" size={16} color="#f59e0b" />
                    <Text size="xs" bold className="text-amber-700">Čeka sinhronizaciju ({pendingSyncImages.length}):</Text>
                  </HStack>
                  <HStack className="flex-wrap gap-2">
                    {pendingSyncImages.map((image, index) => (
                      <Box key={index} className="relative w-20 h-20">
                        <Image source={{ uri: image.uri }} className="w-full h-full rounded-lg" />
                        <Box className="absolute top-0 right-0 bg-amber-500 rounded-full w-4 h-4 items-center justify-center">
                          <Ionicons name="time" size={10} color="#fff" />
                        </Box>
                        <Pressable
                          className="absolute -top-1 -right-1 bg-red-500 rounded-full w-5 h-5 items-center justify-center"
                          onPress={() => removePendingSyncImage(index)}
                        >
                          <Ionicons name="close" size={14} color="#fff" />
                        </Pressable>
                      </Box>
                    ))}
                  </HStack>
                  <Text size="xs" className="text-amber-600 italic">
                    Ove slike će biti upload-ovane kada se povežete na internet
                  </Text>
                </VStack>
              )}

              {/* Uploaded Images */}
              {uploadedImages.length > 0 && (
                <VStack space="sm">
                  <Text size="xs" className="text-gray-600">Uploadovane slike ({uploadedImages.length}):</Text>
                  <HStack className="flex-wrap gap-2">
                    {uploadedImages.map((imageUrl, index) => {
                      // Handle both string URLs and objects with url/uri properties
                      const imageUri = typeof imageUrl === 'string' ? imageUrl : (imageUrl.url || imageUrl.uri);
                      return (
                        <Pressable
                          key={index}
                          onPress={() => {
                            setSelectedImage(imageUri);
                            setShowImageModal(true);
                          }}
                          className="relative w-20 h-20"
                        >
                          <Image source={{ uri: imageUri }} className="w-full h-full rounded-lg" />
                          <Box className="absolute top-0 right-0 bg-green-500 rounded-full w-4 h-4 items-center justify-center">
                            <Ionicons name="checkmark" size={10} color="#fff" />
                          </Box>
                        </Pressable>
                      );
                    })}
                  </HStack>
                </VStack>
              )}
            </VStack>
          </Box>
        )}

        {/* Admin Comment */}
        {workOrder.adminComment && (
          <Box className="bg-red-50 mt-3 p-4 border-l-4 border-red-500">
            <VStack space="sm">
              <HStack space="xs" className="items-center">
                <Ionicons name="alert-circle" size={18} color="#ef4444" />
                <Text size="xs" bold className="text-red-700 uppercase tracking-wide">Napomena administracije</Text>
              </HStack>
              <Text size="sm" className="text-red-700">{workOrder.adminComment}</Text>
            </VStack>
          </Box>
        )}
      </ScrollView>

      {/* Bottom Action Bar */}
      {!isCompleted && (
        <Box className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200" style={{ paddingBottom: insets.bottom }}>
          <VStack space="sm" className="p-4">
            <Button
              action="primary"
              size="lg"
              onPress={handleComplete}
              isDisabled={saving}
              className="w-full rounded-2xl py-4"
            >
              {saving ? (
                <ButtonSpinner />
              ) : (
                <HStack space="sm" className="items-center">
                  <Ionicons name="checkmark-circle" size={22} color="#fff" />
                  <ButtonText className="text-base">Završi radni nalog</ButtonText>
                </HStack>
              )}
            </Button>
            <Pressable
              onPress={() => setShowStatusModal(true)}
              className="bg-gray-100 rounded-2xl py-3.5 active:bg-gray-200"
            >
              <HStack space="sm" className="items-center justify-center">
                <Ionicons name="ellipsis-horizontal" size={20} color="#6b7280" />
                <Text size="sm" bold className="text-gray-700">Druge opcije</Text>
              </HStack>
            </Pressable>
          </VStack>
        </Box>
      )}

      {/* Equipment Modal */}
      <Modal visible={showEquipmentModal} animationType="slide" transparent onRequestClose={() => setShowEquipmentModal(false)}>
        <Pressable onPress={() => setShowEquipmentModal(false)} className="flex-1 bg-black/50 justify-end">
          <Pressable onPress={(e) => e.stopPropagation()} className="bg-white rounded-t-3xl">
            <VStack className="p-4 pb-8">
              <HStack className="items-center justify-between mb-4">
                <Heading size="lg" className="text-gray-900">Dodaj opremu</Heading>
                <Pressable onPress={() => setShowEquipmentModal(false)} className="w-10 h-10 items-center justify-center">
                  <Ionicons name="close" size={28} color="#9ca3af" />
                </Pressable>
              </HStack>
              <FlatList
                data={availableEquipment}
                keyExtractor={(item) => item._id}
                style={{ maxHeight: 400 }}
                renderItem={({ item }) => (
                  <Pressable
                    className={`p-4 rounded-xl mb-2 ${selectedEquipment === item._id ? 'bg-blue-50 border-2 border-blue-500' : 'bg-gray-50'}`}
                    onPress={() => setSelectedEquipment(item._id)}
                  >
                    <VStack space="xs">
                      <Text size="md" bold className="text-gray-900">{item.description}</Text>
                      <Text size="sm" className="text-gray-500">S/N: {item.serialNumber}</Text>
                    </VStack>
                  </Pressable>
                )}
                ListEmptyComponent={
                  <Center className="p-12">
                    <Ionicons name="cube-outline" size={48} color="#d1d5db" />
                    <Text size="sm" className="text-gray-400 mt-4">Nema dostupne opreme</Text>
                  </Center>
                }
              />
              <Button
                action="primary"
                size="lg"
                onPress={handleAddEquipment}
                className="mt-4 rounded-2xl py-4"
                isDisabled={!selectedEquipment}
              >
                <ButtonText>Dodaj opremu</ButtonText>
              </Button>
            </VStack>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Materials Modal */}
      <Modal visible={showMaterialsModal} animationType="slide" transparent onRequestClose={() => setShowMaterialsModal(false)}>
        <Pressable onPress={() => setShowMaterialsModal(false)} className="flex-1 bg-black/50 justify-end">
          <Pressable onPress={(e) => e.stopPropagation()} className="bg-white rounded-t-3xl">
            <VStack className="p-4 pb-8">
              <HStack className="items-center justify-between mb-4">
                <Heading size="lg" className="text-gray-900">Dodaj materijal</Heading>
                <Pressable onPress={() => setShowMaterialsModal(false)} className="w-10 h-10 items-center justify-center">
                  <Ionicons name="close" size={28} color="#9ca3af" />
                </Pressable>
              </HStack>
              <FlatList
                data={availableMaterials}
                keyExtractor={(item) => item._id || item.type}
                style={{ maxHeight: 300 }}
                renderItem={({ item }) => (
                  <Pressable
                    className={`p-4 rounded-xl mb-2 ${selectedMaterial === item._id ? 'bg-blue-50 border-2 border-blue-500' : 'bg-gray-50'}`}
                    onPress={() => setSelectedMaterial(item._id)}
                  >
                    <HStack className="items-center justify-between">
                      <VStack className="flex-1">
                        <Text size="md" bold className="text-gray-900">{item.type || item.name}</Text>
                        <Text size="sm" className="text-gray-500">Dostupno: {item.quantity}</Text>
                      </VStack>
                    </HStack>
                  </Pressable>
                )}
                ListEmptyComponent={
                  <Center className="p-12">
                    <Ionicons name="cube-outline" size={48} color="#d1d5db" />
                    <Text size="sm" className="text-gray-400 mt-4">Nema dostupnih materijala</Text>
                  </Center>
                }
              />
              <VStack space="md" className="mt-4">
                <Input variant="outline" size="lg" className="bg-gray-50">
                  <InputField
                    placeholder="Količina"
                    value={materialQuantity}
                    onChangeText={setMaterialQuantity}
                    keyboardType="numeric"
                  />
                </Input>
                <Button
                  action="primary"
                  size="lg"
                  onPress={handleAddMaterial}
                  className="rounded-2xl py-4"
                  isDisabled={!selectedMaterial || !materialQuantity}
                >
                  <ButtonText>Dodaj materijal</ButtonText>
                </Button>
              </VStack>
            </VStack>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Remove Equipment Modal */}
      <Modal visible={showRemoveEquipmentModal} animationType="slide" transparent onRequestClose={() => setShowRemoveEquipmentModal(false)}>
        <Pressable onPress={() => setShowRemoveEquipmentModal(false)} className="flex-1 bg-black/50 justify-end">
          <Pressable onPress={(e) => e.stopPropagation()} className="bg-white rounded-t-3xl p-6 pb-8">
            <HStack className="items-center justify-between mb-6">
              <Heading size="lg" className="text-gray-900">Ukloni opremu</Heading>
              <Pressable onPress={() => setShowRemoveEquipmentModal(false)}>
                <Ionicons name="close" size={28} color="#9ca3af" />
              </Pressable>
            </HStack>
            <VStack space="md">
              <Box className="bg-gray-50 border border-gray-300 rounded-xl p-3" style={{ minHeight: 124 }}>
                <InputField
                  placeholder="Razlog uklanjanja opreme..."
                  value={removeReason}
                  onChangeText={setRemoveReason}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  style={{ minHeight: 100, height: 100 }}
                />
              </Box>
              <Button
                action="negative"
                size="lg"
                onPress={handleRemoveEquipment}
                className="rounded-2xl py-4"
                isDisabled={!removeReason}
              >
                <ButtonText>Ukloni opremu</ButtonText>
              </Button>
            </VStack>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Status Modal */}
      <Modal visible={showStatusModal} animationType="slide" transparent onRequestClose={() => setShowStatusModal(false)}>
        <Pressable onPress={() => setShowStatusModal(false)} className="flex-1 bg-black/50 justify-end">
          <Pressable onPress={(e) => e.stopPropagation()} className="bg-white rounded-t-3xl p-6 pb-8">
            <HStack className="items-center justify-between mb-6">
              <Heading size="lg" className="text-gray-900">Promeni status</Heading>
              <Pressable onPress={() => setShowStatusModal(false)}>
                <Ionicons name="close" size={28} color="#9ca3af" />
              </Pressable>
            </HStack>
            <VStack space="sm">
              <Pressable
                onPress={() => {
                  setShowStatusModal(false);
                  setTimeout(() => Alert.prompt('Odlaganje naloga', 'Unesite razlog odlaganja:', text => {
                    setPostponeComment(text);
                    handlePostpone();
                  }), 300);
                }}
                className="bg-yellow-500 rounded-2xl py-4 active:bg-yellow-600"
              >
                <HStack space="sm" className="items-center justify-center">
                  <Ionicons name="pause-circle" size={22} color="#fff" />
                  <Text size="md" bold className="text-white">Odloži nalog</Text>
                </HStack>
              </Pressable>
              <Pressable
                onPress={() => {
                  setShowStatusModal(false);
                  setTimeout(() => Alert.prompt('Otkazivanje naloga', 'Unesite razlog otkazivanja:', text => {
                    setCancelComment(text);
                    handleCancel();
                  }), 300);
                }}
                className="bg-red-500 rounded-2xl py-4 active:bg-red-600"
              >
                <HStack space="sm" className="items-center justify-center">
                  <Ionicons name="close-circle" size={22} color="#fff" />
                  <Text size="md" bold className="text-white">Otkaži nalog</Text>
                </HStack>
              </Pressable>
            </VStack>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Remove by Serial Modal */}
      <Modal visible={showRemoveBySerialModal} animationType="slide" transparent onRequestClose={() => setShowRemoveBySerialModal(false)}>
        <Pressable onPress={() => setShowRemoveBySerialModal(false)} className="flex-1 bg-black/50 justify-end">
          <Pressable onPress={(e) => e.stopPropagation()} className="bg-white rounded-t-3xl p-6 pb-8">
            <ScrollView showsVerticalScrollIndicator={false}>
              <HStack className="items-center justify-between mb-6">
                <Heading size="lg" className="text-gray-900">Ukloni opremu po SN</Heading>
                <Pressable onPress={() => setShowRemoveBySerialModal(false)}>
                  <Ionicons name="close" size={28} color="#9ca3af" />
                </Pressable>
              </HStack>
              <VStack space="md">
                <VStack space="xs">
                  <Text size="sm" bold className="text-gray-700">Naziv opreme</Text>
                  <Input variant="outline" size="lg" className="bg-gray-50">
                    <InputField
                      placeholder="Unesite naziv opreme..."
                      value={removalEquipmentName}
                      onChangeText={setRemovalEquipmentName}
                    />
                  </Input>
                </VStack>

                <VStack space="xs">
                  <Text size="sm" bold className="text-gray-700">Serijski broj</Text>
                  <Input variant="outline" size="lg" className="bg-gray-50">
                    <InputField
                      placeholder="Unesite serijski broj..."
                      value={removalSerialNumber}
                      onChangeText={setRemovalSerialNumber}
                    />
                  </Input>
                </VStack>

                <VStack space="xs">
                  <Text size="sm" bold className="text-gray-700">Stanje opreme</Text>
                  <HStack space="sm">
                    <Pressable
                      onPress={() => setRemovalCondition('ispravna')}
                      className={`flex-1 p-4 rounded-xl border-2 ${
                        removalCondition === 'ispravna'
                          ? 'bg-green-50 border-green-500'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <HStack space="sm" className="items-center justify-center">
                        <Ionicons
                          name={removalCondition === 'ispravna' ? 'checkmark-circle' : 'checkmark-circle-outline'}
                          size={20}
                          color={removalCondition === 'ispravna' ? '#10b981' : '#9ca3af'}
                        />
                        <Text
                          size="sm"
                          bold
                          className={removalCondition === 'ispravna' ? 'text-green-700' : 'text-gray-600'}
                        >
                          Ispravna
                        </Text>
                      </HStack>
                    </Pressable>
                    <Pressable
                      onPress={() => setRemovalCondition('neispravna')}
                      className={`flex-1 p-4 rounded-xl border-2 ${
                        removalCondition === 'neispravna'
                          ? 'bg-red-50 border-red-500'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <HStack space="sm" className="items-center justify-center">
                        <Ionicons
                          name={removalCondition === 'neispravna' ? 'close-circle' : 'close-circle-outline'}
                          size={20}
                          color={removalCondition === 'neispravna' ? '#ef4444' : '#9ca3af'}
                        />
                        <Text
                          size="sm"
                          bold
                          className={removalCondition === 'neispravna' ? 'text-red-700' : 'text-gray-600'}
                        >
                          Neispravna
                        </Text>
                      </HStack>
                    </Pressable>
                  </HStack>
                </VStack>

                <Button
                  action="negative"
                  size="lg"
                  onPress={handleRemoveBySerial}
                  className="mt-4 rounded-2xl py-4"
                  isDisabled={saving || !removalEquipmentName.trim() || !removalSerialNumber.trim()}
                >
                  {saving ? (
                    <ButtonSpinner />
                  ) : (
                    <HStack space="sm" className="items-center">
                      <Ionicons name="trash" size={20} color="#fff" />
                      <ButtonText>Ukloni opremu</ButtonText>
                    </HStack>
                  )}
                </Button>
              </VStack>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Image View Modal */}
      <Modal visible={showImageModal} animationType="fade" transparent onRequestClose={() => setShowImageModal(false)}>
        <Pressable onPress={() => setShowImageModal(false)} className="flex-1 bg-black/90 justify-center">
          <VStack space="md" className="p-4">
            <HStack className="justify-between items-center">
              <Pressable
                onPress={() => {
                  setShowImageModal(false);
                  if (selectedImage) {
                    handleImageDelete(selectedImage);
                  }
                }}
                className="bg-red-500 rounded-full p-3"
              >
                <Ionicons name="trash" size={24} color="#fff" />
              </Pressable>
              <Pressable
                onPress={() => setShowImageModal(false)}
                className="bg-gray-700 rounded-full p-3"
              >
                <Ionicons name="close" size={24} color="#fff" />
              </Pressable>
            </HStack>
            {selectedImage && (
              <Image
                source={{ uri: selectedImage }}
                style={{ width: '100%', height: '80%' }}
                resizeMode="contain"
              />
            )}
          </VStack>
        </Pressable>
      </Modal>
    </Box>
  );
}
