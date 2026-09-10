import { apiClient } from './client'
import type { Product, Supplier, PaginatedResponse } from '@/types'

export interface StockMovement {
  id: number
  product: number
  product_name: string
  movement_type: 'in' | 'out' | 'adjustment'
  quantity: number
  reference: string
  notes: string
  created_by_name: string
  created_at: string
}

export const inventoryApi = {
  // Products
  getProducts: (params?: Record<string, string>) =>
    apiClient.get<PaginatedResponse<Product>>('/inventory/products/', { params }).then(r => r.data),

  getProduct: (id: number) =>
    apiClient.get<Product>(`/inventory/products/${id}/`).then(r => r.data),

  createProduct: (data: Partial<Product>) =>
    apiClient.post<Product>('/inventory/products/', data).then(r => r.data),

  updateProduct: (id: number, data: Partial<Product>) =>
    apiClient.patch<Product>(`/inventory/products/${id}/`, data).then(r => r.data),

  deleteProduct: (id: number) =>
    apiClient.delete(`/inventory/products/${id}/`).then(r => r.data),

  // Suppliers
  getSuppliers: (params?: Record<string, string>) =>
    apiClient.get<PaginatedResponse<Supplier>>('/inventory/suppliers/', { params }).then(r => r.data),

  createSupplier: (data: Partial<Supplier>) =>
    apiClient.post<Supplier>('/inventory/suppliers/', data).then(r => r.data),

  updateSupplier: (id: number, data: Partial<Supplier>) =>
    apiClient.patch<Supplier>(`/inventory/suppliers/${id}/`, data).then(r => r.data),

  deleteSupplier: (id: number) =>
    apiClient.delete(`/inventory/suppliers/${id}/`).then(r => r.data),

  // Stock movements
  getMovements: (params?: Record<string, string>) =>
    apiClient.get<PaginatedResponse<StockMovement>>('/inventory/stock-movements/', { params }).then(r => r.data),

  addMovement: (data: { product: number; movement_type: string; quantity: number; reference?: string; notes?: string }) =>
    apiClient.post<StockMovement>('/inventory/stock-movements/', data).then(r => r.data),

  // Alerts
  getLowStock: () =>
    apiClient.get<{ count: number; products: any[] }>('/inventory/low-stock/').then(r => r.data),

  lookupBarcode: (barcode: string) =>
    apiClient.get<Product>('/inventory/barcode/', { params: { barcode } }).then(r => r.data),
}
