// Auth
export type UserRole = 'admin' | 'receptionist' | 'cashier' | 'stylist'

export interface User {
  id: number
  email: string
  full_name: string
  phone: string
  role: UserRole
  is_active: boolean
  created_at: string
}

export interface AuthTokens {
  access: string
  refresh: string
}

export interface LoginResponse extends AuthTokens {
  user: User
}

// Customer
export interface Customer {
  id: number
  full_name: string
  phone: string
  email: string
  gender: 'male' | 'female' | 'other'
  birthday: string | null
  notes: string
  loyalty_points: number
  created_at: string
}

// Service
export interface ServiceCategory {
  id: number
  name: string
  color: string
}

export interface Service {
  id: number
  name: string
  category: ServiceCategory
  duration_minutes: number
  price: string
  description: string
  is_active: boolean
}

// Employee
export interface Employee {
  id: number
  user: User
  name: string
  phone: string
  role: string
  salary: string
  commission_pct: string
  skills: string[]
  hire_date: string
  is_active: boolean
}

// Appointment
export type AppointmentStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'

export interface Appointment {
  id: number
  customer: Customer
  employee: Employee
  service: Service
  date: string
  start_time: string
  end_time: string
  status: AppointmentStatus
  notes: string
  created_at: string
}

// Product / Inventory
export interface Supplier {
  id: number
  name: string
  phone: string
  email: string
  address: string
}

export interface Product {
  id: number
  name: string
  sku: string
  barcode: string
  cost_price: string
  selling_price: string
  stock_quantity: number
  min_stock_level: number
  supplier: Supplier | null
  is_active: boolean
}

// POS / Sales
export type PaymentMethod = 'cash' | 'mpesa' | 'card' | 'bank'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'

export interface SaleItem {
  id: number
  item_type: 'service' | 'product'
  service?: Service
  product?: Product
  quantity: number
  unit_price: string
  discount_amount: string
  line_total: string
}

export interface Sale {
  id: number
  customer: Customer | null
  employee: Employee
  receipt_number: string
  subtotal: string
  discount_amount: string
  tax_amount: string
  total_amount: string
  payment_status: PaymentStatus
  sale_date: string
  items: SaleItem[]
}

export interface Payment {
  id: number
  sale: number
  method: PaymentMethod
  amount: string
  mpesa_reference: string
  mpesa_phone: string
  status: PaymentStatus
  created_at: string
}

// Expenses
export interface Expense {
  id: number
  category: string
  description: string
  amount: string
  expense_date: string
  created_at: string
}

// Pagination
export interface PaginatedResponse<T> {
  count: number
  total_pages: number
  next: string | null
  previous: string | null
  results: T[]
}

// Cart (POS local state)
export interface CartItem {
  id: string
  item_type: 'service' | 'product'
  service_id?: number
  product_id?: number
  name: string
  unit_price: number
  quantity: number
  discount_amount: number
}
