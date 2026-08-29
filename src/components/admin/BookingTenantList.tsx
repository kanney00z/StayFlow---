import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, CalendarCheck, BedDouble, Plus, Search, 
  Phone, Mail, CheckCircle2, XCircle, Clock, 
  ArrowRight, ShieldCheck, FileText, DollarSign, LogOut, Check,
  Trash2, AlertTriangle, Sparkles, RefreshCw, Scale, X
} from 'lucide-react';
import { Booking, Tenant, Room, RentalType, PropertyProfile, UtilityBill, LeaseContract } from '../../types';
import { formatCurrency, formatDateThai, addMonthsToDate, addDaysToDate, isRoomAvailableForDates } from '../../utils/formatters';
import { LeaseContractSection } from './LeaseContractSection';

interface BookingTenantListProps {
  bookings: Booking[];
  tenants: Tenant[];
  rooms: Room[];
  property?: PropertyProfile;
  bills?: UtilityBill[];
  onAddBooking: (booking: Booking) => void;
  onCheckOutTenant: (tenantId: string, roomId: string) => void;
  onUpdateBookingStatus: (bookingId: string, status: 'paid' | 'pending' | 'cancelled') => void;
  onDeleteBooking: (bookingId: string) => void;
  onClearBookings: (mode: 'all' | 'paid_cancelled') => void;
  onDeleteTenant?: (tenantId: string, roomId: string) => void;
  onOpenInvoiceModal?: (bill: UtilityBill) => void;
  onUpdateBillContract?: (billId: string, contract: LeaseContract) => void;
}

export const BookingTenantList: React.FC<BookingTenantListProps> = ({
  bookings,
  tenants,
  rooms,
  property,
  bills = [],
  onAddBooking,
  onCheckOutTenant,
  onUpdateBookingStatus,
  onDeleteBooking,
  onClearBookings,
  onDeleteTenant,
  onOpenInvoiceModal,
  onUpdateBillContract,
}) => {
  const [activeTab, setActiveTab] = useState<'bookings' | 'tenants'>('bookings');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState<Booking | null>(null);
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
  const [tenantForContract, setTenantForContract] = useState<Tenant | null>(null);
  const [showClearModal, setShowClearModal] = useState(false);

  // New Booking / Check-in form state
  const [formData, setFormData] = useState({
    guestName: '',
    phone: '',
    email: '',
    roomId: rooms[0]?.id || '',
    rentalType: 'daily' as RentalType,
    checkInDate: new Date().toISOString().split('T')[0],
    checkOutDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    durationUnits: 2,
    guestsCount: 2,
    deposit: 1000,
    specialRequests: '',
    paymentMethod: 'promptpay' as const,
  });

  const selectedRoom = (rooms && rooms.length > 0)
    ? (rooms.find(r => r.id === formData.roomId) || rooms[0])
    : null;

  const calculateTotal = () => {
    if (!selectedRoom) return 0;
    if (formData.rentalType === 'daily') {
      const roomTotal = (selectedRoom.dailyRate || 0) * (formData.durationUnits || 1);
      return roomTotal + (formData.deposit || 0);
    } else {
      const roomTotal = selectedRoom.monthlyRate || 0;
      return roomTotal + (selectedRoom.depositMonthly || 0);
    }
  };

  const handleCreateBooking = () => {
    if (!formData.guestName || !selectedRoom) return;

    const total = calculateTotal();
    const newBooking: Booking = {
      id: `book-${Date.now()}`,
      bookingCode: `STAY-${new Date().getFullYear().toString().slice(2)}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`,
      guestName: formData.guestName,
      phone: formData.phone,
      email: formData.email,
      roomId: selectedRoom.id,
      roomNumber: selectedRoom.number,
      roomType: selectedRoom.type,
      rentalType: formData.rentalType,
      checkInDate: formData.checkInDate,
      checkOutDate: formData.checkOutDate,
      durationUnits: Number(formData.durationUnits) || 1,
      guestsCount: Number(formData.guestsCount) || 1,
      roomRateTotal: formData.rentalType === 'daily' 
        ? (selectedRoom.dailyRate || 0) * (formData.durationUnits || 1)
        : (selectedRoom.monthlyRate || 0),
      deposit: formData.rentalType === 'daily' ? formData.deposit : (selectedRoom.depositMonthly || 0),
      totalAmount: total,
      paymentStatus: 'paid',
      paymentMethod: formData.paymentMethod,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      specialRequests: formData.specialRequests,
    };

    onAddBooking(newBooking);
    setShowNewModal(false);
  };

  const filteredBookings = bookings.filter((b) => {
    if (filterType !== 'all' && b.rentalType !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return b.guestName.toLowerCase().includes(q) || b.roomNumber.includes(q) || b.bookingCode.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="bg-white border border-slate-200 rounded-2xl md:rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            <span>ประวัติการจอง & ทะเบียนผู้เช่า</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            จัดการรายการจองห้องพักรายวัน สัญญาเช่ารายเดือน และบันทึกการเช็คอิน-เช็คเอาท์
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {bookings.length > 0 && (
            <button
              type="button"
              onClick={() => setShowClearModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer"
              title="ล้างหรือเคลียร์ข้อมูลรายการจอง"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>ล้างรายการจอง</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-indigo-100 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>บันทึกการจอง / เช็คอินใหม่</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs & Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl md:rounded-3xl p-4 shadow-sm flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('bookings')}
            className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'bookings'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            <span>รายการจองทั้งหมด ({bookings.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tenants')}
            className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'tenants'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>สัญญาผู้เช่ารายเดือน ({tenants.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อผู้เข้าพัก หรือเลขห้อง..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-indigo-500"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none focus:bg-white focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">ทุกรูปแบบ (รายวัน/รายเดือน)</option>
            <option value="daily">รายวัน (Daily)</option>
            <option value="monthly">รายเดือน (Monthly)</option>
          </select>
        </div>
      </div>

      {/* Tab 1: Bookings List */}
      {activeTab === 'bookings' && (
        <div className="bg-white border border-slate-200 rounded-2xl md:rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 font-semibold">รหัสการจอง / ผู้เข้าพัก</th>
                  <th className="py-3.5 px-3 font-semibold">ห้องพัก</th>
                  <th className="py-3.5 px-3 font-semibold">ประเภท</th>
                  <th className="py-3.5 px-3 font-semibold">วันที่เข้าพัก - ออก</th>
                  <th className="py-3.5 px-3 font-semibold text-right">ยอดรวม</th>
                  <th className="py-3.5 px-3 font-semibold text-center">สถานะชำระ</th>
                  <th className="py-3.5 px-4 font-semibold text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-mono text-[11px] font-bold text-slate-400">{b.bookingCode}</span>
                        <div className="font-bold text-sm text-slate-900">{b.guestName}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{b.phone}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 font-mono font-bold text-slate-800 flex items-center justify-center text-xs">
                          {b.roomNumber}
                        </span>
                        <div>
                          <span className="font-semibold text-slate-800">{b.roomType}</span>
                          <span className="block text-[10px] text-slate-500">{b.guestsCount} ท่าน</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        b.rentalType === 'daily'
                          ? 'bg-sky-50 text-sky-700 border border-sky-200'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}>
                        {b.rentalType === 'daily' ? 'รายวัน' : 'รายเดือน'}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-800">
                        {formatDateThai(b.checkInDate)} - {formatDateThai(b.checkOutDate)}
                      </div>
                      <span className="text-[11px] text-slate-500">
                        ({b.durationUnits} {b.rentalType === 'daily' ? 'คืน' : 'เดือน'})
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="font-mono font-bold text-slate-900 text-sm">
                        {formatCurrency(b.totalAmount)}
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {b.paymentMethod === 'promptpay' ? 'พร้อมเพย์' : 'โอนเงิน'}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        b.paymentStatus === 'paid'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {b.paymentStatus === 'paid' ? 'ชำระแล้ว' : 'รอชำระ'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onUpdateBookingStatus(b.id, b.paymentStatus === 'paid' ? 'pending' : 'paid')}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                        >
                          {b.paymentStatus === 'paid' ? 'ตั้งเป็นรอชำระ' : 'ยืนยันจ่าย'}
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setBookingToDelete(b)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                          title="ลบรายการจองนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Monthly Tenants List */}
      {activeTab === 'tenants' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tenants.map((t) => (
            <div
              key={t.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-mono font-bold text-indigo-700 text-sm">
                    {t.roomNumber}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{t.name}</h3>
                    <p className="text-xs text-slate-500 font-mono">ห้อง {t.roomNumber}</p>
                  </div>
                </div>

                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold">
                  สัญญาใช้งานอยู่
                </span>
              </div>

              <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>โทรศัพท์:</span>
                  <span className="font-mono text-slate-900">{t.phone}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>ค่าเช่ารายเดือน:</span>
                  <span className="font-mono font-bold text-slate-900">{formatCurrency(t.monthlyRent)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>เงินประกันห้อง:</span>
                  <span className="font-mono text-slate-900">{formatCurrency(t.depositAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>วันเริ่มสัญญา:</span>
                  <span className="text-slate-800">{formatDateThai(t.startDate)}</span>
                </div>
              </div>

              {t.note && (
                <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-200">
                  📝 {t.note}
                </p>
              )}

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTenantForContract(t)}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    title="เปิดดูและแก้ไขหนังสือสัญญาเช่าห้องพัก"
                  >
                    <Scale className="w-3.5 h-3.5" />
                    <span>สัญญาเช่า</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTenantToDelete(t)}
                    className="p-1.5 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-xl text-xs transition-colors cursor-pointer"
                    title="ลบข้อมูลผู้เช่าออกจากระบบ"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onCheckOutTenant(t.id, t.roomId)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>คืนห้อง / เช็คเอาท์</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Booking / Check-in Modal */}
      <AnimatePresence>
        {showNewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-slate-900"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-indigo-600" />
                  <span>บันทึกการจองห้องพัก & เช็คอิน</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-xs">
                {/* Rental Type Selector */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const dur = 2;
                      const out = addDaysToDate(formData.checkInDate, dur);
                      setFormData({ ...formData, rentalType: 'daily', durationUnits: dur, checkOutDate: out, deposit: 1000 });
                    }}
                    className={`p-3 rounded-2xl border text-center font-bold transition-all cursor-pointer ${
                      formData.rentalType === 'daily'
                        ? 'bg-sky-50 text-sky-800 border-sky-300 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    🛎️ จองแบบรายวัน (Daily)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const dur = 6;
                      const out = addMonthsToDate(formData.checkInDate, dur);
                      setFormData({ ...formData, rentalType: 'monthly', durationUnits: dur, checkOutDate: out, deposit: selectedRoom?.depositMonthly || 9000 });
                    }}
                    className={`p-3 rounded-2xl border text-center font-bold transition-all cursor-pointer ${
                      formData.rentalType === 'monthly'
                        ? 'bg-indigo-50 text-indigo-800 border-indigo-300 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    🏢 ทำสัญญาเช่ารายเดือน (Monthly)
                  </button>
                </div>

                {/* Guest Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-600 block mb-1">ชื่อผู้เข้าพัก / ผู้ทำสัญญา *</label>
                    <input
                      type="text"
                      placeholder="เช่น คุณสมชาย มั่งคั่ง"
                      value={formData.guestName}
                      onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 block mb-1">เบอร์โทรศัพท์ติดต่อ *</label>
                    <input
                      type="tel"
                      placeholder="08X-XXX-XXXX"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:bg-white focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>

                {/* Room Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-600 block mb-1">เลือกห้องพัก</label>
                    {rooms.length === 0 ? (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl">
                        ยังไม่มีห้องพักในระบบ กรุณาเพิ่มห้องพักก่อน
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <select
                          value={formData.roomId || rooms[0]?.id}
                          onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:bg-white focus:border-indigo-500 outline-none cursor-pointer"
                        >
                          {rooms.map((r) => {
                            const availCheck = isRoomAvailableForDates(
                              r,
                              formData.rentalType,
                              formData.checkInDate,
                              formData.checkOutDate,
                              formData.durationUnits,
                              bookings
                            );
                            return (
                              <option key={r.id} value={r.id}>
                                ห้อง {r.number} ({r.type}) — {availCheck.available ? '🟢 ว่างพร้อมจอง' : `🔴 ${availCheck.reason || 'ไม่ว่าง'}`}
                              </option>
                            );
                          })}
                        </select>
                        {selectedRoom && !isRoomAvailableForDates(selectedRoom, formData.rentalType, formData.checkInDate, formData.checkOutDate, formData.durationUnits, bookings).available && (
                          <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>
                              ห้องนี้ {isRoomAvailableForDates(selectedRoom, formData.rentalType, formData.checkInDate, formData.checkOutDate, formData.durationUnits, bookings).reason || 'ไม่ว่างในช่วงเวลาดังกล่าว'}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-slate-600 block mb-1">จำนวนผู้เข้าพัก (ท่าน)</label>
                    <input
                      type="number"
                      value={formData.guestsCount}
                      onChange={(e) => setFormData({ ...formData, guestsCount: parseInt(e.target.value) || 1 })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:bg-white focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>

                {/* Dates & Duration */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-slate-600 block mb-1">วันเข้าพัก (Check-in)</label>
                    <input
                      type="date"
                      value={formData.checkInDate}
                      onChange={(e) => {
                        const newIn = e.target.value;
                        const newOut = formData.rentalType === 'monthly'
                          ? addMonthsToDate(newIn, formData.durationUnits)
                          : addDaysToDate(newIn, formData.durationUnits);
                        setFormData({ ...formData, checkInDate: newIn, checkOutDate: newOut });
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 focus:bg-white focus:border-indigo-500 outline-none cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 block mb-1">วันออก (Check-out)</label>
                    <input
                      type="date"
                      value={formData.checkOutDate}
                      onChange={(e) => {
                        const newOut = e.target.value;
                        if (formData.rentalType === 'daily') {
                          const diff = Math.ceil((new Date(newOut).getTime() - new Date(formData.checkInDate).getTime()) / (1000 * 60 * 60 * 24));
                          setFormData({ ...formData, checkOutDate: newOut, durationUnits: diff > 0 ? diff : 1 });
                        } else {
                          setFormData({ ...formData, checkOutDate: newOut });
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 focus:bg-white focus:border-indigo-500 outline-none cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 block mb-1">
                      {formData.rentalType === 'daily' ? 'จำนวนคืน' : 'สัญญา (เดือน)'}
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={formData.durationUnits}
                      onChange={(e) => {
                        const dur = Math.max(1, parseInt(e.target.value) || 1);
                        const newOut = formData.rentalType === 'monthly'
                          ? addMonthsToDate(formData.checkInDate, dur)
                          : addDaysToDate(formData.checkInDate, dur);
                        setFormData({ ...formData, durationUnits: dur, checkOutDate: newOut });
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 font-mono focus:bg-white focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>

                {/* Price summary box */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex justify-between text-slate-600">
                    <span>
                      ค่าห้อง ({formData.durationUnits} {formData.rentalType === 'daily' ? 'คืน' : 'เดือน'}):
                    </span>
                    <span className="font-mono font-semibold text-slate-900">
                      {formatCurrency(
                        selectedRoom
                          ? (formData.rentalType === 'daily'
                              ? (selectedRoom.dailyRate || 0) * (formData.durationUnits || 1)
                              : (selectedRoom.monthlyRate || 0))
                          : 0
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>เงินประกันความเสียหาย:</span>
                    <span className="font-mono text-slate-800">
                      {formatCurrency(formData.deposit)}
                    </span>
                  </div>
                  <div className="border-t border-slate-200 pt-2 flex justify-between items-baseline font-bold">
                    <span className="text-slate-800">ยอดชำระวันเช็คอิน:</span>
                    <span className="text-lg font-extrabold text-indigo-600 font-mono">
                      {formatCurrency(calculateTotal())}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleCreateBooking}
                  disabled={!formData.guestName}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl text-xs shadow-md shadow-indigo-100 cursor-pointer"
                >
                  ยืนยันบันทึกการจอง
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Single Booking Confirmation Modal */}
      <AnimatePresence>
        {bookingToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-900"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-lg font-bold text-slate-900">
                  ยืนยันการลบรายการจอง?
                </h3>
                <p className="text-xs text-slate-500">
                  คุณกำลังจะลบรายการจองรหัส <strong className="font-mono text-slate-800">{bookingToDelete.bookingCode}</strong>
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-xs space-y-2 text-slate-600">
                <div className="flex justify-between">
                  <span>ผู้เข้าพัก:</span>
                  <span className="font-bold text-slate-900">{bookingToDelete.guestName}</span>
                </div>
                <div className="flex justify-between">
                  <span>ห้องพัก:</span>
                  <span className="font-bold text-indigo-700">ห้อง {bookingToDelete.roomNumber} ({bookingToDelete.roomType})</span>
                </div>
                <div className="flex justify-between">
                  <span>ยอดเงิน:</span>
                  <span className="font-mono font-bold text-slate-900">{formatCurrency(bookingToDelete.totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>สถานะการชำระ:</span>
                  <span className="font-semibold text-slate-800">
                    {bookingToDelete.paymentStatus === 'paid' ? 'ชำระเงินแล้ว' : 'รอชำระเงิน'}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setBookingToDelete(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteBooking(bookingToDelete.id);
                    setBookingToDelete(null);
                  }}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-rose-100 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>ลบรายการนี้</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Clear Bookings Modal */}
      <AnimatePresence>
        {showClearModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-900"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-lg font-bold text-slate-900">
                  จัดการเคลียร์และล้างรายการจอง
                </h3>
                <p className="text-xs text-slate-500">
                  เลือกรูปแบบการล้างข้อมูลรายการจองห้องพักในระบบ
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onClearBookings('paid_cancelled');
                    setShowClearModal(false);
                  }}
                  className="w-full p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-indigo-300 rounded-2xl text-left transition-all cursor-pointer flex items-start gap-3"
                >
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-900">ล้างเฉพาะรายการที่เสร็จสิ้นแล้ว</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      ลบเฉพาะรายการจองที่สถานะ "ชำระแล้ว" หรือ "ยกเลิกแล้ว" เก็บเฉพาะรายการรอเช็คอิน
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClearBookings('all');
                    setShowClearModal(false);
                  }}
                  className="w-full p-3.5 bg-rose-50/50 hover:bg-rose-50 border border-rose-200 rounded-2xl text-left transition-all cursor-pointer flex items-start gap-3"
                >
                  <div className="p-2 bg-rose-100 text-rose-600 rounded-xl mt-0.5">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-rose-900">ล้างรายการจองทั้งหมด (Clear All)</div>
                    <div className="text-[11px] text-rose-600 mt-0.5">
                      ลบรายการประวัติการจองทั้งหมด {bookings.length} รายการ เพื่อเริ่มนับรายการใหม่
                    </div>
                  </div>
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowClearModal(false)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Tenant Confirmation Modal */}
      <AnimatePresence>
        {tenantToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-900"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-lg font-bold text-slate-900">
                  ยืนยันการลบข้อมูลผู้เช่า {tenantToDelete.name}?
                </h3>
                <p className="text-xs text-slate-500">
                  การลบข้อมูลผู้เช่าจะนำข้อมูลออกจากห้อง {tenantToDelete.roomNumber} และปรับสถานะห้องเป็นว่าง
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setTenantToDelete(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onDeleteTenant) {
                      onDeleteTenant(tenantToDelete.id, tenantToDelete.roomId);
                    } else {
                      onCheckOutTenant(tenantToDelete.id, tenantToDelete.roomId);
                    }
                    setTenantToDelete(null);
                  }}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-rose-100 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>ลบข้อมูลผู้เช่า</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Tenant Lease Contract Modal */}
      <AnimatePresence>
        {tenantForContract && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="no-print bg-slate-800/90 px-4 sm:px-6 py-3.5 border-b border-slate-700/70 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-600/30 text-purple-300 flex items-center justify-center border border-purple-500/40">
                    <Scale className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">หนังสือสัญญาเช่าห้องพัก</h3>
                    <p className="text-xs text-slate-400">ห้อง {tenantForContract.roomNumber} • ผู้เช่า: {tenantForContract.name}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setTenantForContract(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                {(() => {
                  const roomForT = rooms.find(r => r.id === tenantForContract.roomId || r.number === tenantForContract.roomNumber) || {
                    id: tenantForContract.roomId,
                    number: tenantForContract.roomNumber,
                    floor: parseInt(tenantForContract.roomNumber[0]) || 1,
                    type: 'ห้องพักมาตรฐาน',
                    dailyRate: 650,
                    monthlyRate: tenantForContract.monthlyRent,
                    depositDaily: 500,
                    depositMonthly: tenantForContract.depositAmount,
                    status: 'occupied',
                    building: property?.name || 'หอพัก',
                    images: [],
                    amenities: [],
                    waterMeter: 0,
                    electricityMeter: 0,
                  };

                  const defaultProperty: PropertyProfile = property || {
                    name: 'หอพักสุขสมบูรณ์',
                    nameEn: 'Suksomboon Apartment',
                    tagline: 'บริการห้องพักรายวัน-รายเดือน',
                    address: '123/45 ถนนสุขุมวิท กรุงเทพฯ 10110',
                    phone: '081-234-5678',
                    email: 'contact@apartment.com',
                    taxId: '0-1055-67890-12-3',
                    promptPayId: '0812345678',
                    promptPayName: 'หอพักสุขสมบูรณ์',
                    bankName: 'ธนาคารกสิกรไทย',
                    bankAccount: '123-4-56789-0',
                    bankAccountName: 'หอพักสุขสมบูรณ์',
                    lineId: '@apartment',
                    wifiSsid: 'Apartment_Guest',
                    wifiPass: 'wifi123456',
                  };

                  const tenantBill = bills.find(b => b.roomId === tenantForContract.roomId || b.roomNumber === tenantForContract.roomNumber);

                  return (
                    <LeaseContractSection
                      room={roomForT}
                      tenant={tenantForContract}
                      bill={tenantBill}
                      property={defaultProperty}
                      onSaveContract={(updatedContract) => {
                        if (tenantBill && onUpdateBillContract) {
                          onUpdateBillContract(tenantBill.id, updatedContract);
                        }
                      }}
                    />
                  );
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
