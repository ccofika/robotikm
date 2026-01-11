



import React, { useState, useEffect, useContext } from 'react';
import { View, ScrollView, Pressable, Alert, Image, Linking, Platform, Modal, FlatList, ActivityIndicator, KeyboardAvoidingView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
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

// Equipment categories for dismount dropdown
const EQUIPMENT_CATEGORIES = [
  'STB',
  'Cam Modul',
  'Hybrid',
  'OTT tv po tvom',
  'Smart Card',
  'HFC Modem',
  'GPON Modem',
  'ATV',
  'PON',
  'M-Cam Modul',
  'M-Smart Card',
  'M-HFC Modem',
  'M-GPON Modem',
  'M-ATV',
  'M-STB',
  'M-OTT tv po tvom',
  'M-Hybrid',
  'M-PON',
];

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
  const [equipmentSearchTerm, setEquipmentSearchTerm] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [materialQuantity, setMaterialQuantity] = useState('');
  const [removeEquipmentId, setRemoveEquipmentId] = useState('');
  const [removeReason, setRemoveReason] = useState('');

  // Postpone & Cancel states
  const [showPostponeModal, setShowPostponeModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [postponeDate, setPostponeDate] = useState(new Date());
  const [postponeTime, setPostponeTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [postponeComment, setPostponeComment] = useState('');
  const [cancelComment, setCancelComment] = useState('');

  // Serial removal states
  const [removalEquipmentName, setRemovalEquipmentName] = useState('');
  const [removalEquipmentDescription, setRemovalEquipmentDescription] = useState('');
  const [removalSerialNumber, setRemovalSerialNumber] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

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
      // Prvo dodaj sve slike u queue (autoProcess = false da ne poziva processQueue nakon svake)
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        console.log(`[ImageUpload] Adding image ${i + 1}/${images.length} to queue`);

        // Dodaj u queue (autoProcess = false ne poziva processQueue još)
        await dataRepository.uploadWorkOrderImage(orderId, image.uri, user._id, false);

        // Update progress za dodavanje u queue
        setUploadProgress(Math.round(((i + 1) / images.length) * 50)); // Prva polovina progress bara
      }

      console.log(`[ImageUpload] All ${images.length} images added to queue`);

      // Ako je offline, prebaci slike u pendingSyncImages
      if (!isOnline) {
        setPendingSyncImages([...pendingSyncImages, ...images]);

        // Clear local images
        setImages([]);
        setUploadProgress(100);

        Alert.alert('Uspešno', 'Slike će biti uploadovane kada se povežete na internet');
      } else {
        // Ako je online, procesuj queue i čekaj da se sve slike upload-uju
        console.log('[ImageUpload] Starting queue processing...');

        // Ručno procesuj sve slike iz queue-a
        const syncQueue = require('../services/syncQueue').default;

        // Čekaj da se trenutno procesiranje završi ako je u toku
        let waitAttempts = 0;
        const maxWaitAttempts = 10; // max 10 sekundi čekanja da prethodno procesiranje završi
        while (syncQueue.isProcessing && waitAttempts < maxWaitAttempts) {
          console.log('[ImageUpload] Queue already processing, waiting...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          waitAttempts++;
        }

        console.log('[ImageUpload] Starting processQueue...');
        // Procesuj queue - ovo će uploadovati sve slike sekvencijalno
        await syncQueue.processQueue();

        console.log('[ImageUpload] processQueue completed, checking results...');

        // Proveri queue da vidimo koliko je uspešno upload-ovano
        const finalQueue = await syncQueue.getQueue();
        const remainingImages = finalQueue.filter(item =>
          item.type === 'UPLOAD_IMAGE' &&
          item.data.workOrderId === orderId &&
          (item.status === 'pending' || item.status === 'failed')
        );

        console.log(`[ImageUpload] Queue check - Remaining in queue: ${remainingImages.length}`);
        console.log(`[ImageUpload] Total images attempted: ${images.length}`);

        // VAŽNO: Prvo refresh work order sa servera da vidimo stvarni broj slika
        const imagesBefore = workOrder?.images?.length || 0;
        console.log(`[ImageUpload] Images before upload: ${imagesBefore}`);

        // Učitaj fresh podatke direktno sa servera
        console.log('[ImageUpload] Fetching fresh work order data...');
        const freshOrder = await dataRepository.getWorkOrder(user._id, orderId, true); // force=true za server refresh
        const imagesAfter = freshOrder?.images?.length || 0;
        const actualUploaded = imagesAfter - imagesBefore;

        console.log(`[ImageUpload] Images after upload: ${imagesAfter}`);
        console.log(`[ImageUpload] Actually uploaded: ${actualUploaded}/${images.length}`);

        // Ažuriraj UI sa fresh podacima
        await fetchWorkOrder();

        // Clear local images
        setImages([]);
        setUploadProgress(100);

        // Prikaži rezultat baziran na stvarnom broju upload-ovanih slika
        if (actualUploaded === images.length && remainingImages.length === 0) {
          Alert.alert('Uspešno', `Sve slike (${images.length}) su uspešno uploadovane!`);
        } else if (actualUploaded > 0) {
          Alert.alert(
            'Delimično uspešno',
            `Upload-ovano ${actualUploaded} od ${images.length} slika.${remainingImages.length > 0 ? ` ${remainingImages.length} slika nije uspelo.` : ''}`
          );
        } else {
          Alert.alert('Greška', 'Nijedna slika nije uspešno uploadovana. Pokušajte ponovo.');
        }
      }
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
              setShowImageModal(false);

              // Handle both string URLs and objects with url/uri properties
              const imageUri = typeof imageUrl === 'string' ? imageUrl : (imageUrl.url || imageUrl.uri);

              // Koristi dataRepository za offline-first pristup
              await dataRepository.deleteWorkOrderImage(user._id, orderId, imageUri);

              // Refresh work order data
              await fetchWorkOrder();

              const message = isOnline
                ? 'Slika je obrisana'
                : 'Slika je označena za brisanje i biće obrisana kada se povežete na internet';

              Alert.alert('Uspešno', message);
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
      setEquipmentSearchTerm('');
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
    if (!removalEquipmentName.trim() || !removalEquipmentDescription.trim() || !removalSerialNumber.trim()) {
      Alert.alert('Greška', 'Morate popuniti naziv opreme, opis i serijski broj');
      return;
    }

    setSaving(true);

    try {
      // Koristi dataRepository za offline-first uklanjanje opreme po serijskom broju
      const result = await dataRepository.removeEquipmentBySerial(orderId, {
        technicianId: user._id,
        equipmentName: removalEquipmentName,
        equipmentDescription: removalEquipmentDescription,
        serialNumber: removalSerialNumber
      });

      // Proveri da li je oprema već uklonjena
      if (result.alreadyRemoved) {
        Alert.alert('Obaveštenje', result.message || 'Ova oprema je već uklonjena u ovom radnom nalogu');

        // Reset form i zatvori modal
        setRemovalEquipmentName('');
        setRemovalEquipmentDescription('');
        setRemovalSerialNumber('');
        setShowRemoveBySerialModal(false);

        // Refresh data da prikažemo trenutno stanje
        fetchWorkOrder();
        return;
      }

      const message = isOnline
        ? 'Oprema je uspešno uklonjena'
        : 'Oprema je uklonjena i biće sinhronizovana kada se povežete na internet';

      Alert.alert('Uspešno', message);

      // Reset form
      setRemovalEquipmentName('');
      setRemovalEquipmentDescription('');
      setRemovalSerialNumber('');
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

  const handleUndoRemoval = async (serialNumber) => {
    Alert.alert(
      'Potvrda',
      'Da li ste sigurni da želite da poništite demontažu ove opreme?',
      [
        { text: 'Odustani', style: 'cancel' },
        {
          text: 'Potvrdi',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              const response = await userEquipmentAPI.undoRemoval(orderId, serialNumber, user._id);

              // Instant UI update - ukloni opremu iz lokalnog state-a
              setRemovedEquipment(prev => prev.filter(eq => eq.serialNumber?.toLowerCase() !== serialNumber?.toLowerCase()));

              const actionMessage = response.data.action === 'deleted'
                ? 'Oprema je obrisana iz sistema'
                : response.data.action === 'restored'
                ? 'Oprema je vraćena korisniku'
                : 'Oprema je uklonjena iz evidencije';

              Alert.alert('Uspešno', actionMessage);

              // Background refresh za sinhronizaciju sa serverom
              fetchWorkOrder();
            } catch (error) {
              console.error('Greška pri poništavanju demontaže:', error);
              const errorMessage = error.response?.data?.error || error.message || 'Neuspešno poništavanje demontaže';
              Alert.alert('Greška', errorMessage);
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  const handleAddMaterial = async () => {
    if (!selectedMaterial || !materialQuantity) {
      Alert.alert('Greška', 'Unesite materijal i količinu');
      return;
    }

    try {
      // Pronađi ceo objekat materijala iz availableMaterials
      const materialObject = availableMaterials.find(m => m._id === selectedMaterial);

      console.log('[Materials] Adding material:', {
        selectedMaterial,
        materialObject,
        availableMaterialsCount: availableMaterials.length
      });

      if (!materialObject) {
        Alert.alert('Greška', 'Materijal nije pronađen');
        return;
      }

      // Pronađi postojeći materijal ili dodaj novi
      const existingMaterialIndex = usedMaterials.findIndex(
        mat => (mat.material === selectedMaterial || mat.materialId === selectedMaterial || mat.material?._id === selectedMaterial)
      );

      let updatedMaterials;
      if (existingMaterialIndex !== -1) {
        // Ažuriraj postojeći materijal
        updatedMaterials = [...usedMaterials];
        updatedMaterials[existingMaterialIndex] = {
          ...updatedMaterials[existingMaterialIndex],
          material: selectedMaterial,
          materialId: selectedMaterial,
          name: materialObject.name,
          type: materialObject.type,
          quantity: updatedMaterials[existingMaterialIndex].quantity + parseInt(materialQuantity)
        };
      } else {
        // Dodaj novi materijal sa svim informacijama
        updatedMaterials = [
          ...usedMaterials,
          {
            material: selectedMaterial,
            materialId: selectedMaterial,
            name: materialObject.name,
            type: materialObject.type,
            quantity: parseInt(materialQuantity)
          }
        ];
      }

      console.log('[Materials] Updated materials:', updatedMaterials);

      // Koristi dataRepository za offline-first ažuriranje
      await dataRepository.updateUsedMaterials(user._id, orderId, updatedMaterials);

      const message = isOnline
        ? 'Materijal je dodat'
        : 'Materijal je dodat i biće sinhronizovan kada se povežete na internet';

      console.log('[Materials] Material added successfully');
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
              console.log('[Materials] Removing material:', materialToRemove);

              // Ukloni materijal iz liste
              const updatedMaterials = usedMaterials.filter(
                mat => (mat.material || mat.materialId) !== (materialToRemove.material || materialToRemove.materialId)
              );

              console.log('[Materials] Materials after removal:', updatedMaterials);

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
    // Validacija komentara
    if (!postponeComment || postponeComment.trim() === '') {
      Alert.alert('Greška', 'Morate uneti razlog odlaganja radnog naloga');
      return;
    }

    // Kombinuj datum i vreme
    const selectedDateTime = new Date(postponeDate);
    selectedDateTime.setHours(postponeTime.getHours(), postponeTime.getMinutes(), 0, 0);

    // Validacija maksimalnog odlaganja (48 sati)
    const now = new Date();
    const maxPostponeDate = new Date(now.getTime() + (48 * 60 * 60 * 1000)); // 48 sati u budućnosti

    if (selectedDateTime > maxPostponeDate) {
      Alert.alert('Greška', 'Radni nalog može biti odložen maksimalno 48 sati. Za duže odlaganje molimo otkažite radni nalog.');
      return;
    }

    if (selectedDateTime < now) {
      Alert.alert('Greška', 'Datum i vreme odlaganja moraju biti u budućnosti');
      return;
    }

    setSaving(true);
    try {
      const formattedDate = postponeDate.toISOString().split('T')[0];
      const formattedTime = `${String(postponeTime.getHours()).padStart(2, '0')}:${String(postponeTime.getMinutes()).padStart(2, '0')}`;

      await dataRepository.updateWorkOrder(user._id, orderId, {
        status: 'odlozen',
        postponeDate: formattedDate,
        postponeTime: formattedTime,
        postponeComment: postponeComment.trim(),
        comment
      });

      const message = isOnline
        ? 'Radni nalog je odložen'
        : 'Radni nalog je označen kao odložen i biće sinhronizovan kada se povežete na internet';

      Alert.alert('Uspešno', message, [
        { text: 'OK', onPress: () => {
          setShowPostponeModal(false);
          navigation.goBack();
        }}
      ]);
    } catch (error) {
      console.error('Greška pri odlaganju radnog naloga:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Neuspešno odlaganje radnog naloga';
      Alert.alert('Greška', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    // Validacija komentara
    if (!cancelComment || cancelComment.trim() === '') {
      Alert.alert('Greška', 'Morate uneti razlog otkazivanja radnog naloga');
      return;
    }

    setSaving(true);
    try {
      await dataRepository.updateWorkOrder(user._id, orderId, {
        status: 'otkazan',
        cancelComment: cancelComment.trim(),
        comment
      });

      const message = isOnline
        ? 'Radni nalog je otkazan'
        : 'Radni nalog je označen kao otkazan i biće sinhronizovan kada se povežete na internet';

      Alert.alert('Uspešno', message, [
        { text: 'OK', onPress: () => {
          setShowCancelModal(false);
          navigation.goBack();
        }}
      ]);
    } catch (error) {
      console.error('Greška pri otkazivanju radnog naloga:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Neuspešno otkazivanje radnog naloga';
      Alert.alert('Greška', errorMessage);
    } finally {
      setSaving(false);
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
        return { label: 'Završen', icon: 'checkmark-circle', color: '#059669', bgColor: '#d1fae5' };
      case 'odlozen':
        return { label: 'Odložen', icon: 'pause-circle', color: '#d97706', bgColor: '#fef3c7' };
      case 'otkazan':
        return { label: 'Otkazan', icon: 'close-circle', color: '#dc2626', bgColor: '#fee2e2' };
      default:
        return { label: 'U toku', icon: 'time', color: '#2563eb', bgColor: '#dbeafe' };
    }
  };

  const statusInfo = getStatusInfo();

  const availableEquipment = technicianEquipment.filter(eq => {
    const assignedToMatch = eq.assignedTo === user._id || eq.assignedTo?._id === user._id;
    const statusMatch = eq.status === 'assigned';
    const notAssignedToUser = !eq.assignedToUser;

    return assignedToMatch && statusMatch && notAssignedToUser;
  });

  const filteredAvailableEquipment = availableEquipment.filter(eq => {
    if (!equipmentSearchTerm) return true;
    const searchLower = equipmentSearchTerm.toLowerCase();
    return (
      eq.description?.toLowerCase().includes(searchLower) ||
      eq.serialNumber?.toLowerCase().includes(searchLower) ||
      eq.category?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top,
          paddingBottom: insets.bottom
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Modern Header with Status */}
        <View style={{
          backgroundColor: '#ffffff',
          paddingTop: 12,
          paddingBottom: 16,
          paddingHorizontal: 20,
          borderBottomWidth: 1,
          borderBottomColor: '#e5e7eb',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 3,
        }}>
          {/* Status Badge - Pill Shape */}
          <View style={{
            backgroundColor: statusInfo.bgColor,
            alignSelf: 'flex-start',
            paddingHorizontal: 14,
            paddingVertical: 7,
            borderRadius: 20,
            marginBottom: 12,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name={statusInfo.icon} size={16} color={statusInfo.color} style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: statusInfo.color }}>
                {statusInfo.label}
              </Text>
            </View>
          </View>

          {/* Municipality and Metadata */}
          <Text style={{ fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 8 }}>
            {workOrder.municipality}
          </Text>

          {/* Details i Tip instalacije */}
          {workOrder.details && (
            <View style={{ marginBottom: 8 }}>
              <Text style={{ fontSize: 13, color: '#374151', lineHeight: 20 }}>
                {workOrder.details}
              </Text>
            </View>
          )}
          {workOrder.installationType && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="settings-outline" size={14} color="#9ca3af" style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 12, color: '#6b7280', fontWeight: '500' }}>
                {workOrder.installationType}
              </Text>
            </View>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
              <Ionicons name="calendar-outline" size={15} color="#6b7280" style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 13, color: '#6b7280', fontWeight: '500' }}>
                {new Date(workOrder.date).toLocaleDateString('sr-RS', { day: '2-digit', month: 'short', year: 'numeric' })}
              </Text>
            </View>
            {workOrder.time && (
              <>
                <Text style={{ fontSize: 13, color: '#d1d5db', marginHorizontal: 6 }}>•</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="time-outline" size={15} color="#6b7280" style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 13, color: '#6b7280', fontWeight: '500' }}>{workOrder.time}</Text>
                </View>
              </>
            )}
          </View>
        </View>
        {/* Location Section - Modern Card */}
        <View style={{
          backgroundColor: '#ffffff',
          marginHorizontal: 20,
          marginTop: 16,
          padding: 18,
          borderRadius: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 3,
          elevation: 2,
          borderWidth: 1,
          borderColor: '#f3f4f6',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
            <View style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: '#eff6ff',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}>
              <Ionicons name="location" size={22} color="#2563eb" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 2 }}>
                {workOrder.address}
              </Text>
              <Text style={{ fontSize: 13, color: '#6b7280', fontWeight: '500', marginBottom: (workOrder.tisId || workOrder.installationType) ? 4 : 0 }}>
                {workOrder.type}
              </Text>
              {workOrder.tisId && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: workOrder.installationType ? 4 : 0 }}>
                  <Ionicons name="finger-print-outline" size={12} color="#9ca3af" style={{ marginRight: 4 }} />
                  <Text style={{ fontSize: 12, color: '#9ca3af', fontWeight: '500' }}>
                    TIS ID: {workOrder.tisId}
                  </Text>
                </View>
              )}
              {workOrder.installationType && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="settings-outline" size={12} color="#9ca3af" style={{ marginRight: 4 }} />
                  <Text style={{ fontSize: 12, color: '#9ca3af', fontWeight: '500' }}>
                    Tip instalacije: {workOrder.installationType}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <Pressable
            onPress={() => openMaps(workOrder.address, workOrder.municipality)}
            style={{
              backgroundColor: '#2563eb',
              borderRadius: 12,
              paddingVertical: 14,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="navigate" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#ffffff' }}>
              Otvori navigaciju
            </Text>
          </Pressable>
        </View>

        {/* Contact Section - Modern Card */}
        {(workOrder.userName || workOrder.userPhone) && (
          <View style={{
            backgroundColor: '#ffffff',
            marginHorizontal: 20,
            marginTop: 12,
            padding: 18,
            borderRadius: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 3,
            elevation: 2,
            borderWidth: 1,
            borderColor: '#f3f4f6',
          }}>
            {workOrder.userName && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: workOrder.userPhone ? 14 : 0 }}>
                <View style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: '#f9fafb',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}>
                  <Ionicons name="person" size={22} color="#6b7280" />
                </View>
                <Text style={{ fontSize: 15, fontWeight: '500', color: '#111827' }}>
                  {workOrder.userName}
                </Text>
              </View>
            )}
            {workOrder.userPhone && (
              <Pressable
                onPress={() => makePhoneCall(workOrder.userPhone)}
                style={{
                  backgroundColor: '#059669',
                  borderRadius: 12,
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="call" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#ffffff' }}>
                  {workOrder.userPhone}
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Details Section - Modern Card */}
        {workOrder.details && (
          <View style={{
            backgroundColor: '#ffffff',
            marginHorizontal: 20,
            marginTop: 12,
            padding: 18,
            borderRadius: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 3,
            elevation: 2,
            borderWidth: 1,
            borderColor: '#f3f4f6',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <View style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: '#eff6ff',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}>
                <Ionicons name="information-circle" size={22} color="#2563eb" />
              </View>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>
                Detalji naloga
              </Text>
            </View>
            <View style={{
              backgroundColor: '#eff6ff',
              borderRadius: 12,
              padding: 14,
              borderWidth: 1,
              borderColor: '#dbeafe',
            }}>
              <Text style={{ fontSize: 14, color: '#1e3a8a', lineHeight: 20 }}>
                {workOrder.details}
              </Text>
            </View>
          </View>
        )}

        {/* Equipment Section - Modern Card */}
        {!isCompleted && (
          <View style={{
            backgroundColor: '#ffffff',
            marginHorizontal: 20,
            marginTop: 12,
            padding: 18,
            borderRadius: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 3,
            elevation: 2,
            borderWidth: 1,
            borderColor: '#f3f4f6',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
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
                  <Ionicons name="hardware-chip" size={22} color="#9333ea" />
                </View>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>
                  Oprema
                </Text>
              </View>
              <View style={{ flexDirection: 'row' }}>
                <Pressable
                  onPress={() => {
                    setShowCategoryDropdown(false);
                    setShowRemoveBySerialModal(true);
                  }}
                  style={{
                    backgroundColor: '#fef2f2',
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    marginRight: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <Ionicons name="build-outline" size={16} color="#dc2626" style={{ marginRight: 4 }} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#dc2626' }}>Demontiraj</Text>
                </Pressable>
                <Pressable
                  onPress={() => setShowEquipmentModal(true)}
                  style={{
                    backgroundColor: '#eff6ff',
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <Ionicons name="add" size={16} color="#2563eb" style={{ marginRight: 4 }} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#2563eb' }}>Dodaj</Text>
                </Pressable>
              </View>
            </View>
            {userEquipment.length > 0 ? (
              <View>
                {userEquipment.map((eq, index) => (
                  <View key={index} style={{
                    backgroundColor: '#f9fafb',
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: index < userEquipment.length - 1 ? 8 : 0,
                    borderWidth: 1,
                    borderColor: '#f3f4f6',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 4 }}>
                        {eq.description}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#6b7280', fontWeight: '500' }}>
                        S/N: {eq.serialNumber}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => {
                        setRemoveEquipmentId(eq.id);
                        setShowRemoveEquipmentModal(true);
                      }}
                      style={{
                        width: 40,
                        height: 40,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginLeft: 8,
                      }}
                    >
                      <Ionicons name="close-circle" size={28} color="#ef4444" />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : (
              <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                <Ionicons name="cube-outline" size={36} color="#d1d5db" style={{ marginBottom: 8 }} />
                <Text style={{ fontSize: 14, color: '#9ca3af', fontStyle: 'italic' }}>
                  Nije dodata oprema
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Removed Equipment Section - Warning Card */}
        {removedEquipment.length > 0 && (
          <View style={{
            backgroundColor: '#ffffff',
            marginHorizontal: 20,
            marginTop: 12,
            padding: 18,
            borderRadius: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 3,
            elevation: 2,
            borderWidth: 2,
            borderColor: '#fdba74',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
              <View style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: '#fed7aa',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}>
                <Ionicons name="warning" size={22} color="#ea580c" />
              </View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#c2410c' }}>
                Uklonjena Oprema
              </Text>
            </View>
            <View>
              {removedEquipment.map((eq, index) => {
                let equipmentName = eq.equipmentType || 'Nepoznata oprema';
                if (eq.notes && eq.notes.includes(' - ')) {
                  const noteParts = eq.notes.split(' - ');
                  if (noteParts.length > 1) {
                    equipmentName = noteParts[1];
                  }
                }
                const serialNumber = eq.serialNumber || 'N/A';
                const removalDate = eq.removedAt || eq.removalDate;

                return (
                  <View key={index} style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: index < removedEquipment.length - 1 ? 8 : 0,
                    borderWidth: 1,
                    borderColor: '#fed7aa',
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', flex: 1 }}>
                        {equipmentName}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{
                          backgroundColor: eq.condition === 'neispravna' ? '#fee2e2' : '#d1fae5',
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 8,
                          marginRight: !isCompleted ? 8 : 0,
                        }}>
                          <Text style={{
                            fontSize: 11,
                            fontWeight: '700',
                            color: eq.condition === 'neispravna' ? '#dc2626' : '#059669',
                          }}>
                            {eq.condition === 'neispravna' ? 'Neispravna' : 'Ispravna'}
                          </Text>
                        </View>
                        {!isCompleted && (
                          <Pressable
                            onPress={() => handleUndoRemoval(eq.serialNumber)}
                            disabled={saving}
                            style={{
                              backgroundColor: '#fef2f2',
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 8,
                              opacity: saving ? 0.5 : 1,
                            }}
                          >
                            <Ionicons name="close-circle" size={18} color="#dc2626" />
                          </Pressable>
                        )}
                      </View>
                    </View>
                    <Text style={{ fontSize: 12, color: '#6b7280', fontWeight: '500', marginBottom: 2 }}>
                      S/N: {serialNumber}
                    </Text>
                    {removalDate && (
                      <Text style={{ fontSize: 12, color: '#9ca3af', fontWeight: '500' }}>
                        {new Date(removalDate).toLocaleDateString('sr-RS')}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Materials Section - Modern Card */}
        {!isCompleted && (
          <View style={{
            backgroundColor: '#ffffff',
            marginHorizontal: 20,
            marginTop: 12,
            padding: 18,
            borderRadius: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 3,
            elevation: 2,
            borderWidth: 1,
            borderColor: '#f3f4f6',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: '#d1fae5',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}>
                  <Ionicons name="cube" size={22} color="#059669" />
                </View>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>
                  Materijali
                </Text>
              </View>
              <Pressable
                onPress={() => setShowMaterialsModal(true)}
                style={{
                  backgroundColor: '#eff6ff',
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Ionicons name="add" size={16} color="#2563eb" style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#2563eb' }}>Dodaj</Text>
              </Pressable>
            </View>
            {usedMaterials.length > 0 ? (
              <View>
                {usedMaterials.map((mat, index) => {
                  // Prioritet: direktno ime iz mat objekta, pa iz material reference, pa type
                  const materialName = mat.name || mat.material?.name || mat.type || mat.material?.type || 'Nepoznat materijal';
                  return (
                    <View key={index} style={{
                      backgroundColor: '#f9fafb',
                      borderRadius: 12,
                      padding: 14,
                      marginBottom: index < usedMaterials.length - 1 ? 8 : 0,
                      borderWidth: 1,
                      borderColor: '#f3f4f6',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                      <Text style={{ fontSize: 14, fontWeight: '500', color: '#111827', flex: 1 }}>
                        {materialName}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{
                          backgroundColor: '#dbeafe',
                          borderRadius: 20,
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          marginRight: 8,
                        }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#1e40af' }}>
                            ×{mat.quantity}
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => handleRemoveMaterial(mat)}
                          style={{
                            width: 40,
                            height: 40,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Ionicons name="close-circle" size={28} color="#ef4444" />
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                <Ionicons name="cube-outline" size={36} color="#d1d5db" style={{ marginBottom: 8 }} />
                <Text style={{ fontSize: 14, color: '#9ca3af', fontStyle: 'italic' }}>
                  Nisu dodati materijali
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Comment Section - Modern Card */}
        {!isCompleted && (
          <View style={{
            backgroundColor: '#ffffff',
            marginHorizontal: 20,
            marginTop: 12,
            padding: 18,
            borderRadius: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 3,
            elevation: 2,
            borderWidth: 1,
            borderColor: '#f3f4f6',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <View style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: '#fef3c7',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}>
                <Ionicons name="document-text" size={22} color="#d97706" />
              </View>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>
                Napomena
              </Text>
            </View>
            <View style={{
              backgroundColor: '#f9fafb',
              borderWidth: 1,
              borderColor: '#e5e7eb',
              borderRadius: 12,
              padding: 14,
              minHeight: 124,
            }}>
              <InputField
                placeholder="Dodaj napomenu o radu..."
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                style={{ minHeight: 100, height: 100, fontSize: 14, color: '#111827' }}
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>
        )}

        {/* Photos Section - Material Design Card */}
        {!isCompleted && (
          <Box className="bg-white mx-4 mt-3 p-4 rounded-2xl shadow-sm border border-gray-100">
            <VStack space="md">
              <HStack space="sm" className="items-center">
                <Box className="w-10 h-10 rounded-full bg-pink-50 items-center justify-center">
                  <Ionicons name="images" size={20} color="#ec4899" />
                </Box>
                <Text size="sm" bold className="text-gray-900">Fotografije</Text>
              </HStack>

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

        {/* Admin Comment - Alert Card */}
        {workOrder.adminComment && (
          <View style={{
            backgroundColor: '#ffffff',
            marginHorizontal: 20,
            marginTop: 12,
            marginBottom: 16,
            padding: 18,
            borderRadius: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 3,
            elevation: 2,
            borderWidth: 2,
            borderColor: '#fca5a5',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <View style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: '#fee2e2',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}>
                <Ionicons name="alert-circle" size={22} color="#dc2626" />
              </View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#b91c1c' }}>
                Napomena administracije
              </Text>
            </View>
            <View style={{
              backgroundColor: '#fef2f2',
              borderRadius: 12,
              padding: 14,
            }}>
              <Text style={{ fontSize: 14, color: '#b91c1c', lineHeight: 20 }}>
                {workOrder.adminComment}
              </Text>
            </View>
          </View>
        )}

        {/* Bottom Action Bar - Modern Design */}
        {!isCompleted && (
          <View style={{
            backgroundColor: '#ffffff',
            marginHorizontal: 20,
            marginTop: 16,
            marginBottom: 20,
            padding: 18,
            borderRadius: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 3,
            borderWidth: 1,
            borderColor: '#f3f4f6',
          }}>
            {/* Primary Action - Complete Work Order */}
            <Pressable
              onPress={handleComplete}
              disabled={saving}
              style={{ marginBottom: 10 }}
            >
              <LinearGradient
                colors={['#059669', '#10b981']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  borderRadius: 14,
                  paddingVertical: 16,
                  paddingHorizontal: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {saving ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" style={{ marginRight: 10 }} />
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#ffffff' }}>
                      Čuvanje...
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={22} color="#fff" style={{ marginRight: 10 }} />
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#ffffff' }}>
                      Završi radni nalog
                    </Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>

            {/* Secondary Action - Other Options */}
            <Pressable
              onPress={() => setShowStatusModal(true)}
              style={{
                backgroundColor: '#f9fafb',
                borderWidth: 1,
                borderColor: '#e5e7eb',
                borderRadius: 14,
                paddingVertical: 14,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="ellipsis-horizontal-circle-outline" size={20} color="#6b7280" style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#6b7280' }}>
                Druge opcije
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Equipment Modal - Material Design 3 */}
      <Modal visible={showEquipmentModal} animationType="slide" transparent onRequestClose={() => {
        setShowEquipmentModal(false);
        setEquipmentSearchTerm('');
      }}>
        <Pressable onPress={() => {
          setShowEquipmentModal(false);
          setEquipmentSearchTerm('');
        }} className="flex-1 bg-black/50 justify-end">
          <Pressable onPress={(e) => e.stopPropagation()} className="bg-white rounded-t-3xl" style={{ height: '85%' }}>
            <VStack style={{ flex: 1 }}>
              {/* Fixed Header Section */}
              <VStack className="px-6 pt-6 pb-4 border-b border-gray-100">
                {/* Header */}
                <HStack className="items-center justify-between mb-4">
                  <HStack space="sm" className="items-center">
                    <Box className="w-10 h-10 rounded-full bg-purple-50 items-center justify-center">
                      <Ionicons name="hardware-chip" size={20} color="#9333ea" />
                    </Box>
                    <Heading size="lg" className="text-gray-900">Dodaj opremu</Heading>
                  </HStack>
                  <Pressable
                    onPress={() => {
                      setShowEquipmentModal(false);
                      setEquipmentSearchTerm('');
                    }}
                    style={{ minHeight: 44, minWidth: 44 }}
                    className="items-center justify-center"
                  >
                    <Ionicons name="close-circle" size={28} color="#9ca3af" />
                  </Pressable>
                </HStack>

                {/* Search Bar */}
                <VStack space="sm">
                  <Text size="sm" bold className="text-gray-700">Pretraži opremu</Text>
                  <Input variant="outline" size="lg" className="bg-gray-50 border-2 border-gray-200">
                    <InputField
                      placeholder="Pretraži po opisu, S/N, kategoriji..."
                      value={equipmentSearchTerm}
                      onChangeText={setEquipmentSearchTerm}
                      autoCapitalize="none"
                    />
                    {equipmentSearchTerm.length > 0 && (
                      <Pressable
                        onPress={() => setEquipmentSearchTerm('')}
                        style={{ minHeight: 40, minWidth: 40 }}
                        className="items-center justify-center"
                      >
                        <Ionicons name="close-circle" size={20} color="#9ca3af" />
                      </Pressable>
                    )}
                  </Input>
                  {equipmentSearchTerm && (
                    <Text size="xs" className="text-gray-500">
                      Pronađeno: {filteredAvailableEquipment.length} od {availableEquipment.length}
                    </Text>
                  )}
                </VStack>
              </VStack>

              {/* Scrollable Equipment List */}
              <Box style={{ flex: 1 }} className="px-6 pt-4">
                <FlatList
                  data={filteredAvailableEquipment}
                  keyExtractor={(item) => item._id}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <Pressable
                      className={`p-4 rounded-xl mb-3 border-2 ${
                        selectedEquipment === item._id
                          ? 'bg-purple-50 border-purple-500'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                      onPress={() => setSelectedEquipment(item._id)}
                      style={{ minHeight: 72 }}
                    >
                      <HStack space="sm" className="items-center">
                        <Box
                          className={`w-8 h-8 rounded-full items-center justify-center ${
                            selectedEquipment === item._id ? 'bg-purple-500' : 'bg-gray-300'
                          }`}
                        >
                          {selectedEquipment === item._id ? (
                            <Ionicons name="checkmark" size={18} color="#fff" />
                          ) : (
                            <Ionicons name="hardware-chip-outline" size={16} color="#fff" />
                          )}
                        </Box>
                        <VStack className="flex-1" space="xs">
                          <Text size="sm" bold className="text-gray-900">{item.description}</Text>
                          <Text size="xs" className="text-gray-500">S/N: {item.serialNumber}</Text>
                        </VStack>
                      </HStack>
                    </Pressable>
                  )}
                  ListEmptyComponent={
                    <Center className="p-12">
                      <Box className="w-16 h-16 rounded-full bg-gray-100 items-center justify-center mb-3">
                        <Ionicons name={equipmentSearchTerm ? "search-outline" : "cube-outline"} size={32} color="#d1d5db" />
                      </Box>
                      <Text size="sm" bold className="text-gray-600 mb-1">
                        {equipmentSearchTerm ? 'Nema rezultata' : 'Nema dostupne opreme'}
                      </Text>
                      {equipmentSearchTerm && (
                        <Text size="xs" className="text-gray-400 text-center">
                          Pokušajte sa drugačijom pretragom
                        </Text>
                      )}
                    </Center>
                  }
                />
              </Box>

              {/* Fixed Action Button */}
              <Box className="px-6 border-t border-gray-100" style={{ paddingTop: 16, paddingBottom: Math.max(insets.bottom, 16) }}>
                <Pressable
                  onPress={handleAddEquipment}
                  disabled={!selectedEquipment}
                  className="rounded-xl"
                >
                  <LinearGradient
                    colors={selectedEquipment ? ['#9333ea', '#a855f7'] : ['#d1d5db', '#d1d5db']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16 }}
                  >
                    <HStack space="sm" className="items-center justify-center">
                      <Ionicons name="add-circle" size={20} color="#fff" />
                      <Text size="sm" bold className="text-white">Dodaj opremu</Text>
                    </HStack>
                  </LinearGradient>
                </Pressable>
              </Box>
            </VStack>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Materials Modal - Material Design 3 */}
      <Modal visible={showMaterialsModal} animationType="slide" transparent onRequestClose={() => setShowMaterialsModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <Pressable onPress={() => setShowMaterialsModal(false)} className="flex-1 bg-black/50 justify-end">
            <Pressable onPress={(e) => e.stopPropagation()} className="bg-white rounded-t-3xl">
              <VStack className="px-6 pt-6" style={{ paddingBottom: Math.max(insets.bottom + 8, 32) }}>
              {/* Header */}
              <HStack className="items-center justify-between mb-6">
                <HStack space="sm" className="items-center">
                  <Box className="w-10 h-10 rounded-full bg-green-50 items-center justify-center">
                    <Ionicons name="cube" size={20} color="#059669" />
                  </Box>
                  <Heading size="lg" className="text-gray-900">Dodaj materijal</Heading>
                </HStack>
                <Pressable
                  onPress={() => setShowMaterialsModal(false)}
                  style={{ minHeight: 44, minWidth: 44 }}
                  className="items-center justify-center"
                >
                  <Ionicons name="close-circle" size={28} color="#9ca3af" />
                </Pressable>
              </HStack>

              {/* Materials List */}
              <FlatList
                data={availableMaterials}
                keyExtractor={(item) => item._id || item.type}
                style={{ maxHeight: 280 }}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <Pressable
                    className={`p-4 rounded-xl mb-3 border-2 ${
                      selectedMaterial === item._id
                        ? 'bg-green-50 border-green-500'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                    onPress={() => setSelectedMaterial(item._id)}
                    style={{ minHeight: 68 }}
                  >
                    <HStack space="sm" className="items-center justify-between">
                      <HStack space="sm" className="items-center flex-1">
                        <Box
                          className={`w-8 h-8 rounded-full items-center justify-center ${
                            selectedMaterial === item._id ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                        >
                          {selectedMaterial === item._id ? (
                            <Ionicons name="checkmark" size={18} color="#fff" />
                          ) : (
                            <Ionicons name="cube-outline" size={16} color="#fff" />
                          )}
                        </Box>
                        <VStack className="flex-1" space="xs">
                          <Text size="sm" bold className="text-gray-900">{item.type || item.name}</Text>
                          <Text size="xs" className="text-gray-500">Dostupno: {item.quantity}</Text>
                        </VStack>
                      </HStack>
                    </HStack>
                  </Pressable>
                )}
                ListEmptyComponent={
                  <Center className="p-12">
                    <Box className="w-16 h-16 rounded-full bg-gray-100 items-center justify-center mb-3">
                      <Ionicons name="cube-outline" size={32} color="#d1d5db" />
                    </Box>
                    <Text size="sm" className="text-gray-400">Nema dostupnih materijala</Text>
                  </Center>
                }
              />

              {/* Quantity Input */}
              <VStack space="sm" className="mt-4">
                <Text size="sm" bold className="text-gray-700">Količina</Text>
                <Input variant="outline" size="lg" className="bg-gray-50 border-2 border-gray-200">
                  <InputField
                    placeholder="Unesite količinu..."
                    value={materialQuantity}
                    onChangeText={setMaterialQuantity}
                    keyboardType="numeric"
                  />
                </Input>
              </VStack>

              {/* Action Button */}
              <Pressable
                onPress={handleAddMaterial}
                disabled={!selectedMaterial || !materialQuantity}
                className="mt-4 rounded-xl"
              >
                <LinearGradient
                  colors={selectedMaterial && materialQuantity ? ['#059669', '#10b981'] : ['#d1d5db', '#d1d5db']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16 }}
                >
                  <HStack space="sm" className="items-center justify-center">
                    <Ionicons name="add-circle" size={20} color="#fff" />
                    <Text size="sm" bold className="text-white">Dodaj materijal</Text>
                  </HStack>
                </LinearGradient>
              </Pressable>
              </VStack>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Remove Equipment Modal */}
      <Modal visible={showRemoveEquipmentModal} animationType="slide" transparent onRequestClose={() => setShowRemoveEquipmentModal(false)}>
        <Pressable onPress={() => setShowRemoveEquipmentModal(false)} className="flex-1 bg-black/50 justify-end">
          <Pressable onPress={(e) => e.stopPropagation()} className="bg-white rounded-t-3xl px-6 pt-6" style={{ paddingBottom: Math.max(insets.bottom + 8, 32) }}>
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
          <Pressable onPress={(e) => e.stopPropagation()} className="bg-white rounded-t-3xl px-6 pt-6" style={{ paddingBottom: Math.max(insets.bottom + 8, 32) }}>
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
                  setTimeout(() => setShowPostponeModal(true), 300);
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
                  setTimeout(() => setShowCancelModal(true), 300);
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
      <Modal visible={showRemoveBySerialModal} animationType="slide" transparent onRequestClose={() => { setShowRemoveBySerialModal(false); setShowCategoryDropdown(false); }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <Pressable onPress={() => { setShowRemoveBySerialModal(false); setShowCategoryDropdown(false); }} className="flex-1 bg-black/50 justify-end">
            <Pressable onPress={(e) => { e.stopPropagation(); setShowCategoryDropdown(false); }} className="bg-white rounded-t-3xl px-6 pt-6" style={{ paddingBottom: Math.max(insets.bottom + 8, 32), maxHeight: '80%' }}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <HStack className="items-center justify-between mb-6">
                  <Heading size="lg" className="text-gray-900">Demontiraj opremu</Heading>
                  <Pressable onPress={() => { setShowRemoveBySerialModal(false); setShowCategoryDropdown(false); }}>
                    <Ionicons name="close" size={28} color="#9ca3af" />
                  </Pressable>
                </HStack>
                <VStack space="md">
                  {/* Category Dropdown */}
                  <VStack space="xs">
                    <Text size="sm" bold className="text-gray-700">Kategorija opreme</Text>
                    <Pressable
                      onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                      style={{
                        backgroundColor: '#f9fafb',
                        borderWidth: 1,
                        borderColor: '#e2e8f0',
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 14,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Text style={{ color: removalEquipmentName ? '#111827' : '#9ca3af', fontSize: 16 }}>
                        {removalEquipmentName || 'Izaberite kategoriju'}
                      </Text>
                      <Ionicons name={showCategoryDropdown ? 'chevron-up' : 'chevron-down'} size={20} color="#6b7280" />
                    </Pressable>

                    {showCategoryDropdown && (
                      <View style={{
                        backgroundColor: '#ffffff',
                        borderWidth: 1,
                        borderColor: '#e2e8f0',
                        borderRadius: 8,
                        marginTop: 4,
                        maxHeight: 200,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                        elevation: 3,
                      }}>
                        <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={true}>
                          {EQUIPMENT_CATEGORIES.map((category, index) => (
                            <Pressable
                              key={category}
                              onPress={() => {
                                setRemovalEquipmentName(category);
                                setShowCategoryDropdown(false);
                              }}
                              style={{
                                paddingHorizontal: 12,
                                paddingVertical: 12,
                                borderBottomWidth: index < EQUIPMENT_CATEGORIES.length - 1 ? 1 : 0,
                                borderBottomColor: '#f3f4f6',
                                backgroundColor: removalEquipmentName === category ? '#eff6ff' : '#ffffff',
                              }}
                            >
                              <Text style={{
                                fontSize: 15,
                                color: removalEquipmentName === category ? '#2563eb' : '#374151',
                                fontWeight: removalEquipmentName === category ? '600' : '400',
                              }}>
                                {category}
                              </Text>
                            </Pressable>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </VStack>

                  <VStack space="xs">
                    <Text size="sm" bold className="text-gray-700">Opis opreme</Text>
                    <Input variant="outline" size="lg" className="bg-gray-50">
                      <InputField
                        placeholder="Unesite opis opreme..."
                        value={removalEquipmentDescription}
                        onChangeText={setRemovalEquipmentDescription}
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

                  <Button
                    action="negative"
                    size="lg"
                    onPress={handleRemoveBySerial}
                    className="mt-4 rounded-2xl py-4"
                    isDisabled={saving || !removalEquipmentName.trim() || !removalEquipmentDescription.trim() || !removalSerialNumber.trim()}
                  >
                    {saving ? (
                      <ButtonSpinner />
                    ) : (
                      <HStack space="sm" className="items-center">
                        <Ionicons name="build" size={20} color="#fff" />
                        <ButtonText>Demontiraj opremu</ButtonText>
                      </HStack>
                    )}
                  </Button>
                </VStack>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Postpone Modal */}
      <Modal visible={showPostponeModal} animationType="slide" transparent onRequestClose={() => setShowPostponeModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <Pressable onPress={() => setShowPostponeModal(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: insets.bottom + 20 }}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <Text style={{ fontSize: 22, fontWeight: '700', color: '#111827' }}>Odlaganje termina</Text>
                <Pressable onPress={() => setShowPostponeModal(false)} style={{ padding: 4 }}>
                  <Ionicons name="close" size={28} color="#9ca3af" />
                </Pressable>
              </View>

              {/* Info Message */}
              <View style={{ backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 12, padding: 12, marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <Ionicons name="information-circle" size={20} color="#3b82f6" style={{ marginTop: 2, marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#1e40af', marginBottom: 4 }}>Napomena:</Text>
                    <Text style={{ fontSize: 12, color: '#1e3a8a', lineHeight: 18 }}>
                      Radni nalog može biti odložen maksimalno 48 sati. Za duže odlaganje molimo otkažite radni nalog.
                    </Text>
                  </View>
                </View>
              </View>

              {/* Datum */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Novi datum:</Text>
                <Pressable
                  onPress={() => setShowDatePicker(true)}
                  style={{
                    backgroundColor: '#f9fafb',
                    borderWidth: 1,
                    borderColor: '#d1d5db',
                    borderRadius: 12,
                    padding: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <Text style={{ fontSize: 15, color: '#111827' }}>
                    {postponeDate.toLocaleDateString('sr-RS', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                </Pressable>
                <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>
                  Maksimalno: {new Date(Date.now() + (48 * 60 * 60 * 1000)).toLocaleDateString('sr-RS', { day: '2-digit', month: 'long', year: 'numeric' })}
                </Text>
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={postponeDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (selectedDate) {
                      setPostponeDate(selectedDate);
                    }
                  }}
                  minimumDate={new Date()}
                  maximumDate={new Date(Date.now() + (48 * 60 * 60 * 1000))}
                />
              )}

              {/* Vreme */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Novo vreme:</Text>
                <Pressable
                  onPress={() => setShowTimePicker(true)}
                  style={{
                    backgroundColor: '#f9fafb',
                    borderWidth: 1,
                    borderColor: '#d1d5db',
                    borderRadius: 12,
                    padding: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <Text style={{ fontSize: 15, color: '#111827' }}>
                    {`${String(postponeTime.getHours()).padStart(2, '0')}:${String(postponeTime.getMinutes()).padStart(2, '0')}`}
                  </Text>
                  <Ionicons name="time-outline" size={20} color="#6b7280" />
                </Pressable>
              </View>

              {showTimePicker && (
                <DateTimePicker
                  value={postponeTime}
                  mode="time"
                  is24Hour={true}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedTime) => {
                    setShowTimePicker(Platform.OS === 'ios');
                    if (selectedTime) {
                      setPostponeTime(selectedTime);
                    }
                  }}
                />
              )}

              {/* Razlog odlaganja */}
              <View style={{ marginBottom: 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151' }}>Razlog odlaganja:</Text>
                  <Text style={{ fontSize: 14, color: '#ef4444', marginLeft: 4 }}>*</Text>
                </View>
                <View style={{
                  backgroundColor: '#f9fafb',
                  borderWidth: 1,
                  borderColor: '#d1d5db',
                  borderRadius: 12,
                  padding: 12,
                  minHeight: 120
                }}>
                  <InputField
                    placeholder="Obavezno objasnite razlog odlaganja radnog naloga..."
                    value={postponeComment}
                    onChangeText={setPostponeComment}
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                    style={{ minHeight: 100, fontSize: 14, color: '#111827' }}
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>

              {/* Submit Button */}
              <Pressable
                onPress={handlePostpone}
                disabled={saving || !postponeComment.trim()}
                style={{
                  backgroundColor: (!postponeComment.trim() || saving) ? '#fbbf24' : '#f59e0b',
                  borderRadius: 14,
                  paddingVertical: 16,
                  alignItems: 'center',
                  opacity: (!postponeComment.trim() || saving) ? 0.6 : 1
                }}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#ffffff' }}>Odloži nalog</Text>
                )}
              </Pressable>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Cancel Modal */}
      <Modal visible={showCancelModal} animationType="slide" transparent onRequestClose={() => setShowCancelModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <Pressable onPress={() => setShowCancelModal(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: insets.bottom + 20 }}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <Text style={{ fontSize: 22, fontWeight: '700', color: '#111827' }}>Otkazivanje radnog naloga</Text>
                <Pressable onPress={() => setShowCancelModal(false)} style={{ padding: 4 }}>
                  <Ionicons name="close" size={28} color="#9ca3af" />
                </Pressable>
              </View>

              {/* Info Message */}
              <View style={{ backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 12, padding: 12, marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <Ionicons name="alert-circle" size={20} color="#ef4444" style={{ marginTop: 2, marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#991b1b', marginBottom: 4 }}>Napomena:</Text>
                    <Text style={{ fontSize: 12, color: '#7f1d1d', lineHeight: 18 }}>
                      Molimo objasnite razlog otkazivanja radnog naloga.
                    </Text>
                  </View>
                </View>
              </View>

              {/* Razlog otkazivanja */}
              <View style={{ marginBottom: 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151' }}>Razlog otkazivanja:</Text>
                  <Text style={{ fontSize: 14, color: '#ef4444', marginLeft: 4 }}>*</Text>
                </View>
                <View style={{
                  backgroundColor: '#f9fafb',
                  borderWidth: 1,
                  borderColor: '#d1d5db',
                  borderRadius: 12,
                  padding: 12,
                  minHeight: 140
                }}>
                  <InputField
                    placeholder="Obavezno objasnite razlog otkazivanja radnog naloga..."
                    value={cancelComment}
                    onChangeText={setCancelComment}
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                    style={{ minHeight: 120, fontSize: 14, color: '#111827' }}
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>

              {/* Submit Button */}
              <Pressable
                onPress={handleCancel}
                disabled={saving || !cancelComment.trim()}
                style={{
                  backgroundColor: (!cancelComment.trim() || saving) ? '#f87171' : '#ef4444',
                  borderRadius: 14,
                  paddingVertical: 16,
                  alignItems: 'center',
                  opacity: (!cancelComment.trim() || saving) ? 0.6 : 1
                }}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#ffffff' }}>Otkaži nalog</Text>
                )}
              </Pressable>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
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
    </View>
  );
}
