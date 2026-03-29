import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';
import { Order } from '../../types';
import api from '../../services/api';

export default function RiderDashboard() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const response = await api.get('/orders');
      setOrders(response.data);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status: newStatus });
      Alert.alert('Success', `Order marked as ${newStatus}`);
      loadOrders();
    } catch (error) {
      Alert.alert('Error', 'Failed to update order status');
    }
  };

  const handleCallCustomer = (phone: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert('Error', 'Customer phone number not available');
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const renderOrder = ({ item }: { item: Order }) => {
    const address = item.delivery_address;
    const isAssignedToMe = item.assigned_rider_id === user?.id;
    const canAccept = item.status === 'ready' && !item.assigned_rider_id;
    const canDeliver = isAssignedToMe && item.status === 'out_for_delivery';

    return (
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderNumber}>#{item.order_number}</Text>
            <Text style={styles.customerName}>{item.customer_name}</Text>
            {isAssignedToMe && (
              <View style={styles.assignedBadge}>
                <Text style={styles.assignedText}>ASSIGNED TO YOU</Text>
              </View>
            )}
          </View>
          <Text style={styles.totalAmount}>₹{item.total.toFixed(2)}</Text>
        </View>

        {/* Delivery Address */}
        <View style={styles.addressSection}>
          <View style={styles.addressHeader}>
            <Ionicons name="location" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Delivery Address</Text>
          </View>
          <Text style={styles.addressLabel}>{address.label}</Text>
          <Text style={styles.addressText}>
            {address.address_line1}, {address.address_line2 && address.address_line2 + ', '}
            {address.city}, {address.state} - {address.pincode}
          </Text>
          {address.landmark && (
            <Text style={styles.landmarkText}>Landmark: {address.landmark}</Text>
          )}
        </View>

        {/* Order Items Summary */}
        <View style={styles.itemsSection}>
          <Text style={styles.itemsCount}>
            {item.items.length} {item.items.length === 1 ? 'item' : 'items'}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {canAccept && (
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => Alert.alert(
                'Accept Delivery',
                'Do you want to accept this delivery?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Accept',
                    onPress: async () => {
                      // In real app, would call assign endpoint
                      handleUpdateStatus(item.id, 'out_for_delivery');
                    },
                  },
                ]
              )}
            >
              <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
              <Text style={styles.buttonText}>Accept Delivery</Text>
            </TouchableOpacity>
          )}

          {isAssignedToMe && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.callButton]}
                onPress={() => handleCallCustomer(item.customer_phone)}
              >
                <Ionicons name="call" size={20} color={COLORS.white} />
                <Text style={styles.buttonText}>Call Customer</Text>
              </TouchableOpacity>

              {canDeliver && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.deliveredButton]}
                  onPress={() => handleUpdateStatus(item.id, 'delivered')}
                >
                  <Ionicons name="checkmark-done" size={20} color={COLORS.white} />
                  <Text style={styles.buttonText}>Mark Delivered</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    );
  };

  const myOrders = orders.filter(o => o.assigned_rider_id === user?.id);
  const availableOrders = orders.filter(o => o.status === 'ready' && !o.assigned_rider_id);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Rider Dashboard</Text>
          <Text style={styles.subtitle}>{user?.name}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color={COLORS.error} />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{myOrders.length}</Text>
          <Text style={styles.statLabel}>My Deliveries</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{availableOrders.length}</Text>
          <Text style={styles.statLabel}>Available</Text>
        </View>
      </View>

      {/* Orders List */}
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrder}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadOrders} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="bicycle-outline" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No deliveries available</Text>
          </View>
        }
      />
    </View>
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
    backgroundColor: COLORS.surface,
  },
  greeting: {
    fontSize: SIZES.fontXl,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: SIZES.fontMd,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs,
  },
  logoutButton: {
    padding: SIZES.sm,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: SIZES.md,
    gap: SIZES.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: SIZES.md,
    borderRadius: SIZES.radiusMd,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  statValue: {
    fontSize: SIZES.fontXxl,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs,
  },
  listContent: {
    padding: SIZES.md,
  },
  orderCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    marginBottom: SIZES.md,
    ...SHADOWS.small,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.md,
  },
  orderNumber: {
    fontSize: SIZES.fontLg,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  customerName: {
    fontSize: SIZES.fontMd,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs,
  },
  assignedBadge: {
    backgroundColor: COLORS.success + '20',
    paddingHorizontal: SIZES.sm,
    paddingVertical: 2,
    borderRadius: SIZES.radiusSm,
    marginTop: SIZES.xs,
    alignSelf: 'flex-start',
  },
  assignedText: {
    fontSize: SIZES.fontXs,
    color: COLORS.success,
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: SIZES.fontXl,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  addressSection: {
    marginBottom: SIZES.md,
    paddingVertical: SIZES.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.sm,
    gap: SIZES.xs,
  },
  sectionTitle: {
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: COLORS.text,
  },
  addressLabel: {
    fontSize: SIZES.fontSm,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: SIZES.xs,
  },
  addressText: {
    fontSize: SIZES.fontSm,
    color: COLORS.text,
    lineHeight: 20,
  },
  landmarkText: {
    fontSize: SIZES.fontXs,
    color: COLORS.textMuted,
    marginTop: SIZES.xs,
  },
  itemsSection: {
    marginBottom: SIZES.md,
  },
  itemsCount: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
  },
  actionButtons: {
    gap: SIZES.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.lg,
    borderRadius: SIZES.radiusMd,
    gap: SIZES.sm,
  },
  acceptButton: {
    backgroundColor: COLORS.success,
  },
  callButton: {
    backgroundColor: COLORS.info,
  },
  deliveredButton: {
    backgroundColor: COLORS.primary,
  },
  buttonText: {
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: COLORS.white,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.xxl * 2,
  },
  emptyText: {
    fontSize: SIZES.fontLg,
    color: COLORS.textMuted,
    marginTop: SIZES.md,
  },
});