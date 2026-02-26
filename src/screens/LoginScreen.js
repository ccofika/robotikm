import React, { useState, useContext } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Modal,
  Pressable
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
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);

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

      // Sačuvaj korisnika (NotificationContext automatski registruje push token)
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
                <Pressable onPress={() => setShowPrivacyPolicy(true)} className="mt-2">
                  <Text size="xs" className="text-blue-500 underline">Privacy Policy</Text>
                </Pressable>
              </VStack>
            </VStack>
          </Card>
        </ScrollView>

        {/* Privacy Policy Modal */}
        <Modal
          visible={showPrivacyPolicy}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowPrivacyPolicy(false)}
        >
          <Box className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
            <HStack className="px-4 py-3 border-b border-slate-200 items-center justify-between">
              <Heading size="lg" className="text-slate-900">Privacy Policy</Heading>
              <Pressable onPress={() => setShowPrivacyPolicy(false)} className="p-2">
                <Ionicons name="close" size={24} color="#334155" />
              </Pressable>
            </HStack>
            <ScrollView className="flex-1 px-5 py-4">
              <VStack space="md">
                <Text size="sm" className="text-slate-500">Last updated: February 2026</Text>

                <Heading size="md" className="text-slate-900 mt-2">1. Introduction</Heading>
                <Text size="sm" className="text-slate-700 leading-5">
                  TelCo Inventory ("we", "our", or "us") is a workforce management application designed for internal use by authorized technicians of our telecommunications company. This Privacy Policy describes how we collect, use, and protect your information.
                </Text>

                <Heading size="md" className="text-slate-900 mt-2">2. Information We Collect</Heading>
                <Text size="sm" className="text-slate-700 leading-5">
                  We collect the following types of information:{'\n\n'}
                  <Text bold>Account Information:</Text> Your name, username, and role as provided by your employer.{'\n\n'}
                  <Text bold>Location Data (including background location):</Text> With your permission, this app collects GPS location data in the background (when the app is closed or not in use). Your location is sent to company servers approximately every 5 minutes during work hours so that administrators can track technician positions on a map for dispatching and work coordination. A persistent notification will be displayed while background tracking is active. You can disable background location tracking at any time through your device's Settings {'>'} Apps {'>'} Robotik Mobile {'>'} Permissions {'>'} Location.{'\n\n'}
                  <Text bold>Push Notification Tokens:</Text> We store device push notification tokens to send work-related notifications such as new work order assignments and equipment updates.{'\n\n'}
                  <Text bold>Work Data:</Text> Work orders, equipment assignments, material usage, and related photos uploaded during work activities.{'\n\n'}
                  <Text bold>Device Information:</Text> Basic device information for app compatibility and notification delivery.
                </Text>

                <Heading size="md" className="text-slate-900 mt-2">3. How We Use Your Information</Heading>
                <Text size="sm" className="text-slate-700 leading-5">
                  Your information is used exclusively for:{'\n\n'}
                  - Managing work orders and task assignments{'\n'}
                  - Tracking equipment and material inventory{'\n'}
                  - Sending work-related push notifications{'\n'}
                  - Route tracking during active work hours{'\n'}
                  - Generating operational reports for management{'\n'}
                  - Ensuring proper equipment accountability
                </Text>

                <Heading size="md" className="text-slate-900 mt-2">4. Data Storage and Security</Heading>
                <Text size="sm" className="text-slate-700 leading-5">
                  Your data is stored securely on cloud servers with industry-standard encryption. Local data is cached on your device for offline functionality and is cleared upon logout. We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, or destruction.
                </Text>

                <Heading size="md" className="text-slate-900 mt-2">5. Data Sharing</Heading>
                <Text size="sm" className="text-slate-700 leading-5">
                  We do not sell, trade, or share your personal information with third parties. Your data is accessible only to authorized company administrators for operational purposes. We may use third-party cloud services (database hosting, image storage, notification delivery) which process data on our behalf under strict confidentiality agreements.
                </Text>

                <Heading size="md" className="text-slate-900 mt-2">6. Data Retention</Heading>
                <Text size="sm" className="text-slate-700 leading-5">
                  Work-related data is retained for the duration of your employment and for a reasonable period thereafter as required by applicable regulations. You may request deletion of your personal data by contacting your administrator.
                </Text>

                <Heading size="md" className="text-slate-900 mt-2">7. Your Rights</Heading>
                <Text size="sm" className="text-slate-700 leading-5">
                  You have the right to:{'\n\n'}
                  - Access your personal data{'\n'}
                  - Request correction of inaccurate data{'\n'}
                  - Request deletion of your data{'\n'}
                  - Withdraw consent for location tracking{'\n'}
                  - Opt out of push notifications via device settings
                </Text>

                <Heading size="md" className="text-slate-900 mt-2">8. Permissions</Heading>
                <Text size="sm" className="text-slate-700 leading-5">
                  This app may request the following permissions:{'\n\n'}
                  <Text bold>Location (Foreground):</Text> Used to determine your current position when responding to administrator GPS requests and for work order route tracking.{'\n\n'}
                  <Text bold>Location (Background / "Allow all the time"):</Text> Used to periodically send your GPS position to company servers every 5 minutes, even when the app is closed or not in use. This enables administrators to view technician locations on a live map for dispatching and coordination purposes. A persistent notification is displayed while background tracking is active.{'\n\n'}
                  <Text bold>Camera/Photos:</Text> Used to capture and upload photos of completed work for documentation.{'\n\n'}
                  <Text bold>Notifications:</Text> Used to receive work order assignments and equipment updates in real-time.{'\n\n'}
                  All permissions are optional and the app will function with limited capabilities if permissions are denied. Background location tracking can be revoked at any time through device settings.
                </Text>

                <Heading size="md" className="text-slate-900 mt-2">9. Children's Privacy</Heading>
                <Text size="sm" className="text-slate-700 leading-5">
                  This application is intended for use by employed adult technicians only. We do not knowingly collect information from children under 18 years of age.
                </Text>

                <Heading size="md" className="text-slate-900 mt-2">10. Changes to This Policy</Heading>
                <Text size="sm" className="text-slate-700 leading-5">
                  We may update this Privacy Policy from time to time. Any changes will be reflected within the app. Continued use of the app after changes constitutes acceptance of the updated policy.
                </Text>

                <Heading size="md" className="text-slate-900 mt-2">11. Contact Us</Heading>
                <Text size="sm" className="text-slate-700 leading-5 mb-8">
                  If you have questions about this Privacy Policy or wish to exercise your data rights, please contact your company administrator or reach us at magacin.robotik@gmail.com.
                </Text>
              </VStack>
            </ScrollView>
          </Box>
        </Modal>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
