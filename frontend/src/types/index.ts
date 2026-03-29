export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'customer' | 'admin' | 'staff' | 'rider';
  addresses?: Address[];
  profile_image?: string;
}

export interface Address {
  label: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  lat?: number;
  lng?: number;
  is_default: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  price_half?: number;
  price_full?: number;
  price_quarter?: number;
  image?: string;
  is_vegetarian: boolean;
  is_available: boolean;
  spice_level?: 'mild' | 'medium' | 'hot';
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  image?: string;
  order: number;
  is_active: boolean;
}

export interface OrderItem {
  menu_item_id: string;
  name: string;
  quantity: number;
  size?: 'half' | 'full' | 'quarter';
  price: number;
  special_instructions?: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  items: OrderItem[];
  delivery_address: Address;
  payment_method: 'cod' | 'online';
  coupon_code?: string;
  subtotal: number;
  discount: number;
  delivery_fee: number;
  tax: number;
  total: number;
  status: 'pending' | 'accepted' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
  payment_status: 'pending' | 'completed' | 'failed';
  payment_id?: string;
  assigned_rider_id?: string;
  assigned_rider_name?: string;
  estimated_delivery_time?: string;
  created_at: string;
  updated_at: string;
  delivered_at?: string;
}

export interface Review {
  id: string;
  order_id: string;
  customer_id: string;
  customer_name: string;
  rating: number;
  comment?: string;
  food_rating?: number;
  delivery_rating?: number;
  created_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_value: number;
  max_discount?: number;
  valid_from: string;
  valid_until: string;
  usage_limit?: number;
  usage_count: number;
  is_active: boolean;
}

export interface CartItem extends MenuItem {
  quantity: number;
  selectedSize?: 'half' | 'full' | 'quarter';
  selectedPrice: number;
  special_instructions?: string;
}