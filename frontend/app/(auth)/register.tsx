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

export default function RegisterScreen() {
  const router = useRouter();
  const register = useAuthStore((state) => state.register);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !phone || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await register(email.toLowerCase().trim(), password, name, phone);
      router.replace('/');
    } catch (error: any) {
      Alert.alert(
        'Registration Failed',
        error.response?.data?.detail || 'Unable to create account'
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join VDC Restro today</Text>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          <Input
            label="Full Name"
            value={name}
            onChangeText={setName}
            placeholder="Enter your full name"
            icon={<Ionicons name="person-outline" size={20} color={COLORS.textMuted} />}
          />

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
            label="Phone Number"
            value={phone}
            onChangeText={setPhone}
            placeholder="Enter your phone number"
            keyboardType="phone-pad"
            icon={<Ionicons name="call-outline" size={20} color={COLORS.textMuted} />}
          />

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Create a password"
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

          <Input
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm your password"
            secureTextEntry={!showPassword}
            icon={<Ionicons name="lock-closed-outline" size={20} color={COLORS.textMuted} />}
          />

          <Button
            title="Create Account"
            onPress={handleRegister}
            loading={loading}
            style={styles.registerButton}
          />

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
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
  header: {
    marginTop: SIZES.xxl,
    marginBottom: SIZES.lg,
  },
  backButton: {
    marginBottom: SIZES.md,
  },
  title: {
    fontSize: SIZES.fontXxl,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SIZES.xs,
  },
  subtitle: {
    fontSize: SIZES.fontMd,
    color: COLORS.textSecondary,
  },
  formContainer: {
    marginTop: SIZES.md,
  },
  registerButton: {
    marginTop: SIZES.md,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SIZES.lg,
    marginBottom: SIZES.xl,
  },
  loginText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.fontMd,
  },
  loginLink: {
    color: COLORS.primary,
    fontSize: SIZES.fontMd,
    fontWeight: '600',
  },
});