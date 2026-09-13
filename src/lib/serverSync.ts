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

// Track whether the hosting environment has an active Node/Express backend supporting /api/sync
// (e.g. true in full-stack dev / Docker / Cloud Run, false in static Vercel SPA or GitHub Pages)
let isServerSyncAvailable: boolean | null = null;

export function isServerSyncSupported(): boolean {
  return isServerSyncAvailable !== false;
}

/**
 * Helper to safely extract JSON without throwing SyntaxError if the server
 * returns an HTML error page or an SPA fallback (like index.html with <!doctype html>).
 */
async function parseJsonSafely(res: Response): Promise<{ success: boolean; data?: any }> {
  if (res.status === 404 || res.status === 405) {
    isServerSyncAvailable = false;
    return { success: false };
  }

  const contentType = res.headers.get('content-type') || '';
  // If not JSON or text, likely an HTML SPA fallback page
  if (contentType && !contentType.includes('application/json') && !contentType.includes('text/plain')) {
    isServerSyncAvailable = false;
    return { success: false };
  }

  try {
    const text = await res.text();
    const trimmed = text ? text.trim() : '';
    if (!trimmed || trimmed.startsWith('<') || trimmed.startsWith('<!DOCTYPE') || trimmed.includes('<html')) {
      isServerSyncAvailable = false;
      return { success: false };
    }
    const json = JSON.parse(trimmed);
    isServerSyncAvailable = true;
    return { success: true, data: json };
  } catch {
    isServerSyncAvailable = false;
    return { success: false };
  }
}

export async function fetchServerState(): Promise<ServerSyncData | null> {
  // If we already detected that backend server sync is not available (e.g. static hosting), skip fetch
  if (isServerSyncAvailable === false) return null;

  try {
    const res = await fetch('/api/sync/state');
    const { success, data: json } = await parseJsonSafely(res);
    if (!success || !json) return null;

    if (json.success && json.data) {
      return json.data;
    }
    return null;
  } catch {
    // Network or offline error: mark inactive gracefully
    isServerSyncAvailable = false;
    return null;
  }
}

export async function saveServerState(data: ServerSyncData): Promise<boolean> {
  if (isServerSyncAvailable === false) return false;

  try {
    const res = await fetch('/api/sync/state', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const { success, data: json } = await parseJsonSafely(res);
    if (!success || !json) return false;

    return Boolean(json.success);
  } catch {
    isServerSyncAvailable = false;
    return false;
  }
}

export async function deleteBookingFromServer(bookingId: string): Promise<boolean> {
  if (isServerSyncAvailable === false) return false;
  try {
    const res = await fetch(`/api/sync/booking/${encodeURIComponent(bookingId)}`, {
      method: 'DELETE',
    });
    const { success } = await parseJsonSafely(res);
    return success && res.ok;
  } catch {
    return false;
  }
}

export async function clearBookingsFromServer(mode: 'all' | 'paid_cancelled'): Promise<boolean> {
  if (isServerSyncAvailable === false) return false;
  try {
    const res = await fetch('/api/sync/clear-bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    });
    const { success } = await parseJsonSafely(res);
    return success && res.ok;
  } catch {
    return false;
  }
}

export async function deleteTenantFromServer(tenantId: string): Promise<boolean> {
  if (isServerSyncAvailable === false) return false;
  try {
    const res = await fetch(`/api/sync/tenant/${encodeURIComponent(tenantId)}`, {
      method: 'DELETE',
    });
    const { success } = await parseJsonSafely(res);
    return success && res.ok;
  } catch {
    return false;
  }
}

export async function deleteBillFromServer(billId: string): Promise<boolean> {
  if (isServerSyncAvailable === false) return false;
  try {
    const res = await fetch(`/api/sync/bill/${encodeURIComponent(billId)}`, {
      method: 'DELETE',
    });
    const { success } = await parseJsonSafely(res);
    return success && res.ok;
  } catch {
    return false;
  }
}


