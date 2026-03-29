import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import api from '../../services/api';

export default function CheckoutScreen() {
  const router = useRouter();
  const { items, totalPrice, clearCart } = useCartStore();
  const { user } = useAuthStore();

  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online'>('cod');
  const [selectedAddress, setSelectedAddress] = useState(user?.addresses?.[0] || null);
  const [loading, setLoading] = useState(false);

  // New address form
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: 'Home',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: '',
    landmark: '',
  });

  const deliveryFee = totalPrice < 300 ? 30 : 0;
  const tax = totalPrice * 0.05;
  const total = totalPrice + deliveryFee + tax;

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      Alert.alert('Error', 'Please select a delivery address');
      return;
    }

    if (items.length === 0) {
      Alert.alert('Error', 'Your cart is empty');
      return;
    }

    setLoading(true);
    try {
      const orderItems = items.map(item => ({
        menu_item_id: item.id,
        name: item.name,
        quantity: item.quantity,
        size: item.selectedSize,
        price: item.selectedPrice,
        special_instructions: item.special_instructions,
      }));

      const response = await api.post('/orders', {
        items: orderItems,
        delivery_address: selectedAddress,
        payment_method: paymentMethod,
      });

      clearCart();
      Alert.alert(
        'Order Placed!',
        `Your order #${response.data.order_number} has been placed successfully.`,
        [
          {
            text: 'View Orders',
            onPress: () => router.replace('/(customer)/orders'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Order Failed',
        error.response?.data?.detail || 'Unable to place order. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = async () => {
    if (!newAddress.address_line1 || !newAddress.city || !newAddress.state || !newAddress.pincode) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    try {
      const response = await api.post('/users/addresses', {
        ...newAddress,
        is_default: user?.addresses?.length === 0,
      });
      
      setSelectedAddress(newAddress);
      setShowAddressForm(false);
      Alert.alert('Success', 'Address added successfully');
      
      // Refresh user data
      const userResponse = await api.get('/auth/me');
      useAuthStore.getState().setUser(userResponse.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to add address');
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Order Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Summary</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Items ({items.length})</Text>
            <Text style={styles.summaryValue}>₹{totalPrice.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={styles.summaryValue}>₹{deliveryFee.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax (5%)</Text>
            <Text style={styles.summaryValue}>₹{tax.toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      {/* Delivery Address */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <TouchableOpacity onPress={() => setShowAddressForm(!showAddressForm)}>
            <Text style={styles.addButton}>
              {showAddressForm ? 'Cancel' : '+ Add New'}
            </Text>
          </TouchableOpacity>
        </View>

        {showAddressForm ? (
          <View style={styles.addressForm}>
            <TextInput
              style={styles.input}
              placeholder="Label (Home/Work/Other)"
              placeholderTextColor={COLORS.textMuted}
              value={newAddress.label}
              onChangeText={(text) => setNewAddress({ ...newAddress, label: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Address Line 1 *"
              placeholderTextColor={COLORS.textMuted}
              value={newAddress.address_line1}
              onChangeText={(text) => setNewAddress({ ...newAddress, address_line1: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Address Line 2"
              placeholderTextColor={COLORS.textMuted}
              value={newAddress.address_line2}
              onChangeText={(text) => setNewAddress({ ...newAddress, address_line2: text })}
            />
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="City *"
                placeholderTextColor={COLORS.textMuted}
                value={newAddress.city}
                onChangeText={(text) => setNewAddress({ ...newAddress, city: text })}
              />
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="State *"
                placeholderTextColor={COLORS.textMuted}
                value={newAddress.state}
                onChangeText={(text) => setNewAddress({ ...newAddress, state: text })}
              />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Pincode *"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={newAddress.pincode}
              onChangeText={(text) => setNewAddress({ ...newAddress, pincode: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Landmark"
              placeholderTextColor={COLORS.textMuted}
              value={newAddress.landmark}
              onChangeText={(text) => setNewAddress({ ...newAddress, landmark: text })}
            />
            <Button title="Save Address" onPress={handleAddAddress} style={styles.saveButton} />
          </View>
        ) : (
          <>
            {user?.addresses && user.addresses.length > 0 ? (
              user.addresses.map((address: any, index: number) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.addressCard,
                    selectedAddress === address && styles.selectedAddress,
                  ]}
                  onPress={() => setSelectedAddress(address)}
                >
                  <View style={styles.addressContent}>
                    <Text style={styles.addressLabel}>{address.label}</Text>
                    <Text style={styles.addressText}>
                      {address.address_line1}, {address.address_line2 && address.address_line2 + ', '}
                      {address.city}, {address.state} - {address.pincode}
                    </Text>
                    {address.landmark && (
                      <Text style={styles.landmarkText}>Landmark: {address.landmark}</Text>
                    )}
                  </View>
                  {selectedAddress === address && (
                    <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.noAddressText}>No saved addresses. Add a new one.</Text>
            )}
          </>
        )}
      </View>

      {/* Payment Method */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Method</Text>
        
        <TouchableOpacity
          style={[
            styles.paymentCard,
            paymentMethod === 'cod' && styles.selectedPayment,
          ]}
          onPress={() => setPaymentMethod('cod')}
        >
          <View style={styles.paymentContent}>
            <Ionicons name="cash-outline" size={24} color={COLORS.primary} />
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentTitle}>Cash on Delivery</Text>
              <Text style={styles.paymentDesc}>Pay when you receive</Text>
            </View>
          </View>
          {paymentMethod === 'cod' && (
            <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.paymentCard,
            paymentMethod === 'online' && styles.selectedPayment,
          ]}
          onPress={() => setPaymentMethod('online')}
        >
          <View style={styles.paymentContent}>
            <Ionicons name="card-outline" size={24} color={COLORS.primary} />
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentTitle}>Online Payment</Text>
              <Text style={styles.paymentDesc}>Pay using Razorpay</Text>
            </View>
          </View>
          {paymentMethod === 'online' && (
            <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
          )}
        </TouchableOpacity>
      </View>

      {/* Place Order Button */}
      <View style={styles.footer}>
        <Button
          title={`Place Order - ₹${total.toFixed(2)}`}
          onPress={handlePlaceOrder}
          loading={loading}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  section: {
    padding: SIZES.md,
    marginBottom: SIZES.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  sectionTitle: {
    fontSize: SIZES.fontLg,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  addButton: {
    fontSize: SIZES.fontMd,
    color: COLORS.primary,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    ...SHADOWS.small,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.sm,
  },
  summaryLabel: {
    fontSize: SIZES.fontMd,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: SIZES.fontMd,
    color: COLORS.text,
    fontWeight: '500',
  },
  totalRow: {
    marginTop: SIZES.sm,
    paddingTop: SIZES.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  totalLabel: {
    fontSize: SIZES.fontLg,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  totalValue: {
    fontSize: SIZES.fontXl,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  addressForm: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    ...SHADOWS.small,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    color: COLORS.text,
    fontSize: SIZES.fontMd,
    marginBottom: SIZES.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  saveButton: {
    marginTop: SIZES.sm,
  },
  addressCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    marginBottom: SIZES.sm,
    borderWidth: 2,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  selectedAddress: {
    borderColor: COLORS.primary,
  },
  addressContent: {
    flex: 1,
    marginRight: SIZES.md,
  },
  addressLabel: {
    fontSize: SIZES.fontMd,
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
  noAddressText: {
    fontSize: SIZES.fontMd,
    color: COLORS.textMuted,
    textAlign: 'center',
    padding: SIZES.lg,
  },
  paymentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    marginBottom: SIZES.sm,
    borderWidth: 2,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  selectedPayment: {
    borderColor: COLORS.primary,
  },
  paymentContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentInfo: {
    marginLeft: SIZES.md,
  },
  paymentTitle: {
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: COLORS.text,
  },
  paymentDesc: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  footer: {
    padding: SIZES.lg,
    paddingBottom: SIZES.xl,
  },
});