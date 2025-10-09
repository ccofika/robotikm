# Robotik Mobile - React Native aplikacija za tehničare

React Native mobilna aplikacija za upravljanje radnim nalozima, opremom i materijalima.

## 📋 Preduslovi

Pre nego što počnete, uverite se da imate instalirano:

- **Node.js** (v18 ili noviji): https://nodejs.org/
- **npm** ili **yarn**
- **Git**: https://git-scm.com/
- **Android Studio** (za Android razvoj): https://developer.android.com/studio
- **Expo CLI**: `npm install -g expo-cli`

## 🚀 Instalacija

### 1. Instalacija dependencies

```bash
cd robotikm
npm install
```

### 2. Konfiguracija

Ažurirajte `src/services/api.js` sa pravom adresom backend-a:

```javascript
const API_URL = 'http://YOUR_BACKEND_URL:5000';
```

Za lokalni development na fizičkom uređaju koristite IP adresu računara:
```javascript
const API_URL = 'http://192.168.1.XXX:5000';  // Zameni sa IP adresom računara
```

## 📱 Pokretanje aplikacije

### Expo Go (Najbrži način)

1. Instalirajte Expo Go aplikaciju na telefon:
   - Android: https://play.google.com/store/apps/details?id=host.exp.exponent
   - iOS: https://apps.apple.com/app/expo-go/id982107779

2. Pokrenite dev server:
   ```bash
   npm start
   ```

3. Skenirajte QR kod pomoću Expo Go aplikacije

### Android Emulator

1. Pokrenite Android Studio emulator
2. Zatim:
   ```bash
   npm run android
   ```

### iOS Simulator (samo Mac)

```bash
npm run ios
```

## 📂 Struktura projekta

```
robotikm/
├── src/
│   ├── navigation/          # React Navigation setup
│   ├── screens/             # Screen komponente
│   ├── components/
│   │   └── common/          # Reusable komponente
│   ├── context/             # React Context (Auth, itd.)
│   ├── services/            # API servisi
│   ├── utils/               # Utility funkcije
│   └── styles/              # Theme i stilovi
├── assets/                  # Slike, fontovi
├── App.js                   # Root komponenta
├── app.json                 # Expo konfiguracija
├── package.json
└── README.md
```

## 🔧 Dostupne komande

- `npm start` - Pokreni Expo dev server
- `npm run android` - Pokreni na Android emulatoru
- `npm run ios` - Pokreni na iOS simulatoru (samo Mac)
- `npm run web` - Pokreni u browseru

## 🛠️ Tech Stack

- **React Native** (0.74.5)
- **Expo** (SDK 51)
- **React Navigation** - Navigacija
- **NativeWind** - Tailwind CSS za React Native
- **Axios** - HTTP klijent
- **AsyncStorage** - Lokalno skladištenje

## 📖 Funkcionalnosti

Aplikacija omogućava tehničarima da:

- ✅ Prijave se u sistem
- ✅ Pregledaju radne naloge
- ✅ Ažuriraju status radnih naloga
- ✅ Pregledaju zaduženu opremu
- ✅ Pregledaju zadužene materijale
- ✅ Pregledaju osnovnu opremu
- ✅ Potvrde prijem nove opreme
- ✅ Vide overdue radne naloge

## 🐛 Debug

Za otvaranje React Native debug menija:
- **Android emulator**: Pritisnite `Ctrl + M` ili `Cmd + M` (Mac)
- **Fizički Android uređaj**: Protresite telefon
- **iOS simulator**: Pritisnite `Cmd + D`

## 📝 Dodatne informacije

- Backend API mora biti pokrenut na portu 5000
- Backend CORS već podržava Expo dev server portove (19000, 19006, 8081)
- Za production build koristite `expo build:android` ili `expo build:ios`

## 🤝 Doprinos

Za doprinose kontaktirajte razvojni tim.

## 📄 Licenca

Privatno - sva prava zadržana.
