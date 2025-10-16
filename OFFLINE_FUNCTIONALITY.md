# Offline-First Funkcionalnost - Robotikm Android Aplikacija

## 📋 Pregled

Robotikm aplikacija sada podržava potpunu offline funkcionalnost koja omogućava tehničarima da rade bez aktivne internet konekcije. Sve promene se automatski sinhronizuju kada se konekcija vrati.

## 🎯 Implementirane Funkcionalnosti

### Core Infrastruktura

#### 1. **Network Monitor** (`src/services/networkMonitor.js`)
- Prati online/offline status uređaja pomoću @react-native-community/netinfo
- Notifikuje aplikaciju o promenama network statusa
- Singleton servis dostupan kroz celu aplikaciju

#### 2. **Offline Storage** (`src/services/offlineStorage.js`)
- Lokalno skladište zasnovano na AsyncStorage
- Čuva:
  - Radne naloge po tehničaru
  - Opremu tehničara
  - Materijale tehničara
  - Opremu korisnika po radnom nalogu
  - Uklonjenu opremu
  - Metadata o poslednjoj sinhronizaciji
- Single Source of Truth (SSOT) - lokalna baza je izvor podataka za UI

#### 3. **Sync Queue Manager** (`src/services/syncQueue.js`)
- Upravlja redom akcija koje čekaju na sinhronizaciju
- Svaka akcija u queue-u sadrži:
  - Tip akcije (UPDATE_WORK_ORDER, ADD_USER_EQUIPMENT, itd.)
  - Podatke za sinhronizaciju
  - Retry logiku (max 5 pokušaja)
  - Exponential backoff (1s → 2s → 4s → 8s → 16s → 60s)
- Automatski procesira queue kada se vrati konekcija

#### 4. **Data Repository** (`src/services/dataRepository.js`)
- Cache-first pristup podacima
- Za GET operacije:
  - Vraća podatke iz cache-a odmah
  - Fetchuje sa servera u pozadini ako je online
  - Ažurira cache nakon uspešnog fetch-a
- Za POST/PUT/DELETE operacije:
  - Ažurira lokalni cache odmah (optimistic update)
  - Dodaje u sync queue
  - Procesira sync ako je online

#### 5. **Sync Service** (`src/services/syncService.js`)
- Implementira stvarnu logiku sinhronizacije
- Procesira svaki tip akcije iz queue-a
- Detektuje konflikte (timestamp-based)
- Omogućava conflict resolution

#### 6. **Offline Context** (`src/context/OfflineContext.js`)
- React Context za pristup offline funkcionalnostima
- Pruža:
  - Network status (isOnline, isSyncing)
  - Queue statistiku (pendingActions, failedActions)
  - Funkcije za sync i conflict resolution
- Auto-sync kada se vrati u foreground
- Auto-sync kada se vrati konekcija

### UI Komponente

#### 1. **NetworkStatusBanner** (`src/components/offline/NetworkStatusBanner.js`)
- Prikazuje se na vrhu aplikacije
- Indikatori:
  - **Offline** (narandžasta): "Offline - X promena će biti sinhronizovano"
  - **Syncing** (plava): "Sinhronizacija u toku..."
  - **Error** (crvena): "X akcija nije uspelo - dodirnite za detalje"
  - **Pending** (ljubičasta): "X promena čeka na sinhronizaciju"

#### 2. **SyncStatusIndicator** (`src/components/offline/SyncStatusIndicator.js`)
- Kompaktna ikonica u header-u
- Pokazuje:
  - ✓ Sve sinhronizovano (zelena)
  - ⟳ Sinhronizacija u toku (plava)
  - ⚠ Konflikti (crvena)
  - ⚠ Greške (crvena)
  - ☁ Pending akcije (ljubičasta)
  - ☁ Offline (narandžasta)
- Badge sa brojem pending/failed akcija

#### 3. **ConflictResolutionModal** (`src/components/offline/ConflictResolutionModal.js`)
- Prikazuje detaljno obe verzije (serverska i lokalna)
- Omogućava tehničaru da izabere:
  - "Zadrži moju verziju"
  - "Prihvati serversku verziju"
  - (U budućnosti: "Spoji")

#### 4. **SyncErrorModal** (`src/components/offline/SyncErrorModal.js`)
- Lista svih neuspelih sinhronizacija
- Za svaku grešku pokazuje:
  - Tip akcije
  - Poruku greške
  - Broj pokušaja (X/5)
  - Vreme poslednjeg pokušaja
- Akcije:
  - "Pokušaj ponovo" - Retry pojedinačne akcije
  - "Odbaci" - Trajno ukloni akciju iz queue-a
  - "Pokušaj sve ponovo" - Retry svih failed akcija

### Integrisani Ekrani

#### 1. **WorkOrdersScreen** (Lista radnih naloga)
- ✅ Offline čitanje radnih naloga iz cache-a
- ✅ Background refresh kada je online
- ✅ Pull-to-refresh (force refresh ako je online)
- ✅ SyncStatusIndicator u header-u

#### 2. **WorkOrderDetailScreen** (Detalji radnog naloga)
- ✅ Offline čitanje detalja radnog naloga
- ✅ Offline dodavanje opreme
- ✅ Offline uklanjanje opreme
- ✅ Offline dodavanje materijala
- ✅ Offline uklanjanje materijala
- ✅ Offline upload slika (queue-ovano)
- ✅ Offline završavanje radnog naloga
- ✅ Offline odlaganje radnog naloga
- ✅ Offline otkazivanje radnog naloga
- Sve akcije:
  - Ažuriraju UI odmah
  - Dodaju se u sync queue
  - Prikazuju poruku koja zavisi od network statusa

#### 3. **EquipmentScreen** (Oprema tehničara)
- ✅ Offline čitanje opreme iz cache-a
- ✅ Background refresh kada je online
- ✅ Pull-to-refresh

## 🔄 Kako Radi Sinhronizacija

### 1. Offline Akcija
```javascript
// Korisnik završava radni nalog offline
await dataRepository.updateWorkOrder(technicianId, workOrderId, {
  status: 'zavrsen',
  comment: 'Gotovo',
  completedAt: new Date().toISOString()
});
```

**Šta se dešava:**
1. Podaci se čuvaju u lokalnom storage-u odmah
2. UI se ažurira odmah (optimistic update)
3. Akcija se dodaje u sync queue
4. Korisnik vidi poruku: "Radni nalog je označen kao završen i biće sinhronizovan kada se povežete na internet"

### 2. Kada Se Vrati Konekcija
```javascript
// OfflineContext automatski detektuje da je uređaj online
networkMonitor.addListener((online) => {
  if (online) {
    handleGoingOnline(); // Automatski pokreće sync
  }
});
```

**Šta se dešava:**
1. NetworkMonitor detektuje konekciju
2. SyncQueue automatski počinje da procesira pending akcije
3. SyncService poziva stvarnu API akciju za svaku akciju u queue-u
4. Ako uspe → Akcija se uklanja iz queue-a
5. Ako ne uspe → Retry sa exponential backoff

### 3. Conflict Detection
```javascript
// Pre nego što pošalje akciju, SyncService proverava konflikte
const conflict = await detectWorkOrderConflict(workOrderId, localUpdates);

if (conflict) {
  // Prikaži ConflictResolutionModal
  await handleConflict(item, conflict);
}
```

**Konflikti se detektuju:**
- Timestamp-based: Server verzija je novija od lokalne
- Status-based: Radni nalog je već završen na serveru
- Field-based: Specifična polja su promenjena na obe strane

### 4. Greške i Retry
```javascript
// Ako sync ne uspe, akcija se retry-uje sa exponential backoff
const delays = [1s, 2s, 4s, 8s, 16s, 60s];
// Maksimalno 5 pokušaja

// Nakon 5 neuspelih pokušaja → Status: 'failed'
// Korisnik vidi u SyncErrorModal
```

## 📱 Korisničko Iskustvo

### Scenario 1: Rad bez Interneta
1. Tehničar gubi internet konekciju
2. **NetworkStatusBanner** se pojavljuje: "Offline - promene će biti sinhronizovane"
3. Tehničar nastavi normalno da radi:
   - Dodaje opremu
   - Dodaje materijale
   - Uploaduje slike
   - Završava radne naloge
4. Sve akcije se čuvaju lokalno
5. **SyncStatusIndicator** pokazuje broj pending akcija

### Scenario 2: Povratak Online
1. Tehničar se vrati u zonu sa internetom
2. **NetworkStatusBanner** se ažurira: "Sinhronizacija u toku..."
3. **SyncStatusIndicator** pokazuje spinner
4. Sve akcije se automatski sinhronizuju u pozadini
5. Kada je gotovo → Banner nestaje, indicator pokazuje ✓

### Scenario 3: Konflikt
1. Tokom sinhronizacije detektuje se konflikt
2. **ConflictResolutionModal** se otvara automatski
3. Tehničar vidi:
   - Svoju verziju (lokalna)
   - Verziju sa servera
   - Razlike između njih
4. Tehničar bira jednu od opcija:
   - "Zadrži moju verziju" → Forsira upload lokalne verzije
   - "Prihvati serversku verziju" → Odbacuje lokalnu, prihvata serversku

### Scenario 4: Greška pri Sinhronizaciji
1. Neka akcija ne može da se sinhronizuje (npr. radni nalog je već završen)
2. **NetworkStatusBanner** se pojavljuje crveni: "1 akcija nije uspelo - dodirnite za detalje"
3. Tehničar dodirne banner
4. **SyncErrorModal** se otvara sa listom grešaka
5. Tehničar vidi šta nije uspelo i može:
   - "Pokušaj ponovo" → Retry
   - "Odbaci" → Trajno ukloni akciju

## 🔧 Tehnički Detalji

### Zavisnosti
```json
{
  "@react-native-community/netinfo": "^11.4.1",
  "uuid": "^13.0.0",
  "react-native-background-fetch": "^4.2.8",
  "@react-native-async-storage/async-storage": "2.2.0"
}
```

### Storage Keys
```
- workOrders_{technicianId}
- equipment_{technicianId}
- materials_{technicianId}
- userEquipment_{workOrderId}
- removedEquipment_{workOrderId}
- syncQueue
- lastSync_{entity}_{technicianId}
```

### Sync Queue Item Struktura
```javascript
{
  id: "uuid",
  type: "UPDATE_WORK_ORDER",
  entity: "workOrders",
  entityId: "workOrderId",
  action: "update",
  data: { ...updateData },
  timestamp: 1234567890,
  retryCount: 0,
  maxRetries: 5,
  status: "pending" | "syncing" | "failed" | "synced",
  error: null | "error message",
  lastAttempt: null | timestamp
}
```

### Podržani Tipovi Akcija
- `UPDATE_WORK_ORDER` - Ažuriranje radnog naloga (status, komentar, itd.)
- `UPDATE_USED_MATERIALS` - Ažuriranje materijala
- `ADD_USER_EQUIPMENT` - Dodavanje opreme korisniku
- `REMOVE_USER_EQUIPMENT` - Uklanjanje opreme korisnika
- `UPLOAD_IMAGE` - Upload slike za radni nalog
- `DELETE_IMAGE` - Brisanje slike sa radnog naloga

## 🚀 Sledeći Koraci / Poboljšanja

### Prioritet 1 (Kritično)
- [ ] **Testing** - Testirati sve offline scenarije
- [ ] **Opservability** - Dodati analytics za offline usage
- [ ] **Error Handling** - Poboljšati error messages

### Prioritet 2 (Važno)
- [ ] **Background Sync** - Implementirati react-native-background-fetch
- [ ] **Image Caching** - Keširati uploadovane slike lokalno
- [ ] **Merge Conflict Resolution** - Omogućiti "Spoji" opciju
- [ ] **Storage Cleanup** - Automatsko brisanje starih podataka (30+ dana)

### Prioritet 3 (Nice-to-have)
- [ ] **Delta Sync** - Slati samo izmene umesto celih objekata
- [ ] **Compression** - Kompresovati podatke u storage-u
- [ ] **Offline Indicators** - Vizuelni indikatori za svaki unsync-ed item
- [ ] **Manual Sync Trigger** - Dugme za manual sync

## 📖 Developer Guide

### Kako Dodati Novu Offline Akciju

1. **Dodaj tip akcije u syncService.js:**
```javascript
case 'MY_NEW_ACTION':
  return await this.syncMyNewAction(item);
```

2. **Implementiraj sync metodu:**
```javascript
async syncMyNewAction(item) {
  const { data } = item.data;
  await myAPI.doSomething(data);
  return true;
}
```

3. **U repository-ju dodaj metodu:**
```javascript
async doMyAction(data) {
  // 1. Ažuriraj lokalno
  await offlineStorage.saveMyData(data);

  // 2. Dodaj u queue
  await syncQueue.addToQueue({
    type: 'MY_NEW_ACTION',
    entity: 'myEntity',
    action: 'update',
    data
  });

  // 3. Sync ako je online
  if (networkMonitor.getIsOnline()) {
    syncQueue.processQueue();
  }
}
```

### Kako Testirati Offline Funkcionalnost

1. **U razvoju:**
   - Chrome DevTools → Network tab → Offline checkbox
   - Ili isključi WiFi/Mobilne podatke na test uređaju

2. **Test scenariji:**
   - Uradi akciju offline → Proveri da je u queue-u
   - Vrati se online → Proveri da je sinhronizovano
   - Simuliraj grešku → Proveri retry logiku
   - Napravi konflikt → Proveri resolution modal

## 📝 Napomene

- **Performance**: Offline storage je brz (AsyncStorage), ali za velike količine podataka (1000+ radnih naloga) razmotri optimizacije
- **Security**: Podaci u AsyncStorage nisu enkriptovani - ne čuvaj osetljive informacije
- **Battery**: Background sync koristi battery - implementiraj samo kada je potrebno
- **Network**: Sync automatski proverava konekciju pre slanja - nema potrebe za dodatnim provera

---

**Kreirano:** 2025-01-XX
**Verzija:** 1.0.0
**Status:** ✅ Production Ready (uz testing)
