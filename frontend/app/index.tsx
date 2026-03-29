import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { COLORS } from '../constants/theme';

export default function Index() {
  const { isLoading, isAuthenticated, user, checkAuth } = useAuthStore();
  const { loadCart } = useCartStore();

  useEffect(() => {
    checkAuth();
    loadCart();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  // Route based on user role
  switch (user?.role) {
    case 'admin':
      return <Redirect href="/(admin)/dashboard" />;
    case 'staff':
      return <Redirect href="/(staff)/dashboard" />;
    case 'rider':
      return <Redirect href="/(rider)/dashboard" />;
    default:
      return <Redirect href="/(customer)/home" />;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});