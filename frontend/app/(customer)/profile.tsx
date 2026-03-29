import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      {/* Menu Items */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="person-outline" size={24} color={COLORS.primary} />
            <Text style={styles.menuItemText}>Edit Profile</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="location-outline" size={24} color={COLORS.primary} />
            <Text style={styles.menuItemText}>Saved Addresses</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="heart-outline" size={24} color={COLORS.primary} />
            <Text style={styles.menuItemText}>Favorites</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="pricetag-outline" size={24} color={COLORS.primary} />
            <Text style={styles.menuItemText}>Offers & Coupons</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Support Section */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="help-circle-outline" size={24} color={COLORS.primary} />
            <Text style={styles.menuItemText}>Help & Support</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="information-circle-outline" size={24} color={COLORS.primary} />
            <Text style={styles.menuItemText}>About</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <View style={styles.section}>
        <Button
          title="Logout"
          onPress={handleLogout}
          variant="outline"
        />
      </View>

      {/* App Info */}
      <Text style={styles.appVersion}>VDC Restro v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    alignItems: 'center',
    padding: SIZES.xl,
    backgroundColor: COLORS.surface,
  },
  avatarContainer: {
    marginBottom: SIZES.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.gold,
  },
  avatarText: {
    fontSize: SIZES.fontXxl,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  name: {
    fontSize: SIZES.fontXl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SIZES.xs,
  },
  email: {
    fontSize: SIZES.fontMd,
    color: COLORS.textSecondary,
  },
  section: {
    marginTop: SIZES.lg,
    paddingHorizontal: SIZES.md,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.md,
    marginBottom: SIZES.sm,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMd,
    ...SHADOWS.small,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: SIZES.fontMd,
    color: COLORS.text,
    marginLeft: SIZES.md,
  },
  appVersion: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: SIZES.fontSm,
    marginVertical: SIZES.xl,
  },
});