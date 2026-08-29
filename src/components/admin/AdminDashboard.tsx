import React from 'react';
import { motion } from 'motion/react';
import { 
  Building2, Users, CreditCard, Droplets, Zap, 
  DoorClosed, CheckCircle2, Clock, AlertCircle, ArrowUpRight,
  TrendingUp, FileText, ChevronRight, Plus, CalendarCheck, BedDouble
} from 'lucide-react';
import { Room, Booking, UtilityBill, PropertyProfile } from '../../types';
import { formatCurrency, formatDateThai, getStatusBadgeInfo } from '../../utils/formatters';

interface AdminDashboardProps {
  rooms: Room[];
  bookings: Booking[];
  bills: UtilityBill[];
  property: PropertyProfile;
  onNavigateTab: (tab: 'dashboard' | 'rooms' | 'utilities' | 'bookings' | 'settings') => void;
  onSelectRoom: (room: Room) => void;
  onOpenInvoiceModal: (bill: UtilityBill) => void;
  onNewBookingClick: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  rooms,
  bookings,
  bills,
  property,
  onNavigateTab,
  onSelectRoom,
  onOpenInvoiceModal,
  onNewBookingClick,
}) => {
  // Calculations for stats
  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter(r => r.status === 'occupied').length;
  const availableRooms = rooms.filter(r => r.status === 'available').length;
  const reservedRooms = rooms.filter(r => r.status === 'reserved').length;
  const cleaningRooms = rooms.filter(r => r.status === 'cleaning').length;
  const maintenanceRooms = rooms.filter(r => r.status === 'maintenance').length;
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  // Revenue calculations
  const totalMonthlyRentProjected = rooms
    .filter(r => r.status === 'occupied')
    .reduce((sum, r) => sum + r.monthlyRate, 0);

  const dailyBookingRevenue = bookings
    .filter(b => b.rentalType === 'daily' && b.paymentStatus === 'paid')
    .reduce((sum, b) => sum + b.totalAmount, 0);

  const totalUtilityReceivables = bills.reduce((sum, b) => sum + (b.waterAmount + b.elecAmount), 0);
  const unpaidBills = bills.filter(b => b.paymentStatus === 'unpaid');
  const unpaidAmount = unpaidBills.reduce((sum, b) => sum + b.grandTotal, 0);

  // Group rooms by floor
  const floors = Array.from(new Set<number>(rooms.map(r => Number(r.floor)))).sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping"></span>
            <span>ระบบพร้อมใช้งานแบบเรียลไทม์</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            ภาพรวมการบริหารหอพัก & ห้องพัก
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            ข้อมูลประจำเดือนสิงหาคม 2569 | ติดตามสถานะห้อง ผู้เช่า และค่าน้ำค่าไฟ
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onNewBookingClick}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-indigo-100 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>เช็คอิน / จองห้องพักใหม่</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('utilities')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold border border-slate-200 shadow-sm transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4 text-amber-500" />
            <span>จดมิเตอร์น้ำ-ไฟ</span>
          </button>
        </div>
      </div>

      {/* 4 Main Stat Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Occupancy Rate */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">อัตราการเข้าพัก</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono">{occupancyRate}%</span>
            <span className="text-xs text-indigo-600 font-medium">({occupiedRooms}/{totalRooms} ห้อง)</span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${occupancyRate}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-[11px] text-slate-500 mt-2">
            <span>ว่าง: {availableRooms} ห้อง</span>
            <span>จอง: {reservedRooms} ห้อง</span>
          </div>
        </motion.div>

        {/* Metric 2: Monthly Rent Revenue */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">รายได้ค่าเช่ารายเดือน</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
              {formatCurrency(totalMonthlyRentProjected)}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-3 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> จากสัญญาเช่า {occupiedRooms} ห้องที่พักอยู่
          </p>
        </motion.div>

        {/* Metric 3: Daily Bookings Revenue */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">รายได้จองรายวัน</span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
              <BedDouble className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
              {formatCurrency(dailyBookingRevenue)}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-3 flex items-center gap-1">
            <CalendarCheck className="w-3.5 h-3.5 text-sky-600" /> จากการจองรายวันในรอบสัปดาห์
          </p>
        </motion.div>

        {/* Metric 4: Utility & Pending Bills */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">บิลค้างชำระ (น้ำ-ไฟ-ค่าเช่า)</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <Zap className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-600 font-mono">
              {formatCurrency(unpaidAmount)}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-3 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> รอชำระ {unpaidBills.length} ใบแจ้งหนี้
          </p>
        </motion.div>
      </div>

      {/* Visual Interactive Room Status Matrix by Floor */}
      <div className="bg-white border border-slate-200 rounded-2xl md:rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <DoorClosed className="w-5 h-5 text-indigo-600" />
              <span>ผังห้องพักประจำอาคาร (Interactive Floor Grid)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              คลิกที่การ์ดห้องเพื่อดูข้อมูลผู้เช่า เลขมิเตอร์ หรือเปลี่ยนสถานะ
            </p>
          </div>

          {/* Color legend */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-emerald-100 border border-emerald-300"></span>
              <span className="text-slate-600 font-medium">ว่าง ({availableRooms})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-indigo-100 border border-indigo-300"></span>
              <span className="text-slate-600 font-medium">มีผู้เช่า ({occupiedRooms})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-amber-100 border border-amber-300"></span>
              <span className="text-slate-600 font-medium">ติดจอง ({reservedRooms})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-sky-100 border border-sky-300"></span>
              <span className="text-slate-600 font-medium">ทำความสะอาด ({cleaningRooms})</span>
            </div>
          </div>
        </div>

        {/* Floor Rows */}
        <div className="space-y-6 mt-6">
          {floors.map((floorNum) => {
            const floorRooms = rooms.filter(r => r.floor === floorNum);
            return (
              <div key={floorNum} className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                  <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 font-mono">
                    {floorNum}
                  </span>
                  <span>ชั้น {floorNum}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {floorRooms.map((room) => {
                    const badge = getStatusBadgeInfo(room.status);
                    const isOccupied = room.status === 'occupied';

                    return (
                      <motion.div
                        key={room.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onSelectRoom(room)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${badge.color} bg-white shadow-xs hover:shadow-md hover:border-indigo-400 relative flex flex-col justify-between h-32`}
                      >
                        <div className="flex justify-between items-start">
                          <span className="text-lg font-mono font-bold text-slate-900">
                            {room.number}
                          </span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {room.type}
                          </span>
                        </div>

                        <div>
                          {isOccupied && room.currentTenant ? (
                            <div className="space-y-0.5">
                              <p className="text-xs font-medium text-slate-800 truncate">
                                {room.currentTenant.name}
                              </p>
                              <p className="text-[11px] text-slate-500 font-mono">
                                ค่าเช่า: {formatCurrency(room.monthlyRate || 0)}
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              <p className="text-xs text-slate-500">{badge.label}</p>
                              <p className="text-[11px] text-indigo-600 font-mono font-semibold">
                                รายวัน {formatCurrency(room.dailyRate || 0)}/คืน
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Quick meter chips */}
                        <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-100 pt-1.5 font-mono">
                          <span className="flex items-center gap-0.5 text-sky-600 font-medium">
                            <Droplets className="w-2.5 h-2.5" /> {room.currentWaterMeter}
                          </span>
                          <span className="flex items-center gap-0.5 text-amber-600 font-medium">
                            <Zap className="w-2.5 h-2.5" /> {room.currentElecMeter}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Grid: Recent Bookings & Pending Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Recent Bookings */}
        <div className="bg-white border border-slate-200 rounded-2xl md:rounded-3xl p-6 shadow-sm">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-indigo-600" />
              <span>รายการจองห้องพักล่าสุด (Recent Bookings)</span>
            </h3>
            <button
              type="button"
              onClick={() => onNavigateTab('bookings')}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 cursor-pointer"
            >
              ดูทั้งหมด <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 mt-3">
            {bookings.slice(0, 4).map((b) => (
              <div key={b.id} className="py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-mono font-bold text-slate-800 text-sm">
                    {b.roomNumber}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                      <span>{b.guestName}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        b.rentalType === 'daily' ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}>
                        {b.rentalType === 'daily' ? 'รายวัน' : 'รายเดือน'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {formatDateThai(b.checkInDate)} - {formatDateThai(b.checkOutDate)} ({b.durationUnits} {b.rentalType === 'daily' ? 'คืน' : 'เดือน'})
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono font-bold text-slate-900 text-sm">
                    {formatCurrency(b.totalAmount)}
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                    b.paymentStatus === 'paid' ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' : 'text-amber-700 bg-amber-50 border border-amber-200'
                  }`}>
                    {b.paymentStatus === 'paid' ? 'ชำระแล้ว' : 'รอชำระ'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: Pending Utility Bills & Quick Invoices */}
        <div className="bg-white border border-slate-200 rounded-2xl md:rounded-3xl p-6 shadow-sm">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-500" />
              <span>ใบแจ้งหนี้ค่าน้ำ-ไฟ & ค่าเช่า (Invoices)</span>
            </h3>
            <button
              type="button"
              onClick={() => onNavigateTab('utilities')}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 cursor-pointer"
            >
              จดมิเตอร์ทั้งหมด <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 mt-3">
            {bills.map((bill) => (
              <div key={bill.id} className="py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center font-mono font-bold text-amber-800 text-sm">
                    {bill.roomNumber}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-slate-900">{bill.tenantName}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span className="text-sky-600 font-medium">น้ำ {bill.waterUnits} น.</span>
                      <span>•</span>
                      <span className="text-amber-600 font-medium">ไฟ {bill.elecUnits} น.</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-mono font-bold text-slate-900 text-sm">
                      {formatCurrency(bill.grandTotal)}
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      bill.paymentStatus === 'paid' ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' : 'text-amber-700 bg-amber-50 border border-amber-200'
                    }`}>
                      {bill.paymentStatus === 'paid' ? 'ชำระแล้ว' : 'รอชำระ'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenInvoiceModal(bill)}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all cursor-pointer"
                    title="เปิดดูใบแจ้งหนี้ / ใบเสร็จ"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
