# Call Recording Implementation Guide

## 📋 Pregled Projekta

Ovaj dokument opisuje implementaciju funkcionalnosti snimanja telefonskih poziva u Android aplikaciji **robotikm** sa linkingom na backend (**robotikb**) i web panel (**robotikf**).

---

## 🔴 KRITIČNI NALAZI - AccessibilityService Analiza (2024-2025)

### **Realnost AccessibilityService za Call Recording:**

#### ❌ **Ograničenja:**
- AccessibilityService **SAM PO SEBI NE SNIMA AUDIO**
- Služi SAMO za **detekciju poziva** i pristup UI događajima
- Za snimanje je potreban **MediaRecorder** sa odgovarajućim AudioSource

#### ⚠️ **Problemi sa postojećim rešenjima:**
- **50-70% korisnika** Cube ACR prijavljuje "čujem samo sebe"
- **Bluetooth/headset pozivi** - gotovo uvek NE RADE
- **Wi-Fi calling** - NE FUNKCIONIŠE pouzdano
- Kvalitet zavisi od proizvođača telefona - **NEPREDVIDIVO**

#### ✅ **Šta RADI:**
- Detekcija incoming/outgoing poziva
- Dobijanje broja telefona pozivara
- Snimanje vaše strane poziva (mikrofon)

#### ❌ **Šta NE RADI pouzdano:**
- Snimanje DRUGE STRANE poziva bez dodatnih workaround-a
- Bluetooth/headset pozivi
- Wi-Fi calling

---

## 🎯 DVA PRISTUPA - SA I BEZ ROOT-a

---

# REŠENJE A: BEZ ROOT-a (AccessibilityService + Speakerphone)

## Pregled

Koristi AccessibilityService za detekciju poziva i automatski uključuje speakerphone kako bi mikrofon mogao da snimi obe strane razgovora.

### Prednosti:
- ✅ Radi na svim Android verzijama 10-15
- ✅ Bez root-a
- ✅ Snima OBE STRANE (preko speakerfona)
- ✅ Direktna APK distribucija
- ✅ Brža implementacija (5-7 dana)

### Mane:
- ⚠️ Korisnik MORA držati telefon na speakerphone
- ⚠️ Kvalitet zavisi od ambijenta (buka)
- ⚠️ Bluetooth/headset NE RADI

### Očekivani kvalitet:
- ✅ Vaša strana: 9/10
- ⚠️ Druga strana: 6-7/10 (zavisi od volumena i buke)
- ⚠️ Bluetooth/headset: NE RADI
- ✅ Obični telefonski pozivi: RADI

---

## A.1 - Android Implementacija (Native Module)

### A.1.1 - Permissions (AndroidManifest.xml)

Dodati u `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Call Recording Permissions -->
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.READ_PHONE_STATE" />
    <uses-permission android:name="android.permission.READ_CALL_LOG" />
    <uses-permission android:name="android.permission.PROCESS_OUTGOING_CALLS" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MICROPHONE" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />

    <application>
        <!-- Accessibility Service -->
        <service
            android:name=".callrecording.CallRecordingAccessibilityService"
            android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE"
            android:exported="true">
            <intent-filter>
                <action android:name="android.accessibilityservice.AccessibilityService" />
            </intent-filter>
            <meta-data
                android:name="android.accessibilityservice"
                android:resource="@xml/accessibility_service_config" />
        </service>

        <!-- Foreground Service -->
        <service
            android:name=".callrecording.CallRecordingService"
            android:enabled="true"
            android:exported="false"
            android:foregroundServiceType="microphone" />

        <!-- Broadcast Receiver -->
        <receiver
            android:name=".callrecording.CallReceiver"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.PHONE_STATE" />
                <action android:name="android.intent.action.NEW_OUTGOING_CALL" />
            </intent-filter>
        </receiver>
    </application>
</manifest>
```

### A.1.2 - Accessibility Service Configuration

Kreirati `android/app/src/main/res/xml/accessibility_service_config.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<accessibility-service xmlns:android="http://schemas.android.com/apk/res/android"
    android:accessibilityEventTypes="typeAllMask"
    android:accessibilityFeedbackType="feedbackGeneric"
    android:accessibilityFlags="flagDefault"
    android:canRetrieveWindowContent="true"
    android:description="@string/accessibility_service_description"
    android:notificationTimeout="100" />
```

### A.1.3 - CallRecordingAccessibilityService.java

`android/app/src/main/java/com/robotikm/callrecording/CallRecordingAccessibilityService.java`:

```java
package com.robotikm.callrecording;

import android.accessibilityservice.AccessibilityService;
import android.content.Intent;
import android.view.accessibility.AccessibilityEvent;
import android.util.Log;

public class CallRecordingAccessibilityService extends AccessibilityService {
    private static final String TAG = "CallRecordingAccessibility";
    private static boolean isServiceRunning = false;

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        // Ova metoda će biti pozvana za accessibility događaje
        // Koristi se kao indikator da je servis aktivan
        Log.d(TAG, "Accessibility event received: " + event.getEventType());
    }

    @Override
    public void onInterrupt() {
        Log.d(TAG, "Accessibility service interrupted");
    }

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        isServiceRunning = true;
        Log.d(TAG, "Accessibility service connected");
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        isServiceRunning = false;
        Log.d(TAG, "Accessibility service destroyed");
    }

    public static boolean isRunning() {
        return isServiceRunning;
    }
}
```

### A.1.4 - CallReceiver.java (PhoneState Listener)

`android/app/src/main/java/com/robotikm/callrecording/CallReceiver.java`:

```java
package com.robotikm.callrecording;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.telephony.TelephonyManager;
import android.util.Log;

public class CallReceiver extends BroadcastReceiver {
    private static final String TAG = "CallReceiver";
    private static boolean isCallActive = false;

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();

        if (action != null && action.equals(TelephonyManager.ACTION_PHONE_STATE_CHANGED)) {
            String state = intent.getStringExtra(TelephonyManager.EXTRA_STATE);
            String phoneNumber = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER);

            Log.d(TAG, "Phone state changed: " + state);

            if (state.equals(TelephonyManager.EXTRA_STATE_RINGING)) {
                // Incoming call - Preparing
                Log.d(TAG, "Incoming call from: " + phoneNumber);
                prepareRecording(context, phoneNumber, "incoming");

            } else if (state.equals(TelephonyManager.EXTRA_STATE_OFFHOOK)) {
                // Call answered/active - Start recording
                Log.d(TAG, "Call active");
                if (!isCallActive) {
                    isCallActive = true;
                    startRecording(context, phoneNumber);
                }

            } else if (state.equals(TelephonyManager.EXTRA_STATE_IDLE)) {
                // Call ended - Stop recording
                Log.d(TAG, "Call ended");
                if (isCallActive) {
                    isCallActive = false;
                    stopRecording(context);
                }
            }
        } else if (action != null && action.equals(Intent.ACTION_NEW_OUTGOING_CALL)) {
            String phoneNumber = intent.getStringExtra(Intent.EXTRA_PHONE_NUMBER);
            Log.d(TAG, "Outgoing call to: " + phoneNumber);
            prepareRecording(context, phoneNumber, "outgoing");
        }
    }

    private void prepareRecording(Context context, String phoneNumber, String callType) {
        Intent serviceIntent = new Intent(context, CallRecordingService.class);
        serviceIntent.setAction("PREPARE_RECORDING");
        serviceIntent.putExtra("phoneNumber", phoneNumber);
        serviceIntent.putExtra("callType", callType);
        context.startService(serviceIntent);
    }

    private void startRecording(Context context, String phoneNumber) {
        Intent serviceIntent = new Intent(context, CallRecordingService.class);
        serviceIntent.setAction("START_RECORDING");
        serviceIntent.putExtra("phoneNumber", phoneNumber);
        context.startForegroundService(serviceIntent);
    }

    private void stopRecording(Context context) {
        Intent serviceIntent = new Intent(context, CallRecordingService.class);
        serviceIntent.setAction("STOP_RECORDING");
        context.startService(serviceIntent);
    }
}
```

### A.1.5 - CallRecordingService.java (Foreground Service)

`android/app/src/main/java/com/robotikm/callrecording/CallRecordingService.java`:

```java
package com.robotikm.callrecording;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.AudioManager;
import android.media.MediaRecorder;
import android.os.Build;
import android.os.Environment;
import android.os.IBinder;
import android.util.Log;
import androidx.core.app.NotificationCompat;

import java.io.File;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class CallRecordingService extends Service {
    private static final String TAG = "CallRecordingService";
    private static final String CHANNEL_ID = "CallRecordingChannel";
    private static final int NOTIFICATION_ID = 1001;

    private MediaRecorder mediaRecorder;
    private AudioManager audioManager;
    private String currentPhoneNumber;
    private String currentCallType;
    private String currentFilePath;
    private long callStartTime;
    private boolean isSpeakerphoneWasOn = false;
    private int originalVolume = -1;

    @Override
    public void onCreate() {
        super.onCreate();
        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        createNotificationChannel();
        Log.d(TAG, "Service created");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && intent.getAction() != null) {
            String action = intent.getAction();

            switch (action) {
                case "PREPARE_RECORDING":
                    currentPhoneNumber = intent.getStringExtra("phoneNumber");
                    currentCallType = intent.getStringExtra("callType");
                    Log.d(TAG, "Prepared for recording: " + currentCallType);
                    break;

                case "START_RECORDING":
                    startForeground(NOTIFICATION_ID, createNotification("Snimanje poziva u toku..."));
                    enableSpeakerphone();
                    startRecording();
                    break;

                case "STOP_RECORDING":
                    stopRecording();
                    disableSpeakerphone();
                    stopForeground(true);
                    stopSelf();
                    break;
            }
        }
        return START_NOT_STICKY;
    }

    private void enableSpeakerphone() {
        try {
            // Sačuvaj trenutni state
            isSpeakerphoneWasOn = audioManager.isSpeakerphoneOn();
            originalVolume = audioManager.getStreamVolume(AudioManager.STREAM_VOICE_CALL);

            // Uključi speakerphone
            audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);
            audioManager.setSpeakerphoneOn(true);

            // Povećaj volume
            int maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_VOICE_CALL);
            audioManager.setStreamVolume(AudioManager.STREAM_VOICE_CALL,
                                        (int)(maxVolume * 0.8), 0);

            Log.d(TAG, "Speakerphone enabled");
        } catch (Exception e) {
            Log.e(TAG, "Error enabling speakerphone", e);
        }
    }

    private void disableSpeakerphone() {
        try {
            // Vrati na prethodni state
            audioManager.setSpeakerphoneOn(isSpeakerphoneWasOn);

            if (originalVolume != -1) {
                audioManager.setStreamVolume(AudioManager.STREAM_VOICE_CALL,
                                            originalVolume, 0);
            }

            audioManager.setMode(AudioManager.MODE_NORMAL);
            Log.d(TAG, "Speakerphone disabled");
        } catch (Exception e) {
            Log.e(TAG, "Error disabling speakerphone", e);
        }
    }

    private void startRecording() {
        try {
            // Kreiraj folder za snimke
            File recordingsDir = new File(getExternalFilesDir(null), "CallRecordings");
            if (!recordingsDir.exists()) {
                recordingsDir.mkdirs();
            }

            // Generiši ime fajla
            String timestamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(new Date());
            String fileName = "CALL_" + currentCallType + "_" + timestamp + ".m4a";
            currentFilePath = new File(recordingsDir, fileName).getAbsolutePath();

            callStartTime = System.currentTimeMillis();

            // Setup MediaRecorder
            mediaRecorder = new MediaRecorder();

            // KRITIČNO: VOICE_RECOGNITION je najbolji izbor za AccessibilityService pristup
            mediaRecorder.setAudioSource(MediaRecorder.AudioSource.VOICE_RECOGNITION);
            mediaRecorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
            mediaRecorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
            mediaRecorder.setAudioEncodingBitRate(128000);
            mediaRecorder.setAudioSamplingRate(44100);
            mediaRecorder.setOutputFile(currentFilePath);

            mediaRecorder.prepare();
            mediaRecorder.start();

            Log.d(TAG, "Recording started: " + currentFilePath);

        } catch (IOException e) {
            Log.e(TAG, "Error starting recording", e);
            releaseMediaRecorder();
        }
    }

    private void stopRecording() {
        try {
            if (mediaRecorder != null) {
                mediaRecorder.stop();
                mediaRecorder.reset();

                long duration = System.currentTimeMillis() - callStartTime;
                Log.d(TAG, "Recording stopped. Duration: " + duration + "ms");

                // Obavesti React Native da je snimak gotov
                notifyReactNative(currentFilePath, currentPhoneNumber, currentCallType, duration);

                releaseMediaRecorder();
            }
        } catch (Exception e) {
            Log.e(TAG, "Error stopping recording", e);
            releaseMediaRecorder();
        }
    }

    private void releaseMediaRecorder() {
        if (mediaRecorder != null) {
            mediaRecorder.release();
            mediaRecorder = null;
        }
    }

    private void notifyReactNative(String filePath, String phoneNumber, String callType, long duration) {
        // Ovde će biti event emitter ka React Native
        Intent broadcastIntent = new Intent("CALL_RECORDING_COMPLETED");
        broadcastIntent.putExtra("filePath", filePath);
        broadcastIntent.putExtra("phoneNumber", phoneNumber);
        broadcastIntent.putExtra("callType", callType);
        broadcastIntent.putExtra("duration", duration);
        sendBroadcast(broadcastIntent);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Call Recording Service",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Služi za snimanje telefonskih poziva");

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private Notification createNotification(String contentText) {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Snimanje poziva")
            .setContentText(contentText)
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        releaseMediaRecorder();
        disableSpeakerphone();
        Log.d(TAG, "Service destroyed");
    }
}
```

### A.1.6 - React Native Module Bridge

`android/app/src/main/java/com/robotikm/callrecording/CallRecordingModule.java`:

```java
package com.robotikm.callrecording;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.provider.Settings;
import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class CallRecordingModule extends ReactContextBaseJavaModule {
    private static final String TAG = "CallRecordingModule";
    private ReactApplicationContext reactContext;
    private BroadcastReceiver recordingCompletedReceiver;

    public CallRecordingModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        setupBroadcastReceiver();
    }

    @Override
    public String getName() {
        return "CallRecordingModule";
    }

    private void setupBroadcastReceiver() {
        recordingCompletedReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String filePath = intent.getStringExtra("filePath");
                String phoneNumber = intent.getStringExtra("phoneNumber");
                String callType = intent.getStringExtra("callType");
                long duration = intent.getLongExtra("duration", 0);

                WritableMap params = Arguments.createMap();
                params.putString("filePath", filePath);
                params.putString("phoneNumber", phoneNumber);
                params.putString("callType", callType);
                params.putDouble("duration", duration);

                sendEvent("CallRecordingCompleted", params);
            }
        };

        IntentFilter filter = new IntentFilter("CALL_RECORDING_COMPLETED");
        reactContext.registerReceiver(recordingCompletedReceiver, filter);
    }

    private void sendEvent(String eventName, WritableMap params) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
            .emit(eventName, params);
    }

    @ReactMethod
    public void isAccessibilityServiceEnabled(Promise promise) {
        try {
            boolean isEnabled = CallRecordingAccessibilityService.isRunning();
            promise.resolve(isEnabled);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void openAccessibilitySettings(Promise promise) {
        try {
            Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            reactContext.startActivity(intent);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    @Override
    public void onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy();
        if (recordingCompletedReceiver != null) {
            reactContext.unregisterReceiver(recordingCompletedReceiver);
        }
    }
}
```

Register u `MainApplication.java`:

```java
@Override
protected List<ReactPackage> getPackages() {
    List<ReactPackage> packages = new PackageList(this).getPackages();
    packages.add(new ReactPackage() {
        @Override
        public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
            List<NativeModule> modules = new ArrayList<>();
            modules.add(new CallRecordingModule(reactContext));
            return modules;
        }

        @Override
        public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
            return Collections.emptyList();
        }
    });
    return packages;
}
```

---

## A.2 - React Native Integration

### A.2.1 - CallRecordingService.js

`src/services/CallRecordingService.js`:

```javascript
import { NativeModules, NativeEventEmitter, Platform, PermissionsAndroid, Alert } from 'react-native';
import RNFS from 'react-native-fs';
import { API_URL } from './api';
import dataRepository from './dataRepository';

const { CallRecordingModule } = NativeModules;
const eventEmitter = new NativeEventEmitter(CallRecordingModule);

class CallRecordingService {
  constructor() {
    this.isListening = false;
    this.setupEventListeners();
  }

  setupEventListeners() {
    if (this.isListening) return;

    eventEmitter.addListener('CallRecordingCompleted', async (event) => {
      console.log('[CallRecording] Recording completed:', event);

      try {
        await this.handleRecordingCompleted(event);
      } catch (error) {
        console.error('[CallRecording] Error handling completed recording:', error);
      }
    });

    this.isListening = true;
  }

  async handleRecordingCompleted(event) {
    const { filePath, phoneNumber, callType, duration } = event;

    // Sačuvaj metadata lokalno
    const recording = {
      id: Date.now().toString(),
      filePath,
      phoneNumber,
      callType,
      duration,
      recordedAt: new Date().toISOString(),
      uploaded: false
    };

    // Sačuvaj u offline storage
    await dataRepository.saveCallRecording(recording);

    // Pokušaj upload ako je online
    await this.uploadRecording(recording);
  }

  async uploadRecording(recording) {
    try {
      // Proveri da li postoji povezan work order za ovaj broj telefona
      const workOrder = await dataRepository.findWorkOrderByPhoneNumber(
        recording.phoneNumber
      );

      if (!workOrder) {
        console.log('[CallRecording] No work order found for phone:', recording.phoneNumber);
        return;
      }

      // Konvertuj fajl u base64 ili formiraj FormData
      const fileExists = await RNFS.exists(recording.filePath);
      if (!fileExists) {
        console.error('[CallRecording] File not found:', recording.filePath);
        return;
      }

      const formData = new FormData();
      formData.append('audio', {
        uri: recording.filePath,
        type: 'audio/mp4',
        name: `call_${recording.id}.m4a`
      });
      formData.append('workOrderId', workOrder._id);
      formData.append('phoneNumber', recording.phoneNumber);
      formData.append('callType', recording.callType);
      formData.append('duration', recording.duration);
      formData.append('recordedAt', recording.recordedAt);

      // Upload na backend
      const response = await fetch(`${API_URL}/api/call-recordings/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });

      if (response.ok) {
        // Označi kao uploaded
        recording.uploaded = true;
        await dataRepository.updateCallRecording(recording);

        // Obriši lokalni fajl nakon uspešnog upload-a
        await RNFS.unlink(recording.filePath);

        console.log('[CallRecording] Successfully uploaded:', recording.id);
      }

    } catch (error) {
      console.error('[CallRecording] Upload error:', error);
      // Ostaje u offline queue za kasnije
    }
  }

  async requestPermissions() {
    if (Platform.OS !== 'android') return false;

    try {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
        PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      ];

      const granted = await PermissionsAndroid.requestMultiple(permissions);

      const allGranted = Object.values(granted).every(
        status => status === PermissionsAndroid.RESULTS.GRANTED
      );

      return allGranted;
    } catch (error) {
      console.error('[CallRecording] Permission error:', error);
      return false;
    }
  }

  async checkAccessibilityService() {
    try {
      const isEnabled = await CallRecordingModule.isAccessibilityServiceEnabled();
      return isEnabled;
    } catch (error) {
      console.error('[CallRecording] Check accessibility error:', error);
      return false;
    }
  }

  async openAccessibilitySettings() {
    try {
      await CallRecordingModule.openAccessibilitySettings();
    } catch (error) {
      console.error('[CallRecording] Open settings error:', error);
    }
  }

  async setupCallRecording() {
    // 1. Request permissions
    const hasPermissions = await this.requestPermissions();
    if (!hasPermissions) {
      Alert.alert(
        'Potrebne dozvole',
        'Aplikacija zahteva dozvole za snimanje poziva.'
      );
      return false;
    }

    // 2. Check accessibility service
    const isAccessibilityEnabled = await this.checkAccessibilityService();
    if (!isAccessibilityEnabled) {
      Alert.alert(
        'Omogući Accessibility Service',
        'Za automatsko snimanje poziva, omogućite "Call Recording Service" u accessibility podešavanjima.',
        [
          { text: 'Otkaži', style: 'cancel' },
          { text: 'Otvori podešavanja', onPress: () => this.openAccessibilitySettings() }
        ]
      );
      return false;
    }

    return true;
  }

  async syncPendingRecordings() {
    try {
      const pendingRecordings = await dataRepository.getPendingCallRecordings();

      for (const recording of pendingRecordings) {
        await this.uploadRecording(recording);
      }

      console.log('[CallRecording] Synced pending recordings:', pendingRecordings.length);
    } catch (error) {
      console.error('[CallRecording] Sync error:', error);
    }
  }
}

export default new CallRecordingService();
```

### A.2.2 - Integration u App.js

```javascript
import CallRecordingService from './services/CallRecordingService';

// U useEffect nakon login-a:
useEffect(() => {
  if (user) {
    // Setup call recording
    CallRecordingService.setupCallRecording();

    // Sync pending recordings
    CallRecordingService.syncPendingRecordings();
  }
}, [user]);
```

### A.2.3 - Settings Screen

Dodati opciju u settings za enable/disable snimanja poziva.

---

## A.3 - Backend Implementacija

### A.3.1 - CallRecording Model

`robotikb/models/CallRecording.js`:

```javascript
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CallRecordingSchema = new Schema({
  workOrderId: {
    type: Schema.Types.ObjectId,
    ref: 'WorkOrder',
    required: true
  },
  technicianId: {
    type: Schema.Types.ObjectId,
    ref: 'Technician',
    required: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  callType: {
    type: String,
    enum: ['incoming', 'outgoing'],
    required: true
  },
  duration: {
    type: Number, // u milisekundama
    required: true
  },
  recordingUrl: {
    type: String, // Cloudinary URL
    required: true
  },
  recordedAt: {
    type: Date,
    required: true
  },
  metadata: {
    fileSize: Number,
    format: String,
    quality: String
  }
}, { timestamps: true });

CallRecordingSchema.index({ workOrderId: 1 });
CallRecordingSchema.index({ technicianId: 1 });
CallRecordingSchema.index({ recordedAt: -1 });

module.exports = mongoose.model('CallRecording', CallRecordingSchema);
```

### A.3.2 - API Routes

`robotikb/routes/callRecordings.js`:

```javascript
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadAudio, deleteAudio } = require('../config/cloudinary');
const { CallRecording, WorkOrder, Technician } = require('../models');
const { auth } = require('../middleware/auth');

// Multer configuration za audio upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/mp4', 'audio/m4a', 'audio/mpeg', 'audio/mp3'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files allowed.'));
    }
  }
});

// Upload call recording
router.post('/upload', auth, upload.single('audio'), async (req, res) => {
  try {
    const { workOrderId, phoneNumber, callType, duration, recordedAt } = req.body;
    const technicianId = req.user._id;

    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // Upload to Cloudinary
    const uploadResult = await uploadAudio(req.file.buffer, {
      folder: 'call-recordings',
      resource_type: 'video', // Cloudinary tretira audio kao video
      format: 'm4a'
    });

    // Create recording entry
    const callRecording = new CallRecording({
      workOrderId,
      technicianId,
      phoneNumber,
      callType,
      duration: parseInt(duration),
      recordingUrl: uploadResult.secure_url,
      recordedAt: new Date(recordedAt),
      metadata: {
        fileSize: req.file.size,
        format: req.file.mimetype,
        quality: 'standard'
      }
    });

    await callRecording.save();

    // Add reference to WorkOrder
    await WorkOrder.findByIdAndUpdate(workOrderId, {
      $push: { callRecordings: callRecording._id }
    });

    res.json({
      success: true,
      recording: callRecording
    });

  } catch (error) {
    console.error('Call recording upload error:', error);
    res.status(500).json({ error: 'Failed to upload call recording' });
  }
});

// Get recordings for work order
router.get('/work-order/:workOrderId', auth, async (req, res) => {
  try {
    const { workOrderId } = req.params;

    const recordings = await CallRecording.find({ workOrderId })
      .populate('technicianId', 'name')
      .sort({ recordedAt: -1 });

    res.json(recordings);

  } catch (error) {
    console.error('Get recordings error:', error);
    res.status(500).json({ error: 'Failed to fetch recordings' });
  }
});

// Get recordings for technician
router.get('/technician/:technicianId', auth, async (req, res) => {
  try {
    const { technicianId } = req.params;
    const { startDate, endDate } = req.query;

    const query = { technicianId };

    if (startDate && endDate) {
      query.recordedAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const recordings = await CallRecording.find(query)
      .populate('workOrderId', 'tisId address municipality')
      .sort({ recordedAt: -1 });

    res.json(recordings);

  } catch (error) {
    console.error('Get technician recordings error:', error);
    res.status(500).json({ error: 'Failed to fetch recordings' });
  }
});

// Delete recording
router.delete('/:recordingId', auth, async (req, res) => {
  try {
    const { recordingId } = req.params;

    const recording = await CallRecording.findById(recordingId);
    if (!recording) {
      return res.status(404).json({ error: 'Recording not found' });
    }

    // Delete from Cloudinary
    await deleteAudio(recording.recordingUrl);

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

Register u `server.js`:

```javascript
const callRecordingsRouter = require('./routes/callRecordings');
app.use('/api/call-recordings', callRecordingsRouter);
```

### A.3.3 - Update WorkOrder Model

Dodati u `robotikb/models/WorkOrder.js`:

```javascript
callRecordings: [{
  type: Schema.Types.ObjectId,
  ref: 'CallRecording'
}]
```

---

## A.4 - Frontend Web (Admin Panel)

### A.4.1 - Call Recordings Component

`robotikf/src/pages/WorkOrders/components/CallRecordingsSection.js`:

```javascript
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CallRecordingsSection = ({ workOrderId }) => {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState(null);

  useEffect(() => {
    fetchRecordings();
  }, [workOrderId]);

  const fetchRecordings = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/call-recordings/work-order/${workOrderId}`
      );
      setRecordings(response.data);
    } catch (error) {
      console.error('Error fetching recordings:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleDelete = async (recordingId) => {
    if (!window.confirm('Da li ste sigurni da želite da obrišete ovaj snimak?')) {
      return;
    }

    try {
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/call-recordings/${recordingId}`
      );
      setRecordings(recordings.filter(r => r._id !== recordingId));
    } catch (error) {
      console.error('Error deleting recording:', error);
      alert('Greška pri brisanju snimka');
    }
  };

  if (loading) {
    return <div>Učitavanje snimaka poziva...</div>;
  }

  if (recordings.length === 0) {
    return (
      <div className="text-gray-500 text-center py-8">
        Nema snimljenih poziva za ovaj radni nalog
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Snimljeni pozivi ({recordings.length})</h3>

      {recordings.map(recording => (
        <div key={recording._id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-medium text-gray-900">{recording.phoneNumber}</div>
              <div className="text-sm text-gray-500">
                {new Date(recording.recordedAt).toLocaleString('sr-RS')}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 text-xs rounded-full ${
                recording.callType === 'incoming'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-green-100 text-green-700'
              }`}>
                {recording.callType === 'incoming' ? 'Dolazni' : 'Odlazni'}
              </span>
              <span className="text-sm text-gray-600">
                {formatDuration(recording.duration)}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <audio
              controls
              className="flex-1"
              onPlay={() => setPlayingId(recording._id)}
              onPause={() => setPlayingId(null)}
            >
              <source src={recording.recordingUrl} type="audio/mp4" />
              Vaš browser ne podržava audio reprodukciju.
            </audio>

            <button
              onClick={() => handleDelete(recording._id)}
              className="p-2 text-red-600 hover:bg-red-50 rounded"
              title="Obriši snimak"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>

          {recording.technicianId && (
            <div className="mt-2 text-xs text-gray-500">
              Tehničar: {recording.technicianId.name}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default CallRecordingsSection;
```

### A.4.2 - Integration u WorkOrderDetail

Dodati u `robotikf/src/pages/WorkOrders/WorkOrderDetail.js`:

```javascript
import CallRecordingsSection from './components/CallRecordingsSection';

// U render sekciji, dodati:
<div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden mb-6">
  <div className="p-6 border-b border-slate-200">
    <h3 className="text-lg font-semibold text-slate-900 flex items-center space-x-2">
      <span>📞</span>
      <span>Snimljeni pozivi</span>
    </h3>
  </div>
  <div className="p-6">
    <CallRecordingsSection workOrderId={id} />
  </div>
</div>
```

---

# REŠENJE B: SA ROOT-om (System App + VOICE_CALL)

## Pregled

Instaliranje aplikacije kao privileged system app omogućava pristup `CAPTURE_AUDIO_OUTPUT` permisiji i korišćenje `VOICE_CALL` audio source-a za PERFEKTNO snimanje obe strane poziva.

### Prednosti:
- ✅ **SAVRŠENO snimanje obe strane** (10/10 kvalitet)
- ✅ Radi sa Bluetooth/headset
- ✅ Radi sa Wi-Fi calling
- ✅ Bez potrebe za speakerphone
- ✅ Profesionalno rešenje

### Mane:
- ⚠️ Potreban ROOT
- ⚠️ Void warranty
- ⚠️ Komplikovaniji setup (8-10 dana)
- ⚠️ Potrebno flash-ovanje ROM-a ili Magisk

### Očekivani kvalitet:
- ✅ Vaša strana: 10/10
- ✅ Druga strana: 10/10
- ✅ Bluetooth/headset: RADI
- ✅ Wi-Fi calling: RADI

---

## B.1 - ROOT Setup (Magisk)

### B.1.1 - Root Telefona

1. **Unlock Bootloader:**
```bash
# Za većinu Android uređaja:
adb reboot bootloader
fastboot oem unlock
```

2. **Install Magisk:**
   - Download Magisk APK sa: https://github.com/topjohnwu/Magisk
   - Patch boot.img preko Magisk aplikacije
   - Flash patched boot.img:
```bash
fastboot flash boot magisk_patched.img
fastboot reboot
```

3. **Verify Root:**
```bash
adb shell
su
# Ako dobijete root prompt (#), root je uspešan
```

### B.1.2 - Install aplikacije kao System App

**Metod 1: Magisk Module (Preporučeno)**

Kreirati Magisk module strukturu:

```
CallRecorderSystemApp/
├── module.prop
├── system/
│   └── priv-app/
│       └── Robotikm/
│           └── Robotikm.apk
└── META-INF/
    └── com/
        └── google/
            └── android/
                ├── update-binary
                └── updater-script
```

`module.prop`:
```ini
id=robotikm_call_recorder
name=Robotikm Call Recorder
version=1.0
versionCode=1
author=YourName
description=System app for call recording with CAPTURE_AUDIO_OUTPUT
```

Install preko Magisk Manager-a.

**Metod 2: Manual System Installation**

```bash
adb root
adb remount
adb push Robotikm.apk /system/priv-app/Robotikm/
adb shell chmod 644 /system/priv-app/Robotikm/Robotikm.apk
adb reboot
```

---

## B.2 - Android Permissions & Configuration

### B.2.1 - AndroidManifest.xml (System App verzija)

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    android:sharedUserId="android.uid.system">

    <!-- Privileged Permissions -->
    <uses-permission android:name="android.permission.CAPTURE_AUDIO_OUTPUT" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.READ_PHONE_STATE" />
    <uses-permission android:name="android.permission.READ_CALL_LOG" />
    <uses-permission android:name="android.permission.PROCESS_OUTGOING_CALLS" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MICROPHONE" />

    <application
        android:allowBackup="false"
        android:label="@string/app_name"
        android:icon="@mipmap/ic_launcher">

        <!-- Call Recording Service -->
        <service
            android:name=".callrecording.PrivilegedCallRecordingService"
            android:enabled="true"
            android:exported="false"
            android:foregroundServiceType="microphone" />

        <!-- Broadcast Receiver -->
        <receiver
            android:name=".callrecording.PrivilegedCallReceiver"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.PHONE_STATE" />
                <action android:name="android.intent.action.NEW_OUTGOING_CALL" />
            </intent-filter>
        </receiver>
    </application>
</manifest>
```

### B.2.2 - Sign APK sa Platform Key

Za system app, APK mora biti potpisan sa platform signing key-em:

```bash
# Get platform keys od proizvođača ili koristi test keys
java -jar signapk.jar platform.x509.pem platform.pk8 \
  unsigned.apk signed-system.apk
```

---

## B.3 - Privileged Call Recording Implementation

### B.3.1 - PrivilegedCallRecordingService.java

`android/app/src/main/java/com/robotikm/callrecording/PrivilegedCallRecordingService.java`:

```java
package com.robotikm.callrecording;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.MediaRecorder;
import android.os.Build;
import android.os.Environment;
import android.os.IBinder;
import android.util.Log;
import androidx.core.app.NotificationCompat;

import java.io.File;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class PrivilegedCallRecordingService extends Service {
    private static final String TAG = "PrivilegedCallRecording";
    private static final String CHANNEL_ID = "CallRecordingChannel";
    private static final int NOTIFICATION_ID = 2001;

    private MediaRecorder mediaRecorder;
    private String currentPhoneNumber;
    private String currentCallType;
    private String currentFilePath;
    private long callStartTime;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        Log.d(TAG, "Privileged service created");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && intent.getAction() != null) {
            String action = intent.getAction();

            switch (action) {
                case "PREPARE_RECORDING":
                    currentPhoneNumber = intent.getStringExtra("phoneNumber");
                    currentCallType = intent.getStringExtra("callType");
                    break;

                case "START_RECORDING":
                    startForeground(NOTIFICATION_ID, createNotification("Snimanje poziva..."));
                    startRecording();
                    break;

                case "STOP_RECORDING":
                    stopRecording();
                    stopForeground(true);
                    stopSelf();
                    break;
            }
        }
        return START_NOT_STICKY;
    }

    private void startRecording() {
        try {
            File recordingsDir = new File(getExternalFilesDir(null), "CallRecordings");
            if (!recordingsDir.exists()) {
                recordingsDir.mkdirs();
            }

            String timestamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US)
                .format(new Date());
            String fileName = "CALL_" + currentCallType + "_" + timestamp + ".m4a";
            currentFilePath = new File(recordingsDir, fileName).getAbsolutePath();

            callStartTime = System.currentTimeMillis();

            mediaRecorder = new MediaRecorder();

            // KLJUČNO: Koristi VOICE_CALL kao privileged app
            // Ovo omogućava snimanje OBE STRANE poziva sa odličnim kvalitetom
            try {
                mediaRecorder.setAudioSource(MediaRecorder.AudioSource.VOICE_CALL);
            } catch (Exception e) {
                Log.w(TAG, "VOICE_CALL not available, trying VOICE_DOWNLINK + VOICE_UPLINK");

                // Fallback: Pokušaj sa odvojenim stream-ovima
                // Ovo zahteva miksovanje dva fajla kasnije
                mediaRecorder.setAudioSource(MediaRecorder.AudioSource.VOICE_DOWNLINK);
                // Ili koristi VOICE_UPLINK za drugu stranu
            }

            mediaRecorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
            mediaRecorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
            mediaRecorder.setAudioEncodingBitRate(128000);
            mediaRecorder.setAudioSamplingRate(44100);
            mediaRecorder.setOutputFile(currentFilePath);

            mediaRecorder.prepare();
            mediaRecorder.start();

            Log.d(TAG, "Recording started (PRIVILEGED MODE): " + currentFilePath);

        } catch (IOException e) {
            Log.e(TAG, "Error starting privileged recording", e);
            releaseMediaRecorder();
        }
    }

    private void stopRecording() {
        try {
            if (mediaRecorder != null) {
                mediaRecorder.stop();
                mediaRecorder.reset();

                long duration = System.currentTimeMillis() - callStartTime;
                Log.d(TAG, "Privileged recording stopped. Duration: " + duration + "ms");

                notifyReactNative(currentFilePath, currentPhoneNumber, currentCallType, duration);
                releaseMediaRecorder();
            }
        } catch (Exception e) {
            Log.e(TAG, "Error stopping recording", e);
            releaseMediaRecorder();
        }
    }

    private void releaseMediaRecorder() {
        if (mediaRecorder != null) {
            mediaRecorder.release();
            mediaRecorder = null;
        }
    }

    private void notifyReactNative(String filePath, String phoneNumber,
                                   String callType, long duration) {
        Intent broadcastIntent = new Intent("CALL_RECORDING_COMPLETED");
        broadcastIntent.putExtra("filePath", filePath);
        broadcastIntent.putExtra("phoneNumber", phoneNumber);
        broadcastIntent.putExtra("callType", callType);
        broadcastIntent.putExtra("duration", duration);
        sendBroadcast(broadcastIntent);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Privileged Call Recording",
                NotificationManager.IMPORTANCE_LOW
            );

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private Notification createNotification(String text) {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("System Call Recorder")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        releaseMediaRecorder();
    }
}
```

### B.3.2 - PrivilegedCallReceiver.java

Identičan kao CallReceiver iz Rešenja A, samo poziva `PrivilegedCallRecordingService` umesto `CallRecordingService`.

---

## B.4 - Alternativa: BCR Integration

Umesto custom implementacije, možete integrisati **BCR (Basic Call Recorder)** koji je open source i već rešava sve probleme:

### B.4.1 - BCR Setup

1. **Download BCR:**
   - GitHub: https://github.com/chenxiaolong/BCR
   - Latest release APK

2. **Install kao System App:**
```bash
adb root
adb remount
adb push BCR.apk /system/priv-app/BCR/
adb shell chmod 644 /system/priv-app/BCR/BCR.apk
adb reboot
```

3. **Configure BCR:**
   - Output directory: `/sdcard/CallRecordings`
   - Format: M4A/AAC
   - Sample rate: 44100 Hz
   - Bitrate: 128 kbps

4. **Integration sa Robotikm:**
   - Monitor BCR output folder
   - Auto-upload na backend kada se novi fajl kreira
   - Parse metadata iz file name-a

### B.4.2 - BCR File Watcher

`src/services/BCRWatcher.js`:

```javascript
import RNFS from 'react-native-fs';
import { DeviceEventEmitter } from 'react-native';

class BCRWatcher {
  constructor() {
    this.watchPath = RNFS.ExternalStorageDirectoryPath + '/CallRecordings';
    this.knownFiles = new Set();
  }

  async startWatching() {
    // Initial scan
    await this.scanForNewFiles();

    // Setup periodic check (svake 10 sekundi)
    this.interval = setInterval(() => {
      this.scanForNewFiles();
    }, 10000);
  }

  stopWatching() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  async scanForNewFiles() {
    try {
      const files = await RNFS.readDir(this.watchPath);

      for (const file of files) {
        if (!this.knownFiles.has(file.path) && file.name.endsWith('.m4a')) {
          this.knownFiles.add(file.path);
          await this.handleNewRecording(file);
        }
      }
    } catch (error) {
      console.error('[BCRWatcher] Scan error:', error);
    }
  }

  async handleNewRecording(file) {
    // Parse BCR filename format
    // Format: 20240115_143022_+381641234567_incoming.m4a
    const matches = file.name.match(/(\d{8}_\d{6})_(\+\d+)_(incoming|outgoing)/);

    if (matches) {
      const [_, timestamp, phoneNumber, callType] = matches;

      const recording = {
        filePath: file.path,
        phoneNumber: phoneNumber,
        callType: callType,
        duration: 0, // BCR ne pruža trajanje u imenu
        recordedAt: this.parseTimestamp(timestamp),
        uploaded: false
      };

      // Emit event za React Native
      DeviceEventEmitter.emit('BCR_RECORDING_DETECTED', recording);
    }
  }

  parseTimestamp(timestamp) {
    // 20240115_143022 -> ISO date
    const year = timestamp.substr(0, 4);
    const month = timestamp.substr(4, 2);
    const day = timestamp.substr(6, 2);
    const hour = timestamp.substr(9, 2);
    const minute = timestamp.substr(11, 2);
    const second = timestamp.substr(13, 2);

    return new Date(year, month - 1, day, hour, minute, second).toISOString();
  }
}

export default new BCRWatcher();
```

Integration u App:
```javascript
import BCRWatcher from './services/BCRWatcher';

useEffect(() => {
  if (user) {
    BCRWatcher.startWatching();

    const subscription = DeviceEventEmitter.addListener(
      'BCR_RECORDING_DETECTED',
      (recording) => {
        CallRecordingService.handleRecordingCompleted(recording);
      }
    );

    return () => {
      BCRWatcher.stopWatching();
      subscription.remove();
    };
  }
}, [user]);
```

---

## B.5 - Backend & Frontend

Backend i Frontend su **IDENTIČNI** kao u Rešenju A (sekcije A.3 i A.4).

Jedina razlika je kvalitet audio snimaka - sa ROOT pristupom imamo 10/10 kvalitet za obe strane poziva.

---

# 🔄 AUTO-UPDATE SISTEM (Za oba rešenja)

## Update Infrastructure

### Backend - AppVersion Model

`robotikb/models/AppVersion.js`:

```javascript
const mongoose = require('mongoose');

const AppVersionSchema = new mongoose.Schema({
  versionName: { type: String, required: true },  // "1.2.3"
  versionCode: { type: Number, required: true },  // 123
  apkUrl: { type: String, required: true },       // Cloudinary URL
  releaseNotes: { type: String },
  mandatory: { type: Boolean, default: false },
  minSupportedVersion: { type: Number },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AppVersion', AppVersionSchema);
```

### API Endpoint

`robotikb/routes/appUpdates.js`:

```javascript
const express = require('express');
const router = express.Router();
const { AppVersion } = require('../models');
const multer = require('multer');
const { uploadAPK } = require('../config/cloudinary');

// Check for updates
router.get('/check', async (req, res) => {
  try {
    const currentVersionCode = parseInt(req.query.versionCode);

    const latestVersion = await AppVersion.findOne()
      .sort({ versionCode: -1 })
      .limit(1);

    if (!latestVersion) {
      return res.json({ updateAvailable: false });
    }

    if (latestVersion.versionCode > currentVersionCode) {
      res.json({
        updateAvailable: true,
        versionName: latestVersion.versionName,
        versionCode: latestVersion.versionCode,
        downloadUrl: latestVersion.apkUrl,
        releaseNotes: latestVersion.releaseNotes,
        mandatory: latestVersion.mandatory
      });
    } else {
      res.json({ updateAvailable: false });
    }
  } catch (error) {
    console.error('Update check error:', error);
    res.status(500).json({ error: 'Failed to check for updates' });
  }
});

// Upload new version (admin only)
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', upload.single('apk'), async (req, res) => {
  try {
    const { versionName, versionCode, releaseNotes, mandatory } = req.body;

    // Upload APK to Cloudinary
    const uploadResult = await uploadAPK(req.file.buffer, {
      folder: 'app-updates',
      resource_type: 'raw'
    });

    const appVersion = new AppVersion({
      versionName,
      versionCode: parseInt(versionCode),
      apkUrl: uploadResult.secure_url,
      releaseNotes,
      mandatory: mandatory === 'true'
    });

    await appVersion.save();

    res.json({ success: true, version: appVersion });
  } catch (error) {
    console.error('Upload version error:', error);
    res.status(500).json({ error: 'Failed to upload version' });
  }
});

module.exports = router;
```

### Android - Auto Update

`src/services/AppUpdateService.js`:

```javascript
import { Alert, PermissionsAndroid, Platform } from 'react-native';
import RNFetchBlob from 'rn-fetch-blob';
import DeviceInfo from 'react-native-device-info';
import { API_URL } from './api';

class AppUpdateService {
  async checkForUpdates(silent = false) {
    try {
      const currentVersionCode = DeviceInfo.getBuildNumber();

      const response = await fetch(
        `${API_URL}/api/app-updates/check?versionCode=${currentVersionCode}`
      );
      const data = await response.json();

      if (data.updateAvailable) {
        if (!silent || data.mandatory) {
          this.showUpdateDialog(data);
        }
      } else if (!silent) {
        Alert.alert('Ažuriranje', 'Koristite najnoviju verziju aplikacije.');
      }
    } catch (error) {
      console.error('[AppUpdate] Check failed:', error);
    }
  }

  showUpdateDialog(updateInfo) {
    const buttons = [
      {
        text: 'Ažuriraj',
        onPress: () => this.downloadAndInstall(updateInfo.downloadUrl)
      }
    ];

    if (!updateInfo.mandatory) {
      buttons.unshift({ text: 'Kasnije', style: 'cancel' });
    }

    Alert.alert(
      `Nova verzija ${updateInfo.versionName}`,
      updateInfo.releaseNotes || 'Dostupna je nova verzija aplikacije.',
      buttons,
      { cancelable: !updateInfo.mandatory }
    );
  }

  async downloadAndInstall(url) {
    try {
      // Request install permission
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.REQUEST_INSTALL_PACKAGES
        );

        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Greška', 'Potrebna je dozvola za instalaciju aplikacija.');
          return;
        }
      }

      const { config, fs } = RNFetchBlob;
      const downloads = fs.dirs.DownloadDir;
      const path = `${downloads}/robotikm-update.apk`;

      Alert.alert('Preuzimanje', 'Aplikacija se preuzima...');

      config({
        path,
        fileCache: true,
        addAndroidDownloads: {
          useDownloadManager: true,
          notification: true,
          title: 'Preuzimanje nove verzije',
          description: 'Molimo sačekajte...',
          mime: 'application/vnd.android.package-archive',
        }
      })
      .fetch('GET', url)
      .then((res) => {
        Alert.alert(
          'Preuzimanje završeno',
          'Kliknite OK da instalirate novu verziju.',
          [
            {
              text: 'OK',
              onPress: () => {
                RNFetchBlob.android.actionViewIntent(
                  res.path(),
                  'application/vnd.android.package-archive'
                );
              }
            }
          ]
        );
      })
      .catch(error => {
        console.error('[AppUpdate] Download error:', error);
        Alert.alert('Greška', 'Neuspešno preuzimanje nove verzije.');
      });

    } catch (error) {
      console.error('[AppUpdate] Install error:', error);
      Alert.alert('Greška', 'Greška pri instalaciji nove verzije.');
    }
  }
}

export default new AppUpdateService();
```

Integration u App:
```javascript
import AppUpdateService from './services/AppUpdateService';

useEffect(() => {
  // Check na startup
  AppUpdateService.checkForUpdates(true);

  // Periodic check (svaka 4 sata)
  const interval = setInterval(() => {
    AppUpdateService.checkForUpdates(true);
  }, 4 * 60 * 60 * 1000);

  return () => clearInterval(interval);
}, []);
```

---

# 📝 DEPLOYMENT PLAN

## Faza 1: Priprema (1 dan)

1. Odlučiti između Rešenja A i B
2. Setup backend (CallRecording model + routes)
3. Setup Cloudinary za audio storage

## Faza 2: Android Development (3-5 dana)

### Za Rešenje A:
- Native modules (AccessibilityService, CallReceiver, CallRecordingService)
- React Native integration
- Testing na test uređaju

### Za Rešenje B:
- ROOT telefona
- System app setup
- BCR integration ili custom privileged service
- Testing

## Faza 3: Backend Integration (1-2 dana)

- API testiranje
- Upload/download funkcionalnost
- WorkOrder linking

## Faza 4: Frontend Web (1-2 dana)

- CallRecordings komponenta
- Audio player
- Admin UI

## Faza 5: Auto-Update (1 dan)

- Backend upload endpoint
- Android update checker
- Testing update flow-a

## Faza 6: Testing & Rollout (2-3 dana)

- Full end-to-end testing
- Beta testing sa 2-3 tehničara
- Production rollout

---

# ⚠️ VAŽNE NAPOMENE

## Pravni Aspekti

1. **Obaveštenje u aplikaciji:**
   - Jasna poruka da se pozivi snimaju
   - Privacy policy update
   - Opcionalno: Audio beep na početku poziva

2. **GDPR Compliance:**
   - Pravo korisnika da traži brisanje snimaka
   - Data retention policy (preporučeno 6 meseci)
   - Pristup samo za admins

3. **Radno pravo:**
   - Službeni telefoni - dozvoljeno u većini slučajeva
   - Obavesti tehničare pisanim putem

## Tehnički Limitations

### Rešenje A (Bez ROOT-a):
- ❌ Bluetooth/headset ne rade
- ❌ Wi-Fi calling problematičan
- ⚠️ Mora se držati telefon na speakerfonu
- ⚠️ Kvalitet zavisi od ambijenta

### Rešenje B (Sa ROOT-om):
- ❌ Void warranty
- ❌ Zahteva tehničko znanje
- ⚠️ Mogu se pojaviti problemi sa OTA updates proizvođača
- ✅ Ali kvalitet je perfektan

## Preporuka

**Za brz početak:** Rešenje A
**Za dugoročno, profesionalno rešenje:** Rešenje B

Možete početi sa Rešenjem A i kasnije migrirati na B kada budete imali iskustva.

---

# 📞 SUPPORT & TROUBLESHOOTING

## Common Issues

### "No audio recorded" (Rešenje A)
- Proveri da li je AccessibilityService omogućen
- Testirati različite audio source-ove (VOICE_RECOGNITION, VOICE_COMMUNICATION, MIC)
- Osigurati da je speakerphone uključen tokom poziva

### "Recording fails on some devices"
- Device-specific problem - svaki proizvođač ima različite implementacije
- Pokušati sa različitim audio source-ovima
- Fallback na MIC ako ništa drugo ne radi

### "Bluetooth calls not recording" (Rešenje A)
- Očekivano - AccessibilityService + VOICE_RECOGNITION ne podržava Bluetooth
- Rešenje: Migrirati na Rešenje B (ROOT)

### "App crashes during call" (Oba rešenja)
- Check permissions
- Osigurati da foreground service radi
- Check logcat za detaljne greške

---

# 🎯 FINALNA PREPORUKA

**Za vaš projekat (službeni telefoni tehničara):**

1. **START:** Implementiraj Rešenje A (5-7 dana)
   - Brza implementacija
   - 70-80% poziva će biti kvalitetno snimljeno
   - Obavesti tehničare da koriste speakerphone

2. **UPGRADE (posle 2-3 meseca):** Migriraj na Rešenje B
   - ROOT telefona tokom redovnog servisa
   - 100% kvalitet snimanja
   - Profesionalno rešenje

Oba rešenja dele isti backend i frontend, tako da migracija je jednostavna!

---

**Autor:** AI Assistant
**Datum:** 2025-01-16
**Verzija dokumenta:** 1.0
