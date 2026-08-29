export type RentalType = 'daily' | 'monthly';

export type RoomStatus = 'available' | 'occupied' | 'reserved' | 'cleaning' | 'maintenance';

export type RoomType = 'Standard' | 'Deluxe' | 'Studio' | 'Executive Suite' | 'Family Suite';

export interface Room {
  id: string;
  number: string;
  floor: number;
  building: string;
  type: RoomType;
  status: RoomStatus;
  dailyRate: number;
  monthlyRate: number;
  depositMonthly: number;
  sizeSqm: number;
  bedType: string;
  maxGuests: number;
  images: string[];
  amenities: string[];
  description: string;
  currentTenant?: {
    id: string;
    name: string;
    phone: string;
    rentalType: RentalType;
    startDate: string;
    endDate?: string;
  };
  previousWaterMeter: number;
  currentWaterMeter: number;
  previousElecMeter: number;
  currentElecMeter: number;
  meterLastUpdated?: string;
}

export interface Tenant {
  id: string;
  name: string;
  phone: string;
  email: string;
  idCard: string;
  roomNumber: string;
  roomId: string;
  rentalType: RentalType;
  startDate: string;
  endDate?: string;
  depositAmount: number;
  monthlyRent: number;
  emergencyContact: string;
  emergencyPhone: string;
  idCardImage?: string;
  note?: string;
  status: 'active' | 'checked_out';
}

export interface Booking {
  id: string;
  bookingCode: string;
  guestName: string;
  phone: string;
  email: string;
  roomId: string;
  roomNumber: string;
  roomType: RoomType;
  rentalType: RentalType;
  checkInDate: string;
  checkOutDate: string;
  durationUnits: number; // days or months
  guestsCount: number;
  roomRateTotal: number;
  deposit: number;
  cleaningFee?: number;
  discount?: number;
  totalAmount: number;
  paymentStatus: 'paid' | 'pending' | 'cancelled';
  paymentMethod: 'promptpay' | 'transfer' | 'cash' | 'credit_card';
  createdAt: string;
  specialRequests?: string;
}

export interface UtilityRateConfig {
  waterRatePerUnit: number; // บาท / หน่วย
  waterBillingType: 'unit' | 'flat' | 'per_person';
  waterFlatRate: number; // บาท / เดือน
  waterPerPersonRate: number; // บาท / คน
  elecRatePerUnit: number; // บาท / หน่วย
  commonFeeMonthly: number; // ค่าส่วนกลาง บาท/เดือน
  internetFeeMonthly: number; // ค่าอินเทอร์เน็ต บาท/เดือน
  trashFeeMonthly: number; // ค่าเก็บขยะ บาท/เดือน
  parkingFeeMonthly: number; // ค่าจอดรถยนต์ บาท/เดือน
  minWaterCharge: number; // ขั้นต่ำค่าน้ำ
  minElecCharge: number; // ขั้นต่ำค่าไฟ
}

export interface PaymentRecord {
  id: string;
  amount: number;
  date: string;
  method: string;
  slipImage?: string;
  slipReference?: string;
  note?: string;
  recordedAt?: string;
}

export interface LeaseContract {
  id: string;
  contractNumber: string;
  contractDate: string; // วันที่ทำสัญญา
  contractPlace?: string; // สถานที่ทำสัญญา
  
  // ผู้ให้เช่า (Lessor)
  lessorName: string;
  lessorIdCard?: string;
  lessorPhone: string;
  lessorAddress: string;
  
  // ผู้เช่า (Lessee)
  lesseeName: string;
  lesseeIdCard: string;
  lesseePhone: string;
  lesseeAddress?: string;
  lesseeEmergencyContact?: string;
  lesseeEmergencyPhone?: string;
  
  // ข้อมูลห้องพัก (Room details)
  roomId: string;
  roomNumber: string;
  roomType?: string;
  buildingName?: string;
  
  // ระยะเวลาและเงื่อนไขการเงิน (Duration & Financials)
  startDate: string;
  endDate?: string;
  durationMonths: number;
  monthlyRent: number;
  depositAmount: number;
  advanceRentAmount: number;
  paymentDueDay: number; // วันที่กำหนดชำระของทุกเดือน เช่น วันที่ 5
  
  // ค่าน้ำ-ค่าไฟ-ค่าบริการ (Utility Rates)
  waterRateText?: string;
  elecRateText?: string;
  commonFeeMonthly?: number;
  otherFeesText?: string;
  
  // ข้อกำหนดและระเบียบการพักอาศัย (Rules & Clauses)
  rulesAndClauses: string[];
  specialConditions?: string;
  
  // ลายมือชื่อ (Signatures)
  lessorSignatureName?: string;
  lesseeSignatureName?: string;
  witnessName1?: string;
  witnessName2?: string;
  
  createdAt: string;
  updatedAt?: string;
  status: 'active' | 'expired' | 'terminated';
}

export interface UtilityBill {
  id: string;
  billNumber: string;
  roomId: string;
  roomNumber: string;
  tenantName: string;
  tenantPhone?: string;
  monthYear: string; // e.g. "2026-08" (สิงหาคม 2569)
  billingDate: string;
  dueDate: string;
  
  // Water
  prevWaterMeter: number;
  currWaterMeter: number;
  waterUnits: number;
  waterRate: number;
  waterAmount: number;
  
  // Electricity
  prevElecMeter: number;
  currElecMeter: number;
  elecUnits: number;
  elecRate: number;
  elecAmount: number;
  
  // Rent & Other
  roomRentAmount: number;
  commonFee: number;
  internetFee: number;
  parkingFee: number;
  trashFee: number;
  otherFees: number;
  otherFeesNote?: string;
  discount: number;
  
  // Total
  subtotal: number;
  grandTotal: number;
  
  paymentStatus: 'paid' | 'unpaid' | 'overdue' | 'partial';
  paidAmount?: number; // ยอดเงินที่รับชำระแล้ว (บาท)
  remainingBalance?: number; // ยอดคงค้างชำระ (บาท)
  paidDate?: string;
  paidMethod?: string;
  slipImage?: string; // Base64 or Image URL of payment slip
  slipDate?: string;
  slipReference?: string;
  paymentRecords?: PaymentRecord[]; // ประวัติรายการรับเงิน
  attachedContract?: LeaseContract; // สัญญาเช่าที่แนบไว้ในบิลนี้
  note?: string;
}

export interface PropertyProfile {
  name: string;
  nameEn: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  taxId: string;
  promptPayId: string;
  promptPayName: string;
  bankName: string;
  bankAccount: string;
  bankAccountName: string;
  lineId: string;
  wifiSsid: string;
  wifiPass: string;
}
