/**
 * Safe LocalStorage Wrapper with Quota Management & Error Suppression
 * Prevents "The quota has been exceeded" (QuotaExceededError) from crashing mobile browsers (iOS Safari, etc.)
 */

export const safeStorage = {
  getItem: <T = any>(key: string, fallback: T): T => {
    if (typeof window === 'undefined') return fallback;
    try {
      const item = window.localStorage.getItem(key);
      if (!item) return fallback;
      return JSON.parse(item) as T;
    } catch (err) {
      console.warn(`[SafeStorage] Failed to read key "${key}":`, err);
      return fallback;
    }
  },

  setItem: (key: string, value: any): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      const serialized = JSON.stringify(value);
      window.localStorage.setItem(key, serialized);
      return true;
    } catch (err: any) {
      console.warn(`[SafeStorage] Quota exceeded or failed to write key "${key}":`, err);
      
      // Try emergency cleanup if quota exceeded
      try {
        // If this is rooms with large base64 images, sanitize images before saving to storage
        if (key === 'stayflow_rooms' && Array.isArray(value)) {
          const sanitizedRooms = value.map((r: any) => ({
            ...r,
            images: Array.isArray(r.images) 
              ? r.images.map((img: string) => (img.startsWith('data:image') && img.length > 50000 ? '' : img)).filter(Boolean)
              : r.images,
          }));
          window.localStorage.setItem(key, JSON.stringify(sanitizedRooms));
          return true;
        }
      } catch (innerErr) {
        console.warn(`[SafeStorage] Fallback save failed for key "${key}":`, innerErr);
      }
      return false;
    }
  },

  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(key);
    } catch (err) {
      console.warn(`[SafeStorage] Failed to remove key "${key}":`, err);
    }
  },

  clearAppData: (): void => {
    if (typeof window === 'undefined') return;
    try {
      const keysToRemove = [
        'stayflow_property',
        'stayflow_utility_config',
        'stayflow_rooms',
        'stayflow_tenants',
        'stayflow_bookings',
        'stayflow_bills',
      ];
      keysToRemove.forEach((k) => window.localStorage.removeItem(k));
    } catch (err) {
      console.warn('[SafeStorage] Failed to clear app data:', err);
    }
  },
};
