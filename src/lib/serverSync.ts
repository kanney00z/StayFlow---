/**
 * Server-Side Sync Engine
 * Provides fallback local/cloud server persistence when third-party quotas (like Supabase) are exceeded.
 */
import { PropertyProfile, UtilityRateConfig, Room, Tenant, Booking, UtilityBill } from '../types';

export interface ServerSyncData {
  property?: PropertyProfile;
  utilityConfig?: UtilityRateConfig;
  rooms?: Room[];
  tenants?: Tenant[];
  bookings?: Booking[];
  bills?: UtilityBill[];
  updatedAt?: number;
}

export async function fetchServerState(): Promise<ServerSyncData | null> {
  try {
    const res = await fetch('/api/sync/state');
    if (!res.ok) return null;
    const json = await res.json();
    if (json && json.success && json.data) {
      return json.data;
    }
    return null;
  } catch (err) {
    console.warn('[ServerSync] Could not fetch server state:', err);
    return null;
  }
}

export async function saveServerState(data: ServerSyncData): Promise<boolean> {
  try {
    const res = await fetch('/api/sync/state', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) return false;
    const json = await res.json();
    return Boolean(json && json.success);
  } catch (err) {
    console.warn('[ServerSync] Could not save server state:', err);
    return false;
  }
}

export async function deleteBookingFromServer(bookingId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/sync/booking/${encodeURIComponent(bookingId)}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    console.warn('[ServerSync] Could not delete booking on server:', err);
    return false;
  }
}

export async function clearBookingsFromServer(mode: 'all' | 'paid_cancelled'): Promise<boolean> {
  try {
    const res = await fetch('/api/sync/clear-bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    });
    return res.ok;
  } catch (err) {
    console.warn('[ServerSync] Could not clear bookings on server:', err);
    return false;
  }
}

export async function deleteTenantFromServer(tenantId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/sync/tenant/${encodeURIComponent(tenantId)}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    console.warn('[ServerSync] Could not delete tenant on server:', err);
    return false;
  }
}

export async function deleteBillFromServer(billId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/sync/bill/${encodeURIComponent(billId)}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    console.warn('[ServerSync] Could not delete bill on server:', err);
    return false;
  }
}

