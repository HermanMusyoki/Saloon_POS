import { apiClient } from './client'
import type { Payment } from '@/types'

export const paymentsApi = {
  getSalePayments: (saleId: number) =>
    apiClient.get<Payment[]>(`/payments/sale/${saleId}/`).then(r => r.data),

  queryMpesaStatus: (paymentId: number) =>
    apiClient.get<Payment>(`/payments/${paymentId}/mpesa/status/`).then(r => r.data),

  refund: (paymentId: number) =>
    apiClient.post<Payment>(`/payments/${paymentId}/refund/`).then(r => r.data),
}
