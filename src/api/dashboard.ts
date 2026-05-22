/**
 * Dashboard API layer.
 * All dashboard data fetching centralized here.
 */
import { request } from './client';
import type { ApiResponse } from '@/src/types/api';
import type { DashboardStats } from '@/src/features/dashboard/types';

/**
 * Fetch aggregated dashboard statistics.
 * Endpoint: GET /api/v1/admin/dashboard/stats
 * Requires authentication.
 */
export async function getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
  return request<DashboardStats>('GET', '/api/v1/admin/dashboard/stats', { auth: true });
}