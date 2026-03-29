import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { COLORS, SIZES } from '../../constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await login(email.toLowerCase().trim(), password);
      router.replace('/');
    } catch (error: any) {
      Alert.alert(
        'Login Failed',
        error.response?.data?.detail || 'Invalid email or password'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo Section */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>VDC</Text>
          </View>
          <Text style={styles.title}>Ver Deluxe Crave</Text>
          <Text style={styles.subtitle}>Luxury Dining Experience</Text>
        </View>

        {/* Form Section */}
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Welcome Back</Text>
          <Text style={styles.formSubtitle}>Sign in to continue</Text>

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            icon={<Ionicons name="mail-outline" size={20} color={COLORS.textMuted} />}
          />

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry={!showPassword}
            icon={
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>
            }
          />

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            style={styles.loginButton}
          />

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.registerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          {/* Test Credentials */}
          <View style={styles.testCredentials}>
            <Text style={styles.testTitle}>Test Accounts:</Text>
            <Text style={styles.testText}>Customer: customer@vdcrestro.com / Customer@123</Text>
            <Text style={styles.testText}>Admin: admin@vdcrestro.com / Admin@123</Text>
            <Text style={styles.testText}>Staff: staff@vdcrestro.com / Staff@123</Text>
            <Text style={styles.testText}>Rider: rider@vdcrestro.com / Rider@123</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SIZES.lg,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: SIZES.xxl * 2,
    marginBottom: SIZES.xl,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.md,
  },
  logoText: {
    fontSize: SIZES.fontXxl,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  title: {
    fontSize: SIZES.fontXl,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SIZES.xs,
  },
  subtitle: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
  },
  formContainer: {
    marginTop: SIZES.lg,
  },
  formTitle: {
    fontSize: SIZES.fontXl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SIZES.xs,
  },
  formSubtitle: {
    fontSize: SIZES.fontMd,
    color: COLORS.textSecondary,
    marginBottom: SIZES.lg,
  },
  loginButton: {
    marginTop: SIZES.md,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SIZES.lg,
  },
  registerText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.fontMd,
  },
  registerLink: {
    color: COLORS.primary,
    fontSize: SIZES.fontMd,
    fontWeight: '600',
  },
  testCredentials: {
    marginTop: SIZES.xl,
    padding: SIZES.md,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  testTitle: {
    color: COLORS.primary,
    fontSize: SIZES.fontSm,
    fontWeight: '600',
    marginBottom: SIZES.sm,
  },
  testText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.fontXs,
    marginBottom: SIZES.xs,
  },
});