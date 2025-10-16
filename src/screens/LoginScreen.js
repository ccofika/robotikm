import React, { useState, useContext } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { VStack } from '../components/ui/vstack';
import { HStack } from '../components/ui/hstack';
import { Box } from '../components/ui/box';
import { Card } from '../components/ui/card';
import { Text } from '../components/ui/text';
import { Heading } from '../components/ui/heading';
import { Input, InputField, InputSlot, InputIcon } from '../components/ui/input';
import { Button, ButtonText, ButtonSpinner } from '../components/ui/button';
import { Center } from '../components/ui/center';

export default function LoginScreen() {
  const { login } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    const newErrors = {};
    if (!username.trim()) {
      newErrors.username = 'Korisničko ime je obavezno';
    }
    if (!password) {
      newErrors.password = 'Lozinka je obavezna';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const response = await authAPI.login({ name: username, password });
      const { user, token } = response.data;

      if (user.role !== 'technician') {
        Alert.alert(
          'Pristup odbijen',
          'Ova aplikacija je namenjena samo tehničarima. Molimo koristite web verziju.'
        );
        setLoading(false);
        return;
      }

      await login(user, token);
      Alert.alert('Uspešno', 'Dobrodošli!');
    } catch (error) {
      console.error('Login greška:', error);
      Alert.alert(
        'Greška pri prijavljivanju',
        error.response?.data?.message || 'Neispravno korisničko ime ili lozinka'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#f8fafc', '#e2e8f0']}
      className="flex-1"
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <Card variant="elevated" className="bg-white/80 backdrop-blur-xl border-white/30">
            <VStack space="lg">
              {/* Header */}
              <VStack space="md" className="items-center">
                <Center className="w-20 h-20 bg-blue-50 rounded-2xl mb-2">
                  <Ionicons name="log-in-outline" size={40} color="#2563eb" />
                </Center>
                <Heading size="2xl" className="text-slate-900 text-center">
                  TelCo Inventory
                </Heading>
                <Text size="sm" className="text-slate-600 text-center">
                  Profesionalni sistem upravljanja inventarom
                </Text>
              </VStack>

              {/* Error Alert */}
              {(errors.username || errors.password) && (
                <HStack space="sm" className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  <Ionicons name="alert-circle" size={20} color="#b91c1c" />
                  <Text size="sm" className="text-red-700 flex-1">
                    {errors.username || errors.password}
                  </Text>
                </HStack>
              )}

              {/* Username Input */}
              <VStack space="xs">
                <Text size="sm" bold className="text-slate-700">
                  Korisničko ime
                </Text>
                <Input variant="outline" size="md" isDisabled={loading}>
                  <InputSlot className="pl-3">
                    <InputIcon as={() => <Ionicons name="person-outline" size={18} color="#64748b" />} />
                  </InputSlot>
                  <InputField
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Unesite korisničko ime"
                    autoCapitalize="none"
                    editable={!loading}
                  />
                </Input>
              </VStack>

              {/* Password Input */}
              <VStack space="xs">
                <Text size="sm" bold className="text-slate-700">
                  Lozinka
                </Text>
                <Input variant="outline" size="md" isDisabled={loading}>
                  <InputSlot className="pl-3">
                    <InputIcon as={() => <Ionicons name="lock-closed-outline" size={18} color="#64748b" />} />
                  </InputSlot>
                  <InputField
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Unesite lozinku"
                    secureTextEntry={!showPassword}
                    editable={!loading}
                  />
                  <InputSlot onPress={() => setShowPassword(!showPassword)}>
                    <InputIcon as={() => (
                      <Ionicons
                        name={showPassword ? "eye-outline" : "eye-off-outline"}
                        size={18}
                        color="#64748b"
                      />
                    )} />
                  </InputSlot>
                </Input>
              </VStack>

              {/* Submit Button */}
              <Button
                action="primary"
                size="lg"
                onPress={handleLogin}
                isDisabled={loading}
                className="mt-2"
              >
                {loading ? (
                  <>
                    <ButtonSpinner />
                    <ButtonText>Prijavljivanje...</ButtonText>
                  </>
                ) : (
                  <ButtonText>Prijavi se</ButtonText>
                )}
              </Button>

              {/* Footer */}
              <VStack space="xs" className="mt-6 pt-6 border-t border-slate-200 items-center">
                <Text size="xs" className="text-slate-500">&copy; 2024 TelCo Inventory System</Text>
                <Text size="xs" className="text-slate-400">Verzija 1.0</Text>
              </VStack>
            </VStack>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
