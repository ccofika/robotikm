# 🚀 Quick Start - Robotik Mobile UI

Brzi vodič za početak rada sa UI komponentama.

## ✅ Setup je kompletan!

Vaš projekat je već konfigurisan sa:
- ✅ NativeWind 2.0
- ✅ Tailwind CSS
- ✅ UI komponente (Button, Input, Card, Text, Badge, Separator)
- ✅ Utility funkcije (cn, useColorScheme, colors)
- ✅ Dark mode support
- ✅ TypeScript definicije

## 📦 Instalirane dependencije

```json
{
  "nativewind": "^2.0.11",
  "tailwindcss": "^3.4.1",
  "class-variance-authority": "^0.7.1",
  "clsx": "^2.1.1",
  "tailwind-merge": "^3.3.1",
  "react-native-reanimated": "~3.10.1",
  "@roninoss/icons": "^0.0.4"
}
```

## 🎯 Brz početak - 3 koraka

### 1. Importuj komponente

```jsx
import { Text, Button, Input, Card } from '../components/ui';
```

### 2. Koristi ih!

```jsx
export default function MyScreen() {
  return (
    <View className="flex-1 bg-background p-4">
      <Card>
        <Text variant="title1">Hello World</Text>
        <Button onPress={() => alert('Clicked!')}>
          Click me
        </Button>
      </Card>
    </View>
  );
}
```

### 3. Stilizuj sa Tailwind klasama

```jsx
<View className="flex-1 items-center justify-center bg-background">
  <Text className="text-2xl font-bold text-primary">
    Stilizovan tekst
  </Text>
</View>
```

## 📚 Najčešće korišćene komponente

### Text
```jsx
<Text variant="title1">Naslov</Text>
<Text variant="body">Normalan tekst</Text>
<Text color="secondary">Sivi tekst</Text>
```

### Button
```jsx
<Button onPress={handlePress}>Default</Button>
<Button variant="outline">Outline</Button>
<Button variant="destructive">Delete</Button>
<Button loading>Loading...</Button>
```

### Input
```jsx
<Input
  placeholder="Unesite tekst"
  value={text}
  onChangeText={setText}
/>
```

### Card
```jsx
<Card>
  <CardHeader>
    <CardTitle>Naslov</CardTitle>
    <CardDescription>Opis</CardDescription>
  </CardHeader>
  <CardContent>
    <Text>Sadržaj</Text>
  </CardContent>
</Card>
```

### Badge
```jsx
<Badge variant="success">Active</Badge>
<Badge variant="destructive">Error</Badge>
```

## 🎨 Najčešće Tailwind klase

### Layout
```
flex-1              // Uzima ceo prostor
flex-row            // Horizontalni layout
items-center        // Centrira po vertikali
justify-center      // Centrira po horizontali
gap-4               // Razmak između elemenata
```

### Spacing
```
p-4                 // padding: 16px
px-6                // horizontal padding: 24px
m-2                 // margin: 8px
mt-4                // margin-top: 16px
```

### Boje (auto dark mode)
```
bg-background       // Pozadina
bg-card             // Kartica
bg-primary          // Primarna boja
text-foreground     // Tekst
text-primary        // Primarni tekst
border-border       // Border
```

### Typography
```
text-sm             // Mali tekst
text-base           // Normalan (16px)
text-xl             // Veliki
text-2xl            // Veći
font-bold           // Bold
font-semibold       // Semi-bold
```

### Borders & Radius
```
rounded-lg          // 8px radius
rounded-full        // Potpuno okruglo
border-2            // 2px border
border-t-2          // Samo top border
```

## 🌙 Dark Mode

Automatski je podržan! Koristite ove klase:

```jsx
// Automatski (preporučeno)
<View className="bg-background">
<Text className="text-foreground">

// Ili eksplicitno
<View className="bg-white dark:bg-black">
<Text className="text-black dark:text-white">
```

## 💡 Korisni tipovi

### Kompletan login form (copy-paste ready)

```jsx
import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { Text, Input, Button, Card } from '../components/ui';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center p-6">
        <Card className="w-full">
          <View className="p-6 gap-4">
            <Text variant="title1">Prijava</Text>

            <Input
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />

            <Input
              placeholder="Lozinka"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <Button onPress={() => console.log('Login')}>
              Prijavi se
            </Button>
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}
```

### Lista sa karticama

```jsx
import { FlatList } from 'react-native';
import { Card, CardHeader, CardTitle, Badge } from '../components/ui';

const DATA = [
  { id: '1', title: 'Task 1', status: 'active' },
  { id: '2', title: 'Task 2', status: 'done' },
];

export default function ListScreen() {
  return (
    <FlatList
      data={DATA}
      className="flex-1 bg-background"
      contentContainerClassName="p-4 gap-3"
      renderItem={({ item }) => (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{item.title}</CardTitle>
            <Badge variant={item.status === 'done' ? 'success' : 'default'}>
              {item.status}
            </Badge>
          </CardHeader>
        </Card>
      )}
    />
  );
}
```

## 🔧 Dodavanje više komponenti

### Koristite NativeWindUI za napredne komponente:

```bash
# Bottom Sheet
npx nwui-cli@latest add bottom-sheet
npx expo install @gorhom/bottom-sheet

# Date Picker
npx nwui-cli@latest add date-picker
npx expo install @react-native-community/datetimepicker

# Dropdown Menu
npx nwui-cli@latest add dropdown-menu

# Progress Indicator
npx nwui-cli@latest add progress-indicator

# Slider
npx nwui-cli@latest add slider
npx expo install @react-native-community/slider
```

### Lista dostupnih komponenti:
- Action Sheet, Activity Indicator, Alert, Avatar
- Bottom Sheet, Bottom Tabs, Button, Card, Checkbox
- Context Menu, Date Picker, Dropdown Menu, Form
- Progress Indicator, Ratings Indicator, Slider
- Stepper, Text Field, Toggle, Toolbar
- [Vidi sve komponente](https://nativewindui.com/)

## 📖 Detaljnija dokumentacija

- `UI_COMPONENTS_GUIDE.md` - Kompletan vodič sa svim komponentama
- `src/components/ui/EXAMPLE_USAGE.jsx` - Interaktivni primeri
- [NativeWind Docs](https://www.nativewind.dev/)
- [NativeWindUI](https://nativewindui.com/)

## ⚡ Troubleshooting

### Cache problemi
```bash
npx expo start --clear
```

### Build greške
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Clear watchman (Mac/Linux)
watchman watch-del-all

# Rebuild
npx expo run:android
# ili
npx expo run:ios
```

### Stilovi se ne primenjuju
1. Proverite da je `import './global.css'` na vrhu `App.js`
2. Proverite `babel.config.js` konfiguraciju
3. Restartujte Metro bundler

---

**Sve je spremno! Počnite da gradite vaš UI! 🎨🚀**
