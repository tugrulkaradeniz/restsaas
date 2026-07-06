export type UserRole = 'super_admin' | 'owner' | 'manager' | 'cashier' | 'waiter' | 'kitchen'
export type TenantPlan = 'starter' | 'pro' | 'enterprise'
export type TableStatus = 'empty' | 'occupied' | 'reserved' | 'dirty'
export type TableShape = 'round' | 'square' | 'rectangle'
export type OrderSource = 'waiter' | 'qr' | 'online'
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'paid' | 'cancelled'
export type OrderItemStatus = 'pending' | 'preparing' | 'ready' | 'cancelled'
export type PaymentMethod = 'cash' | 'card' | 'online' | 'points'
export type PaymentStatus = 'pending' | 'completed' | 'refunded'
export type LoyaltyTransactionType = 'earn' | 'redeem'
export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'
export type CampaignType = 'percent' | 'fixed' | 'free_item' | 'happy_hour'
export type ExpenseCategory = 'rent' | 'electricity' | 'water' | 'staff' | 'other'

export interface Tenant {
  id: string
  slug: string
  name: string
  plan: TenantPlan
  stripe_customer_id: string | null
  trial_ends_at: string | null
  loyalty_enabled: boolean
  loyalty_rate: number
  loyalty_redeem_rate: number
  printer_model: string | null
  printer_ip: string | null
  kitchen_printer_model: string | null
  kitchen_printer_ip: string | null
  address: string | null
  logo_url: string | null
  phone: string | null
  online_ordering_enabled: boolean
  cuisine_type_ids: string[]
  lat: number | null
  lng: number | null
  online_order_hours: Record<string, { open: string; close: string }> | null
  created_at: string
}

export interface CuisineType {
  id: string
  name: string
  emoji: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface DeliveryZone {
  id: string
  tenant_id: string
  name: string
  max_distance_km: number
  min_order_amount: number
  delivery_fee: number
  estimated_minutes: number
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface ItemOptionGroup {
  id: string
  menu_item_id: string
  tenant_id: string
  name: string
  is_required: boolean
  max_select: number
  sort_order: number
  options?: ItemOption[]
}

export interface ItemOption {
  id: string
  group_id: string
  tenant_id: string
  name: string
  price_delta: number
  sort_order: number
  is_active: boolean
}

export interface VerifiedCustomer {
  id: string
  phone: string
  email: string | null
  name: string | null
  verification_token: string
  first_verified_at: string
  last_order_at: string | null
}

export interface CustomerAddress {
  id: string
  verified_customer_id: string
  label: string
  address: string
  lat: number | null
  lng: number | null
  is_default: boolean
  created_at: string
}

export interface WaiterCall {
  id: string
  tenant_id: string
  table_id: string
  status: 'pending' | 'answered'
  note: string | null
  created_at: string
}

export interface User {
  id: string
  tenant_id: string
  email: string
  role: UserRole
  full_name: string
  created_at: string
}

export interface Table {
  id: string
  tenant_id: string
  name: string
  capacity: number
  status: TableStatus
  qr_token: string
}

export interface FloorPlan {
  id: string
  tenant_id: string
  name: string
  layout: FloorPlanLayout
}

export interface FloorPlanLayout {
  tables: FloorPlanTable[]
  walls?: FloorPlanWall[]
}

export interface FloorPlanTable {
  id: string
  x: number
  y: number
  rotation: number
  shape: TableShape
  width?: number
  height?: number
}

export interface FloorPlanWall {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface MenuCategory {
  id: string
  tenant_id: string
  name: string
  sort_order: number
  is_active: boolean
}

export interface MenuItem {
  id: string
  tenant_id: string
  category_id: string
  name: string
  price: number
  cost: number | null
  image_url: string | null
  description_internal: string | null
  description_public: string | null
  kdv_rate: number
  kdv_included: boolean
  calories: number | null
  is_available: boolean
  is_visible_selfservis: boolean
  created_at: string
  allergens?: MenuItemAllergen[]
  removables?: MenuItemRemovable[]
  extras?: MenuItemExtra[]
  category?: MenuCategory
}

export interface MenuItemAllergen {
  id: string
  menu_item_id: string
  allergen: string
}

export interface MenuItemRemovable {
  id: string
  menu_item_id: string
  tenant_id: string
  name: string
}

export interface MenuItemExtra {
  id: string
  menu_item_id: string
  tenant_id: string
  name: string
  price: number
}

export interface Order {
  id: string
  tenant_id: string
  table_id: string | null
  waiter_id: string | null
  source: OrderSource
  status: OrderStatus
  total_amount: number
  discount_amount: number
  points_used: number
  customer_phone: string | null
  customer_location: Record<string, unknown> | null
  payment_method: string | null
  // online ordering fields
  customer_name: string | null
  customer_email: string | null
  delivery_address: string | null
  delivery_lat: number | null
  delivery_lng: number | null
  delivery_type: 'pickup' | 'delivery' | null
  delivery_zone_id: string | null
  delivery_fee: number
  order_note: string | null
  created_at: string
  table?: Table
  waiter?: User
  items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  menu_item_id: string
  quantity: number
  unit_price: number
  note: string | null
  status: OrderItemStatus
  selected_options: SelectedOption[] | null
  is_complimentary: boolean
  menu_item?: MenuItem
}

export interface SelectedOption {
  group_name: string
  option_name: string
  price_delta: number
}

export interface Payment {
  id: string
  order_id: string
  tenant_id: string
  method: PaymentMethod
  amount: number
  status: PaymentStatus
  reference: string | null
}

export interface Ingredient {
  id: string
  tenant_id: string
  name: string
  unit: string
  stock_qty: number
  min_stock: number
  unit_cost: number
}

export interface Recipe {
  id: string
  menu_item_id: string
  ingredient_id: string
  quantity: number
  waste_percent: number
  ingredient?: Ingredient
}

export interface Supplier {
  id: string
  tenant_id: string
  name: string
  contact: string | null
  email: string | null
  phone: string | null
  note: string | null
}

export interface Expense {
  id: string
  tenant_id: string
  category: ExpenseCategory
  amount: number
  description: string | null
  date: string
}

export interface Customer {
  id: string
  tenant_id: string
  phone: string
  full_name: string
  points_balance: number
  created_at: string
}

export interface LoyaltyTransaction {
  id: string
  customer_id: string
  order_id: string | null
  type: LoyaltyTransactionType
  points: number
  note: string | null
  created_at: string
}

export interface Reservation {
  id: string
  tenant_id: string
  table_id: string | null
  customer_name: string
  customer_phone: string
  party_size: number
  date: string
  time: string
  note: string | null
  status: ReservationStatus
  created_at: string
  table?: Table
}

export interface Shift {
  id: string
  tenant_id: string
  user_id: string
  start_time: string
  end_time: string | null
  opening_cash: number
  closing_cash: number | null
  note: string | null
  user?: User
}

export interface Campaign {
  id: string
  tenant_id: string
  name: string
  type: CampaignType
  value: number
  min_order_amount: number | null
  free_item_id: string | null
  start_time: string | null
  end_time: string | null
  valid_from: string | null
  valid_to: string | null
  is_active: boolean
}
