# 🔥 Firebase Cloud Messaging (FCM) Setup Guide

## Problem
Android push notifikacije se ne prikazuju jer FCM NIJE konfigurisan. Od Expo SDK 51+, FCM je **OBAVEZAN** za Android push notifikacije.

## Rešenje - Korak po korak

### Korak 1: Kreiraj Firebase Projekat

1. Idi na [Firebase Console](https://console.firebase.com)
2. Klikni "Add project" ili "Create a project"
3. Unesi ime projekta (npr. "Robotik Mobile")
4. Isključi Google Analytics (nije potreban za notifikacije)
5. Klikni "Create project"

### Korak 2: Dodaj Android App u Firebase

1. Na Firebase dashboard-u, klikni Android ikonicu
2. **Package name**: `com.robotik.mobile` (MORA biti isti kao u app.json!)
3. **App nickname**: "Robotik Mobile" (opciono)
4. **Debug signing certificate SHA-1**: Ostavi prazno za sada
5. Klikni "Register app"

### Korak 3: Preuzmi `google-services.json`

1. Klikni "Download google-services.json"
2. **VAŽNO**: Kopiraj ovaj fajl u **root** folder robotikm projekta:
   ```
   D:\MANGEMENT-APP-MAIN\robotikm\google-services.json
   ```
3. Klikni "Next" i "Continue to console"

### Korak 4: Generiši Service Account Key (Za Expo Push Notifications)

1. U Firebase Console, klikni ⚙️ (Settings) > "Project settings"
2. Idi na "Service accounts" tab
3. Klikni "Generate new private key"
4. Potvrdi upozorenje
5. Preuzmi JSON fajl (npr. `robotik-mobile-firebase-adminsdk-xxxxx.json`)
6. **ČUVAJ OVAJ FAJL NA SIGURNOM MESTU** - ovo je privatni ključ!
7. **DODAJ U .gitignore** da se ne commit-uje na Git

### Korak 5: Upload Credentials preko EAS CLI

```bash
# Instaliraj EAS CLI ako već nije instaliran
npm install -g eas-cli

# Login u Expo account
eas login

# Konfiguriši credentials
eas credentials

# Izaberi opcije:
# 1. Select platform: Android
# 2. Select build profile: production
# 3. Select credentials: Google Service Account
# 4. Set up a Google Service Account for Push Notifications
# 5. Upload service account key JSON fajl koji si preuzeo u Koraku 4
```

### Korak 6: Ažuriraj app.json

Fajl je već ažuriran - vidi izmene u `app.json`.

### Korak 7: Rebuild Aplikacije

```bash
# Development build (za testiranje)
eas build --profile development --platform android

# Production build (za release)
eas build --profile production --platform android
```

### Korak 8: Testiranje

1. Instaliraj novi APK na telefon
2. Uloguj se kao tehničar
3. Proveri da li se push token registruje (proveri backend log)
4. Testiraj slanje notifikacije (dodeli radni nalog tehničaru)
5. Notifikacija bi trebalo da se pojavi kao Android notifikacija čak i kada je app zatvoren

## Verifikacija

### Provera da li je FCM ispravno konfigurisan:

1. **google-services.json postoji** u root folderu
2. **app.json ima googleServicesFile** konfiguraciju
3. **Service account key** je upload-ovan preko EAS CLI
4. **App je rebuild-ovan** sa novom konfiguracijom

### Debug Tips:

```bash
# Proveri logs pri slanju notifikacije
# Backend log bi trebalo da prikaže:
✅ Push token registrovan za tehničara [IME]: ExponentPushToken[xxx]
✅ Push notifikacija poslata tehničaru [IME] (ExponentPushToken[xxx])

# Ako vidiš grešku:
❌ Greška pri slanju push notifikacije: DeviceNotRegistered
# Znači da FCM nije ispravno konfigurisan
```

## Dodatne Napomene

### Android 13+ (API 33+) Permisije
- App već ima `POST_NOTIFICATIONS` permisiju u app.json ✅
- Runtime permisija se automatski traži u `notificationService.js` ✅

### Channel Configuration
- Channels su ispravno konfigurisani ✅
- `channelId` se mapira između backend-a i app-a ✅
- Poznati bug: Notifikacije mogu ići u "Miscellaneous" kategoriju kada je app u background-u (Android OS problem, ne vaš)

### Testing Checklist
- [ ] Firebase projekat kreiran
- [ ] google-services.json preuzet i kopiran
- [ ] Service account key generisan
- [ ] Credentials upload-ovani preko EAS CLI
- [ ] app.json ažuriran
- [ ] App rebuild-ovan
- [ ] Novi APK instaliran na telefon
- [ ] Push token se registruje uspešno
- [ ] Notifikacije se prikazuju van aplikacije

## Troubleshooting

### Problem: "DeviceNotRegistered" greška
**Rešenje**: FCM nije ispravno konfigurisan. Proveri korake 4-5.

### Problem: Notifikacije rade samo kada je app otvoren
**Rešenje**: FCM nije konfigurisan ili app nije rebuild-ovan posle dodavanja FCM-a.

### Problem: Notifikacije idu u "Miscellaneous" kategoriju
**Rešenje**: Ovo je poznati bug u expo-notifications. Privremeno rešenje: Korisnici moraju ručno omogućiti "Pop on screen" za Miscellaneous kategoriju u Android settings.

### Problem: Token se ne registruje
**Rešenje**:
1. Proveri da li je app fizički uređaj (ne emulator)
2. Proveri da li je standalone build (ne Expo Go)
3. Proveri internet konekciju
4. Proveri backend logs

## Korisni Linkovi

- [Expo Push Notifications Setup](https://docs.expo.dev/push-notifications/push-notifications-setup/)
- [FCM Credentials Guide](https://docs.expo.dev/push-notifications/fcm-credentials/)
- [Expo Notifications API](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Firebase Console](https://console.firebase.google.com)
