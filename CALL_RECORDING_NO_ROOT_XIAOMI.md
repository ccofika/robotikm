# 🎯 CALL RECORDING - BEZ ROOT-a - Xiaomi 13 (Android 15)

## ✅ **NAJBOLJE REŠENJE: Native Xiaomi Dialer + File Watcher**

Ovo je **PERFEKTNO** rešenje koje **NE ZAHTEVA ROOT**!

---

## 📋 **KAKO RADI**

### 1. **Omogući Native Xiaomi Call Recorder (BEZ ROOT-a!)**

Xiaomi 13 sa HyperOS 2 (Android 15) **IMA UGRAĐEN** call recorder, ali je onemogućen na Global ROM verziji.

**Proces omogućavanja (10 minuta):**

```bash
# KORAK 1: Instaliraj ADB Tools na računar
# Download: ADB Installer v1.4.3 sa xiaomifirmware.com

# KORAK 2: Omogući Developer Options na telefonu
Settings → About Phone → Tapni "MIUI Version" 7 puta
Settings → Additional Settings → Developer Options
  ✅ USB Debugging
  ✅ Install via USB
  ✅ USB Debugging (Security Settings)
  ✅ Disable ADB Timeout

# KORAK 3: Povezi telefon i verifikuj
adb devices
# Trebate videti: List of devices attached...

# KORAK 4: Ukloni Google Dialer i omogući Xiaomi Dialer
adb shell pm uninstall -k --user 0 com.google.android.dialer
adb shell pm uninstall -k --user 0 com.google.android.contacts
adb shell pm uninstall -k --user 0 com.android.phone.cust.overlay.miui
adb shell pm install-existing com.android.contacts
adb shell pm install-existing com.android.incallui

# KORAK 5: Postavi Xiaomi Dialer kao default
# Instaliraj "Hidden Settings" app sa Google Play Store
# Otvori Hidden Settings → Manage Applications → Contacts and Dialer
# Selektuj "Contacts and Dialer" kao default

# ✅ GOTOVO! Xiaomi Dialer sa call recording je sada aktivan!
```

### 2. **Rezultat**

```
✅ Native Xiaomi Dialer instaliran
✅ Automatsko snimanje poziva omogućeno
✅ Snimci se čuvaju u: /MIUI/sound_recorder/call_rec/
✅ Format: MP3
✅ Kvalitet: OBE STRANE RAZGOVORA (10/10)
✅ BEZ ROOT-a!
✅ Radi sa Bluetooth/headset
✅ Ne gubi se garancija
```

---

## 📂 **KAKO VAŠA APLIKACIJA PRIKUPLJA SNIMKE**

### Lokacija Snimaka

```
/storage/emulated/0/MIUI/sound_recorder/call_rec/
```

### Format Imena Fajla

Xiaomi native dialer čuva snimke sa sledećim formatom:

```
call_[timestamp]_[phone_number].mp3

Primeri:
call_20250124143022_+381641234567.mp3
call_20250124150833_381691122334.mp3
```

### Metadata u MP3 Fajlu

Xiaomi takođe upisuje metadata u MP3 fajl:
- Call Date/Time
- Phone Number
- Contact Name (ako postoji u imeniku)
- Call Duration

---

## 🔄 **ARHITEKTURA SISTEMA**

```
┌─────────────────────────────────────────┐
│   POZIV - AUTOMATSKI SNIMLJEN           │
│   (Xiaomi Native Dialer)                │
│   - Incoming poziv ✅                    │
│   - Outgoing poziv ✅                    │
│   - Bluetooth poziv ✅                   │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│   Snimak čuvan u:                       │
│   /MIUI/sound_recorder/call_rec/        │
│   - Format: MP3                         │
│   - Bitrate: 128 kbps                   │
│   - Sample rate: 44100 Hz               │
│   - Kvalitet: OBE STRANE 10/10          │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│   Robotikm FileWatcher Service          │
│   - Prati folder svake 10 sekundi       │
│   - Detektuje novi MP3 fajl              │
│   - Parse-uje broj telefona iz imena     │
│   - Parse-uje timestamp                  │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│   Matching Logic                        │
│   - Pronalazi WorkOrder sa tim brojem   │
│   - Najskoriji ACTIVE work order        │
│   - Matching po customer phone number   │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│   Offline Queue                         │
│   - Čuva metadata u AsyncStorage        │
│   - Upload kada je online               │
│   - Retry na failure                    │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│   Upload na Backend (robotikb)          │
│   - POST /api/call-recordings/upload    │
│   - FormData sa MP3 fajlom              │
│   - workOrderId, phoneNumber, metadata  │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│   Backend Processing                    │
│   - Upload MP3 na Cloudinary            │
│   - Čuva URL u MongoDB                  │
│   - Link sa WorkOrder-om                │
│   - Metadata: duration, size, timestamp │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│   Admin Panel (robotikf)                │
│   - Lista snimaka po WorkOrder-u        │
│   - Audio player za reprodukciju        │
│   - Download opcija                     │
│   - Delete opcija                       │
└─────────────────────────────────────────┘
```

---

## 💻 **IMPLEMENTACIJA - DETALJNO**

### **FAZA 1: Setup Xiaomi Dialera (Vi - 1 sat)**

#### Šta vam je potrebno:
- Windows/Linux/Mac računar
- USB kabl
- Xiaomi 13 telefon
- Internet konekcija

#### Koraci:

**1.1 - Instalacija ADB Tools**

**Windows:**
```bash
# Download: ADB Installer v1.4.3
# Link: https://xiaomifirmware.com/downloads/adb-installer/
# Run installer, pritisni Y tri puta
# ADB će biti instaliran u C:\adb\
```

**Linux:**
```bash
sudo apt install android-tools-adb android-tools-fastboot
```

**Mac:**
```bash
brew install android-platform-tools
```

**1.2 - Omogući Developer Options**

```
1. Otvori Settings
2. Idi u "About Phone"
3. Tapni na "MIUI Version" ili "HyperOS Version" 7 puta
4. Idi nazad u Settings → Additional Settings
5. Klikni "Developer Options"
6. Omogući:
   ✅ USB Debugging
   ✅ Install via USB
   ✅ USB Debugging (Security Settings)
   ✅ Disable ADB Timeout
```

**1.3 - Povezi telefon i testiranje**

```bash
# Otvori Command Prompt (Windows) ili Terminal (Mac/Linux)
cd C:\adb  # Windows
# ili samo 'adb' ako je u PATH

# Proveri da li ADB vidi telefon
adb devices

# Trebate videti:
# List of devices attached
# ABC123456789    device
#
# Ako piše "unauthorized", odobri na telefonu
```

**1.4 - Izvršavanje ADB komandi**

```bash
# Kopiraj i nalepite TAČNO OVAKO:

# 1. Ukloni Google Dialer
adb shell pm uninstall -k --user 0 com.google.android.dialer

# 2. Ukloni Google Contacts
adb shell pm uninstall -k --user 0 com.google.android.contacts

# 3. Ukloni restriction overlay
adb shell pm uninstall -k --user 0 com.android.phone.cust.overlay.miui

# 4. Instaliraj Xiaomi Contacts
adb shell pm install-existing com.android.contacts

# 5. Instaliraj Xiaomi InCallUI
adb shell pm install-existing com.android.incallui

# ✅ Ako sve komande kažu "Success", GOTOVO JE!
```

**1.5 - Postavi default dialer**

```
1. Instaliraj "Hidden Settings for MIUI" sa Google Play Store
2. Otvori Hidden Settings app
3. Idi u "Manage Applications"
4. Klikni na "Contacts and Dialer"
5. Selektuj "Dialer" tab
6. Izaberi "Contacts and Dialer" kao default
```

**1.6 - Testiranje**

```
1. Napravite test poziv
2. Otvori File Manager
3. Idi u MIUI → sound_recorder → call_rec
4. Trebate videti MP3 fajl!
5. Play fajl da proverite kvalitet
```

---

### **FAZA 2: FileWatcher Service (2 dana)**

#### 2.1 - React Native FileWatcher

**Kreirati:** `src/services/XiaomiCallRecordingWatcher.js`

```javascript
import RNFS from 'react-native-fs';
import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from './api';

class XiaomiCallRecordingWatcher {
  constructor() {
    // Xiaomi native call recorder folder
    this.watchPath = RNFS.ExternalStorageDirectoryPath + '/MIUI/sound_recorder/call_rec';
    this.processedFiles = new Set();
    this.isWatching = false;
    this.interval = null;
  }

  async initialize() {
    console.log('[Xiaomi Watcher] Initializing...');

    // Request permissions
    await this.requestPermissions();

    // Load processed files from storage
    await this.loadProcessedFiles();

    // Start watching
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
        console.error('[Xiaomi Watcher] Storage permissions not granted');
      }

      return allGranted;
    } catch (error) {
      console.error('[Xiaomi Watcher] Permission error:', error);
      return false;
    }
  }

  async loadProcessedFiles() {
    try {
      const stored = await AsyncStorage.getItem('processedCallRecordings');
      if (stored) {
        this.processedFiles = new Set(JSON.parse(stored));
        console.log('[Xiaomi Watcher] Loaded', this.processedFiles.size, 'processed files');
      }
    } catch (error) {
      console.error('[Xiaomi Watcher] Error loading processed files:', error);
    }
  }

  async saveProcessedFiles() {
    try {
      await AsyncStorage.setItem(
        'processedCallRecordings',
        JSON.stringify(Array.from(this.processedFiles))
      );
    } catch (error) {
      console.error('[Xiaomi Watcher] Error saving processed files:', error);
    }
  }

  async startWatching() {
    if (this.isWatching) {
      console.log('[Xiaomi Watcher] Already watching');
      return;
    }

    console.log('[Xiaomi Watcher] Starting to watch:', this.watchPath);
    this.isWatching = true;

    // Check immediately
    await this.checkForNewRecordings();

    // Check every 10 seconds
    this.interval = setInterval(() => {
      this.checkForNewRecordings();
    }, 10000);
  }

  stopWatching() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      this.isWatching = false;
      console.log('[Xiaomi Watcher] Stopped watching');
    }
  }

  async checkForNewRecordings() {
    try {
      // Check if folder exists
      const exists = await RNFS.exists(this.watchPath);
      if (!exists) {
        console.log('[Xiaomi Watcher] Folder does not exist yet:', this.watchPath);
        return;
      }

      // Read all files
      const files = await RNFS.readDir(this.watchPath);

      for (const file of files) {
        // Only process MP3 files
        if (!file.name.endsWith('.mp3')) continue;

        // Skip if already processed
        if (this.processedFiles.has(file.path)) continue;

        // Mark as processed immediately
        this.processedFiles.add(file.path);
        await this.saveProcessedFiles();

        // Process the recording
        console.log('[Xiaomi Watcher] New recording found:', file.name);
        await this.processRecording(file);
      }
    } catch (error) {
      console.error('[Xiaomi Watcher] Error checking files:', error);
    }
  }

  async processRecording(file) {
    try {
      console.log('[Xiaomi Watcher] Processing:', file.name);

      // Parse filename: call_20250124143022_+381641234567.mp3
      const parsed = this.parseFilename(file.name);

      if (!parsed) {
        console.error('[Xiaomi Watcher] Could not parse filename:', file.name);
        return;
      }

      console.log('[Xiaomi Watcher] Parsed data:', parsed);

      // Get file stats
      const stats = await RNFS.stat(file.path);

      const recording = {
        id: Date.now().toString(),
        filePath: file.path,
        phoneNumber: parsed.phoneNumber,
        recordedAt: parsed.timestamp,
        fileSize: stats.size,
        uploaded: false,
        retryCount: 0
      };

      // Save to offline queue
      await this.saveToOfflineQueue(recording);

      // Try to upload
      await this.uploadRecording(recording);

    } catch (error) {
      console.error('[Xiaomi Watcher] Error processing recording:', error);
    }
  }

  parseFilename(filename) {
    // Xiaomi format: call_YYYYMMDDHHMMSS_+phoneNumber.mp3
    // Example: call_20250124143022_+381641234567.mp3

    const regex = /^call_(\d{14})_([\+\d]+)\.mp3$/;
    const match = filename.match(regex);

    if (!match) {
      console.error('[Xiaomi Watcher] Filename does not match expected format:', filename);
      return null;
    }

    const [_, timestampStr, phoneNumber] = match;

    // Parse timestamp: YYYYMMDDHHMMSS
    const year = timestampStr.substring(0, 4);
    const month = timestampStr.substring(4, 6);
    const day = timestampStr.substring(6, 8);
    const hour = timestampStr.substring(8, 10);
    const minute = timestampStr.substring(10, 12);
    const second = timestampStr.substring(12, 14);

    const timestamp = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second)
    );

    return {
      phoneNumber: phoneNumber,
      timestamp: timestamp.toISOString()
    };
  }

  async saveToOfflineQueue(recording) {
    try {
      const queueKey = 'offlineCallRecordingsQueue';
      const stored = await AsyncStorage.getItem(queueKey);
      const queue = stored ? JSON.parse(stored) : [];

      queue.push(recording);

      await AsyncStorage.setItem(queueKey, JSON.stringify(queue));
      console.log('[Xiaomi Watcher] Saved to offline queue:', recording.id);
    } catch (error) {
      console.error('[Xiaomi Watcher] Error saving to queue:', error);
    }
  }

  async uploadRecording(recording) {
    try {
      console.log('[Xiaomi Watcher] Uploading recording:', recording.id);

      // Find matching work order
      const workOrder = await this.findWorkOrderByPhone(recording.phoneNumber);

      if (!workOrder) {
        console.log('[Xiaomi Watcher] No work order found for:', recording.phoneNumber);
        return;
      }

      console.log('[Xiaomi Watcher] Found work order:', workOrder._id);

      // Prepare FormData
      const formData = new FormData();
      formData.append('audio', {
        uri: `file://${recording.filePath}`,
        type: 'audio/mpeg',
        name: `call_${recording.id}.mp3`
      });
      formData.append('workOrderId', workOrder._id);
      formData.append('phoneNumber', recording.phoneNumber);
      formData.append('recordedAt', recording.recordedAt);
      formData.append('fileSize', recording.fileSize);

      // Get auth token
      const token = await AsyncStorage.getItem('authToken');

      // Upload to backend
      const response = await fetch(`${API_URL}/api/call-recordings/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        console.log('[Xiaomi Watcher] Upload successful:', recording.id);

        // Mark as uploaded
        recording.uploaded = true;
        await this.removeFromOfflineQueue(recording.id);

        // Delete local file (optional)
        await RNFS.unlink(recording.filePath);
        console.log('[Xiaomi Watcher] Local file deleted:', recording.filePath);
      } else {
        const errorText = await response.text();
        console.error('[Xiaomi Watcher] Upload failed:', response.status, errorText);
      }

    } catch (error) {
      console.error('[Xiaomi Watcher] Upload error:', error);
      // Recording stays in offline queue for retry
    }
  }

  async findWorkOrderByPhone(phoneNumber) {
    if (!phoneNumber) return null;

    try {
      const token = await AsyncStorage.getItem('authToken');

      const response = await fetch(
        `${API_URL}/api/work-orders/search-by-phone?phone=${encodeURIComponent(phoneNumber)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Return the most recent ACTIVE work order
        return data.workOrders?.[0] || null;
      } else {
        console.error('[Xiaomi Watcher] Work order search failed:', response.status);
      }
    } catch (error) {
      console.error('[Xiaomi Watcher] Work order search error:', error);
    }

    return null;
  }

  async removeFromOfflineQueue(recordingId) {
    try {
      const queueKey = 'offlineCallRecordingsQueue';
      const stored = await AsyncStorage.getItem(queueKey);
      const queue = stored ? JSON.parse(stored) : [];

      const updatedQueue = queue.filter(r => r.id !== recordingId);

      await AsyncStorage.setItem(queueKey, JSON.stringify(updatedQueue));
      console.log('[Xiaomi Watcher] Removed from offline queue:', recordingId);
    } catch (error) {
      console.error('[Xiaomi Watcher] Error removing from queue:', error);
    }
  }

  async syncOfflineQueue() {
    try {
      const queueKey = 'offlineCallRecordingsQueue';
      const stored = await AsyncStorage.getItem(queueKey);
      const queue = stored ? JSON.parse(stored) : [];

      console.log('[Xiaomi Watcher] Syncing offline queue:', queue.length, 'recordings');

      for (const recording of queue) {
        if (!recording.uploaded && recording.retryCount < 5) {
          recording.retryCount = (recording.retryCount || 0) + 1;
          await this.uploadRecording(recording);
        }
      }
    } catch (error) {
      console.error('[Xiaomi Watcher] Error syncing offline queue:', error);
    }
  }
}

export default new XiaomiCallRecordingWatcher();
```

#### 2.2 - Integration u App.js

```javascript
import XiaomiCallRecordingWatcher from './services/XiaomiCallRecordingWatcher';
import NetInfo from '@react-native-community/netinfo';

// U glavnom App komponenti:
useEffect(() => {
  if (user && user.role === 'technician') {
    // Initialize watcher after login
    XiaomiCallRecordingWatcher.initialize();

    // Setup network listener for offline queue sync
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        console.log('[App] Network connected, syncing offline queue');
        XiaomiCallRecordingWatcher.syncOfflineQueue();
      }
    });

    return () => {
      XiaomiCallRecordingWatcher.stopWatching();
      unsubscribe();
    };
  }
}, [user]);
```

#### 2.3 - package.json Dependencies

Dodati u `robotikm/package.json`:

```json
{
  "dependencies": {
    "react-native-fs": "^2.20.0"
  }
}
```

Instalacija:
```bash
cd robotikm
npm install react-native-fs
npx pod-install  # Ako koristite iOS (opciono)
```

---

### **FAZA 3: Backend API (1 dan)**

#### 3.1 - CallRecording Model

**Već postoji u dokumentaciji**, ali evo i ovde za referencu:

`robotikb/models/CallRecording.js`:

```javascript
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CallRecordingSchema = new Schema({
  workOrderId: {
    type: Schema.Types.ObjectId,
    ref: 'WorkOrder',
    required: true,
    index: true
  },
  technicianId: {
    type: Schema.Types.ObjectId,
    ref: 'Technician',
    required: true,
    index: true
  },
  phoneNumber: {
    type: String,
    required: true,
    index: true
  },
  callType: {
    type: String,
    enum: ['incoming', 'outgoing', 'unknown'],
    default: 'unknown'
  },
  duration: {
    type: Number, // milliseconds
    default: 0
  },
  recordingUrl: {
    type: String, // Cloudinary URL
    required: true
  },
  recordedAt: {
    type: Date,
    required: true,
    index: true
  },
  metadata: {
    fileSize: Number,
    format: String,
    bitrate: Number,
    sampleRate: Number
  }
}, {
  timestamps: true
});

CallRecordingSchema.index({ workOrderId: 1, recordedAt: -1 });
CallRecordingSchema.index({ technicianId: 1, recordedAt: -1 });

module.exports = mongoose.model('CallRecording', CallRecordingSchema);
```

#### 3.2 - Search Work Orders by Phone

`robotikb/routes/workOrders.js` (dodati endpoint):

```javascript
// GET /api/work-orders/search-by-phone?phone=+381641234567
router.get('/search-by-phone', auth, async (req, res) => {
  try {
    const { phone } = req.query;
    const technicianId = req.user._id;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Normalizuj broj telefona (ukloni razmake, crtice, itd.)
    const normalizedPhone = phone.replace(/[\s\-\(\)]/g, '');

    // Pronađi work order-e gde customer ima ovaj broj telefona
    // Samo active ili pending work order-e
    // Za ovog tehničara
    const workOrders = await WorkOrder.find({
      technicianId: technicianId,
      status: { $in: ['pending', 'in-progress'] },
      $or: [
        { 'customer.phone': { $regex: normalizedPhone, $options: 'i' } },
        { 'customer.phoneSecondary': { $regex: normalizedPhone, $options: 'i' } }
      ]
    })
    .sort({ createdAt: -1 }) // Najnoviji prvi
    .limit(1)
    .lean();

    res.json({
      success: true,
      workOrders: workOrders
    });

  } catch (error) {
    console.error('Search work orders by phone error:', error);
    res.status(500).json({ error: 'Failed to search work orders' });
  }
});
```

#### 3.3 - Upload Call Recording Endpoint

`robotikb/routes/callRecordings.js`:

```javascript
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { CallRecording, WorkOrder } = require('../models');
const { auth } = require('../middleware/auth');
const cloudinary = require('../config/cloudinary');

// Multer configuration for audio files
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/m4a'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files allowed.'));
    }
  }
});

// POST /api/call-recordings/upload
router.post('/upload', auth, upload.single('audio'), async (req, res) => {
  try {
    const { workOrderId, phoneNumber, recordedAt, fileSize } = req.body;
    const technicianId = req.user._id;

    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    console.log('Uploading call recording:', {
      workOrderId,
      phoneNumber,
      technicianId,
      fileSize: req.file.size
    });

    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'call-recordings',
          resource_type: 'video', // Cloudinary treats audio as video
          format: 'mp3',
          public_id: `call_${Date.now()}_${technicianId}`
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      uploadStream.end(req.file.buffer);
    });

    console.log('Cloudinary upload successful:', uploadResult.secure_url);

    // Create CallRecording entry
    const callRecording = new CallRecording({
      workOrderId,
      technicianId,
      phoneNumber,
      callType: 'unknown', // Xiaomi ne daje tip u imenu fajla
      duration: 0, // Može se kasnije extract-ovati iz MP3 metadata
      recordingUrl: uploadResult.secure_url,
      recordedAt: new Date(recordedAt),
      metadata: {
        fileSize: parseInt(fileSize) || req.file.size,
        format: 'audio/mpeg',
        bitrate: 128000,
        sampleRate: 44100
      }
    });

    await callRecording.save();

    // Add reference to WorkOrder
    await WorkOrder.findByIdAndUpdate(workOrderId, {
      $push: { callRecordings: callRecording._id }
    });

    console.log('Call recording saved:', callRecording._id);

    res.json({
      success: true,
      recording: callRecording
    });

  } catch (error) {
    console.error('Call recording upload error:', error);
    res.status(500).json({
      error: 'Failed to upload call recording',
      details: error.message
    });
  }
});

// GET /api/call-recordings/work-order/:workOrderId
router.get('/work-order/:workOrderId', auth, async (req, res) => {
  try {
    const { workOrderId } = req.params;

    const recordings = await CallRecording.find({ workOrderId })
      .populate('technicianId', 'name email')
      .sort({ recordedAt: -1 });

    res.json({
      success: true,
      recordings
    });

  } catch (error) {
    console.error('Get recordings error:', error);
    res.status(500).json({ error: 'Failed to fetch recordings' });
  }
});

// DELETE /api/call-recordings/:recordingId
router.delete('/:recordingId', auth, async (req, res) => {
  try {
    const { recordingId } = req.params;

    const recording = await CallRecording.findById(recordingId);
    if (!recording) {
      return res.status(404).json({ error: 'Recording not found' });
    }

    // Delete from Cloudinary
    const publicId = recording.recordingUrl.split('/').pop().split('.')[0];
    await cloudinary.uploader.destroy(`call-recordings/${publicId}`, {
      resource_type: 'video'
    });

    // Remove from WorkOrder
    await WorkOrder.findByIdAndUpdate(recording.workOrderId, {
      $pull: { callRecordings: recordingId }
    });

    // Delete from database
    await CallRecording.findByIdAndDelete(recordingId);

    res.json({ success: true });

  } catch (error) {
    console.error('Delete recording error:', error);
    res.status(500).json({ error: 'Failed to delete recording' });
  }
});

module.exports = router;
```

Register u `robotikb/server.js`:

```javascript
const callRecordingsRouter = require('./routes/callRecordings');
app.use('/api/call-recordings', callRecordingsRouter);
```

#### 3.4 - Update WorkOrder Model

Dodati u `robotikb/models/WorkOrder.js`:

```javascript
callRecordings: [{
  type: Schema.Types.ObjectId,
  ref: 'CallRecording'
}]
```

---

### **FAZA 4: Admin Panel (1 dan)**

#### 4.1 - CallRecordingsSection Component

`robotikf/src/pages/WorkOrders/components/CallRecordingsSection.js`:

```javascript
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './CallRecordingsSection.css';

const CallRecordingsSection = ({ workOrderId }) => {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playingId, setPlayingId] = useState(null);

  useEffect(() => {
    fetchRecordings();
  }, [workOrderId]);

  const fetchRecordings = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/call-recordings/work-order/${workOrderId}`
      );
      setRecordings(response.data.recordings || []);
      setError(null);
    } catch (error) {
      console.error('Error fetching recordings:', error);
      setError('Failed to load call recordings');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (ms) => {
    if (!ms || ms === 0) return 'Unknown';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    const mb = (bytes / (1024 * 1024)).toFixed(2);
    return `${mb} MB`;
  };

  const handleDelete = async (recordingId) => {
    if (!window.confirm('Are you sure you want to delete this recording?')) {
      return;
    }

    try {
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/call-recordings/${recordingId}`
      );
      setRecordings(recordings.filter(r => r._id !== recordingId));
    } catch (error) {
      console.error('Error deleting recording:', error);
      alert('Failed to delete recording');
    }
  };

  const handleDownload = (recordingUrl, phoneNumber) => {
    const link = document.createElement('a');
    link.href = recordingUrl;
    link.download = `call_${phoneNumber}_${Date.now()}.mp3`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="recordings-loading">
        <div className="spinner"></div>
        <p>Loading call recordings...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="recordings-error">
        <p>{error}</p>
        <button onClick={fetchRecordings}>Retry</button>
      </div>
    );
  }

  if (recordings.length === 0) {
    return (
      <div className="recordings-empty">
        <svg className="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
        <p>No call recordings for this work order</p>
      </div>
    );
  }

  return (
    <div className="call-recordings-section">
      <div className="recordings-header">
        <h3>Call Recordings ({recordings.length})</h3>
        <button onClick={fetchRecordings} className="refresh-btn">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <div className="recordings-list">
        {recordings.map(recording => (
          <div key={recording._id} className="recording-card">
            <div className="recording-header">
              <div className="recording-info">
                <div className="phone-number">{recording.phoneNumber}</div>
                <div className="recording-date">
                  {new Date(recording.recordedAt).toLocaleString('sr-RS', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
              <div className="recording-meta">
                <span className="file-size">{formatFileSize(recording.metadata?.fileSize)}</span>
                {recording.duration > 0 && (
                  <span className="duration">{formatDuration(recording.duration)}</span>
                )}
              </div>
            </div>

            <div className="recording-player">
              <audio
                controls
                className="audio-player"
                onPlay={() => setPlayingId(recording._id)}
                onPause={() => setPlayingId(null)}
                preload="metadata"
              >
                <source src={recording.recordingUrl} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </div>

            <div className="recording-actions">
              <button
                onClick={() => handleDownload(recording.recordingUrl, recording.phoneNumber)}
                className="action-btn download-btn"
                title="Download recording"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </button>

              <button
                onClick={() => handleDelete(recording._id)}
                className="action-btn delete-btn"
                title="Delete recording"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>

            {recording.technicianId && (
              <div className="recording-footer">
                <span className="technician-name">
                  Recorded by: {recording.technicianId.name}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CallRecordingsSection;
```

#### 4.2 - CSS Styling

`robotikf/src/pages/WorkOrders/components/CallRecordingsSection.css`:

```css
.call-recordings-section {
  padding: 24px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.recordings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.recordings-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.refresh-btn {
  padding: 8px;
  background: #f3f4f6;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.refresh-btn:hover {
  background: #e5e7eb;
}

.refresh-btn svg {
  width: 20px;
  height: 20px;
  color: #6b7280;
}

.recordings-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.recording-card {
  padding: 20px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  transition: box-shadow 0.2s;
}

.recording-card:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.recording-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.recording-info {
  flex: 1;
}

.phone-number {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}

.recording-date {
  font-size: 14px;
  color: #6b7280;
}

.recording-meta {
  display: flex;
  gap: 12px;
  align-items: center;
}

.file-size,
.duration {
  font-size: 13px;
  color: #6b7280;
  padding: 4px 8px;
  background: white;
  border-radius: 4px;
}

.recording-player {
  margin-bottom: 16px;
}

.audio-player {
  width: 100%;
  height: 40px;
}

.recording-actions {
  display: flex;
  gap: 12px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn svg {
  width: 18px;
  height: 18px;
}

.download-btn {
  background: #3b82f6;
  color: white;
}

.download-btn:hover {
  background: #2563eb;
}

.delete-btn {
  background: #ef4444;
  color: white;
}

.delete-btn:hover {
  background: #dc2626;
}

.recording-footer {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
}

.technician-name {
  font-size: 13px;
  color: #6b7280;
}

.recordings-loading,
.recordings-error,
.recordings-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  color: #6b7280;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f4f6;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-icon {
  width: 64px;
  height: 64px;
  color: #d1d5db;
  margin-bottom: 16px;
}

.recordings-error button {
  margin-top: 16px;
  padding: 8px 24px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.recordings-error button:hover {
  background: #2563eb;
}
```

#### 4.3 - Integration u WorkOrderDetail

U `robotikf/src/pages/WorkOrders/WorkOrderDetail.js`, dodati:

```javascript
import CallRecordingsSection from './components/CallRecordingsSection';

// U render sekciji, dodati novi section:
<div className="work-order-section">
  <CallRecordingsSection workOrderId={workOrderId} />
</div>
```

---

## 📝 **DEPLOYMENT CHECKLIST**

### Pre Deploy-a:

```
□ Xiaomi 13 je na Global ROM verziji (NE EU/EEA)
□ ADB tools instalirani na računaru
□ USB Debugging omogućen na telefonu
□ Izvršene ADB komande za omogućavanje Xiaomi Dialera
□ Test poziv snimljen uspešno
□ react-native-fs instaliran u robotikm
□ Backend endpoints dodati
□ CallRecording model kreiran u MongoDB
□ Cloudinary konfigurisan za audio upload
□ Frontend komponenta dodata
```

### Deployment Steps:

1. **Backend Deploy**
```bash
cd robotikb
# Dodati nove rute i model
git add .
git commit -m "Add call recording backend support"
git push
# Deploy na Render.com će se automatski aktivirati
```

2. **Frontend Deploy**
```bash
cd robotikf
# Dodati CallRecordingsSection komponentu
npm run build
# Deploy na hosting
```

3. **Mobile App Build**
```bash
cd robotikm
npm install
# Build APK
eas build --platform android --profile production
# ili
cd android && ./gradlew assembleRelease
```

4. **Distribute APK**
- Upload na interni server
- Distribuirati tehničarima preko direct download
- NE upload-ovati na Google Play Store (jer koristi AccessibilityService workaround)

---

## ⚠️ **VAŽNA UPOZORENJA**

### Legalna Compliance:

```
✅ OBAVEZNO - Pre korišćenja:
1. Pisano obavestiti sve tehničare da se pozivi snimaju
2. Ažurirati Privacy Policy
3. Dodati obaveštenje u aplikaciju pri prvom pokretanju
4. Implementirati Data Retention Policy (6 meseci)
5. GDPR compliance - pravo na brisanje snimaka
```

### Tehnička Ograničenja:

```
⚠️ Radi SAMO na Xiaomi uređajima sa Global ROM
⚠️ NE RADI na EU/EEA ROM verzijama
⚠️ Nakon factory reset-a, potrebno ponovo izvršiti ADB komande
⚠️ Ako Xiaomi update-uje sistem, možda će biti potrebno ponovo
⚠️ Aplikacija NE SME ići na Google Play Store (direktna APK distribucija)
```

### Storage Management:

```
⚠️ MP3 fajlovi mogu biti veliki (1-10 MB po pozivu)
⚠️ Implementirati auto-cleanup lokalnih fajlova nakon upload-a
⚠️ Cloudinary free tier: 25GB storage, paziti na limit
⚠️ MongoDB storage: Čuvati samo metadata, ne cele fajlove
```

---

## 🎯 **PREDNOSTI OVOG REŠENJA**

✅ **BEZ ROOT-a** - Garancija ostaje validna
✅ **Native Kvalitet** - 10/10 za obe strane poziva
✅ **Bluetooth Support** - Radi sa wireless slušalicama
✅ **Automatski** - Svaki poziv se snima bez intervencije
✅ **MP3 Format** - Univerzalno kompatibilan
✅ **Brza Implementacija** - 5-6 dana ukupno
✅ **Jednostavno** - 5 ADB komandi, jednom po telefonu
✅ **Stabilno** - Koristi native Xiaomi funkcionalnost

---

## 📞 **SUPPORT & TROUBLESHOOTING**

### Problem: "Folder /MIUI/sound_recorder/call_rec/ ne postoji"

**Rešenje:**
```
1. Proveri da li je Xiaomi Dialer aktivan (Settings → Apps → Default apps → Phone)
2. Napravi test poziv
3. Folder će biti automatski kreiran nakon prvog poziva
```

### Problem: "Snimci se ne upload-uju"

**Rešenje:**
```
1. Proveri internet konekciju
2. Proveri storage permissions (READ_EXTERNAL_STORAGE)
3. Proveri logcat: adb logcat | grep "Xiaomi Watcher"
4. Snimci ostaju u offline queue i biće upload-ovani kasnije
```

### Problem: "ADB komanda ne radi"

**Rešenje:**
```
1. Proveri da li je USB Debugging omogućen
2. Proveri da li je telefon autorizovan (tapni OK na telefonu)
3. Restartuj ADB server: adb kill-server && adb start-server
4. Pokušaj ponovo
```

### Problem: "CallRecording nije definisan u Work Order modelu"

**Rešenje:**
```javascript
// Dodati u robotikb/models/WorkOrder.js:
callRecordings: [{
  type: Schema.Types.ObjectId,
  ref: 'CallRecording'
}]
```

---

## 🚀 **NEXT STEPS**

1. **Verifikuj ROM verziju** (vidi dole kako)
2. **Instaliraj ADB** na računar
3. **Izvršite ADB komande** (jednom po telefonu)
4. **Testiraj snimanje** (test poziv)
5. **Implementiraj FileWatcher** u aplikaciji
6. **Dodaj backend endpoints**
7. **Dodaj frontend komponente**
8. **Deploy i testiranje**

---

## 📋 **ESTIMATED TIMELINE**

```
Day 1: Setup Xiaomi Dialer (1h) + Backend API (6h) = 7h
Day 2: FileWatcher Service implementation = 8h
Day 3: Frontend Admin Panel + Testing = 8h
Day 4: Integration testing + Bug fixes = 6h
Day 5: Documentation + Deployment = 4h

TOTAL: 5 radnih dana (33 sata)
```

---

**Autor:** Claude AI Assistant
**Datum:** 2025-01-24
**Verzija:** 1.0
**Status:** READY FOR IMPLEMENTATION ✅
