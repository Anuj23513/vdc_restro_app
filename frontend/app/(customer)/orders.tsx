import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { Order } from '../../types';
import api from '../../services/api';

export default function OrdersScreen() {
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
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return COLORS.success;
      case 'cancelled':
        return COLORS.error;
      case 'pending':
        return COLORS.warning;
      default:
        return COLORS.info;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'checkmark-circle';
      case 'cancelled':
        return 'close-circle';
      case 'out_for_delivery':
        return 'bicycle';
      case 'preparing':
        return 'restaurant';
      default:
        return 'time';
    }
  };

  const renderOrder = ({ item }: { item: Order }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderNumber}>#{item.order_number}</Text>
          <Text style={styles.orderDate}>
            {new Date(item.created_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Ionicons
            name={getStatusIcon(item.status) as any}
            size={16}
            color={getStatusColor(item.status)}
          />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.orderItems}>
        <Text style={styles.itemsLabel}>
          {item.items.length} {item.items.length === 1 ? 'item' : 'items'}
        </Text>
        {item.items.slice(0, 2).map((orderItem, index) => (
          <Text key={index} style={styles.itemText}>
            {orderItem.quantity}x {orderItem.name} ({orderItem.size})
          </Text>
        ))}
        {item.items.length > 2 && (
          <Text style={styles.moreText}>+{item.items.length - 2} more items</Text>
        )}
      </View>

      <View style={styles.orderFooter}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>₹{item.total.toFixed(2)}</Text>
      </View>

      {item.payment_method === 'cod' && (
        <View style={styles.paymentBadge}>
          <Text style={styles.paymentText}>Cash on Delivery</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {orders.length === 0 && !loading ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={80} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>No orders yet</Text>
          <Text style={styles.emptySubtext}>Start ordering delicious food!</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrder}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={loadOrders}
              tintColor={COLORS.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.lg,
  },
  emptyText: {
    fontSize: SIZES.fontLg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SIZES.md,
  },
  emptySubtext: {
    fontSize: SIZES.fontMd,
    color: COLORS.textMuted,
    marginTop: SIZES.xs,
  },
  listContent: {
    padding: SIZES.md,
  },
  orderCard: {
    padding: SIZES.md,
    marginBottom: SIZES.md,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMd,
    ...SHADOWS.small,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SIZES.md,
  },
  orderNumber: {
    fontSize: SIZES.fontLg,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  orderDate: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusFull,
  },
  statusText: {
    fontSize: SIZES.fontXs,
    fontWeight: '600',
    marginLeft: SIZES.xs,
  },
  orderItems: {
    marginBottom: SIZES.md,
    paddingTop: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  itemsLabel: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    marginBottom: SIZES.xs,
  },
  itemText: {
    fontSize: SIZES.fontSm,
    color: COLORS.text,
    marginBottom: 2,
  },
  moreText: {
    fontSize: SIZES.fontSm,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  totalLabel: {
    fontSize: SIZES.fontMd,
    color: COLORS.text,
  },
  totalValue: {
    fontSize: SIZES.fontXl,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  paymentBadge: {
    marginTop: SIZES.sm,
    paddingVertical: SIZES.xs,
    paddingHorizontal: SIZES.sm,
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusSm,
    alignSelf: 'flex-start',
  },
  paymentText: {
    fontSize: SIZES.fontXs,
    color: COLORS.textSecondary,
  },
});