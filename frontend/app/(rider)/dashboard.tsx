import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';

export default function RiderDashboard() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="bicycle" size={64} color={COLORS.primary} />
        <Text style={styles.title}>Rider Dashboard</Text>
        <Text style={styles.subtitle}>Welcome, {user?.name}!</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.message}>Rider dashboard coming soon...</Text>
        <Text style={styles.description}>
          View assigned deliveries, update delivery status, and navigate to customer locations.
        </Text>
      </View>

      <View style={styles.footer}>
        <Button title="Logout" onPress={handleLogout} variant="outline" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SIZES.lg,
  },
  header: {
    alignItems: 'center',
    paddingVertical: SIZES.xxl,
  },
  title: {
    fontSize: SIZES.fontXxl,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: SIZES.md,
  },
  subtitle: {
    fontSize: SIZES.fontLg,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.lg,
  },
  message: {
    fontSize: SIZES.fontXl,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SIZES.md,
  },
  description: {
    fontSize: SIZES.fontMd,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  footer: {
    paddingVertical: SIZES.lg,
  },
});