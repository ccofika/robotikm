/**
 * PRIMER KORIŠĆENJA UI KOMPONENTI
 *
 * Ovaj fajl demonstrira kako koristiti sve dostupne UI komponente
 * Kopirajte primere u vaše screen-ove po potrebi
 */

import React, { useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import {
  Text,
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Separator,
} from './index';

export default function ExampleUsageScreen() {
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);

  const handleButtonPress = () => {
    Alert.alert('Kliknuto!', 'Button je pritisnut');
  };

  const simulateLoading = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="p-4 gap-6">

        {/* TEXT PRIMERI */}
        <Card>
          <CardHeader>
            <CardTitle>Text Varijante</CardTitle>
            <CardDescription>Različite veličine i stilovi teksta</CardDescription>
          </CardHeader>
          <CardContent className="gap-2">
            <Text variant="largeTitle">Large Title</Text>
            <Text variant="title1">Title 1</Text>
            <Text variant="title2">Title 2</Text>
            <Text variant="title3">Title 3</Text>
            <Text variant="heading">Heading</Text>
            <Text variant="body">Body text (default)</Text>
            <Text variant="callout">Callout text</Text>
            <Text variant="subhead">Subhead text</Text>
            <Text variant="footnote">Footnote text</Text>
            <Text variant="caption1">Caption 1</Text>

            <Separator className="my-2" />

            <Text color="primary">Primary color</Text>
            <Text color="secondary">Secondary color</Text>
            <Text color="tertiary">Tertiary color</Text>
            <Text color="accent">Accent color</Text>
            <Text color="destructive">Destructive color</Text>
          </CardContent>
        </Card>

        {/* BUTTON PRIMERI */}
        <Card>
          <CardHeader>
            <CardTitle>Button Varijante</CardTitle>
            <CardDescription>Različiti stilovi i veličine dugmadi</CardDescription>
          </CardHeader>
          <CardContent className="gap-3">
            <Text variant="subhead" className="mb-2">Varijante:</Text>
            <Button variant="default" onPress={handleButtonPress}>
              Default Button
            </Button>
            <Button variant="destructive" onPress={handleButtonPress}>
              Destructive Button
            </Button>
            <Button variant="outline" onPress={handleButtonPress}>
              Outline Button
            </Button>
            <Button variant="secondary" onPress={handleButtonPress}>
              Secondary Button
            </Button>
            <Button variant="ghost" onPress={handleButtonPress}>
              Ghost Button
            </Button>

            <Separator className="my-2" />

            <Text variant="subhead" className="mb-2">Veličine:</Text>
            <Button size="sm" onPress={handleButtonPress}>Small</Button>
            <Button size="default" onPress={handleButtonPress}>Default</Button>
            <Button size="lg" onPress={handleButtonPress}>Large</Button>

            <View className="flex-row gap-2">
              <Button size="icon" onPress={handleButtonPress}>🔥</Button>
              <Button size="icon" onPress={handleButtonPress}>💡</Button>
              <Button size="icon" onPress={handleButtonPress}>⚡</Button>
            </View>

            <Separator className="my-2" />

            <Text variant="subhead" className="mb-2">States:</Text>
            <Button loading={loading} onPress={simulateLoading}>
              {loading ? 'Loading...' : 'Klikni za loading'}
            </Button>
            <Button disabled>Disabled Button</Button>
          </CardContent>
        </Card>

        {/* INPUT PRIMERI */}
        <Card>
          <CardHeader>
            <CardTitle>Input Polja</CardTitle>
            <CardDescription>Različite vrste input-a</CardDescription>
          </CardHeader>
          <CardContent className="gap-3">
            <Input
              placeholder="Osnovni input"
              value={inputValue}
              onChangeText={setInputValue}
            />

            <Input
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Input
              placeholder="Password"
              secureTextEntry
            />

            <Input
              placeholder="Telefon"
              keyboardType="phone-pad"
            />

            <Input
              placeholder="Opis (multiline)"
              multiline
              numberOfLines={3}
              className="h-20"
            />

            <Input
              placeholder="Custom style"
              className="border-blue-500 bg-blue-50"
            />
          </CardContent>
        </Card>

        {/* BADGE PRIMERI */}
        <Card>
          <CardHeader>
            <CardTitle>Badge Komponente</CardTitle>
            <CardDescription>Za prikaz statusa i oznaka</CardDescription>
          </CardHeader>
          <CardContent>
            <View className="flex-row flex-wrap gap-2">
              <Badge variant="default">Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="destructive">Error</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
            </View>
          </CardContent>
        </Card>

        {/* CARD LAYOUT PRIMERI */}
        <Card>
          <CardHeader>
            <CardTitle>Kompleksna kartica</CardTitle>
            <CardDescription>Primer sa svim delovima kartice</CardDescription>
          </CardHeader>

          <CardContent className="gap-3">
            <Text>Ovo je glavni sadržaj kartice. Možete dodati bilo šta ovde:</Text>

            <View className="flex-row gap-2">
              <Badge variant="success">Active</Badge>
              <Badge variant="outline">Beta</Badge>
            </View>

            <Separator />

            <Text color="secondary">
              Dodatne informacije ili detalji mogu ići ovde.
            </Text>
          </CardContent>

          <CardFooter className="gap-2">
            <Button variant="outline" size="sm" className="flex-1">
              Cancel
            </Button>
            <Button size="sm" className="flex-1">
              Confirm
            </Button>
          </CardFooter>
        </Card>

        {/* SEPARATOR PRIMERI */}
        <Card>
          <CardHeader>
            <CardTitle>Separators</CardTitle>
          </CardHeader>
          <CardContent>
            <Text>Tekst iznad</Text>
            <Separator className="my-3" />
            <Text>Tekst ispod</Text>

            <View className="flex-row items-center h-12 my-4">
              <Text>Left</Text>
              <Separator orientation="vertical" className="mx-4" />
              <Text>Right</Text>
            </View>

            <Separator className="bg-blue-500 h-0.5" />
          </CardContent>
        </Card>

        {/* LAYOUT PRIMERI */}
        <Card>
          <CardHeader>
            <CardTitle>Layout Kombinacije</CardTitle>
            <CardDescription>Flex layout primeri</CardDescription>
          </CardHeader>
          <CardContent className="gap-4">
            {/* Horizontalni row */}
            <View className="flex-row gap-2">
              <Button size="sm" className="flex-1">Button 1</Button>
              <Button size="sm" className="flex-1">Button 2</Button>
            </View>

            {/* Grid-like layout */}
            <View className="flex-row flex-wrap gap-2">
              <Badge>Tag 1</Badge>
              <Badge>Tag 2</Badge>
              <Badge>Tag 3</Badge>
              <Badge>Tag 4</Badge>
              <Badge>Tag 5</Badge>
            </View>

            {/* Centered content */}
            <View className="items-center justify-center p-4 bg-muted rounded-lg">
              <Text variant="heading">Centered</Text>
              <Text color="secondary">Content</Text>
            </View>

            {/* Space between */}
            <View className="flex-row items-center justify-between p-3 bg-card border-2 border-border rounded-lg">
              <Text variant="callout">Item</Text>
              <Badge variant="success">New</Badge>
            </View>
          </CardContent>
        </Card>

        {/* DARK MODE PRIMER */}
        <Card>
          <CardHeader>
            <CardTitle>Dark Mode Support</CardTitle>
            <CardDescription>
              Sve komponente automatski podržavaju dark mode
            </CardDescription>
          </CardHeader>
          <CardContent>
            <View className="p-4 bg-background border-2 border-border rounded-lg">
              <Text className="text-foreground">
                Ovaj tekst će biti crn u light mode i beo u dark mode
              </Text>
            </View>

            <View className="p-4 mt-3 bg-card rounded-lg">
              <Text className="text-card-foreground">
                Background automatski menja boju
              </Text>
            </View>

            <View className="p-4 mt-3 bg-white dark:bg-black rounded-lg border-2 border-border">
              <Text className="text-black dark:text-white">
                Ili eksplicitno definišite dark mode stil
              </Text>
            </View>
          </CardContent>
        </Card>

        {/* REAL-WORLD PRIMER: Login Form */}
        <Card>
          <CardHeader>
            <CardTitle>Praktičan primer: Login Form</CardTitle>
          </CardHeader>
          <CardContent className="gap-4">
            <Input placeholder="Email" keyboardType="email-address" />
            <Input placeholder="Password" secureTextEntry />

            <Button onPress={handleButtonPress}>
              Prijavi se
            </Button>

            <Separator />

            <Button variant="outline">
              Registruj se
            </Button>

            <Button variant="ghost" size="sm">
              Zaboravljena lozinka?
            </Button>
          </CardContent>
        </Card>

        {/* REAL-WORLD PRIMER: Profile Card */}
        <Card>
          <CardContent className="flex-row items-center gap-4 p-4">
            <View className="w-16 h-16 bg-primary rounded-full items-center justify-center">
              <Text className="text-2xl text-primary-foreground">JD</Text>
            </View>

            <View className="flex-1">
              <Text variant="heading">John Doe</Text>
              <Text color="secondary" variant="subhead">john.doe@example.com</Text>

              <View className="flex-row gap-2 mt-2">
                <Badge variant="success">Active</Badge>
                <Badge variant="outline">Pro</Badge>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* Bottom spacing */}
        <View className="h-8" />
      </View>
    </ScrollView>
  );
}
