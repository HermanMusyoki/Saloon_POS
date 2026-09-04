import { apiClient } from './client'
import type { Sale, PaginatedResponse } from '@/types'

export interface CheckoutPayload {
  customer_id?: number | null
  employee_id?: number | null
  items: {
    item_type: 'service' | 'product'
    service_id?: number | null
    product_id?: number | null
    quantity: number
    unit_price: number
    discount_amount: number
  }[]
  discount_amount: number
  tax_rate: number
  payment_method: 'cash' | 'mpesa' | 'card' | 'bank'
  amount_paid: number
  mpesa_phone?: string
  notes?: string
  idempotencyKey?: string
}

export const posApi = {
  getSales: (params?: Record<string, string>) =>
    apiClient.get<PaginatedResponse<Sale>>('/pos/', { params }).then(r => r.data),

  getSale: (id: number) =>
    apiClient.get<Sale>(`/pos/${id}/`).then(r => r.data),

  checkout: ({ idempotencyKey, ...data }: CheckoutPayload) =>
    apiClient.post<Sale>('/pos/checkout/', data, {
      headers: idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {},
    }).then(r => r.data),
}
