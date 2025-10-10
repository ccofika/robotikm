# Robotik Mobile - UI Component Library

Vodič za korišćenje UI komponenti u Robotik Mobile aplikaciji.

## 📚 Pregled

Ovaj projekat koristi **NativeWind** (Tailwind CSS za React Native) i custom UI komponente inspirisane shadcn/ui dizajnom. Sve komponente su optimizovane za iOS i Android platforme.

## 🎨 Tehnologije

- **NativeWind 2.0** - Tailwind CSS za React Native
- **class-variance-authority (CVA)** - Varijante komponenti
- **clsx + tailwind-merge** - Kombinovanje CSS klasa
- **React Native Reanimated** - Animacije
- **@roninoss/icons** - Ikone

## 📁 Struktura projekta

```
robotikm/
├── src/
│   ├── components/
│   │   └── ui/           # UI komponente (Button, Input, Card, etc.)
│   │       ├── Text.jsx
│   │       ├── Button.jsx
│   │       ├── Input.jsx
│   │       ├── Card.jsx
│   │       ├── Badge.jsx
│   │       ├── Separator.jsx
│   │       └── index.js
│   └── lib/              # Utility funkcije
│       ├── cn.js         # Class name merger
│       ├── useColorScheme.js
│       └── colors.js
├── global.css            # Tailwind + CSS varijable
├── tailwind.config.js    # Tailwind konfiguracija
└── babel.config.js       # Babel + NativeWind
```

## 🚀 Osnovne komponente

### Text

Komponenta za tekst sa predefinisanim varijantama.

```jsx
import { Text } from '../components/ui';

// Osnovni tekst
<Text>Hello World</Text>

// Sa varijantama
<Text variant="title1">Naslov</Text>
<Text variant="heading">Heading</Text>
<Text variant="body">Body text</Text>
<Text variant="caption1">Caption</Text>

// Sa bojama
<Text color="primary">Primarni tekst</Text>
<Text color="secondary">Sekundarni tekst</Text>
<Text color="destructive">Error poruka</Text>

// Custom style
<Text className="text-blue-500 font-bold">Custom</Text>
```

**Dostupne varijante:**
- `largeTitle` - Veliki naslov (4xl)
- `title1`, `title2`, `title3` - Naslovi
- `heading` - Podnaslovi
- `body` - Normalan tekst (default)
- `callout` - Istaknuti tekst
- `subhead`, `footnote` - Mali tekst
- `caption1`, `caption2` - Sitni tekst

**Dostupne boje:**
- `primary`, `secondary`, `tertiary`
- `accent`, `destructive`, `muted`

### Button

Dugme sa različitim varijantama i veličinama.

```jsx
import { Button } from '../components/ui';

// Osnovni button
<Button onPress={() => console.log('Clicked')}>
  Click Me
</Button>

// Varijante
<Button variant="default">Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>

// Veličine
<Button size="sm">Small</Button>
<Button size="default">Medium</Button>
<Button size="lg">Large</Button>
<Button size="icon">🔥</Button>

// Loading state
<Button loading>Loading...</Button>

// Disabled
<Button disabled>Disabled</Button>

// Sa ikonama (koristite @roninoss/icons ili react-native-vector-icons)
<Button>
  <Icon name="check" size={20} color="white" />
  <Text className="text-primary-foreground">Confirm</Text>
</Button>
```

**Props:**
- `variant`: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
- `size`: 'default' | 'sm' | 'lg' | 'icon'
- `loading`: boolean
- `disabled`: boolean
- `onPress`: funkcija

### Input

Input polje za unos teksta.

```jsx
import { Input } from '../components/ui';

// Osnovni input
<Input
  placeholder="Unesite tekst"
  onChangeText={setText}
  value={text}
/>

// Email input
<Input
  placeholder="Email"
  keyboardType="email-address"
  autoCapitalize="none"
/>

// Password input
<Input
  placeholder="Password"
  secureTextEntry
/>

// Sa custom stilom
<Input
  className="border-blue-500"
  placeholder="Custom input"
/>

// Multiline
<Input
  placeholder="Opis"
  multiline
  numberOfLines={4}
  className="h-24"
/>
```

**Props:**
- Svi standardni `TextInput` props
- `className` - dodatne Tailwind klase

### Card

Kartice za prikaz sadržaja.

```jsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from '../components/ui';

<Card>
  <CardHeader>
    <CardTitle>Naslov kartice</CardTitle>
    <CardDescription>
      Opis kartice ide ovde
    </CardDescription>
  </CardHeader>

  <CardContent>
    <Text>Glavni sadržaj kartice</Text>
  </CardContent>

  <CardFooter>
    <Button>Akcija</Button>
  </CardFooter>
</Card>

// Horizontalna layout
<Card className="flex-row items-center p-3">
  <Image source={require('./avatar.png')} className="w-12 h-12 rounded-full" />
  <View className="ml-3">
    <CardTitle>John Doe</CardTitle>
    <CardDescription>john@example.com</CardDescription>
  </View>
</Card>
```

### Badge

Bedž za prikaz statusa ili oznaka.

```jsx
import { Badge } from '../components/ui';

// Osnovni badge
<Badge>New</Badge>

// Varijante
<Badge variant="default">Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Error</Badge>
<Badge variant="outline">Outline</Badge>
<Badge variant="success">Success</Badge>
<Badge variant="warning">Warning</Badge>

// Sa ikonom
<Badge variant="success">
  <Icon name="check" size={12} color="white" />
  <Text className="text-white ml-1">Active</Text>
</Badge>
```

### Separator

Linija za razdvajanje sadržaja.

```jsx
import { Separator } from '../components/ui';

// Horizontalni separator
<Separator />
<Separator orientation="horizontal" />

// Vertikalni separator
<View className="flex-row h-12">
  <Text>Left</Text>
  <Separator orientation="vertical" className="mx-4" />
  <Text>Right</Text>
</View>

// Custom boja
<Separator className="bg-blue-500" />
```

## 🎨 Tailwind CSS klase

### Layout
```jsx
<View className="flex-1 items-center justify-center">
<View className="flex-row gap-4">
<View className="p-4 m-2">
<View className="w-full h-screen">
```

### Boje (automatski podržava dark mode)
```jsx
<View className="bg-background">         // Pozadina
<View className="bg-card">              // Kartica
<Text className="text-foreground">     // Tekst
<Text className="text-primary">        // Primarni
<Text className="text-destructive">    // Error
<View className="border-border">        // Border
```

### Spacing
```jsx
<View className="p-4">        // padding: 16px
<View className="px-6 py-3">  // horizontal & vertical padding
<View className="m-2">        // margin: 8px
<View className="gap-4">      // gap između children
```

### Typography
```jsx
<Text className="text-sm">       // mali tekst
<Text className="text-base">     // normalni
<Text className="text-lg">       // veliki
<Text className="text-2xl">      // veoma veliki
<Text className="font-bold">     // bold
<Text className="font-semibold"> // semibold
<Text className="italic">        // italic
```

### Borders & Radius
```jsx
<View className="rounded-lg">      // 8px radius
<View className="rounded-full">    // potpuno okruglo
<View className="border-2">        // 2px border
<View className="border-t-2">      // samo top border
```

## 🌙 Dark Mode

Dark mode je automatski konfigurisan. Sistem automatski prati sistem podešavanja telefona.

```jsx
// Automatski - koristi CSS varijable
<View className="bg-background">
<Text className="text-foreground">

// Ili eksplicitno
<View className="bg-white dark:bg-black">
<Text className="text-black dark:text-white">
```

### Korišćenje useColorScheme hook-a

```jsx
import { useColorScheme } from '../lib/useColorScheme';

function MyComponent() {
  const { colorScheme, isDarkColorScheme, toggleColorScheme } = useColorScheme();

  return (
    <View>
      <Text>Current theme: {colorScheme}</Text>
      <Button onPress={toggleColorScheme}>
        Toggle Theme
      </Button>
    </View>
  );
}
```

## 📦 Dodavanje novih komponenti

### Opcija 1: Ručno kreiranje

1. Kreirajte novu komponentu u `src/components/ui/`
2. Koristite `cn()` za kombinovanje klasa
3. Koristite CVA za varijante
4. Eksportujte iz `index.js`

```jsx
// src/components/ui/MyComponent.jsx
import * as React from 'react';
import { View } from 'react-native';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/cn';

const myComponentVariants = cva('base-classes', {
  variants: {
    variant: {
      default: 'variant-classes',
    },
  },
});

export function MyComponent({ className, variant, ...props }) {
  return (
    <View
      className={cn(myComponentVariants({ variant }), className)}
      {...props}
    />
  );
}
```

### Opcija 2: Korišćenje NativeWindUI CLI (preporučeno)

Za naprednije komponente, koristite NativeWindUI:

```bash
# Instalacija komponente
npx nwui-cli@latest add button
npx nwui-cli@latest add card
npx nwui-cli@latest add dialog

# Instalacija sa dependencijama
npx nwui-cli@latest add bottom-sheet
npx expo install @gorhom/bottom-sheet react-native-gesture-handler
```

Dostupne NativeWindUI komponente:
- Action Sheet, Alert, Avatar
- Bottom Sheet, Bottom Tabs
- Checkbox, Context Menu, Date Picker
- Dropdown Menu, Form
- Progress Indicator, Slider, Stepper
- Toggle, Toolbar
- i mnoge druge...

## 🔧 Utility funkcije

### cn() - Class Name Merger

```jsx
import { cn } from '../lib/cn';

// Kombinovanje klasa
<View className={cn('p-4', 'bg-white', className)} />

// Conditional klase
<View className={cn(
  'p-4',
  isActive && 'bg-blue-500',
  isDisabled && 'opacity-50'
)} />
```

### COLORS - Palete boja

```jsx
import { COLORS } from '../lib/colors';

// Pristup bojama
const primaryColor = COLORS.light.primary;
const darkBackground = COLORS.dark.background;
const androidPrimary = COLORS.android.light.primary;
```

## 📱 Primeri kompletnih ekrana

### Login Screen

```jsx
import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { Text, Input, Button, Card, Separator } from '../components/ui';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    // Login logic
    setLoading(false);
  };

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <View className="p-6">
            <Text variant="title1" className="mb-2">Dobrodošli</Text>
            <Text color="secondary" className="mb-6">
              Prijavite se na vaš nalog
            </Text>

            <View className="gap-4">
              <Input
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Input
                placeholder="Lozinka"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              <Button
                onPress={handleLogin}
                loading={loading}
                size="lg"
              >
                Prijavi se
              </Button>

              <Separator className="my-4" />

              <Button variant="outline">
                Registruj se
              </Button>
            </View>
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}
```

### List Screen sa karticama

```jsx
import React from 'react';
import { FlatList, View } from 'react-native';
import { Card, CardHeader, CardTitle, CardDescription, Badge, Separator } from '../components/ui';

const DATA = [
  { id: '1', title: 'Task 1', status: 'active', priority: 'high' },
  { id: '2', title: 'Task 2', status: 'completed', priority: 'low' },
];

export default function TaskListScreen() {
  const renderItem = ({ item }) => (
    <Card className="mb-3">
      <CardHeader>
        <View className="flex-row items-center justify-between">
          <CardTitle>{item.title}</CardTitle>
          <Badge variant={item.status === 'completed' ? 'success' : 'default'}>
            {item.status}
          </Badge>
        </View>
        <CardDescription>Priority: {item.priority}</CardDescription>
      </CardHeader>
    </Card>
  );

  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={DATA}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerClassName="p-4"
        ItemSeparatorComponent={() => <Separator className="my-2" />}
      />
    </View>
  );
}
```

## 🎯 Best Practices

1. **Koristite komponente umesto direktnog Tailwind-a**: Umesto `<View>` i `<Text>`, koristite UI komponente
2. **Konzistentnost**: Držite se design system boja i varijanti
3. **Dark mode first**: Uvek testirajte i light i dark mode
4. **Performance**: Koristite `className` umesto inline styles
5. **Reusability**: Kreirajte custom komponente za ponavljajuće UI patterne

## 📚 Dodatni resursi

- [NativeWind Docs](https://www.nativewind.dev/)
- [Tailwind CSS Docs](https://tailwindcss.com/)
- [NativeWindUI Components](https://nativewindui.com/)
- [React Native Reusables](https://rnr-docs.vercel.app/)
- [CVA Docs](https://cva.style/)

## 🐛 Troubleshooting

### Stilovi se ne primenjuju
1. Proverite da li je `global.css` importovan u `App.js`
2. Resetujte cache: `npx expo start --clear`
3. Proverite `babel.config.js` konfiguraciju

### Dark mode ne radi
1. Proverite `tailwind.config.js` - `darkMode: 'class'`
2. Koristite CSS varijable umesto hardcoded boja
3. Testirajte sa `useColorScheme` hook-om

### TypeScript greške
1. Uverite se da postoji `nativewind-env.d.ts`
2. Dodajte tip definicije za komponente

---

**Happy coding! 🚀**
