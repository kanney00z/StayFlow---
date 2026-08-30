import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, Building2, CreditCard, Droplets, Zap, 
  Wifi, Phone, Mail, Save, CheckCircle2, QrCode, Shield,
  Trash2, AlertTriangle, RotateCcw, Database, RefreshCw, Loader2
} from 'lucide-react';
import { PropertyProfile, UtilityRateConfig, Room, Tenant, Booking, UtilityBill } from '../../types';
import { SupabaseSettingsSection } from './SupabaseSettingsSection';

interface AdminSettingsProps {
  property: PropertyProfile;
  utilityConfig: UtilityRateConfig;
  rooms?: Room[];
  tenants?: Tenant[];
  bookings?: Booking[];
  bills?: UtilityBill[];
  onUpdateProperty: (newProp: PropertyProfile) => void | Promise<any>;
  onUpdateUtilityConfig: (newConfig: UtilityRateConfig) => void | Promise<any>;
  onClearBookings?: () => void;
  onClearBills?: () => void;
  onResetMeters?: () => void;
  onResetDemoData?: () => void;
  onDataSyncedFromCloud?: (data: {
    property?: PropertyProfile;
    utilityConfig?: UtilityRateConfig;
    rooms?: Room[];
    tenants?: Tenant[];
    bookings?: Booking[];
    bills?: UtilityBill[];
  }) => void;
  isRealtimeConnected?: boolean;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({
  property,
  utilityConfig,
  rooms = [],
  tenants = [],
  bookings = [],
  bills = [],
  onUpdateProperty,
  onUpdateUtilityConfig,
  onClearBookings,
  onClearBills,
  onResetMeters,
  onResetDemoData,
  onDataSyncedFromCloud,
  isRealtimeConnected = false,
}) => {
  const [propForm, setPropForm] = useState<PropertyProfile>(property);
  const [utilForm, setUtilForm] = useState<UtilityRateConfig>(utilityConfig);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'bookings' | 'bills' | 'meters' | 'all';
    title: string;
    description: string;
  } | null>(null);

  // Synchronize internal form when props change (only if not currently saving)
  useEffect(() => {
    if (!isSaving) {
      setPropForm(property);
    }
  }, [property, isSaving]);

  useEffect(() => {
    if (!isSaving) {
      setUtilForm(utilityConfig);
    }
  }, [utilityConfig, isSaving]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    // Ensure all numeric fields are cleanly formatted
    const cleanUtil: UtilityRateConfig = {
      ...utilForm,
      waterRatePerUnit: Number(utilForm.waterRatePerUnit) || 0,
      elecRatePerUnit: Number(utilForm.elecRatePerUnit) || 0,
      commonFeeMonthly: Number(utilForm.commonFeeMonthly) || 0,
      internetFeeMonthly: Number(utilForm.internetFeeMonthly) || 0,
      parkingFeeMonthly: Number(utilForm.parkingFeeMonthly) || 0,
      trashFeeMonthly: Number(utilForm.trashFeeMonthly) || 0,
      minWaterCharge: Number(utilForm.minWaterCharge) || 0,
      minElecCharge: Number(utilForm.minElecCharge) || 0,
      waterFlatRate: Number(utilForm.waterFlatRate) || 0,
      waterPerPersonRate: Number(utilForm.waterPerPersonRate) || 0,
    };

    try {
      await onUpdateProperty(propForm);
      await onUpdateUtilityConfig(cleanUtil);
      setUtilForm(cleanUtil);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecuteClear = () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'bookings' && onClearBookings) {
      onClearBookings();
    } else if (confirmAction.type === 'bills' && onClearBills) {
      onClearBills();
    } else if (confirmAction.type === 'meters' && onResetMeters) {
      onResetMeters();
    } else if (confirmAction.type === 'all' && onResetDemoData) {
      onResetDemoData();
    }
    setConfirmAction(null);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-5xl mx-auto">
      {/* Toast */}
      <AnimatePresence>
        {savedSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-emerald-500"
          >
            <CheckCircle2 className="w-5 h-5 text-white" />
            <span className="font-semibold text-sm">บันทึกการตั้งค่าระบบเรียบร้อยแล้ว</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl md:rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-indigo-600" />
            <span>ตั้งค่าระบบ & อัตราค่าน้ำค่าไฟ</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            กำหนดชื่อที่พัก ข้อมูลภาษี บัญชีธนาคาร พร้อมเพย์สำหรับรับเงิน และอัตราค่าน้ำ-ค่าไฟต่อหน่วย
          </p>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-75 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-indigo-100 transition-all cursor-pointer"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 1: Utility Unit Rates */}
        <div className="bg-white border border-slate-200 rounded-2xl md:rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Zap className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-slate-900">อัตราค่าบริการสาธารณูปโภคต่อหน่วย</h3>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="text-sky-700 font-semibold block mb-1 flex items-center gap-1.5">
                <Droplets className="w-3.5 h-3.5 text-sky-600" />
                <span>อัตราค่าน้ำประปา (บาท / หน่วย)</span>
              </label>
              <input
                type="number"
                value={utilForm.waterRatePerUnit}
                onChange={(e) => setUtilForm({ ...utilForm, waterRatePerUnit: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-mono text-sm focus:bg-white focus:border-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="text-amber-700 font-semibold block mb-1 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>อัตราค่าไฟฟ้า (บาท / หน่วย)</span>
              </label>
              <input
                type="number"
                value={utilForm.elecRatePerUnit}
                onChange={(e) => setUtilForm({ ...utilForm, elecRatePerUnit: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-mono text-sm focus:bg-white focus:border-indigo-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-700 font-semibold block mb-1">
                  ค่าส่วนกลาง (บาท/เดือน)
                </label>
                <input
                  type="number"
                  value={utilForm.commonFeeMonthly}
                  onChange={(e) => setUtilForm({ ...utilForm, commonFeeMonthly: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:bg-white focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">
                  ค่าอินเทอร์เน็ต (บาท/เดือน)
                </label>
                <input
                  type="number"
                  value={utilForm.internetFeeMonthly}
                  onChange={(e) => setUtilForm({ ...utilForm, internetFeeMonthly: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:bg-white focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-700 font-semibold block mb-1">
                  ค่าจอดรถยนต์ (บาท/เดือน)
                </label>
                <input
                  type="number"
                  value={utilForm.parkingFeeMonthly}
                  onChange={(e) => setUtilForm({ ...utilForm, parkingFeeMonthly: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:bg-white focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">
                  ค่าขยะ (บาท/เดือน)
                </label>
                <input
                  type="number"
                  value={utilForm.trashFeeMonthly}
                  onChange={(e) => setUtilForm({ ...utilForm, trashFeeMonthly: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:bg-white focus:border-indigo-500 outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: PromptPay & Bank Accounts */}
        <div className="bg-white border border-slate-200 rounded-2xl md:rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">บัญชีรับเงิน & พร้อมเพย์ (PromptPay)</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-700 font-semibold block mb-1">
                หมายเลขพร้อมเพย์ (PromptPay ID - เบอร์โทร/เลขบัตร/Tax ID)
              </label>
              <input
                type="text"
                value={propForm.promptPayId}
                onChange={(e) => setPropForm({ ...propForm, promptPayId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:bg-white focus:border-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="text-slate-700 font-semibold block mb-1">
                ชื่อบัญชีพร้อมเพย์ (PromptPay Name)
              </label>
              <input
                type="text"
                value={propForm.promptPayName}
                onChange={(e) => setPropForm({ ...propForm, promptPayName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-700 font-semibold block mb-1">
                  ชื่อธนาคาร
                </label>
                <input
                  type="text"
                  value={propForm.bankName}
                  onChange={(e) => setPropForm({ ...propForm, bankName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">
                  เลขที่บัญชีธนาคาร
                </label>
                <input
                  type="text"
                  value={propForm.bankAccount}
                  onChange={(e) => setPropForm({ ...propForm, bankAccount: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:bg-white focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-700 font-semibold block mb-1">
                LINE Official ID สำหรับรับสลิปแจ้งโอน
              </label>
              <input
                type="text"
                value={propForm.lineId}
                onChange={(e) => setPropForm({ ...propForm, lineId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-indigo-600 font-mono font-bold focus:bg-white focus:border-indigo-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Property Details */}
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl md:rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">ข้อมูลหอพัก / โรงแรมสำหรับออกใบเสร็จ</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-slate-700 font-semibold block mb-1">
                ชื่อที่พัก (ภาษาไทย) *
              </label>
              <input
                type="text"
                value={propForm.name}
                onChange={(e) => setPropForm({ ...propForm, name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="text-slate-700 font-semibold block mb-1">
                ชื่อที่พัก (ภาษาอังกฤษ)
              </label>
              <input
                type="text"
                value={propForm.nameEn}
                onChange={(e) => setPropForm({ ...propForm, nameEn: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-slate-700 font-semibold block mb-1">
                ที่อยู่เต็ม (Address)
              </label>
              <input
                type="text"
                value={propForm.address}
                onChange={(e) => setPropForm({ ...propForm, address: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="text-slate-700 font-semibold block mb-1">
                เบอร์โทรศัพท์ติดต่อ
              </label>
              <input
                type="text"
                value={propForm.phone}
                onChange={(e) => setPropForm({ ...propForm, phone: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="text-slate-700 font-semibold block mb-1">
                เลขประจำตัวผู้เสียภาษี (Tax ID)
              </label>
              <input
                type="text"
                value={propForm.taxId}
                onChange={(e) => setPropForm({ ...propForm, taxId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:bg-white focus:border-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="text-slate-700 font-semibold block mb-1">
                ชื่อ Wi-Fi ประจำที่พัก
              </label>
              <input
                type="text"
                value={propForm.wifiSsid}
                onChange={(e) => setPropForm({ ...propForm, wifiSsid: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="text-slate-700 font-semibold block mb-1">
                รหัสผ่าน Wi-Fi (Wi-Fi Password)
              </label>
              <input
                type="text"
                value={propForm.wifiPass}
                onChange={(e) => setPropForm({ ...propForm, wifiPass: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:bg-white focus:border-indigo-500 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Supabase Cloud Database & Real-Time Sync */}
      <SupabaseSettingsSection
        property={property}
        utilityConfig={utilityConfig}
        rooms={rooms}
        tenants={tenants}
        bookings={bookings}
        bills={bills}
        onDataSyncedFromCloud={onDataSyncedFromCloud}
        isRealtimeConnected={isRealtimeConnected}
      />

      {/* Section 4: System Data Management & Cleanup (เคลียร์และล้างข้อมูลระบบ) */}
      <div className="bg-white border border-rose-100 rounded-2xl md:rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-rose-100 pb-3">
          <Database className="w-5 h-5 text-rose-600" />
          <div>
            <h3 className="text-base font-bold text-slate-900">จัดการเคลียร์และล้างข้อมูลระบบ (Data Cleanup & Reset)</h3>
            <p className="text-xs text-slate-500">
              ฟังก์ชันสำหรับล้างประวัติการจอง ล้างบิลค่าน้ำค่าไฟ รีเซ็ตมิเตอร์ หรือคืนค่าข้อมูลเริ่มต้น
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {/* Action 1: Clear Bookings */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col justify-between space-y-3">
            <div>
              <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>ล้างประวัติการจองทั้งหมด</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                ลบประวัติการจองและเช็คอินทั้งหมด เพื่อเริ่มบันทึกใหม่
              </p>
            </div>
            <button
              type="button"
              onClick={() => setConfirmAction({
                type: 'bookings',
                title: 'ยืนยันล้างประวัติการจองทั้งหมด?',
                description: 'ระบบจะลบข้อมูลรายการจองห้องพักทั้งหมดในฐานข้อมูล'
              })}
              className="w-full py-2 px-3 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-center"
            >
              ล้างรายการจอง
            </button>
          </div>

          {/* Action 2: Clear Bills */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col justify-between space-y-3">
            <div>
              <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>ล้างใบแจ้งหนี้ค่าน้ำค่าไฟ</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                ลบประวัติการออกใบแจ้งหนี้และบิลค่าเช่าทั้งหมด
              </p>
            </div>
            <button
              type="button"
              onClick={() => setConfirmAction({
                type: 'bills',
                title: 'ยืนยันล้างใบแจ้งหนี้ทั้งหมด?',
                description: 'ระบบจะลบประวัติบิลค่าน้ำค่าไฟและใบแจ้งหนี้ทั้งหมด'
              })}
              className="w-full py-2 px-3 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-center"
            >
              ล้างใบแจ้งหนี้
            </button>
          </div>

          {/* Action 3: Reset Meters */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col justify-between space-y-3">
            <div>
              <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                <span>รีเซ็ตเลขมิเตอร์ทุกห้อง</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                รีเซ็ตเลขมิเตอร์น้ำและไฟทุกห้องกลับเป็น 0 เพื่อเริ่มจดรอบใหม่
              </p>
            </div>
            <button
              type="button"
              onClick={() => setConfirmAction({
                type: 'meters',
                title: 'ยืนยันรีเซ็ตเลขมิเตอร์ทุกห้อง?',
                description: 'เลขมิเตอร์น้ำและไฟทุกห้องจะถูกปรับเป็น 0 หน่วย'
              })}
              className="w-full py-2 px-3 bg-white hover:bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-center"
            >
              รีเซ็ตเลขมิเตอร์
            </button>
          </div>

          {/* Action 4: Reset Demo Data */}
          <div className="p-4 bg-rose-50/50 border border-rose-200 rounded-2xl flex flex-col justify-between space-y-3">
            <div>
              <div className="font-bold text-xs text-rose-900 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-rose-600" />
                <span>คืนค่าข้อมูลตัวอย่างเริ่มต้น</span>
              </div>
              <p className="text-[11px] text-rose-700 mt-1">
                รีเซ็ตข้อมูลทั้งหมดกลับเป็นค่าเริ่มต้นมาตรฐาน (Demo Data)
              </p>
            </div>
            <button
              type="button"
              onClick={() => setConfirmAction({
                type: 'all',
                title: 'ยืนยันรีเซ็ตข้อมูลระบบกลับเป็นค่าเริ่มต้น?',
                description: 'ข้อมูลห้องพัก รายการจอง ผู้เช่า และบิลทั้งหมดจะถูกรีเซ็ตกลับเป็นชุดข้อมูลสาธิตเริ่มต้น'
              })}
              className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer text-center"
            >
              รีเซ็ตระบบทั้งหมด
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-900"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-lg font-bold text-slate-900">
                  {confirmAction.title}
                </h3>
                <p className="text-xs text-slate-500">
                  {confirmAction.description}
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmAction(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleExecuteClear}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-rose-100 transition-colors cursor-pointer"
                >
                  ยืนยันดำเนินการ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </form>
  );
};
