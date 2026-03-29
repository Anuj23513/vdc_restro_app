import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import { Category } from '../../types';

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  const loadCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const onRefresh = async () => {
    setLoading(true);
    await loadCategories();
    setLoading(false);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={onRefresh}
          tintColor={COLORS.primary}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name}!</Text>
          <Text style={styles.subtitle}>What would you like to eat today?</Text>
        </View>
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>VDC</Text>
          </View>
        </View>
      </View>

      {/* Banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>Ver Deluxe Crave</Text>
        <Text style={styles.bannerSubtitle}>Premium Dining Experience</Text>
        <View style={styles.bannerInfo}>
          <Ionicons name="time-outline" size={16} color={COLORS.primary} />
          <Text style={styles.bannerText}> 10AM - 11PM Everyday</Text>
        </View>
        <View style={styles.bannerInfo}>
          <Ionicons name="call-outline" size={16} color={COLORS.primary} />
          <Text style={styles.bannerText}> +91 9315155657</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/(customer)/menu')}
        >
          <Ionicons name="restaurant" size={32} color={COLORS.primary} />
          <Text style={styles.actionText}>Browse Menu</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/(customer)/cart')}
        >
          <Ionicons name="cart" size={32} color={COLORS.primary} />
          <Text style={styles.actionText}>My Cart</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/(customer)/orders')}
        >
          <Ionicons name="list" size={32} color={COLORS.primary} />
          <Text style={styles.actionText}>My Orders</Text>
        </TouchableOpacity>
      </View>

      {/* Categories */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Categories</Text>
        <View style={styles.categoriesGrid}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={styles.categoryCard}
              onPress={() => router.push({ pathname: '/(customer)/menu', params: { category: category.name } })}
            >
              <View style={styles.categoryIcon}>
                <Ionicons name="restaurant-outline" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.categoryName}>{category.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Featured Offers */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Special Offers</Text>
        <TouchableOpacity style={styles.offerCard}>
          <View style={styles.offerContent}>
            <Text style={styles.offerTitle}>WELCOME50</Text>
            <Text style={styles.offerDescription}>Flat ₹50 off on orders above ₹200</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={COLORS.textMuted} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.offerCard}>
          <View style={styles.offerContent}>
            <Text style={styles.offerTitle}>SAVE20</Text>
            <Text style={styles.offerDescription}>Get 20% off on orders above ₹500</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.lg,
  },
  greeting: {
    fontSize: SIZES.fontXl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: SIZES.fontMd,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: SIZES.fontLg,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  banner: {
    margin: SIZES.lg,
    padding: SIZES.lg,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLg,
    borderWidth: 1,
    borderColor: COLORS.primary,
    ...SHADOWS.gold,
  },
  bannerTitle: {
    fontSize: SIZES.fontXl,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  bannerSubtitle: {
    fontSize: SIZES.fontMd,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs,
  },
  bannerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SIZES.sm,
  },
  bannerText: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.lg,
    marginBottom: SIZES.lg,
  },
  actionCard: {
    flex: 1,
    marginHorizontal: SIZES.xs,
    padding: SIZES.md,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMd,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  actionText: {
    fontSize: SIZES.fontSm,
    color: COLORS.text,
    marginTop: SIZES.sm,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: SIZES.lg,
    marginBottom: SIZES.lg,
  },
  sectionTitle: {
    fontSize: SIZES.fontLg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SIZES.md,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -SIZES.xs,
  },
  categoryCard: {
    width: '31%',
    margin: '1%',
    padding: SIZES.md,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMd,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  categoryIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.sm,
  },
  categoryName: {
    fontSize: SIZES.fontXs,
    color: COLORS.text,
    textAlign: 'center',
  },
  offerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.md,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMd,
    marginBottom: SIZES.sm,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  offerContent: {
    flex: 1,
  },
  offerTitle: {
    fontSize: SIZES.fontMd,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  offerDescription: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs,
  },
});