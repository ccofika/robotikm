import React, { useState, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  Alert,
  Image
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { theme } from '../styles/theme';

export default function LoginScreen() {
  const { login } = useContext(AuthContext);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleLogin = async () => {
    // Validacija
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
      const response = await authAPI.login({ username, password });
      const { user, token } = response.data;

      // Proveri da li je korisnik tehničar
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Robotik Mobile</Text>
          <Text style={styles.subtitle}>Prijavite se na svoj nalog</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Korisničko ime"
            value={username}
            onChangeText={setUsername}
            placeholder="Unesite korisničko ime"
            autoCapitalize="none"
            error={errors.username}
          />

          <Input
            label="Lozinka"
            value={password}
            onChangeText={setPassword}
            placeholder="Unesite lozinku"
            secureTextEntry
            error={errors.password}
          />

          <Button
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            size="large"
            style={styles.loginButton}
          >
            Prijavite se
          </Button>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Aplikacija je namenjena samo tehničarima
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.gray[50],
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxl,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray[600],
  },
  form: {
    marginBottom: theme.spacing.xl,
  },
  loginButton: {
    marginTop: theme.spacing.md,
  },
  footer: {
    alignItems: 'center',
    marginTop: theme.spacing.xl,
  },
  footerText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[500],
    textAlign: 'center',
  },
});
