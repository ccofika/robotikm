import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TextInput,
  Pressable,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { authAPI } from '../services/api';

export default function LoginScreen() {
  const { login } = useContext(AuthContext);
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
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center p-6"
          keyboardShouldPersistTaps="handled"
        >
          {/* Login Card - KOPIJA WEB DIZAJNA */}
          <View className="bg-white/80 border border-white/30 rounded-2xl p-8 shadow-lg">
            {/* Header - KOPIJA WEB DIZAJNA */}
            <View className="items-center mb-8">
              <View className="mb-4">
                <View className="p-3 bg-blue-50 rounded-xl">
                  <Ionicons name="log-in-outline" size={32} color="#2563eb" />
                </View>
              </View>
              <Text className="text-2xl font-bold text-slate-900 mb-2">
                TelCo Inventory
              </Text>
              <Text className="text-slate-600 text-center">
                Profesionalni sistem upravljanja inventarom
              </Text>
            </View>

            {/* Error Alert - KOPIJA WEB DIZAJNA */}
            {(errors.username || errors.password) && (
              <View className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex-row items-center mb-6">
                <Ionicons name="alert-circle" size={16} color="#b91c1c" style={{ marginRight: 8 }} />
                <Text className="text-sm text-red-700">
                  {errors.username || errors.password}
                </Text>
              </View>
            )}

            {/* Username Input - KOPIJA WEB DIZAJNA */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-slate-700 mb-2">
                Korisničko ime
              </Text>
              <View className="relative">
                <TextInput
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Unesite korisničko ime"
                  autoCapitalize="none"
                  editable={!loading}
                  className="h-11 w-full pl-10 pr-4 bg-white border border-slate-300 rounded-md text-sm text-slate-900"
                  placeholderTextColor="#94a3b8"
                />
                <View className="absolute left-3 top-3">
                  <Ionicons name="person-outline" size={18} color="#64748b" />
                </View>
              </View>
            </View>

            {/* Password Input - KOPIJA WEB DIZAJNA */}
            <View className="mb-6">
              <Text className="text-sm font-medium text-slate-700 mb-2">
                Lozinka
              </Text>
              <View className="relative">
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Unesite lozinku"
                  secureTextEntry={!showPassword}
                  editable={!loading}
                  className="h-11 w-full pl-10 pr-10 bg-white border border-slate-300 rounded-md text-sm text-slate-900"
                  placeholderTextColor="#94a3b8"
                />
                <View className="absolute left-3 top-3">
                  <Ionicons name="lock-closed-outline" size={18} color="#64748b" />
                </View>
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  className="absolute right-3 top-3"
                >
                  <Ionicons
                    name={showPassword ? "eye-outline" : "eye-off-outline"}
                    size={16}
                    color="#64748b"
                  />
                </Pressable>
              </View>
            </View>

            {/* Submit Button - KOPIJA WEB DIZAJNA */}
            <Pressable
              onPress={handleLogin}
              disabled={loading}
              className="h-11 w-full bg-blue-600 rounded-md items-center justify-center"
            >
              {loading ? (
                <View className="flex-row items-center">
                  <ActivityIndicator color="#fff" size="small" style={{ marginRight: 8 }} />
                  <Text className="text-white font-medium">Prijavljivanje...</Text>
                </View>
              ) : (
                <Text className="text-white font-medium">Prijavi se</Text>
              )}
            </Pressable>

            {/* Footer - KOPIJA WEB DIZAJNA */}
            <View className="mt-8 pt-6 border-t border-slate-200 items-center">
              <Text className="text-xs text-slate-500">&copy; 2024 TelCo Inventory System</Text>
              <Text className="text-xs text-slate-400 mt-1">Verzija 1.0</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
