# 🎯 VOICE RECORDING SYSTEM - IMPLEMENTACIJA SA ACR PHONE

## ✅ **TRENUTNO STANJE: Backend i Frontend ZAVRŠENI!**

**Datum implementacije:** 06.11.2025
**Status:** Backend i Frontend komponente su SPREMNE. Android integracija je sledeći korak.

---

## 📋 **ŠTA JE ZAVRŠENO**

### ✅ **Backend (robotikb) - COMPLETED**

1. **WorkOrder Model Update** (`models/WorkOrder.js`)
   - Dodato `voiceRecordings` polje (array objekata)
   - Sadrži: url, fileName, phoneNumber, duration, recordedAt, uploadedBy, fileSize

2. **Technician Model Update** (`models/Technician.js`)
   - Dodato `phoneNumber` polje
   - Potrebno za matching poziva sa tehničarima

3. **Cloudinary Config Update** (`config/cloudinary.js`)
   - `uploadVoiceRecording()` - Upload audio fajlova sa kompresijom
   - `deleteVoiceRecording()` - Brisanje audio fajlova
   - Kompresija: 64kbps bitrate, 22050Hz sample rate, MP3 format

4. **Voice Recording Endpoints** (`routes/workorders.js`)
   - `POST /api/workorders/voice-recordings/upload` - Upload sa automatskim matchingom
   - `DELETE /api/workorders/:id/voice-recordings/:recordingId` - Brisanje snimka
   - Helper funkcije za normalizaciju broja telefona i pronalaženje matching work orders

### ✅ **Frontend (robotikf) - COMPLETED**

1. **WorkOrderDetail.js Update**
   - Dodata sekcija za prikaz voice recordings
   - **Role-based access:** SAMO za `supervisor` i `superadmin`
   - Built-in HTML5 audio player
   - Prikaz metapodataka: phoneNumber, recordedAt, duration, fileSize

---

## 📂 **TRENUTNA ARHITEKTURA SISTEMA**

```
┌─────────────────────────────────────────┐
│   ACR PHONE APP - SNIMANJE POZIVA       │
│   - Automatsko snimanje ✅               │
│   - Obe strane razgovora ✅              │
│   - Nema "beep" zvuka ✅                 │
│   - Čuva u pristupačan folder ✅         │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│   STORAGE LOKACIJA:                     │
│   /storage/emulated/0/Recordings/       │
│   ACRPhone/                             │
│   ├── 2025/                             │
│   │   └── 11/                           │
│   │       └── 06/                       │
│   │           └── +3816389927/          │
│   │               └── recording.m4a     │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│   ANDROID APP (robotikm)                │
│   [SLEDEĆI KORAK - ZA IMPLEMENTACIJU]   │
│   - FileWatcher Service                 │
│   - Skenira folder svake X sekundi      │
│   - Detektuje nove audio fajlove         │
│   - Parse-uje metadata iz foldera        │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│   MATCHING LOGIKA (Backend)             │
│   [✅ IMPLEMENTIRANO]                    │
│   1. Normalizuj broj telefona           │
│      (+3816389927 → 0616389927)         │
│   2. Pronađi tehničara sa tim brojem    │
│   3. Pronađi work order sa customer     │
│      phone u periodu ±2 dana            │
│   4. Matching po customer phone         │
│   5. Najbliži po vremenu                │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│   CLOUDINARY UPLOAD                     │
│   [✅ IMPLEMENTIRANO]                    │
│   - Kompresija: 64kbps, 22050Hz         │
│   - Format: MP3                         │
│   - Folder: voice-recordings/           │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│   MONGODB STORAGE                       │
│   [✅ IMPLEMENTIRANO]                    │
│   - URL, fileName, phoneNumber          │
│   - duration, recordedAt, uploadedBy    │
│   - fileSize                            │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│   FRONTEND DISPLAY (robotikf)           │
│   [✅ IMPLEMENTIRANO]                    │
│   - WorkOrderDetail stranica            │
│   - Audio player                        │
│   - Role restriction (supervisor+)      │
└─────────────────────────────────────────┘
```

---

## 🔧 **ANDROID APP INTEGRACIJA - SLEDEĆI KORAK**

### Potrebne izmene u `robotikm`:

#### 1. **Instalacija Dependencies**

```bash
cd D:/ROBOTIK/robotikm
npm install react-native-fs
npm install @react-native-community/netinfo
```

#### 2. **Kreirati FileWatcher Service**

**Fajl:** `src/services/ACRPhoneRecordingWatcher.js`

```javascript
import RNFS from 'react-native-fs';
import { PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from './api';

class ACRPhoneRecordingWatcher {
  constructor() {
    // ACR Phone folder struktura
    this.basePath = RNFS.ExternalStorageDirectoryPath + '/Recordings/ACRPhone';
    this.processedFiles = new Set();
    this.isWatching = false;
    this.interval = null;
    this.technicianPhone = null;
  }

  async initialize(technicianPhoneNumber) {
    console.log('[ACR Watcher] Initializing with technician phone:', technicianPhoneNumber);
    this.technicianPhone = technicianPhoneNumber;

    await this.requestPermissions();
    await this.loadProcessedFiles();
    await this.startWatching();
  }

  async requestPermissions() {
    if (Platform.OS !== 'android') return false;

    try {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      ];

      const granted = await PermissionsAndroid.requestMultiple(permissions);
      const allGranted = Object.values(granted).every(
        status => status === PermissionsAndroid.RESULTS.GRANTED
      );

      if (!allGranted) {
        console.error('[ACR Watcher] Storage permissions not granted');
      }

      return allGranted;
    } catch (error) {
      console.error('[ACR Watcher] Permission error:', error);
      return false;
    }
  }

  async loadProcessedFiles() {
    try {
      const stored = await AsyncStorage.getItem('processedACRRecordings');
      if (stored) {
        this.processedFiles = new Set(JSON.parse(stored));
        console.log('[ACR Watcher] Loaded', this.processedFiles.size, 'processed files');
      }
    } catch (error) {
      console.error('[ACR Watcher] Error loading processed files:', error);
    }
  }

  async saveProcessedFiles() {
    try {
      await AsyncStorage.setItem(
        'processedACRRecordings',
        JSON.stringify(Array.from(this.processedFiles))
      );
    } catch (error) {
      console.error('[ACR Watcher] Error saving processed files:', error);
    }
  }

  async startWatching() {
    if (this.isWatching) {
      console.log('[ACR Watcher] Already watching');
      return;
    }

    console.log('[ACR Watcher] Starting to watch:', this.basePath);
    this.isWatching = true;

    // Check immediately
    await this.scanForNewRecordings();

    // Check every 30 seconds
    this.interval = setInterval(() => {
      this.scanForNewRecordings();
    }, 30000);
  }

  stopWatching() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      this.isWatching = false;
      console.log('[ACR Watcher] Stopped watching');
    }
  }

  async scanForNewRecordings() {
    try {
      const exists = await RNFS.exists(this.basePath);
      if (!exists) {
        console.log('[ACR Watcher] Base folder does not exist yet:', this.basePath);
        return;
      }

      // Sken rekurzivno kroz godine/mesece/dane/brojeve
      await this.scanDirectory(this.basePath);

    } catch (error) {
      console.error('[ACR Watcher] Error scanning:', error);
    }
  }

  async scanDirectory(dirPath) {
    try {
      const items = await RNFS.readDir(dirPath);

      for (const item of items) {
        if (item.isDirectory()) {
          // Rekurzivno sken podfoldera
          await this.scanDirectory(item.path);
        } else if (item.isFile() && (item.name.endsWith('.m4a') || item.name.endsWith('.mp3') || item.name.endsWith('.wav'))) {
          // Pronađen audio fajl
          if (!this.processedFiles.has(item.path)) {
            console.log('[ACR Watcher] New recording found:', item.path);

            // Mark as processed
            this.processedFiles.add(item.path);
            await this.saveProcessedFiles();

            // Process
            await this.processRecording(item);
          }
        }
      }
    } catch (error) {
      console.error('[ACR Watcher] Error scanning directory:', dirPath, error);
    }
  }

  async processRecording(file) {
    try {
      console.log('[ACR Watcher] Processing:', file.path);

      // Extract customer phone number from path
      // Format: /storage/.../ACRPhone/2025/11/06/+3816389927/recording.m4a
      const pathParts = file.path.split('/');
      const customerPhone = pathParts[pathParts.length - 2]; // Folder name je broj

      if (!customerPhone || customerPhone.length < 9) {
        console.error('[ACR Watcher] Could not extract phone number from path:', file.path);
        return;
      }

      // Extract recorded date from path (YYYY/MM/DD)
      const year = pathParts[pathParts.length - 4];
      const month = pathParts[pathParts.length - 3];
      const day = pathParts[pathParts.length - 2];

      // Get file stats
      const stats = await RNFS.stat(file.path);
      const recordedAt = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

      const recording = {
        id: Date.now().toString(),
        filePath: file.path,
        customerPhone: customerPhone,
        technicianPhone: this.technicianPhone,
        recordedAt: recordedAt.toISOString(),
        fileSize: stats.size,
        uploaded: false,
        retryCount: 0
      };

      // Save to offline queue
      await this.saveToOfflineQueue(recording);

      // Try to upload
      await this.uploadRecording(recording);

    } catch (error) {
      console.error('[ACR Watcher] Error processing recording:', error);
    }
  }

  async saveToOfflineQueue(recording) {
    try {
      const queueKey = 'offlineACRRecordingsQueue';
      const stored = await AsyncStorage.getItem(queueKey);
      const queue = stored ? JSON.parse(stored) : [];

      queue.push(recording);

      await AsyncStorage.setItem(queueKey, JSON.stringify(queue));
      console.log('[ACR Watcher] Saved to offline queue:', recording.id);
    } catch (error) {
      console.error('[ACR Watcher] Error saving to queue:', error);
    }
  }

  async uploadRecording(recording) {
    try {
      console.log('[ACR Watcher] Uploading recording:', recording.id);

      // Prepare FormData
      const formData = new FormData();
      formData.append('audio', {
        uri: `file://${recording.filePath}`,
        type: 'audio/m4a',
        name: `recording_${recording.id}.m4a`
      });
      formData.append('phoneNumber', recording.technicianPhone);
      formData.append('customerPhone', recording.customerPhone);
      formData.append('recordedAt', recording.recordedAt);

      // Get auth token
      const token = await AsyncStorage.getItem('token');

      // Upload to backend
      const response = await fetch(`${API_URL}/api/workorders/voice-recordings/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('[ACR Watcher] Upload successful:', result);

        // Mark as uploaded
        recording.uploaded = true;
        await this.removeFromOfflineQueue(recording.id);

        // Optionally delete local file
        // await RNFS.unlink(recording.filePath);
      } else {
        const errorText = await response.text();
        console.error('[ACR Watcher] Upload failed:', response.status, errorText);
      }

    } catch (error) {
      console.error('[ACR Watcher] Upload error:', error);
    }
  }

  async removeFromOfflineQueue(recordingId) {
    try {
      const queueKey = 'offlineACRRecordingsQueue';
      const stored = await AsyncStorage.getItem(queueKey);
      const queue = stored ? JSON.parse(stored) : [];

      const updatedQueue = queue.filter(r => r.id !== recordingId);

      await AsyncStorage.setItem(queueKey, JSON.stringify(updatedQueue));
      console.log('[ACR Watcher] Removed from offline queue:', recordingId);
    } catch (error) {
      console.error('[ACR Watcher] Error removing from queue:', error);
    }
  }

  async syncOfflineQueue() {
    try {
      const queueKey = 'offlineACRRecordingsQueue';
      const stored = await AsyncStorage.getItem(queueKey);
      const queue = stored ? JSON.parse(stored) : [];

      console.log('[ACR Watcher] Syncing offline queue:', queue.length, 'recordings');

      for (const recording of queue) {
        if (!recording.uploaded && recording.retryCount < 5) {
          recording.retryCount = (recording.retryCount || 0) + 1;
          await this.uploadRecording(recording);
        }
      }
    } catch (error) {
      console.error('[ACR Watcher] Error syncing offline queue:', error);
    }
  }
}

export default new ACRPhoneRecordingWatcher();
```

#### 3. **Integracija u App Component**

**Fajl:** `src/App.js` (ili glavni component)

```javascript
import ACRPhoneRecordingWatcher from './services/ACRPhoneRecordingWatcher';
import NetInfo from '@react-native-community/netinfo';

// U useEffect nakon logina:
useEffect(() => {
  if (user && user.phoneNumber) {
    // Initialize watcher sa brojem tehničara
    ACRPhoneRecordingWatcher.initialize(user.phoneNumber);

    // Setup network listener
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        console.log('[App] Network connected, syncing offline queue');
        ACRPhoneRecordingWatcher.syncOfflineQueue();
      }
    });

    return () => {
      ACRPhoneRecordingWatcher.stopWatching();
      unsubscribe();
    };
  }
}, [user]);
```

#### 4. **Permissions u AndroidManifest.xml**

```xml
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

---

## 🎯 **BACKEND ENDPOINT DETALJNO**

### **POST /api/workorders/voice-recordings/upload**

**Request:**
```javascript
FormData {
  audio: File (audio/m4a, audio/mp3, audio/wav, etc.),
  phoneNumber: "+3816389927",      // Broj tehničara (caller)
  customerPhone: "0691234567",     // Broj korisnika (sa foldera)
  recordedAt: "2025-11-06T14:30:00.000Z"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Voice recording uspešno uploadovan i povezan sa radnim nalogom",
  "workOrderId": "67abcd1234...",
  "voiceRecording": {
    "url": "https://res.cloudinary.com/.../voice-recordings/call_...",
    "fileName": "recording_123456.m4a",
    "phoneNumber": "0691234567",
    "duration": 120,
    "recordedAt": "2025-11-06T14:30:00.000Z",
    "uploadedBy": "tehnicianId...",
    "fileSize": 2048576
  }
}
```

**Response (Error - No Technician):**
```json
{
  "error": "Tehničar sa ovim brojem telefona nije pronađen",
  "phoneNumber": "0616389927"
}
```

**Response (Error - No Work Order):**
```json
{
  "error": "Nije pronađen radni nalog koji odgovara ovom pozivu",
  "technicianName": "Milan Petrović",
  "customerPhone": "0691234567",
  "recordedAt": "2025-11-06T14:30:00.000Z"
}
```

---

## 📝 **CHECKLIST - ŠTA JE POTREBNO**

### ✅ Backend
- [x] WorkOrder model ažuriran
- [x] Technician model ažuriran (phoneNumber polje)
- [x] Cloudinary funkcije za audio
- [x] Upload endpoint implementiran
- [x] Delete endpoint implementiran
- [x] Matching logika (tehničar → work order)
- [x] Normalizacija brojeva telefona

### ✅ Frontend
- [x] WorkOrderDetail.js ažuriran
- [x] Voice recordings sekcija
- [x] Role-based access (supervisor/superadmin)
- [x] HTML5 audio player
- [x] Prikaz metapodataka

### ⏳ Android App (TO DO)
- [ ] Instalirati react-native-fs
- [ ] Instalirati @react-native-community/netinfo
- [ ] Kreirati ACRPhoneRecordingWatcher.js
- [ ] Integracija u App.js
- [ ] Testiranje file watcher-a
- [ ] Testiranje upload-a
- [ ] Testiranje offline queue-a

### ⏳ Deployment
- [ ] Update backend na production
- [ ] Update frontend na production
- [ ] Build novi APK sa file watcher-om
- [ ] Distribuirati APK tehničarima
- [ ] Dodati phoneNumber za svakog tehničara u bazi

---

## 🚀 **KAKO NASTAVITI**

1. **Dodaj phoneNumber tehničarima u bazi:**
   ```javascript
   // MongoDB update
   db.technicians.updateOne(
     { name: "Ime Tehničara" },
     { $set: { phoneNumber: "0616389927" } }
   )
   ```

2. **Implementiraj Android FileWatcher:**
   - Kopiraj kod iz ovog dokumenta
   - Testiraj lokalno

3. **Test proces:**
   - Napraviti test poziv sa tehničara na neki broj
   - Proveriti da li se fajl pojavio u `/Recordings/ACRPhone/...`
   - Proveriti logove u Metro bundler-u
   - Proveriti da li se poziv uploadovao na backend

4. **Production deploy:**
   - Build novi APK
   - Distribuirati tehničarima
   - Pratiti logove

---

## ⚠️ **VAŽNE NAPOMENE**

- **ACR Phone** mora biti instaliran na svim tehničkim telefonima
- Svi tehničari moraju imati `phoneNumber` u bazi
- Backend endpoint očekuje da tehničar ima broj telefona u profilu
- Matching se vrši po `customerPhone` (userPhone u WorkOrder-u)
- Period matchinga je ±2 dana od snimljenog poziva
- Ako ima više work order-a, uzima se najbliži po vremenu

---

**Status:** READY FOR ANDROID IMPLEMENTATION ✅
**Autor:** Claude AI Assistant
**Datum:** 06.11.2025
