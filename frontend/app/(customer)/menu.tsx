import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { MenuItem, Category } from '../../types';
import { useCartStore } from '../../store/cartStore';
import api from '../../services/api';
import { Button } from '../../components/ui/Button';

export default function MenuScreen() {
  const params = useLocalSearchParams();
  const addItem = useCartStore((state) => state.addItem);

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSize, setSelectedSize] = useState<'quarter' | 'half' | 'full'>('full');
  const [quantity, setQuantity] = useState(1);
  const [instructions, setInstructions] = useState('');

  useEffect(() => {
    loadCategories();
    if (params.category) {
      setSelectedCategory(params.category as string);
    }
  }, [params.category]);

  useEffect(() => {
    loadMenu();
  }, [selectedCategory, searchQuery]);

  const loadCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadMenu = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedCategory) params.category = selectedCategory;
      if (searchQuery) params.search = searchQuery;

      const response = await api.get('/menu', { params });
      setMenuItems(response.data);
    } catch (error) {
      console.error('Error loading menu:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!selectedItem) return;

    const price = selectedSize === 'quarter' && selectedItem.price_quarter
      ? selectedItem.price_quarter
      : selectedSize === 'half' && selectedItem.price_half
      ? selectedItem.price_half
      : selectedItem.price_full || 0;

    addItem({
      ...selectedItem,
      quantity,
      selectedSize,
      selectedPrice: price,
      special_instructions: instructions,
    });

    Alert.alert('Success', 'Item added to cart!');
    closeModal();
  };

  const openItemModal = (item: MenuItem) => {
    setSelectedItem(item);
    setQuantity(1);
    setInstructions('');
    
    // Set default size based on available prices
    if (item.price_quarter) {
      setSelectedSize('quarter');
    } else if (item.price_half) {
      setSelectedSize('half');
    } else {
      setSelectedSize('full');
    }
    
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedItem(null);
    setQuantity(1);
    setInstructions('');
  };

  const renderCategoryFilter = () => (
    <View style={styles.filterContainer}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[{ id: 'all', name: 'All' }, ...categories]}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedCategory === (item.name === 'All' ? '' : item.name) && styles.filterChipActive,
            ]}
            onPress={() => setSelectedCategory(item.name === 'All' ? '' : item.name)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedCategory === (item.name === 'All' ? '' : item.name) && styles.filterChipTextActive,
              ]}
            >
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );

  const renderMenuItem = ({ item }: { item: MenuItem }) => (
    <TouchableOpacity style={styles.menuItem} onPress={() => openItemModal(item)}>
      <View style={styles.itemInfo}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemName}>{item.name}</Text>
          {item.is_vegetarian && (
            <View style={styles.vegBadge}>
              <View style={styles.vegDot} />
            </View>
          )}
        </View>
        
        {item.description && (
          <Text style={styles.itemDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        
        <View style={styles.priceContainer}>
          {item.price_quarter && (
            <Text style={styles.priceText}>Quarter: ₹{item.price_quarter} | </Text>
          )}
          {item.price_half && (
            <Text style={styles.priceText}>Half: ₹{item.price_half} | </Text>
          )}
          {item.price_full && (
            <Text style={styles.priceText}>Full: ₹{item.price_full}</Text>
          )}
        </View>
        
        {item.spice_level && (
          <View style={styles.spiceBadge}>
            <Text style={styles.spiceText}>{item.spice_level}</Text>
          </View>
        )}
      </View>
      
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => openItemModal(item)}
      >
        <Ionicons name="add" size={24} color={COLORS.black} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search menu items..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Category Filter */}
      {renderCategoryFilter()}

      {/* Menu List */}
      <FlatList
        data={menuItems}
        keyExtractor={(item) => item.id}
        renderItem={renderMenuItem}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={loadMenu}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="restaurant-outline" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No items found</Text>
          </View>
        }
      />

      {/* Add to Cart Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedItem?.name}</Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {selectedItem?.description && (
              <Text style={styles.modalDescription}>{selectedItem.description}</Text>
            )}

            {/* Size Selection */}
            <Text style={styles.sectionLabel}>Select Size:</Text>
            <View style={styles.sizeContainer}>
              {selectedItem?.price_quarter && (
                <TouchableOpacity
                  style={[
                    styles.sizeOption,
                    selectedSize === 'quarter' && styles.sizeOptionActive,
                  ]}
                  onPress={() => setSelectedSize('quarter')}
                >
                  <Text style={[styles.sizeText, selectedSize === 'quarter' && styles.sizeTextActive]}>
                    Quarter
                  </Text>
                  <Text style={[styles.sizePrice, selectedSize === 'quarter' && styles.sizePriceActive]}>
                    ₹{selectedItem.price_quarter}
                  </Text>
                </TouchableOpacity>
              )}
              {selectedItem?.price_half && (
                <TouchableOpacity
                  style={[
                    styles.sizeOption,
                    selectedSize === 'half' && styles.sizeOptionActive,
                  ]}
                  onPress={() => setSelectedSize('half')}
                >
                  <Text style={[styles.sizeText, selectedSize === 'half' && styles.sizeTextActive]}>
                    Half
                  </Text>
                  <Text style={[styles.sizePrice, selectedSize === 'half' && styles.sizePriceActive]}>
                    ₹{selectedItem.price_half}
                  </Text>
                </TouchableOpacity>
              )}
              {selectedItem?.price_full && (
                <TouchableOpacity
                  style={[
                    styles.sizeOption,
                    selectedSize === 'full' && styles.sizeOptionActive,
                  ]}
                  onPress={() => setSelectedSize('full')}
                >
                  <Text style={[styles.sizeText, selectedSize === 'full' && styles.sizeTextActive]}>
                    Full
                  </Text>
                  <Text style={[styles.sizePrice, selectedSize === 'full' && styles.sizePriceActive]}>
                    ₹{selectedItem.price_full}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Quantity */}
            <Text style={styles.sectionLabel}>Quantity:</Text>
            <View style={styles.quantityContainer}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Ionicons name="remove" size={20} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={styles.quantityText}>{quantity}</Text>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => setQuantity(quantity + 1)}
              >
                <Ionicons name="add" size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {/* Special Instructions */}
            <Text style={styles.sectionLabel}>Special Instructions (Optional):</Text>
            <TextInput
              style={styles.instructionsInput}
              placeholder="Add any special requests..."
              placeholderTextColor={COLORS.textMuted}
              value={instructions}
              onChangeText={setInstructions}
              multiline
              numberOfLines={3}
            />

            {/* Add to Cart Button */}
            <Button
              title={`Add to Cart - ₹${(
                (selectedSize === 'quarter' && selectedItem?.price_quarter
                  ? selectedItem.price_quarter
                  : selectedSize === 'half' && selectedItem?.price_half
                  ? selectedItem.price_half
                  : selectedItem?.price_full || 0) * quantity
              ).toFixed(2)}`}
              onPress={handleAddToCart}
              style={styles.addToCartButton}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: SIZES.md,
    paddingHorizontal: SIZES.md,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.sm,
    color: COLORS.text,
    fontSize: SIZES.fontMd,
  },
  filterContainer: {
    paddingHorizontal: SIZES.md,
    marginBottom: SIZES.md,
  },
  filterChip: {
    paddingVertical: SIZES.sm,
    paddingHorizontal: SIZES.md,
    marginRight: SIZES.sm,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusFull,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    color: COLORS.text,
    fontSize: SIZES.fontSm,
  },
  filterChipTextActive: {
    color: COLORS.black,
    fontWeight: '600',
  },
  listContent: {
    padding: SIZES.md,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.xs,
  },
  itemName: {
    flex: 1,
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: COLORS.text,
  },
  vegBadge: {
    width: 16,
    height: 16,
    borderWidth: 1,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vegDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  itemDescription: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    marginBottom: SIZES.sm,
  },
  priceContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SIZES.xs,
  },
  priceText: {
    fontSize: SIZES.fontSm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  spiceBadge: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: 2,
    backgroundColor: COLORS.warning,
    borderRadius: SIZES.radiusSm,
    alignSelf: 'flex-start',
  },
  spiceText: {
    fontSize: SIZES.fontXs,
    color: COLORS.black,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: SIZES.radiusMd,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: SIZES.radiusXl,
    borderTopRightRadius: SIZES.radiusXl,
    padding: SIZES.lg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  modalTitle: {
    flex: 1,
    fontSize: SIZES.fontXl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalDescription: {
    fontSize: SIZES.fontMd,
    color: COLORS.textSecondary,
    marginBottom: SIZES.lg,
  },
  sectionLabel: {
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SIZES.sm,
    marginTop: SIZES.md,
  },
  sizeContainer: {
    flexDirection: 'row',
    gap: SIZES.sm,
  },
  sizeOption: {
    flex: 1,
    padding: SIZES.md,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMd,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  sizeOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.card,
  },
  sizeText: {
    fontSize: SIZES.fontMd,
    color: COLORS.text,
    marginBottom: SIZES.xs,
  },
  sizeTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  sizePrice: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
  },
  sizePriceActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.md,
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: SIZES.radiusMd,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quantityText: {
    fontSize: SIZES.fontLg,
    fontWeight: 'bold',
    color: COLORS.text,
    minWidth: 40,
    textAlign: 'center',
  },
  instructionsInput: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    color: COLORS.text,
    fontSize: SIZES.fontMd,
    borderWidth: 1,
    borderColor: COLORS.border,
    textAlignVertical: 'top',
  },
  addToCartButton: {
    marginTop: SIZES.lg,
  },
});