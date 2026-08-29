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
 * Get current Supabase credentials from ENV or localStorage
 */
export function getSupabaseConfig(): SupabaseConfig {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  const storedUrl = localStorage.getItem(STORAGE_KEY_SUPABASE_URL) || '';
  const storedKey = localStorage.getItem(STORAGE_KEY_SUPABASE_KEY) || '';

  return {
    url: storedUrl || envUrl,
    anonKey: storedKey || envKey,
  };
}

/**
 * Save Supabase credentials to localStorage and reset client
 */
export function saveSupabaseConfig(url: string, anonKey: string): void {
  localStorage.setItem(STORAGE_KEY_SUPABASE_URL, url.trim());
  localStorage.setItem(STORAGE_KEY_SUPABASE_KEY, anonKey.trim());
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
-- 🔐 เปิดใช้งาน Row Level Security (RLS) แบบ Public Anon Access
-- เพื่อให้ Web App สามารถอ่าน/เขียนข้อมูลได้ทันที
-- ==========================================
ALTER TABLE public.property_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utility_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utility_bills ENABLE ROW LEVEL SECURITY;

-- สร้าง Policy ให้อนุญาตทุกคนที่ถือ Anon Key อ่าน/เขียนได้
CREATE POLICY "Allow anon read/write property_profile" ON public.property_profile FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read/write utility_config" ON public.utility_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read/write rooms" ON public.rooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read/write tenants" ON public.tenants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read/write bookings" ON public.bookings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read/write utility_bills" ON public.utility_bills FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- ⚡ เปิดใช้งาน Real-Time Replication สำหรับทุกตาราง
-- ==========================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.property_profile;
ALTER PUBLICATION supabase_realtime ADD TABLE public.utility_config;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tenants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.utility_bills;
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
 * Upload all current application data to Supabase
 */
export async function syncAllToSupabase(data: {
  property: PropertyProfile;
  utilityConfig: UtilityRateConfig;
  rooms: Room[];
  tenants: Tenant[];
  bookings: Booking[];
  bills: UtilityBill[];
}): Promise<{ success: boolean; message: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, message: 'ยังไม่ได้ระบุ Supabase URL หรือ Anon Key' };
  }

  try {
    // 1. Property
    await supabase.from('property_profile').upsert({
      id: 'main_property',
      name: data.property.name,
      name_en: data.property.nameEn,
      tagline: data.property.tagline,
      address: data.property.address,
      phone: data.property.phone,
      email: data.property.email,
      tax_id: data.property.taxId,
      bank_name: data.property.bankName,
      bank_account: data.property.bankAccount,
      bank_account_name: data.property.bankAccountName,
      prompt_pay_id: data.property.promptPayId,
      prompt_pay_name: data.property.promptPayName,
      line_id: data.property.lineId,
      wifi_ssid: data.property.wifiSsid,
      wifi_pass: data.property.wifiPass,
      updated_at: new Date().toISOString(),
    });

    // 2. Utility Config
    await supabase.from('utility_config').upsert({
      id: 'main_config',
      water_rate_per_unit: data.utilityConfig.waterRatePerUnit,
      water_billing_type: data.utilityConfig.waterBillingType,
      water_flat_rate: data.utilityConfig.waterFlatRate,
      water_per_person_rate: data.utilityConfig.waterPerPersonRate,
      elec_rate_per_unit: data.utilityConfig.elecRatePerUnit,
      common_fee_monthly: data.utilityConfig.commonFeeMonthly,
      internet_fee_monthly: data.utilityConfig.internetFeeMonthly,
      trash_fee_monthly: data.utilityConfig.trashFeeMonthly,
      parking_fee_monthly: data.utilityConfig.parkingFeeMonthly,
      min_water_charge: data.utilityConfig.minWaterCharge,
      min_elec_charge: data.utilityConfig.minElecCharge,
      updated_at: new Date().toISOString(),
    });

    // 3. Rooms
    if (data.rooms.length > 0) {
      const roomPayloads = data.rooms.map(r => ({
        id: r.id,
        number: r.number,
        floor: r.floor,
        building: r.building,
        type: r.type,
        status: r.status,
        daily_rate: r.dailyRate,
        monthly_rate: r.monthlyRate,
        deposit_monthly: r.depositMonthly,
        size_sqm: r.sizeSqm,
        bed_type: r.bedType,
        max_guests: r.maxGuests,
        description: r.description,
        current_water_meter: r.currentWaterMeter,
        previous_water_meter: r.previousWaterMeter,
        current_elec_meter: r.currentElecMeter,
        previous_elec_meter: r.previousElecMeter,
        meter_last_updated: r.meterLastUpdated,
        images: r.images,
        amenities: r.amenities,
        current_tenant: r.currentTenant,
        updated_at: new Date().toISOString(),
      }));
      await supabase.from('rooms').upsert(roomPayloads);
    }

    // 4. Tenants
    if (data.tenants.length > 0) {
      const tenantPayloads = data.tenants.map(t => ({
        id: t.id,
        name: t.name,
        phone: t.phone,
        email: t.email,
        id_card: t.idCard,
        room_number: t.roomNumber,
        room_id: t.roomId,
        rental_type: t.rentalType,
        start_date: t.startDate,
        end_date: t.endDate,
        deposit_amount: t.depositAmount,
        monthly_rent: t.monthlyRent,
        emergency_contact: t.emergencyContact,
        emergency_phone: t.emergencyPhone,
        id_card_image: t.idCardImage,
        note: t.note,
        status: t.status,
      }));
      await supabase.from('tenants').upsert(tenantPayloads);
    }

    // 5. Bookings
    if (data.bookings.length > 0) {
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
        duration_units: b.durationUnits,
        guests_count: b.guestsCount,
        room_rate_total: b.roomRateTotal,
        deposit: b.deposit,
        cleaning_fee: b.cleaningFee,
        discount: b.discount,
        total_amount: b.totalAmount,
        payment_status: b.paymentStatus,
        payment_method: b.paymentMethod,
        created_at: b.createdAt,
        special_requests: b.specialRequests,
      }));
      await supabase.from('bookings').upsert(bookingPayloads);
    }

    // 6. Bills
    if (data.bills.length > 0) {
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
        updated_at: new Date().toISOString(),
      }));
      await supabase.from('utility_bills').upsert(billPayloads);
    }

    // Also trigger Realtime Broadcast to notify all other online clients
    broadcastRealtimeChange(supabase, 'stayflow_live_sync', 'FULL_SYNC', data);

    return { 
      success: true, 
      message: 'อัปโหลดและซิงค์ข้อมูลขึ้น Supabase Cloud Database สำเร็จแล้ว ทุกเครื่องจะได้รับข้อมูลเดียวกันแบบ Real-Time!' 
    };
  } catch (err: any) {
    return { success: false, message: `ซิงค์ข้อมูลไม่สำเร็จ: ${err.message || 'กรุณาตรวจสอบว่าสร้างตารางใน Supabase แล้วหรือไม่'}` };
  }
}
