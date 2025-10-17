# 📱 Robotik Mobile - APK Build i OTA Update Vodič

Ovaj dokument objašnjava kako da:
1. Kreiraš APK verziju aplikacije
2. Instaliraš APK na Android telefon
3. Publikuješ update-e aplikacije bez ponovne instalacije

---

## 🔧 Preduslov - Prvo konfiguriši backend IP adresu

**VEOMA VAŽNO:** Pre nego što napraviš APK, moraš da podesiš IP adresu tvog backend servera u `AppUpdater.js` fajlu.

1. Otvori `robotikm/src/components/AppUpdater.js`
2. Pronađi liniju:
```javascript
const API_URL = 'http://192.168.1.100:5000'; // Zameni sa tvojom backend IP adresom
```
3. **Zameni `192.168.1.100` sa IP adresom računara na kojem je pokrenut backend.**

### Kako pronaći IP adresu računara:

**Windows:**
```bash
ipconfig
```
Potraži "IPv4 Address" pod aktivnom mrežom (obično WiFi ili Ethernet).

**Linux/Mac:**
```bash
ifconfig
# ili
ip addr show
```

**Primer:**
- Ako je tvoja IP adresa `192.168.0.105`, promeni liniju na:
```javascript
const API_URL = 'http://192.168.0.105:5000';
```

---

## 📦 Deo 1: Kreiranje APK Fajla

### Korak 1: Prebuild Android projekta

```bash
cd robotikm
npx expo prebuild --platform android --clean
```

Ova komanda će:
- Generisati native Android kod u `android/` folderu
- Konfigurisati sve native module
- Pripremiti projekat za build

### Korak 2: Build Release APK-a

```bash
cd android
./gradlew assembleRelease
```

**Na Windows-u koristi:**
```bash
gradlew.bat assembleRelease
```

Ova komanda će:
- Kompajlirati ceo Android projekat
- Kreirati optimizovanu release verziju
- Može trajati 5-10 minuta prvi put

### Korak 3: Pronađi APK fajl

APK fajl će biti kreiran na sledećoj lokaciji:
```
robotikm/android/app/build/outputs/apk/release/app-release.apk
```

---

## 📲 Deo 2: Instalacija APK-a na telefon

### Metoda 1: Preko USB kabla (ADB)

1. Omogući "Developer Options" na telefonu:
   - Idi u Settings → About Phone
   - Klikni 7 puta na "Build Number"

2. Omogući "USB Debugging":
   - Settings → Developer Options → USB Debugging

3. Konektuj telefon USB kablom na računar

4. Instaliraj APK:
```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

### Metoda 2: Preko WiFi (bez kabla)

1. Kopiraj `app-release.apk` fajl na telefon bilo kojim metodom:
   - Google Drive
   - Email
   - Bluetooth
   - WhatsApp (sebi)

2. Na telefonu, otvori fajl menadžer i pronađi APK

3. Klikni na APK fajl

4. Telefon će pitati za dozvolu instalacije iz "Unknown Sources":
   - Dozvoli instalaciju
   - Settings → Security → Install from Unknown Sources

5. Klikni "Install"

### Metoda 3: Deljenje preko mreže

Možeš podeliti APK preko lokalne mreže:

```bash
# U robotikm/android/app/build/outputs/apk/release/ folderu
python -m http.server 8000
```

Zatim na telefonu:
- Konektuj se na istu WiFi mrežu
- Otvori browser i idi na `http://[IP_ADRESA_RACUNARA]:8000`
- Preuzmi `app-release.apk`
- Instaliraj

---

## 🔄 Deo 3: Objavljivanje Update-a (OTA)

Kada želiš da ažuriraš aplikaciju BEZ ponovne instalacije APK-a:

### Korak 1: Izmeni kod

Napravi izmene u React kodu (komponente, stilovi, logika).

**VAŽNO:** OTA updates mogu da ažuriraju:
- ✅ React komponente
- ✅ JavaScript kod
- ✅ Stilove (CSS)
- ✅ Slike i asset-e
- ✅ API pozive

**OTA updates NE MOGU da ažuriraju:**
- ❌ Native module (novi paketi)
- ❌ Permissions u AndroidManifest.xml
- ❌ Gradle konfiguraciju
- ❌ Expo plugins

### Korak 2: Objavi Update

U `robotikb` folderu, pokreni:

```bash
cd robotikb
npm run publish-update
```

Ili sa custom changelog porukom:
```bash
npm run publish-update "Dodato novo dugme za izvoz podataka"
```

Skripta će automatski:
1. Povećati verziju u `app.json` (npr. 1.0.0 → 1.0.1)
2. Eksportovati novi bundle
3. Kopirati bundle u `robotikb/bundles/` folder
4. Kreirati unos u MongoDB bazi
5. Update će biti dostupan za preuzimanje

### Korak 3: Testiranje Update-a

1. **Otvori aplikaciju na telefonu**
2. Aplikacija će automatski:
   - Proveriti da li postoji novi update
   - Preuzeti update u pozadini
   - Prikazati modal "Ažuriranje aplikacije..."
   - Restartovati se sa novim kodom

3. Proveri konzolu backend-a za logove:
```
Checking for updates: current=1.0.0, platform=android
```

---

## 🔍 Troubleshooting

### Problem: "Unable to connect to backend"

**Rešenje:**
1. Proveri da li je backend server pokrenut (`npm run dev` u `robotikb`)
2. Proveri IP adresu u `AppUpdater.js`
3. Proveri da su telefon i računar na istoj WiFi mreži
4. Test-iraj backend: otvori `http://[IP]:5000` u browseru na telefonu

### Problem: "App crashes pri pokretanju"

**Rešenje:**
1. Prvo napravi clean build:
```bash
cd android
./gradlew clean
./gradlew assembleRelease
```

2. Proveri logove:
```bash
adb logcat | grep ReactNative
```

### Problem: "Update se ne preuzima"

**Rešenje:**
1. Proveri backend logove - da li `/api/updates/check` endpoint radi
2. Proveri MongoDB - da li postoji unos u `appupdates` kolekciji
3. Proveri verziju u `app.json` - mora biti veća od trenutne

### Problem: "APK build fails"

**Rešenje:**
1. Obriši node_modules i reinstaliraj:
```bash
cd robotikm
rm -rf node_modules
npm install
```

2. Obriši Android build cache:
```bash
cd android
./gradlew clean
cd ..
rm -rf android
npx expo prebuild --platform android --clean
```

---

## 📊 Workflow Primer

### Prvi put - Kreiranje i instalacija APK-a

```bash
# 1. Podesi IP adresu u AppUpdater.js
# Otvori robotikm/src/components/AppUpdater.js
# Promeni API_URL na tvojun IP

# 2. Kreiraj APK
cd robotikm
npx expo prebuild --platform android --clean
cd android
./gradlew assembleRelease

# 3. Instaliraj na telefon
adb install app/build/outputs/apk/release/app-release.apk
```

### Svaki sledeći update

```bash
# 1. Izmeni kod u robotikm/src/

# 2. Objavi update
cd robotikb
npm run publish-update "Opis izmena"

# 3. Otvori aplikaciju na telefonu
# Update će se automatski preuzeti i primeniti
```

---

## 🎯 Best Practices

### Verzionisanje

- **Patch update (1.0.0 → 1.0.1):** Bugfix-evi, male izmene
- **Minor update (1.0.0 → 1.1.0):** Nove feature-e (bez native izmena)
- **Major update (1.0.0 → 2.0.0):** Veliki refaktor, nove native izmene (ZAHTEVA NOVI APK)

### Kada napraviti novi APK?

Napravi novi APK kada:
- Dodaješ novi native modul (npr. `expo install expo-camera`)
- Menjašš permissions u AndroidManifest.xml
- Ažuriraš Expo SDK verziju
- Dodaješ nove Expo plugins u app.json

### Update Strategy

1. **Testiraj lokalno** pre nego što publikuješ update
2. **Koristi changelog** da opišeš izmene
3. **Mandatory updates** koristi samo za kritične bugfix-eve
4. **Napravi backup** baze pre većih update-a

---

## 📞 Pomoć

Ako nešto ne radi:
1. Proveri logove backend-a
2. Proveri logove aplikacije (`adb logcat`)
3. Proveri MongoDB unose (`db.appupdates.find()`)
4. Restartuj backend server
5. Reinstaliraj aplikaciju (ako je potrebno)

---

**Napomena:** Prvo instaliranje APK-a zahteva malo truda, ali nakon toga, svi update-i se automatski primenjuju bez reinstalacije! 🚀
