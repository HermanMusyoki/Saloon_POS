import { apiClient } from './client'
import type { Service, ServiceCategory, PaginatedResponse } from '@/types'

export const servicesApi = {
  // Categories
  getCategories: async (): Promise<PaginatedResponse<ServiceCategory>> => {
    const { data } = await apiClient.get('/services/categories/')
    return data
  },
  createCategory: async (payload: Partial<ServiceCategory>): Promise<ServiceCategory> => {
    const { data } = await apiClient.post('/services/categories/', payload)
    return data
  },
  updateCategory: async (id: number, payload: Partial<ServiceCategory>): Promise<ServiceCategory> => {
    const { data } = await apiClient.patch(`/services/categories/${id}/`, payload)
    return data
  },
  deleteCategory: async (id: number): Promise<void> => {
    await apiClient.delete(`/services/categories/${id}/`)
  },

  // Services
  getServices: async (params?: Record<string, string>): Promise<PaginatedResponse<Service>> => {
    const { data } = await apiClient.get('/services/', { params })
    return data
  },
  getService: async (id: number): Promise<Service> => {
    const { data } = await apiClient.get(`/services/${id}/`)
    return data
  },
  createService: async (payload: Partial<Service>): Promise<Service> => {
    const { data } = await apiClient.post('/services/', payload)
    return data
  },
  updateService: async (id: number, payload: Partial<Service>): Promise<Service> => {
    const { data } = await apiClient.patch(`/services/${id}/`, payload)
    return data
  },
  deleteService: async (id: number): Promise<void> => {
    await apiClient.delete(`/services/${id}/`)
  },
}
