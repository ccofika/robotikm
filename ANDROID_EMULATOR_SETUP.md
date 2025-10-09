# 📱 Android Emulator Setup Guide - Kompletan Vodič

## Korak 1: Instalacija Android Studio

### 1.1 Download Android Studio

1. Idite na: https://developer.android.com/studio
2. Kliknite **Download Android Studio**
3. Prihvatite uslove i preuzmite instalaciju (oko 1GB)

### 1.2 Instalacija

1. **Pokrenite preuzeti `.exe` fajl**
2. Kliknite **Next** na Welcome screen-u
3. **Choose Components:**
   - ✅ Android Studio
   - ✅ Android Virtual Device (OBAVEZNO!)
4. Kliknite **Next**
5. **Installation Location:** Ostavite podrazumevanu (`C:\Program Files\Android\Android Studio`)
6. Kliknite **Install**
7. Sačekajte instalaciju (3-5 minuta)
8. Kliknite **Next**, zatim **Finish**

### 1.3 Prvi Start Android Studio

1. **Pokreće se Android Studio Setup Wizard**
2. Izaberite **Standard** setup
3. Izaberite temu (Light ili Darcula)
4. **Verify Settings** - kliknite **Next**
5. **License Agreement** - Prihvatite sve licence (kliknite Accept)
6. Kliknite **Finish** - sačekajte download komponenti (može trajati 10-15 minuta)

---

## Korak 2: Konfiguracija Android SDK

### 2.1 Otvorite SDK Manager

1. Pokrenite Android Studio
2. Na Welcome screen-u kliknite **More Actions** → **SDK Manager**
   
   Ili: **File** → **Settings** → **Appearance & Behavior** → **System Settings** → **Android SDK**

### 2.2 SDK Platforms

U **SDK Platforms** tabu:

1. ✅ Čekirajte **Android 13.0 (Tiramisu)** - API Level 33
2. ✅ Čekirajte **Android 14.0 (UpsideDownCake)** - API Level 34 (opciono, najnoviji)
3. Kliknite **Show Package Details** (dolje desno)
4. Proširite **Android 13.0 (Tiramisu)** i čekirajte:
   - ✅ Android SDK Platform 33
   - ✅ Google APIs Intel x86_64 Atom System Image

### 2.3 SDK Tools

Prebacite se na **SDK Tools** tab:

1. ✅ Android SDK Build-Tools
2. ✅ Android Emulator
3. ✅ Android SDK Platform-Tools
4. ✅ Google Play services
5. Kliknite **OK**
6. Potvrdite download (oko 2-3GB) - sačekajte download

---

## Korak 3: Kreiranje Virtuelnog Uređaja (AVD)

### 3.1 Otvorite Device Manager

1. Na Welcome screen-u kliknite **More Actions** → **Virtual Device Manager**
   
   Ili: **Tools** → **Device Manager**

### 3.2 Kreirajte novi AVD

1. Kliknite **Create Device** (ili +)
2. **Select Hardware:**
   - **Category:** Phone
   - **Izaberite:** Pixel 5 ili Pixel 6 (moderan telefon sa dobrim performansama)
   - Kliknite **Next**

3. **System Image:**
   - **Tab:** Recommended
   - **Izaberite:** Tiramisu (API Level 33) - **x86_64** verzija
   - Ako nije preuzeta, kliknite **Download** pored nje i sačekajte
   - Kliknite **Next**

4. **AVD Configuration:**
   - **AVD Name:** Pixel_5_API_33 (ili bilo koje ime)
   - **Startup orientation:** Portrait
   - **Advanced Settings** (opciono):
     - RAM: 2048 MB (minimum)
     - Internal Storage: 2048 MB
     - SD Card: 512 MB
   - Kliknite **Finish**

### 3.3 Pokretanje Emulatora

1. U **Device Manager** videćete vaš novi emulator
2. Kliknite **▶️ Play** dugme pored emulatora
3. Sačekajte da se emulator učita (prvo pokretanje može trajati 2-3 minuta)
4. Kada vidite Android home screen, emulator je spreman! ✅

---

## Korak 4: Podešavanje Environment Variables (Windows)

### 4.1 Pronađite ANDROID_HOME path

Podrazumevano:
```
C:\Users\[VAŠE_IME]\AppData\Local\Android\Sdk
```

### 4.2 Dodajte Environment Variables

1. **Otvorite System Properties:**
   - Pritisnite `Win + R`
   - Ukucajte: `sysdm.cpl`
   - Enter

2. **Advanced tab** → **Environment Variables**

3. **System Variables** sekcija:
   - Kliknite **New**
   - **Variable name:** `ANDROID_HOME`
   - **Variable value:** `C:\Users\[VAŠE_IME]\AppData\Local\Android\Sdk`
   - Kliknite **OK**

4. **Ažurirajte Path:**
   - U **System Variables**, pronađite `Path`
   - Kliknite **Edit**
   - Kliknite **New** i dodajte:
     - `%ANDROID_HOME%\platform-tools`
     - `%ANDROID_HOME%\emulator`
     - `%ANDROID_HOME%\tools`
     - `%ANDROID_HOME%\tools\bin`
   - Kliknite **OK** na svim prozorima

5. **Restartujte terminal/command prompt**

### 4.3 Verifikacija

Otvorite **novi** Command Prompt ili Git Bash i proverite:

```bash
echo %ANDROID_HOME%
# Trebalo bi da prikaže: C:\Users\[VAŠE_IME]\AppData\Local\Android\Sdk

adb version
# Trebalo bi da prikaže verziju adb-a

emulator -list-avds
# Trebalo bi da prikaže listu vaših emulatora
```

---

## Korak 5: Pokretanje React Native Aplikacije na Emulatoru

### 5.1 Pokrenite Emulator

**Opcija 1 - Kroz Android Studio:**
1. Otvorite Android Studio
2. Tools → Device Manager
3. Kliknite ▶️ pored vašeg emulatora

**Opcija 2 - Kroz Command Line:**
```bash
# Prikaži dostupne emulatoare
emulator -list-avds

# Pokreni emulator
emulator -avd Pixel_5_API_33
```

### 5.2 Pokrenite React Native Aplikaciju

**U NOVOM terminalu:**

```bash
cd D:\MANGEMENT-APP-MAIN\robotikm

# Pokrenite Expo
npm start

# Pritisnite 'a' za Android kada se otvori
```

Ili direktno:

```bash
cd D:\MANGEMENT-APP-MAIN\robotikm
npm run android
```

### 5.3 Čekajte instalaciju

- Prvi build može trajati 5-10 minuta
- Expo će instalirati aplikaciju na emulator
- Kada se završi, aplikacija će se automatski otvoriti

---

## 🐛 Troubleshooting

### Problem: "SDK location not found"

**Rešenje:**
1. Kreirajte fajl `local.properties` u `robotikm/android/` folderu
2. Dodajte:
   ```
   sdk.dir=C:\Users\[VAŠE_IME]\AppData\Local\Android\Sdk
   ```

### Problem: Emulator se sporo pokreće

**Rešenje:**
1. Omogućite HAXM (Hardware Acceleration):
   - SDK Manager → SDK Tools → čekirajte Intel x86 Emulator Accelerator (HAXM)
2. U BIOS-u omogućite Intel VT-x ili AMD-V (virtualizacija)

### Problem: "adb: command not found"

**Rešenje:**
- Proverite da li ste dodali `%ANDROID_HOME%\platform-tools` u Path
- Restartujte terminal

### Problem: Aplikacija se ne instalira na emulator

**Rešenje:**
```bash
# Proveri da li je emulator povezan
adb devices

# Restartuj adb server
adb kill-server
adb start-server

# Ponovo pokreni aplikaciju
npm run android
```

---

## ✅ Gotovo!

Sada imate:
- ✅ Instaliran Android Studio
- ✅ Konfigurisane SDK alate
- ✅ Kreiran virtuelni Android uređaj
- ✅ Podešene environment variables
- ✅ Spreman emulator za razvoj

**Sledeći put samo:**
1. Pokrenite emulator (Android Studio → Device Manager → ▶️)
2. `cd robotikm && npm start`
3. Pritisnite `a`

---

## 📚 Korisni Linkovi

- Android Studio: https://developer.android.com/studio
- Expo dokumentacija: https://docs.expo.dev/
- React Native dokumentacija: https://reactnative.dev/docs/environment-setup

