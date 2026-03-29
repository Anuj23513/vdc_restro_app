import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { useCartStore } from '../../store/cartStore';
import { Button } from '../../components/ui/Button';

export default function CartScreen() {
  const router = useRouter();
  const { items, totalItems, totalPrice, updateQuantity, removeItem, clearCart } = useCartStore();

  const handleCheckout = () => {
    if (items.length === 0) {
      Alert.alert('Cart Empty', 'Please add items to cart before checkout');
      return;
    }
    router.push('/(customer)/checkout');
  };

  const renderCartItem = ({ item }: any) => (
    <View style={styles.cartItem}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemSize}>
          Size: {item.selectedSize?.charAt(0).toUpperCase() + item.selectedSize?.slice(1)}
        </Text>
        {item.special_instructions && (
          <Text style={styles.itemInstructions}>
            Note: {item.special_instructions}
          </Text>
        )}
        <Text style={styles.itemPrice}>₹{item.selectedPrice} × {item.quantity}</Text>
      </View>

      <View style={styles.quantityControls}>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => {
            if (item.quantity === 1) {
              removeItem(item.id, item.selectedSize);
            } else {
              updateQuantity(item.id, item.quantity - 1, item.selectedSize);
            }
          }}
        >
          <Ionicons name="remove" size={18} color={COLORS.text} />
        </TouchableOpacity>
        
        <Text style={styles.quantityText}>{item.quantity}</Text>
        
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => updateQuantity(item.id, item.quantity + 1, item.selectedSize)}
        >
          <Ionicons name="add" size={18} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => removeItem(item.id, item.selectedSize)}
      >
        <Ionicons name="trash-outline" size={20} color={COLORS.error} />
      </TouchableOpacity>
    </View>
  );

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="cart-outline" size={80} color={COLORS.textMuted} />
        <Text style={styles.emptyText}>Your cart is empty</Text>
        <Button
          title="Browse Menu"
          onPress={() => router.push('/(customer)/menu')}
          style={styles.browseButton}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => `${item.id}-${item.selectedSize}`}
        renderItem={renderCartItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerText}>
              {totalItems} {totalItems === 1 ? 'item' : 'items'} in cart
            </Text>
            <TouchableOpacity onPress={clearCart}>
              <Text style={styles.clearText}>Clear All</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <View style={styles.footer}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>₹{totalPrice.toFixed(2)}</Text>
        </View>
        <Button title="Proceed to Checkout" onPress={handleCheckout} />
      </View>
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
    color: COLORS.textMuted,
    marginTop: SIZES.md,
    marginBottom: SIZES.xl,
  },
  browseButton: {
    paddingHorizontal: SIZES.xl,
  },
  listContent: {
    padding: SIZES.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  headerText: {
    fontSize: SIZES.fontLg,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  clearText: {
    fontSize: SIZES.fontMd,
    color: COLORS.error,
  },
  cartItem: {
    flexDirection: 'row',
    padding: SIZES.md,
    marginBottom: SIZES.md,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMd,
    ...SHADOWS.small,
  },
  itemInfo: {
    flex: 1,
    marginRight: SIZES.md,
  },
  itemName: {
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SIZES.xs,
  },
  itemSize: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    marginBottom: SIZES.xs,
  },
  itemInstructions: {
    fontSize: SIZES.fontXs,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    marginBottom: SIZES.xs,
  },
  itemPrice: {
    fontSize: SIZES.fontMd,
    color: COLORS.primary,
    fontWeight: '600',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SIZES.md,
  },
  quantityButton: {
    width: 30,
    height: 30,
    borderRadius: SIZES.radiusSm,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    fontSize: SIZES.fontMd,
    fontWeight: 'bold',
    color: COLORS.text,
    marginHorizontal: SIZES.md,
    minWidth: 24,
    textAlign: 'center',
  },
  removeButton: {
    justifyContent: 'center',
  },
  footer: {
    padding: SIZES.lg,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.md,
  },
  totalLabel: {
    fontSize: SIZES.fontLg,
    color: COLORS.text,
  },
  totalValue: {
    fontSize: SIZES.fontXl,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
});