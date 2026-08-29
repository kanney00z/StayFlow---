import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  Room, Tenant, Booking, UtilityBill, 
  PropertyProfile, UtilityRateConfig 
} from '../types';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export interface RealtimeSyncPayload {
  senderId: string;
  timestamp: number;
  action: 'ROOMS_UPDATE' | 'BILLS_UPDATE' | 'BOOKINGS_UPDATE' | 'TENANTS_UPDATE' | 'PROPERTY_UPDATE' | 'CONFIG_UPDATE' | 'FULL_SYNC';
  data: any;
}

// Client-side unique sender ID to avoid self-echo handling loops
export const CLIENT_SESSION_ID = `client_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;

const STORAGE_KEY_SUPABASE_URL = 'stayflow_supabase_url';
const STORAGE_KEY_SUPABASE_KEY = 'stayflow_supabase_key';

let cachedClient: SupabaseClient | null = null;

/**
 * Get the public URL accessible by any mobile phone/device without authentication barriers
 */
export function getPublicBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  let origin = window.location.origin;
  // Replace internal development container prefix with public preview prefix (ais-dev -> ais-pre)
  if (origin.includes('ais-dev-')) {
    origin = origin.replace('ais-dev-', 'ais-pre-');
  }
  return origin + window.location.pathname;
}

/**
 * Encode Supabase credentials into a shareable hash string
 */
export function encodeSyncToken(url: string, anonKey: string): string {
  try {
    const payload = JSON.stringify({ url: url.trim(), key: anonKey.trim() });
    return encodeURIComponent(btoa(unescape(encodeURIComponent(payload))));
  } catch {
    try {
      return encodeURIComponent(btoa(JSON.stringify({ url: url.trim(), key: anonKey.trim() })));
    } catch {
      return '';
    }
  }
}

/**
 * Decode Supabase credentials from a shareable hash string
 */
export function decodeSyncToken(token: string): SupabaseConfig | null {
  try {
    const cleanToken = decodeURIComponent(token.trim());
    const raw = decodeURIComponent(escape(atob(cleanToken)));
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.url === 'string' && typeof parsed.key === 'string' && parsed.url.startsWith('https://')) {
      return { url: parsed.url, anonKey: parsed.key };
    }
  } catch {
    try {
      const cleanToken = decodeURIComponent(token.trim());
      const raw = atob(cleanToken);
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.url === 'string' && typeof parsed.key === 'string') {
        return { url: parsed.url, anonKey: parsed.key };
      }
    } catch {
      // fallback or fail
    }
  }
  return null;
}

/**
 * Generate a complete Direct Sync URL that automatically configures any mobile device or browser upon opening
 */
export function getMobileSyncUrl(): string {
  const config = getSupabaseConfig();
  const baseUrl = getPublicBaseUrl();
  if (!config.url || !config.anonKey) {
    return baseUrl;
  }
  const token = encodeSyncToken(config.url, config.anonKey);
  return `${baseUrl}#sync=${token}`;
}

/**
 * Auto-detect and parse Supabase credentials from URL query/hash on page load
 * Returns true if new credentials were found and applied
 */
export function parseAndApplySyncFromUrl(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    let urlFound = '';
    let keyFound = '';

    // 1. Check Hash (#sync=...)
    const hash = window.location.hash || '';
    if (hash && hash.includes('sync=')) {
      const match = hash.match(/sync=([^&]+)/);
      if (match && match[1]) {
        const decoded = decodeSyncToken(match[1]);
        if (decoded) {
          urlFound = decoded.url;
          keyFound = decoded.anonKey;
        }
      }
    }

    // 2. Check Query Params (?sb_url=...&sb_key=... or ?sync=...)
    if (!urlFound && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('sync')) {
        const decoded = decodeSyncToken(params.get('sync') || '');
        if (decoded) {
          urlFound = decoded.url;
          keyFound = decoded.anonKey;
        }
      } else if (params.get('sb_url') && params.get('sb_key')) {
        urlFound = params.get('sb_url') || '';
        keyFound = params.get('sb_key') || '';
      } else if (params.get('supabase_url') && params.get('supabase_key')) {
        urlFound = params.get('supabase_url') || '';
        keyFound = params.get('supabase_key') || '';
      }
    }

    if (urlFound && keyFound && urlFound.startsWith('https://')) {
      saveSupabaseConfig(urlFound, keyFound);
      
      // Clean URL address bar without reloading
      try {
        if (window.history && window.history.replaceState) {
          window.history.replaceState(null, '', window.location.pathname);
        }
      } catch {
        // ignore
      }
      return true;
    }
  } catch (err) {
    console.warn('Error parsing sync from URL:', err);
  }
  return false;
}

// Auto-run on module evaluation
if (typeof window !== 'undefined') {
  parseAndApplySyncFromUrl();
}

/**
 * Get current Supabase credentials from ENV or localStorage
 */
export function getSupabaseConfig(): SupabaseConfig {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  let storedUrl = '';
  let storedKey = '';
  try {
    if (typeof window !== 'undefined') {
      storedUrl = window.localStorage.getItem(STORAGE_KEY_SUPABASE_URL) || '';
      storedKey = window.localStorage.getItem(STORAGE_KEY_SUPABASE_KEY) || '';
    }
  } catch {
    // Ignore storage errors on private mode
  }

  return {
    url: storedUrl || envUrl,
    anonKey: storedKey || envKey,
  };
}

/**
 * Save Supabase credentials to localStorage and reset client
 */
export function saveSupabaseConfig(url: string, anonKey: string): void {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY_SUPABASE_URL, url.trim());
      window.localStorage.setItem(STORAGE_KEY_SUPABASE_KEY, anonKey.trim());
    }
  } catch (e) {
    console.warn('[Supabase] Failed to save config to localStorage:', e);
  }
  cachedClient = null;
}

/**
 * Check if Supabase credentials are configured
 */
export function isSupabaseConfigured(): boolean {
  const config = getSupabaseConfig();
  return Boolean(config.url && config.anonKey && config.url.startsWith('https://'));
}

/**
 * Get initialized Supabase Client
 */
export function getSupabase(): SupabaseClient | null {
  if (cachedClient) return cachedClient;

  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey || !config.url.startsWith('https://')) {
    return null;
  }

  try {
    cachedClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    return cachedClient;
  } catch (err) {
    console.error('Error creating Supabase client:', err);
    return null;
  }
}

/**
 * Test Connection to Supabase
 */
export async function testSupabaseConnection(url?: string, anonKey?: string): Promise<{ success: boolean; message: string }> {
  try {
    const testUrl = url || getSupabaseConfig().url;
    const testKey = anonKey || getSupabaseConfig().anonKey;

    if (!testUrl || !testKey) {
      return { success: false, message: 'กรุณากรอก Project URL และ Anon Key' };
    }

    if (!testUrl.startsWith('https://') || !testUrl.includes('.supabase.co')) {
      return { success: false, message: 'URL ต้องขึ้นต้นด้วย https:// และลงท้ายด้วย .supabase.co' };
    }

    const testClient = createClient(testUrl, testKey, { auth: { persistSession: false } });
    
    // Try pinging or querying system
    const { error } = await testClient.from('rooms').select('id').limit(1);

    if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
      // 42P01 is table does not exist (connection is ok, but schema not yet migrated)
      return { 
        success: false, 
        message: `เชื่อมต่อไม่สำเร็จ: ${error.message}` 
      };
    }

    return { 
      success: true, 
      message: 'เชื่อมต่อกับ Supabase และ Real-Time Engine สำเร็จเรียบร้อย!' 
    };
  } catch (err: any) {
    return { success: false, message: `เกิดข้อผิดพลาด: ${err.message || 'ไม่สามารถติดต่อ Supabase ได้'}` };
  }
}

/**
 * Broadcast real-time event to all connected devices / users
 */
export function broadcastRealtimeChange(
  supabase: SupabaseClient | null,
  channelName: string = 'stayflow_live_sync',
  action: RealtimeSyncPayload['action'],
  data: any
) {
  if (!supabase) return;

  try {
    const channel = supabase.channel(channelName);
    channel.send({
      type: 'broadcast',
      event: 'STATE_CHANGED',
      payload: {
        senderId: CLIENT_SESSION_ID,
        timestamp: Date.now(),
        action,
        data,
      },
    });
  } catch (err) {
    console.warn('Realtime broadcast failed:', err);
  }
}

/**
 * Full SQL Schema generation script to copy and run in Supabase SQL Editor
 */
export const SUPABASE_SQL_SCHEMA = `-- ==========================================
-- 🏢 StayFlow Dorm Management System Schema
-- รันโค้ดนี้ใน Supabase SQL Editor เพื่อสร้างตารางและเปิดใช้งาน Real-Time
-- ==========================================

-- 1. ตารางข้อมูลที่พัก (Property Profile)
CREATE TABLE IF NOT EXISTS public.property_profile (
    id TEXT PRIMARY KEY DEFAULT 'main_property',
    name TEXT NOT NULL,
    name_en TEXT,
    address TEXT,
    phone TEXT,
    tax_id TEXT,
    bank_name TEXT,
    bank_account TEXT,
    bank_account_name TEXT,
    prompt_pay_id TEXT,
    prompt_pay_name TEXT,
    line_id TEXT,
    notes TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. ตารางการตั้งค่าอัตราค่าน้ำ ค่าไฟ และค่าบริการ (Utility Config)
CREATE TABLE IF NOT EXISTS public.utility_config (
    id TEXT PRIMARY KEY DEFAULT 'main_config',
    water_rate NUMERIC DEFAULT 18,
    elec_rate NUMERIC DEFAULT 8,
    common_fee NUMERIC DEFAULT 200,
    internet_fee NUMERIC DEFAULT 150,
    parking_fee NUMERIC DEFAULT 300,
    trash_fee NUMERIC DEFAULT 40,
    water_calculation_type TEXT DEFAULT 'unit',
    due_day_of_month INTEGER DEFAULT 5,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. ตารางห้องพัก (Rooms)
CREATE TABLE IF NOT EXISTS public.rooms (
    id TEXT PRIMARY KEY,
    number TEXT NOT NULL,
    floor INTEGER NOT NULL,
    type TEXT NOT NULL,
    rental_type TEXT NOT NULL,
    status TEXT NOT NULL,
    daily_rate NUMERIC DEFAULT 890,
    monthly_rate NUMERIC DEFAULT 4000,
    deposit_monthly NUMERIC DEFAULT 5000,
    current_water_meter NUMERIC DEFAULT 0,
    previous_water_meter NUMERIC DEFAULT 0,
    current_elec_meter NUMERIC DEFAULT 0,
    previous_elec_meter NUMERIC DEFAULT 0,
    meter_last_updated TEXT,
    images JSONB DEFAULT '[]'::jsonb,
    amenities JSONB DEFAULT '[]'::jsonb,
    current_tenant JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. ตารางผู้เช่า (Tenants)
CREATE TABLE IF NOT EXISTS public.tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    id_card TEXT,
    room_number TEXT NOT NULL,
    room_id TEXT NOT NULL,
    rental_type TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT,
    deposit_amount NUMERIC DEFAULT 0,
    monthly_rent NUMERIC DEFAULT 0,
    emergency_contact TEXT,
    emergency_phone TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. ตารางการจองห้องพัก (Bookings)
CREATE TABLE IF NOT EXISTS public.bookings (
    id TEXT PRIMARY KEY,
    booking_code TEXT NOT NULL,
    room_id TEXT NOT NULL,
    room_number TEXT NOT NULL,
    room_type TEXT NOT NULL,
    guest_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    rental_type TEXT NOT NULL,
    check_in_date TEXT NOT NULL,
    check_out_date TEXT NOT NULL,
    duration_days INTEGER DEFAULT 1,
    duration_months INTEGER DEFAULT 1,
    room_rate_total NUMERIC NOT NULL,
    deposit NUMERIC DEFAULT 0,
    total_amount NUMERIC NOT NULL,
    payment_status TEXT DEFAULT 'pending',
    payment_method TEXT,
    booking_date TEXT NOT NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. ตารางบิลค่าเช่า & ค่าน้ำค่าไฟ (Utility Bills)
CREATE TABLE IF NOT EXISTS public.utility_bills (
    id TEXT PRIMARY KEY,
    bill_number TEXT NOT NULL,
    room_id TEXT NOT NULL,
    room_number TEXT NOT NULL,
    tenant_name TEXT NOT NULL,
    tenant_phone TEXT,
    month_year TEXT NOT NULL,
    billing_date TEXT NOT NULL,
    due_date TEXT NOT NULL,
    room_rent_amount NUMERIC NOT NULL,
    prev_water_meter NUMERIC DEFAULT 0,
    curr_water_meter NUMERIC DEFAULT 0,
    water_units NUMERIC DEFAULT 0,
    water_rate NUMERIC DEFAULT 18,
    water_amount NUMERIC DEFAULT 0,
    prev_elec_meter NUMERIC DEFAULT 0,
    curr_elec_meter NUMERIC DEFAULT 0,
    elec_units NUMERIC DEFAULT 0,
    elec_rate NUMERIC DEFAULT 8,
    elec_amount NUMERIC DEFAULT 0,
    common_fee NUMERIC DEFAULT 0,
    internet_fee NUMERIC DEFAULT 0,
    parking_fee NUMERIC DEFAULT 0,
    trash_fee NUMERIC DEFAULT 0,
    other_fees NUMERIC DEFAULT 0,
    other_fees_note TEXT,
    subtotal NUMERIC NOT NULL,
    discount NUMERIC DEFAULT 0,
    grand_total NUMERIC NOT NULL,
    payment_status TEXT DEFAULT 'unpaid',
    paid_amount NUMERIC DEFAULT 0,
    remaining_balance NUMERIC DEFAULT 0,
    paid_date TEXT,
    paid_method TEXT,
    slip_image TEXT,
    attached_contract JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 🔐 ปรับสิทธิ์ RLS ให้เข้าถึงได้โดยตรง (Disable RLS เพื่อความเสถียรสูงสุดสำหรับ Anon Key)
-- ==========================================
ALTER TABLE public.property_profile DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.utility_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.utility_bills DISABLE ROW LEVEL SECURITY;

-- ==========================================
-- ⚡ เปิดใช้งาน Real-Time Replication สำหรับทุกตาราง
-- ==========================================
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.property_profile;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.utility_config;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tenants;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.utility_bills;
  EXCEPTION WHEN others THEN NULL;
  END;
END $$;
`;

/**
 * Fetch all cloud records from Supabase tables
 */
export async function fetchAllFromSupabase(): Promise<{
  property?: PropertyProfile;
  utilityConfig?: UtilityRateConfig;
  rooms?: Room[];
  tenants?: Tenant[];
  bookings?: Booking[];
  bills?: UtilityBill[];
} | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const [
      { data: propData },
      { data: configData },
      { data: roomsData },
      { data: tenantsData },
      { data: bookingsData },
      { data: billsData },
    ] = await Promise.all([
      supabase.from('property_profile').select('*').limit(1).maybeSingle(),
      supabase.from('utility_config').select('*').limit(1).maybeSingle(),
      supabase.from('rooms').select('*').order('number', { ascending: true }),
      supabase.from('tenants').select('*').order('created_at', { ascending: false }),
      supabase.from('bookings').select('*').order('created_at', { ascending: false }),
      supabase.from('utility_bills').select('*').order('created_at', { ascending: false }),
    ]);

    const result: any = {};

    if (propData) {
      result.property = {
        name: propData.name || '',
        nameEn: propData.name_en || '',
        tagline: propData.tagline || '',
        address: propData.address || '',
        phone: propData.phone || '',
        email: propData.email || '',
        taxId: propData.tax_id || '',
        bankName: propData.bank_name || '',
        bankAccount: propData.bank_account || '',
        bankAccountName: propData.bank_account_name || '',
        promptPayId: propData.prompt_pay_id || '',
        promptPayName: propData.prompt_pay_name || '',
        lineId: propData.line_id || '',
        wifiSsid: propData.wifi_ssid || '',
        wifiPass: propData.wifi_pass || '',
      };
    }

    if (configData) {
      result.utilityConfig = {
        waterRatePerUnit: Number(configData.water_rate_per_unit || configData.water_rate || 18),
        waterBillingType: configData.water_billing_type || 'unit',
        waterFlatRate: Number(configData.water_flat_rate || 100),
        waterPerPersonRate: Number(configData.water_per_person_rate || 100),
        elecRatePerUnit: Number(configData.elec_rate_per_unit || configData.elec_rate || 8),
        commonFeeMonthly: Number(configData.common_fee_monthly || configData.common_fee || 300),
        internetFeeMonthly: Number(configData.internet_fee_monthly || configData.internet_fee || 200),
        trashFeeMonthly: Number(configData.trash_fee_monthly || configData.trash_fee || 40),
        parkingFeeMonthly: Number(configData.parking_fee_monthly || configData.parking_fee || 300),
        minWaterCharge: Number(configData.min_water_charge || 0),
        minElecCharge: Number(configData.min_elec_charge || 0),
      };
    }

    if (roomsData && roomsData.length > 0) {
      result.rooms = roomsData.map((r: any) => ({
        id: r.id,
        number: r.number,
        floor: Number(r.floor || 1),
        building: r.building || 'A',
        type: r.type || 'Standard',
        status: r.status || 'available',
        dailyRate: Number(r.daily_rate || 890),
        monthlyRate: Number(r.monthly_rate || 4000),
        depositMonthly: Number(r.deposit_monthly || 5000),
        sizeSqm: Number(r.size_sqm || 28),
        bedType: r.bed_type || 'King Bed (6 ฟุต)',
        maxGuests: Number(r.max_guests || 2),
        description: r.description || '',
        currentWaterMeter: Number(r.current_water_meter || 0),
        previousWaterMeter: Number(r.previous_water_meter || 0),
        currentElecMeter: Number(r.current_elec_meter || 0),
        previousElecMeter: Number(r.previous_elec_meter || 0),
        meterLastUpdated: r.meter_last_updated,
        images: r.images || [],
        amenities: r.amenities || [],
        currentTenant: r.current_tenant,
      }));
    }

    if (tenantsData && tenantsData.length > 0) {
      result.tenants = tenantsData.map((t: any) => ({
        id: t.id,
        name: t.name,
        phone: t.phone,
        email: t.email,
        idCard: t.id_card,
        roomNumber: t.room_number,
        roomId: t.room_id,
        rentalType: t.rental_type || 'monthly',
        startDate: t.start_date,
        endDate: t.end_date,
        depositAmount: Number(t.deposit_amount || 0),
        monthlyRent: Number(t.monthly_rent || 0),
        emergencyContact: t.emergency_contact || '',
        emergencyPhone: t.emergency_phone || '',
        idCardImage: t.id_card_image,
        note: t.note,
        status: t.status || 'active',
      }));
    }

    if (bookingsData && bookingsData.length > 0) {
      result.bookings = bookingsData.map((b: any) => ({
        id: b.id,
        bookingCode: b.booking_code,
        roomId: b.room_id,
        roomNumber: b.room_number,
        roomType: b.room_type || 'Standard',
        guestName: b.guest_name,
        phone: b.phone,
        email: b.email,
        rentalType: b.rental_type || 'daily',
        checkInDate: b.check_in_date,
        checkOutDate: b.check_out_date,
        durationUnits: Number(b.duration_units || b.duration_days || b.duration_months || 1),
        guestsCount: Number(b.guests_count || 1),
        roomRateTotal: Number(b.room_rate_total || 0),
        deposit: Number(b.deposit || 0),
        cleaningFee: Number(b.cleaning_fee || 0),
        discount: Number(b.discount || 0),
        totalAmount: Number(b.total_amount || 0),
        paymentStatus: b.payment_status || 'pending',
        paymentMethod: b.payment_method || 'promptpay',
        createdAt: b.created_at || new Date().toISOString(),
        specialRequests: b.special_requests || b.note || '',
      }));
    }

    if (billsData && billsData.length > 0) {
      result.bills = billsData.map((b: any) => ({
        id: b.id,
        billNumber: b.bill_number,
        roomId: b.room_id,
        roomNumber: b.room_number,
        tenantName: b.tenant_name,
        tenantPhone: b.tenant_phone,
        monthYear: b.month_year,
        billingDate: b.billing_date,
        dueDate: b.due_date,
        roomRentAmount: Number(b.room_rent_amount),
        prevWaterMeter: Number(b.prev_water_meter),
        currWaterMeter: Number(b.curr_water_meter),
        waterUnits: Number(b.water_units),
        waterRate: Number(b.water_rate),
        waterAmount: Number(b.water_amount),
        prevElecMeter: Number(b.prev_elec_meter),
        currElecMeter: Number(b.curr_elec_meter),
        elecUnits: Number(b.elec_units),
        elecRate: Number(b.elec_rate),
        elecAmount: Number(b.elec_amount),
        commonFee: Number(b.common_fee),
        internetFee: Number(b.internet_fee),
        parkingFee: Number(b.parking_fee),
        trashFee: Number(b.trash_fee),
        otherFees: Number(b.other_fees),
        otherFeesNote: b.other_fees_note,
        subtotal: Number(b.subtotal),
        discount: Number(b.discount),
        grandTotal: Number(b.grand_total),
        paymentStatus: b.payment_status,
        paidAmount: Number(b.paid_amount || 0),
        remainingBalance: Number(b.remaining_balance || 0),
        paidDate: b.paid_date,
        paidMethod: b.paid_method,
        slipImage: b.slip_image,
        paymentRecords: b.payment_records,
        attachedContract: b.attached_contract,
        note: b.note,
      }));
    }

    return result;
  } catch (err) {
    console.warn('Could not fetch from Supabase tables (tables may not be created yet):', err);
    return null;
  }
}

/**
 * Auto-save individual entities to Supabase
 */
export async function savePropertyToCloud(property: PropertyProfile) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from('property_profile').upsert({
      id: 'main_property',
      name: property.name || '',
      name_en: property.nameEn || '',
      address: property.address || '',
      phone: property.phone || '',
      tax_id: property.taxId || '',
      bank_name: property.bankName || '',
      bank_account: property.bankAccount || '',
      bank_account_name: property.bankAccountName || '',
      prompt_pay_id: property.promptPayId || '',
      prompt_pay_name: property.promptPayName || '',
      line_id: property.lineId || '',
      wifi_ssid: property.wifiSsid || '',
      wifi_pass: property.wifiPass || '',
      notes: '',
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Error saving property to Supabase:', err);
  }
}

export async function saveUtilityConfigToCloud(config: UtilityRateConfig) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from('utility_config').upsert({
      id: 'main_config',
      water_rate: config.waterRatePerUnit,
      water_rate_per_unit: config.waterRatePerUnit,
      water_billing_type: config.waterBillingType,
      water_flat_rate: config.waterFlatRate,
      water_per_person_rate: config.waterPerPersonRate,
      elec_rate: config.elecRatePerUnit,
      elec_rate_per_unit: config.elecRatePerUnit,
      common_fee: config.commonFeeMonthly,
      common_fee_monthly: config.commonFeeMonthly,
      internet_fee: config.internetFeeMonthly,
      internet_fee_monthly: config.internetFeeMonthly,
      parking_fee: config.parkingFeeMonthly,
      parking_fee_monthly: config.parkingFeeMonthly,
      trash_fee: config.trashFeeMonthly,
      trash_fee_monthly: config.trashFeeMonthly,
      water_calculation_type: config.waterBillingType,
      due_day_of_month: 5,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Error saving utility config to Supabase:', err);
  }
}

export async function saveTenantsToCloud(tenants: Tenant[]) {
  const supabase = getSupabase();
  if (!supabase || tenants.length === 0) return;
  try {
    const payloads = tenants.map(t => ({
      id: t.id,
      name: t.name,
      phone: t.phone,
      email: t.email || '',
      id_card: t.idCard,
      room_number: t.roomNumber,
      room_id: t.roomId,
      rental_type: t.rentalType || 'monthly',
      start_date: t.startDate,
      end_date: t.endDate || null,
      deposit_amount: t.depositAmount || 0,
      monthly_rent: t.monthlyRent || 0,
      emergency_contact: t.emergencyContact || '',
      emergency_phone: t.emergencyPhone || '',
      status: t.status || 'active',
    }));
    await supabase.from('tenants').upsert(payloads);
  } catch (err) {
    console.warn('Error saving tenants to Supabase:', err);
  }
}

export async function saveRoomsToCloud(rooms: Room[]) {
  const supabase = getSupabase();
  if (!supabase || rooms.length === 0) return;
  try {
    const payloads = rooms.map(r => ({
      id: r.id,
      number: r.number,
      floor: r.floor,
      type: r.type,
      rental_type: 'monthly',
      status: r.status,
      daily_rate: r.dailyRate,
      monthly_rate: r.monthlyRate,
      deposit_monthly: r.depositMonthly,
      current_water_meter: r.currentWaterMeter,
      previous_water_meter: r.previousWaterMeter,
      current_elec_meter: r.currentElecMeter,
      previous_elec_meter: r.previousElecMeter,
      meter_last_updated: r.meterLastUpdated,
      images: r.images,
      amenities: r.amenities,
      current_tenant: r.currentTenant || null,
      updated_at: new Date().toISOString(),
    }));
    await supabase.from('rooms').upsert(payloads);
  } catch (err) {
    console.warn('Error saving rooms to Supabase:', err);
  }
}

export async function saveBookingsToCloud(bookings: Booking[]) {
  const supabase = getSupabase();
  if (!supabase || bookings.length === 0) return;
  try {
    const payloads = bookings.map(b => ({
      id: b.id,
      booking_code: b.bookingCode,
      room_id: b.roomId,
      room_number: b.roomNumber,
      room_type: b.roomType,
      guest_name: b.guestName,
      phone: b.phone,
      email: b.email,
      rental_type: b.rentalType,
      check_in_date: b.checkInDate,
      check_out_date: b.checkOutDate,
      duration_days: b.durationUnits || 1,
      duration_months: b.durationUnits || 1,
      room_rate_total: b.roomRateTotal,
      deposit: b.deposit,
      total_amount: b.totalAmount,
      payment_status: b.paymentStatus,
      payment_method: b.paymentMethod,
      booking_date: b.createdAt ? b.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
      note: b.specialRequests || '',
    }));
    await supabase.from('bookings').upsert(payloads);
  } catch (err) {
    console.warn('Error saving bookings to Supabase:', err);
  }
}

export async function saveBillsToCloud(bills: UtilityBill[]) {
  const supabase = getSupabase();
  if (!supabase || bills.length === 0) return;
  try {
    const payloads = bills.map(b => ({
      id: b.id,
      bill_number: b.billNumber,
      room_id: b.roomId,
      room_number: b.roomNumber,
      tenant_name: b.tenantName,
      tenant_phone: b.tenantPhone,
      month_year: b.monthYear,
      billing_date: b.billingDate,
      due_date: b.dueDate,
      room_rent_amount: b.roomRentAmount,
      prev_water_meter: b.prevWaterMeter,
      curr_water_meter: b.currWaterMeter,
      water_units: b.waterUnits,
      water_rate: b.waterRate,
      water_amount: b.waterAmount,
      prev_elec_meter: b.prevElecMeter,
      curr_elec_meter: b.currElecMeter,
      elec_units: b.elecUnits,
      elec_rate: b.elecRate,
      elec_amount: b.elecAmount,
      common_fee: b.commonFee,
      internet_fee: b.internetFee,
      parking_fee: b.parkingFee,
      trash_fee: b.trashFee,
      other_fees: b.otherFees,
      other_fees_note: b.otherFeesNote,
      subtotal: b.subtotal,
      discount: b.discount,
      grand_total: b.grandTotal,
      payment_status: b.paymentStatus,
      paid_amount: b.paidAmount,
      remaining_balance: b.remainingBalance,
      paid_date: b.paidDate,
      paid_method: b.paidMethod,
      slip_image: b.slipImage,
      attached_contract: b.attachedContract,
    }));
    await supabase.from('utility_bills').upsert(payloads);
  } catch (err) {
    console.warn('Error saving bills to Supabase:', err);
  }
}

/**
 * Upload all current application data to Supabase
 */
export async function syncAllToSupabase(data: {
  property: PropertyProfile;
  utilityConfig: UtilityRateConfig;
  rooms: Room[];
  tenants: Tenant[];
  bookings: Booking[];
  bills: UtilityBill[];
}): Promise<{ success: boolean; message: string; details?: { rooms: number; tenants: number; bookings: number; bills: number } }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, message: 'ยังไม่ได้ระบุ Supabase URL หรือ Anon Key' };
  }

  let savedRooms = 0;
  let savedTenants = 0;
  let savedBookings = 0;
  let savedBills = 0;
  const errors: string[] = [];

  try {
    // 1. Property Profile
    try {
      await supabase.from('property_profile').upsert({
        id: 'main_property',
        name: data.property.name,
        name_en: data.property.nameEn || '',
        address: data.property.address || '',
        phone: data.property.phone || '',
        tax_id: data.property.taxId || '',
        bank_name: data.property.bankName || '',
        bank_account: data.property.bankAccount || '',
        bank_account_name: data.property.bankAccountName || '',
        prompt_pay_id: data.property.promptPayId || '',
        prompt_pay_name: data.property.promptPayName || '',
        line_id: data.property.lineId || '',
        notes: '',
        updated_at: new Date().toISOString(),
      });
    } catch (e: any) {
      console.warn('Property sync warn:', e.message);
    }

    // 2. Utility Config
    try {
      await supabase.from('utility_config').upsert({
        id: 'main_config',
        water_rate: data.utilityConfig.waterRatePerUnit,
        elec_rate: data.utilityConfig.elecRatePerUnit,
        common_fee: data.utilityConfig.commonFeeMonthly,
        internet_fee: data.utilityConfig.internetFeeMonthly,
        parking_fee: data.utilityConfig.parkingFeeMonthly,
        trash_fee: data.utilityConfig.trashFeeMonthly,
        water_calculation_type: data.utilityConfig.waterBillingType,
        due_day_of_month: 5,
        updated_at: new Date().toISOString(),
      });
    } catch (e: any) {
      console.warn('Utility config sync warn:', e.message);
    }

    // 3. Rooms
    if (data.rooms.length > 0) {
      try {
        const roomPayloads = data.rooms.map(r => ({
          id: r.id,
          number: r.number,
          floor: r.floor,
          type: r.type,
          rental_type: 'monthly',
          status: r.status,
          daily_rate: r.dailyRate,
          monthly_rate: r.monthlyRate,
          deposit_monthly: r.depositMonthly,
          current_water_meter: r.currentWaterMeter,
          previous_water_meter: r.previousWaterMeter,
          current_elec_meter: r.currentElecMeter,
          previous_elec_meter: r.previousElecMeter,
          meter_last_updated: r.meterLastUpdated,
          images: r.images,
          amenities: r.amenities,
          current_tenant: r.currentTenant || null,
          updated_at: new Date().toISOString(),
        }));
        const { error } = await supabase.from('rooms').upsert(roomPayloads);
        if (error) throw error;
        savedRooms = data.rooms.length;
      } catch (e: any) {
        errors.push(`Rooms: ${e.message}`);
      }
    }

    // 4. Tenants
    if (data.tenants.length > 0) {
      try {
        const tenantPayloads = data.tenants.map(t => ({
          id: t.id,
          name: t.name,
          phone: t.phone,
          email: t.email || '',
          id_card: t.idCard,
          room_number: t.roomNumber,
          room_id: t.roomId,
          rental_type: t.rentalType || 'monthly',
          start_date: t.startDate,
          end_date: t.endDate || null,
          deposit_amount: t.depositAmount || 0,
          monthly_rent: t.monthlyRent || 0,
          emergency_contact: t.emergencyContact || '',
          emergency_phone: t.emergencyPhone || '',
          status: t.status || 'active',
        }));
        const { error } = await supabase.from('tenants').upsert(tenantPayloads);
        if (error) throw error;
        savedTenants = data.tenants.length;
      } catch (e: any) {
        errors.push(`Tenants: ${e.message}`);
      }
    }

    // 5. Bookings
    if (data.bookings.length > 0) {
      try {
        const bookingPayloads = data.bookings.map(b => ({
          id: b.id,
          booking_code: b.bookingCode,
          room_id: b.roomId,
          room_number: b.roomNumber,
          room_type: b.roomType,
          guest_name: b.guestName,
          phone: b.phone,
          email: b.email,
          rental_type: b.rentalType,
          check_in_date: b.checkInDate,
          check_out_date: b.checkOutDate,
          duration_days: b.durationUnits || 1,
          duration_months: b.durationUnits || 1,
          room_rate_total: b.roomRateTotal,
          deposit: b.deposit,
          total_amount: b.totalAmount,
          payment_status: b.paymentStatus,
          payment_method: b.paymentMethod,
          booking_date: b.createdAt ? b.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
          note: b.specialRequests || '',
        }));
        const { error } = await supabase.from('bookings').upsert(bookingPayloads);
        if (error) throw error;
        savedBookings = data.bookings.length;
      } catch (e: any) {
        errors.push(`Bookings: ${e.message}`);
      }
    }

    // 6. Utility Bills
    if (data.bills.length > 0) {
      try {
        const billPayloads = data.bills.map(b => ({
          id: b.id,
          bill_number: b.billNumber,
          room_id: b.roomId,
          room_number: b.roomNumber,
          tenant_name: b.tenantName,
          tenant_phone: b.tenantPhone,
          month_year: b.monthYear,
          billing_date: b.billingDate,
          due_date: b.dueDate,
          room_rent_amount: b.roomRentAmount,
          prev_water_meter: b.prevWaterMeter,
          curr_water_meter: b.currWaterMeter,
          water_units: b.waterUnits,
          water_rate: b.waterRate,
          water_amount: b.waterAmount,
          prev_elec_meter: b.prevElecMeter,
          curr_elec_meter: b.currElecMeter,
          elec_units: b.elecUnits,
          elec_rate: b.elecRate,
          elec_amount: b.elecAmount,
          common_fee: b.commonFee,
          internet_fee: b.internetFee,
          parking_fee: b.parkingFee,
          trash_fee: b.trashFee,
          other_fees: b.otherFees,
          other_fees_note: b.otherFeesNote,
          subtotal: b.subtotal,
          discount: b.discount,
          grand_total: b.grandTotal,
          payment_status: b.paymentStatus,
          paid_amount: b.paidAmount,
          remaining_balance: b.remainingBalance,
          paid_date: b.paidDate,
          paid_method: b.paidMethod,
          slip_image: b.slipImage,
          attached_contract: b.attachedContract,
        }));
        const { error } = await supabase.from('utility_bills').upsert(billPayloads);
        if (error) throw error;
        savedBills = data.bills.length;
      } catch (e: any) {
        errors.push(`Bills: ${e.message}`);
      }
    }

    // Trigger Realtime Broadcast
    broadcastRealtimeChange(supabase, 'stayflow_live_sync', 'FULL_SYNC', data);

    if (errors.length > 0) {
      return {
        success: false,
        message: `พบข้อผิดพลาดบางส่วน: ${errors.join(', ')}`,
        details: { rooms: savedRooms, tenants: savedTenants, bookings: savedBookings, bills: savedBills },
      };
    }

    return { 
      success: true, 
      message: `บันทึกขึ้น Supabase สำเร็จแล้ว! (ห้องพัก: ${savedRooms} ห้อง, ผู้เช่า: ${savedTenants} คน, รายการจอง: ${savedBookings} รายการ, บิล: ${savedBills} ใบ)`,
      details: { rooms: savedRooms, tenants: savedTenants, bookings: savedBookings, bills: savedBills },
    };
  } catch (err: any) {
    return { success: false, message: `ซิงค์ข้อมูลไม่สำเร็จ: ${err.message}` };
  }
}
