# 📱 BUILD I DEPLOY NOVE ANDROID VERZIJE - KOMPLETAN VODIČ

**Datum:** 06.11.2025
**Trenutna verzija:** 1.0.1 (versionCode: 2)
**Nova verzija:** 1.0.2 (versionCode: 3)

---

## 🎯 **STEP-BY-STEP PROCES**

### **KORAK 1: Ažuriranje Verzije**

#### **1.1 - Otvori `app.json`**

```bash
cd D:\ROBOTIK\robotikm
notepad app.json
# ili
code app.json
```

#### **1.2 - Promeni verziju**

**Staro:**
```json
{
  "expo": {
    "version": "1.0.1",
    "android": {
      "versionCode": 2
    }
  }
}
```

**Novo:**
```json
{
  "expo": {
    "version": "1.0.2",
    "android": {
      "versionCode": 3
    }
  }
}
```

**Pravilo:**
- `version` - Human-readable verzija (1.0.2, 1.0.3, 1.1.0, itd.)
- `versionCode` - Integer koji se MORA povećavati za 1 svaki put (2 → 3 → 4 → 5...)

**⚠️ VAŽNO:** `versionCode` MORA UVEK biti veći od prethodnog!

---

### **KORAK 2: Build APK-a**

#### **2.1 - Proveri da li si ulogovan u Expo**

```bash
eas whoami
```

**Ako nisi ulogovan:**
```bash
eas login
# Unesi username i password
```

#### **2.2 - Build Production APK**

```bash
cd D:\ROBOTIK\robotikm
eas build --platform android --profile production
```

**Šta će se desiti:**
1. EAS će build-ovati app na Expo serverima
2. Build traje **10-20 minuta**
3. Dobijaš link za download APK-a
4. APK je potpisan i spreman za distribuciju

**Output:**
```
✔ Build complete!
https://expo.dev/artifacts/eas/[ID].apk
```

#### **2.3 - Preuzmi APK**

- Klikni na link iz output-a
- Ili idi na: https://expo.dev/accounts/[username]/projects/robotikm/builds
- Download poslednji APK

---

### **KORAK 3: Upload APK-a na Backend**

**Fajl se čuva u:**
```
D:\ROBOTIK\robotikb\uploads\apks\
```

#### **3.1 - Kopiraj APK u backend folder**

```bash
# Preuzeti APK (obično u Downloads folderu)
# Preimenuj u robotik-mobile-v1.0.2.apk

copy "C:\Users\YourUser\Downloads\downloaded.apk" "D:\ROBOTIK\robotikb\uploads\apks\robotik-mobile-v1.0.2.apk"
```

#### **3.2 - Proveri da li APK postoji**

```bash
dir "D:\ROBOTIK\robotikb\uploads\apks"
```

**Trebao bi da vidiš:**
```
robotik-mobile-v1.0.1.apk
robotik-mobile-v1.0.2.apk  ← Nova verzija
```

---

### **KORAK 4: Kreiranje Nove Verzije u Bazi**

#### **4.1 - Otvori MongoDB Compass**

- Connect na: `mongodb+srv://...` (tvoj connection string)
- Otvori `robotikb` database
- Otvori `apkversions` kolekciju

#### **4.2 - Insert New Document**

```json
{
  "version": "1.0.2",
  "url": "https://robotikb-3eov.onrender.com/apks/robotik-mobile-v1.0.2.apk",
  "releaseNotes": [
    "Dodato automatsko snimanje i upload poziva sa ACR Phone aplikacije",
    "Dodato polje za broj telefona tehničara",
    "Poboljšana stabilnost aplikacije"
  ],
  "isMandatory": false,
  "createdAt": "2025-11-06T20:00:00.000Z",
  "updatedAt": "2025-11-06T20:00:00.000Z"
}
```

**Polja:**
- `version` - mora odgovarati verziji u app.json
- `url` - puni URL do APK-a na backend serveru
- `releaseNotes` - array stringova, šta je novo
- `isMandatory` - `true` = force update, `false` = opciono

---

### **KORAK 5: Upload APK-a na Render.com (Backend)**

#### **5.1 - Commit i Push APK na Git**

```bash
cd D:\ROBOTIK\robotikb

# Dodaj APK u Git
git add uploads/apks/robotik-mobile-v1.0.2.apk

# Commit
git commit -m "Add APK version 1.0.2 with voice recordings feature"

# Push
git push origin main
```

#### **5.2 - Proveri Render.com Deploy**

- Idi na: https://dashboard.render.com/
- Otvori `robotikb` service
- Čekaj dok se deploy ne završi (5-10 minuta)

#### **5.3 - Testiraj URL**

Otvori u browseru:
```
https://robotikb-3eov.onrender.com/apks/robotik-mobile-v1.0.2.apk
```

**Expected:** Download APK fajla počinje

---

### **KORAK 6: Testiranje Update Mehanizma**

#### **6.1 - Otvori postojeću Android app (verzija 1.0.1)**

- App automatski proverava nove verzije na svakih 5 minuta
- Ili restartuj app da force-uješ proveru

#### **6.2 - Očekivani Scenario**

**Ako je `isMandatory: false`:**
- Prikazaće se notifikacija: "Nova verzija 1.0.2 je dostupna"
- User može da klikne "Ažuriraj" ili "Kasnije"

**Ako je `isMandatory: true`:**
- Prikazaće se blocking modal
- User MORA da ažurira app pre nego što nastavi

#### **6.3 - Klikni "Ažuriraj"**

- App će download-ovati APK (progress bar)
- Otvoriće se Android installer
- User instalira novu verziju
- App se restartuje

---

### **KORAK 7: Verifikacija na Frontendu (Tehnicians Page)**

#### **7.1 - Otvori robotikf admin panel**

```
https://your-frontend-url.com/technicians
```

#### **7.2 - Proveri sekciju "App Verzije"**

**Trebao bi da vidiš:**

```
┌──────────────────────────────────────────┐
│  📱 Aplikacija Verzije                   │
├──────────────────────────────────────────┤
│  Verzija: 1.0.2                          │
│  Status: Aktuelna ✅                      │
│  Release Notes:                          │
│  • Dodato automatsko snimanje poziva     │
│  • Dodato polje za broj telefona         │
│                                          │
│  [Download APK]                          │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│  Verzija: 1.0.1                          │
│  Status: Stara verzija                   │
│  [Download APK]                          │
└──────────────────────────────────────────┘
```

---

## 🔄 **ALTERNATIVNI NAČIN - LOCAL BUILD (Brži, ali manje pouzdan)**

Ako ne želiš da čekaš EAS build (20 minuta), možeš build-ovati lokalno:

### **Preduslov:**
- Android Studio instaliran
- Java JDK instaliran
- Android SDK instaliran

### **Komande:**

```bash
cd D:\ROBOTIK\robotikm

# Build lokalno
npx expo run:android --variant release

# Ili ako koristiš gradlew:
cd android
./gradlew assembleRelease

# APK će biti u:
# android/app/build/outputs/apk/release/app-release.apk
```

**Napomena:** Local build može imati probleme sa signing-om. EAS build je pouzdaniji.

---

## 📋 **CHECKLIST - Pre Svakog Release-a**

- [ ] Ažurirana `version` u app.json (npr. 1.0.1 → 1.0.2)
- [ ] Ažuriran `versionCode` u app.json (npr. 2 → 3)
- [ ] Testirano sve nove funkcionalnosti
- [ ] Build APK-a sa `eas build --platform android --profile production`
- [ ] Download-ovan APK sa Expo linka
- [ ] APK preimenovan u `robotik-mobile-v1.0.2.apk`
- [ ] APK kopiran u `D:\ROBOTIK\robotikb\uploads\apks\`
- [ ] Git commit i push na backend
- [ ] Render.com deploy završen
- [ ] Testiran URL: https://robotikb-3eov.onrender.com/apks/robotik-mobile-v1.0.2.apk
- [ ] Kreiran novi document u `apkversions` kolekciji
- [ ] Testiran auto-update mehanizam u app-u
- [ ] Verifikovano na frontend-u (Technicians page)

---

## 🚨 **COMMON ERRORS & SOLUTIONS**

### **Error: "versionCode must be greater than previous"**

**Uzrok:** Zaboravio si da povećaš `versionCode`
**Rešenje:**
```json
// app.json
"android": {
  "versionCode": 3  // Povećaj za 1
}
```

---

### **Error: "APK not found 404"**

**Uzrok:** APK nije upload-ovan na Render ili je pogrešan URL
**Rešenje:**
1. Proveri da li je APK u `robotikb/uploads/apks/`
2. Proveri da li je Git push završen
3. Proveri da li je Render deploy završen
4. Testiraj URL direktno u browseru

---

### **Error: "Download failed"**

**Uzrok:** Internet konekcija ili Render server problem
**Rešenje:**
1. Proveri internet konekciju
2. Restartuj app i pokušaj ponovo
3. Proveri Render logs: https://dashboard.render.com/

---

### **Error: "Installation blocked"**

**Uzrok:** Android ne dozvoljava instalaciju sa "Unknown sources"
**Rešenje:**
1. Settings → Security → Unknown Sources → Enable
2. Ili Settings → Apps → Special App Access → Install unknown apps → Enable za tvoju app

---

## 📊 **VERSION HISTORY**

| Verzija | versionCode | Datum       | Release Notes                                          |
|---------|-------------|-------------|-------------------------------------------------------|
| 1.0.2   | 3           | 06.11.2025  | Voice recordings, phone number field                  |
| 1.0.1   | 2           | ??          | Previous version                                      |
| 1.0.0   | 1           | ??          | Initial release                                       |

---

## 🎯 **QUICK REFERENCE - Najčešće Komande**

```bash
# 1. Proveri EAS login
eas whoami

# 2. Build production APK
eas build --platform android --profile production

# 3. Proveri build status
eas build:list

# 4. Kopiraj APK u backend
copy "C:\Users\...\Downloads\app.apk" "D:\ROBOTIK\robotikb\uploads\apks\robotik-mobile-v1.0.2.apk"

# 5. Git commit i push
cd D:\ROBOTIK\robotikb
git add uploads/apks/
git commit -m "Add APK v1.0.2"
git push origin main

# 6. Testiraj URL
curl -I https://robotikb-3eov.onrender.com/apks/robotik-mobile-v1.0.2.apk
```

---

## 📱 **Gde Tehnički Preuzimaju Aplikaciju?**

### **Opcija 1: Iz Admin Panel-a (Tehnicians Page)**

Supervisor/Superadmin dele link tehničarima:
```
https://your-frontend.com/technicians
```

Tehničari kliknu "Download APK" dugme.

### **Opcija 2: Direktan Link**

Šalji tehničarima direktan link:
```
https://robotikb-3eov.onrender.com/apks/robotik-mobile-v1.0.2.apk
```

### **Opcija 3: QR Code**

Generiši QR code od linka i šalji sliku tehničarima.

---

**Autor:** Claude AI Assistant
**Datum:** 06.11.2025
**Status:** ✅ READY TO USE

🎉 **Uspešno deploy-ovanje nove verzije!**
