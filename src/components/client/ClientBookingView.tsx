import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  BedDouble, Calendar, Users, Search, Sparkles, 
  Check, Star, MapPin, Phone, ShieldCheck, Wifi, 
  Tv, Wind, Bath, Coffee, Utensils, QrCode, ArrowRight,
  Download, Printer, CheckCircle2, ChevronRight, Info,
  Plus, Minus, Edit3, SlidersHorizontal, Lock, AlertCircle
} from 'lucide-react';
import { Room, Booking, PropertyProfile, RentalType } from '../../types';
import { formatCurrency, formatDateThai, addMonthsToDate, addDaysToDate, isRoomAvailableForDates } from '../../utils/formatters';
import { PromptPayQR } from '../ui/PromptPayQR';
import { ClientRoomCard } from './ClientRoomCard';

interface ClientBookingViewProps {
  rooms: Room[];
  bookings?: Booking[];
  property: PropertyProfile;
  onCompleteBooking: (booking: Booking) => void;
}

export const ClientBookingView: React.FC<ClientBookingViewProps> = ({
  rooms,
  bookings = [],
  property,
  onCompleteBooking,
}) => {
  const [rentalType, setRentalType] = useState<RentalType>('daily');
  const [checkInDate, setCheckInDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [checkOutDate, setCheckOutDate] = useState<string>(
    new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]
  );
  const [monthlyContractMonths, setMonthlyContractMonths] = useState<number>(6);
  const [isCustomMonths, setIsCustomMonths] = useState<boolean>(false);
  const [guestCount, setGuestCount] = useState<number>(2);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<'available' | 'all'>('available');
  
  // Modal states
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [showBookingModal, setShowBookingModal] = useState<boolean>(false);
  const [showConfirmationSlip, setShowConfirmationSlip] = useState<Booking | null>(null);
  const [bookingErrorMessage, setBookingErrorMessage] = useState<string | null>(null);

  // Guest booking form
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [specialRequest, setSpecialRequest] = useState('');

  // Calculate nights
  const nightsCount = useMemo(() => {
    const start = new Date(checkInDate).getTime();
    const end = new Date(checkOutDate).getTime();
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  }, [checkInDate, checkOutDate]);

  // Compute room availability for each room based on dates and existing bookings
  const evaluatedRooms = useMemo(() => {
    return rooms.map((room) => {
      const { available, reason } = isRoomAvailableForDates(
        room,
        rentalType,
        checkInDate,
        checkOutDate,
        monthlyContractMonths,
        bookings
      );
      return {
        room,
        isAvailable: available,
        unavailableReason: reason,
      };
    });
  }, [rooms, rentalType, checkInDate, checkOutDate, monthlyContractMonths, bookings]);

  // Filter available rooms according to user filter
  const displayedRooms = useMemo(() => {
    return evaluatedRooms.filter(({ room, isAvailable }) => {
      if (typeFilter !== 'all' && room.type !== typeFilter) return false;
      if (room.maxGuests < guestCount) return false;
      if (availabilityFilter === 'available' && !isAvailable) return false;
      return true;
    });
  }, [evaluatedRooms, typeFilter, guestCount, availabilityFilter]);

  const availableRoomsCount = useMemo(() => {
    return evaluatedRooms.filter(({ room, isAvailable }) => {
      if (typeFilter !== 'all' && room.type !== typeFilter) return false;
      if (room.maxGuests < guestCount) return false;
      return isAvailable;
    }).length;
  }, [evaluatedRooms, typeFilter, guestCount]);

  // Calculate pricing for a room
  const getRoomPricing = (room: Room) => {
    if (rentalType === 'daily') {
      const roomTotal = room.dailyRate * nightsCount;
      const deposit = 1000;
      return {
        unitRate: room.dailyRate,
        unitLabel: 'บาท / คืน',
        duration: nightsCount,
        durationLabel: `${nightsCount} คืน`,
        roomTotal,
        deposit,
        grandTotal: roomTotal + deposit,
      };
    } else {
      const roomTotal = room.monthlyRate;
      const deposit = room.depositMonthly;
      return {
        unitRate: room.monthlyRate,
        unitLabel: 'บาท / เดือน',
        duration: monthlyContractMonths,
        durationLabel: `สัญญา ${monthlyContractMonths} เดือน`,
        roomTotal,
        deposit,
        grandTotal: roomTotal + deposit,
      };
    }
  };

  const handleOpenBooking = (room: Room) => {
    // Re-verify availability
    const { available, reason } = isRoomAvailableForDates(
      room,
      rentalType,
      checkInDate,
      checkOutDate,
      monthlyContractMonths,
      bookings
    );

    if (!available) {
      alert(`⚠️ ขออภัย: ห้อง ${room.number} ${reason || 'ไม่ว่างในช่วงเวลานี้ ไม่สามารถทำการจองได้'}`);
      return;
    }

    setBookingErrorMessage(null);
    setSelectedRoom(room);
    setShowBookingModal(true);
  };

  const handleConfirmReservation = () => {
    if (!selectedRoom || !guestName || !guestPhone) return;

    // Check again to avoid double booking
    const { available, reason } = isRoomAvailableForDates(
      selectedRoom,
      rentalType,
      checkInDate,
      checkOutDate,
      monthlyContractMonths,
      bookings
    );

    if (!available) {
      setBookingErrorMessage(`⚠️ ไม่สามารถทำรายการได้: ห้อง ${selectedRoom.number} ${reason || 'ถูกจองแล้วในช่วงเวลาดังกล่าว'}`);
      return;
    }

    const pricing = getRoomPricing(selectedRoom);
    const bookingCode = `STAY-${new Date().getFullYear().toString().slice(2)}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newBooking: Booking = {
      id: `client-book-${Date.now()}`,
      bookingCode,
      guestName,
      phone: guestPhone,
      email: guestEmail,
      roomId: selectedRoom.id,
      roomNumber: selectedRoom.number,
      roomType: selectedRoom.type,
      rentalType,
      checkInDate,
      checkOutDate: rentalType === 'daily' 
        ? checkOutDate 
        : addMonthsToDate(checkInDate, monthlyContractMonths),
      durationUnits: rentalType === 'daily' ? nightsCount : monthlyContractMonths,
      guestsCount: guestCount,
      roomRateTotal: pricing.roomTotal,
      deposit: pricing.deposit,
      totalAmount: pricing.grandTotal,
      paymentStatus: 'paid',
      paymentMethod: 'promptpay',
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      specialRequests: specialRequest,
    };

    onCompleteBooking(newBooking);
    setShowBookingModal(false);
    setShowConfirmationSlip(newBooking);

    // Launch confetti!
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (e) {
      // ignore
    }
  };

  return (
    <div className="space-y-10 pb-16">
      {/* Luxury Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-white">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/50 via-white to-white pointer-events-none"></div>

        <div className="relative px-6 py-10 sm:px-12 sm:py-14 max-w-4xl mx-auto text-center space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>สัมผัสประสบการณ์การพักผ่อนระดับพรีเมียม</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight"
          >
            {property.name}
          </motion.h1>

          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            {property.tagline}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500 pt-2">
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-indigo-600" /> {property.address.slice(0, 30)}...</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-indigo-600" /> {property.phone}</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Wifi className="w-3.5 h-3.5 text-indigo-600" /> ฟรี Wi-Fi ความเร็วสูง</span>
          </div>
        </div>

        {/* Search & Filter Control Bar */}
        <div className="relative max-w-5xl mx-auto px-4 sm:px-8 pb-8">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs">
            {/* Mode Switcher Tabs */}
            <div className="flex items-center justify-center gap-2 bg-slate-200/70 p-1 rounded-xl max-w-md mx-auto mb-5">
              <button
                type="button"
                onClick={() => setRentalType('daily')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  rentalType === 'daily'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BedDouble className="w-4 h-4" />
                <span>จองห้องพักรายวัน</span>
              </button>

              <button
                type="button"
                onClick={() => setRentalType('monthly')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  rentalType === 'monthly'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>เช่าพักรายเดือน</span>
              </button>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {rentalType === 'daily' ? (
                <>
                  <div>
                    <label className="text-slate-600 block mb-1 font-medium">วันเช็คอิน (Check-in)</label>
                    <input
                      type="date"
                      value={checkInDate}
                      onChange={(e) => setCheckInDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 font-medium outline-none focus:border-indigo-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 block mb-1 font-medium">วันเช็คเอาท์ (Check-out)</label>
                    <input
                      type="date"
                      value={checkOutDate}
                      onChange={(e) => setCheckOutDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 font-medium outline-none focus:border-indigo-500 cursor-pointer"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-slate-600 block mb-1 font-medium">วันเริ่มสัญญาเข้าอยู่</label>
                    <input
                      type="date"
                      value={checkInDate}
                      onChange={(e) => setCheckInDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 font-medium outline-none focus:border-indigo-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-600 font-medium">ระยะเวลาสัญญาเช่า</label>
                      <button
                        type="button"
                        onClick={() => setIsCustomMonths(!isCustomMonths)}
                        className="text-[11px] text-indigo-600 hover:text-indigo-700 font-semibold cursor-pointer flex items-center gap-1 hover:underline"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>{isCustomMonths ? 'เลือกจากรายการ' : 'กำหนดเอง (ระบุจำนวนเดือน)'}</span>
                      </button>
                    </div>

                    {!isCustomMonths ? (
                      <div className="space-y-1.5">
                        <select
                          value={[1, 2, 3, 6, 9, 12, 24].includes(monthlyContractMonths) ? monthlyContractMonths : 'custom'}
                          onChange={(e) => {
                            if (e.target.value === 'custom') {
                              setIsCustomMonths(true);
                            } else {
                              setMonthlyContractMonths(parseInt(e.target.value) || 6);
                            }
                          }}
                          className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 font-medium outline-none focus:border-indigo-500 cursor-pointer text-xs sm:text-sm shadow-2xs"
                        >
                          <option value={1}>สัญญา 1 เดือน (ระยะสั้น)</option>
                          <option value={2}>สัญญา 2 เดือน</option>
                          <option value={3}>สัญญา 3 เดือน</option>
                          <option value={6}>สัญญา 6 เดือน (สัญญายอดนิยม)</option>
                          <option value={9}>สัญญา 9 เดือน</option>
                          <option value={12}>สัญญา 1 ปี (12 เดือน)</option>
                          <option value={24}>สัญญา 2 ปี (24 เดือน)</option>
                          <option value="custom">✏️ ระบุจำนวนเดือนเอง (กำหนดเอง)...</option>
                        </select>
                      </div>
                    ) : (
                      <div className="space-y-2 bg-indigo-50/60 p-2.5 rounded-xl border border-indigo-200/80">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setMonthlyContractMonths(prev => Math.max(1, prev - 1))}
                            className="w-8 h-8 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-bold text-sm shadow-2xs transition-colors cursor-pointer"
                            title="ลด 1 เดือน"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>

                          <div className="flex-1 relative">
                            <input
                              type="number"
                              min={1}
                              max={120}
                              value={monthlyContractMonths}
                              onChange={(e) => setMonthlyContractMonths(Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-full bg-white border border-indigo-300 rounded-lg py-1.5 px-3 text-slate-900 font-bold font-mono text-center text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                              placeholder="ระบุจำนวนเดือน"
                            />
                          </div>

                          <span className="text-xs font-bold text-indigo-900 whitespace-nowrap">เดือน</span>

                          <button
                            type="button"
                            onClick={() => setMonthlyContractMonths(prev => Math.min(120, prev + 1))}
                            className="w-8 h-8 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-bold text-sm shadow-2xs transition-colors cursor-pointer"
                            title="เพิ่ม 1 เดือน"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Quick preset chips */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          <span className="text-[10px] text-slate-500">ด่วน:</span>
                          {[1, 3, 6, 12, 24].map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setMonthlyContractMonths(m)}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                                monthlyContractMonths === m
                                  ? 'bg-indigo-600 text-white shadow-2xs'
                                  : 'bg-white text-slate-600 hover:bg-indigo-100 hover:text-indigo-700 border border-slate-200'
                              }`}
                            >
                              {m === 12 ? '1 ปี' : m === 24 ? '2 ปี' : `${m} เดือน`}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-1 text-[11px] text-slate-500 flex items-center justify-between">
                      <span>สิ้นสุดสัญญา:</span>
                      <span className="font-semibold text-indigo-700">
                        {formatDateThai(addMonthsToDate(checkInDate, monthlyContractMonths))} ({monthlyContractMonths} เดือน)
                      </span>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="text-slate-600 block mb-1 font-medium">จำนวนผู้เข้าพัก</label>
                <select
                  value={guestCount}
                  onChange={(e) => setGuestCount(parseInt(e.target.value) || 1)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 font-medium outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value={1}>1 ท่าน</option>
                  <option value={2}>2 ท่าน (มาตรฐาน)</option>
                  <option value={3}>3 ท่าน</option>
                  <option value={4}>4 ท่าน (ครอบครัว)</option>
                  <option value={5}>5 ท่าน</option>
                </select>
              </div>

              <div>
                <label className="text-slate-600 block mb-1 font-medium">ประเภทห้องพัก</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 font-medium outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="all">ทุกประเภทห้องพัก</option>
                  <option value="Standard">Standard</option>
                  <option value="Studio">Studio</option>
                  <option value="Deluxe">Deluxe</option>
                  <option value="Executive Suite">Executive Suite</option>
                  <option value="Family Suite">Family Suite</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Available Room List Showcase */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-slate-200 pb-4">
          <div>
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">ห้องพักแนะนำ</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              เลือกห้องพักที่คุณชื่นชอบ
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {rentalType === 'daily'
                ? `ราคาสำหรับการเข้าพัก ${nightsCount} คืน (${formatDateThai(checkInDate)} - ${formatDateThai(checkOutDate)})`
                : `ราคาค่าเช่ารายเดือน สัญญา ${monthlyContractMonths} เดือน (ค่าน้ำค่าไฟคิดตามมิเตอร์จริง)`}
            </p>
          </div>

          {/* Availability Filter Buttons */}
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setAvailabilityFilter('available')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                availabilityFilter === 'available'
                  ? 'bg-white text-emerald-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>เฉพาะห้องว่าง ({availableRoomsCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setAvailabilityFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                availabilityFilter === 'all'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>ทุกห้อง ({evaluatedRooms.length})</span>
            </button>
          </div>
        </div>

        {/* Room Cards Grid or Empty State */}
        {displayedRooms.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-lg font-bold text-slate-900">ไม่มีห้องว่างในช่วงเวลาที่คุณเลือก</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                ห้องพักทั้งหมดถูกจองหรือมีผู้เข้าพักแล้วในช่วงวันที่ {formatDateThai(checkInDate)} ถึง {rentalType === 'daily' ? formatDateThai(checkOutDate) : formatDateThai(addMonthsToDate(checkInDate, monthlyContractMonths))} กรุณาเลือกช่วงเวลาหรือประเภทห้องอื่น
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAvailabilityFilter('all')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
            >
              <span>ดูห้องพักทั้งหมดในระบบ</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedRooms.map(({ room, isAvailable, unavailableReason }) => {
              const pricing = getRoomPricing(room);
              return (
                <ClientRoomCard
                  key={room.id}
                  room={room}
                  rentalType={rentalType}
                  pricing={pricing}
                  isAvailable={isAvailable}
                  unavailableReason={unavailableReason}
                  onOpenBooking={handleOpenBooking}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Booking Checkout Modal */}
      <AnimatePresence>
        {showBookingModal && selectedRoom && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl my-8 space-y-5 max-h-[90vh] overflow-y-auto text-slate-900"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div>
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">ยืนยันการจองห้องพัก</span>
                  <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                    ห้อง {selectedRoom.number} ({selectedRoom.type})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer text-lg"
                >
                  ✕
                </button>
              </div>

              {/* Error banner if collision detected */}
              {bookingErrorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span className="font-semibold">{bookingErrorMessage}</span>
                </div>
              )}

              {/* Room Image Gallery in Checkout Modal */}
              {selectedRoom.images && selectedRoom.images.length > 0 && (
                <div className="space-y-2">
                  <div className="h-44 sm:h-52 w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                    <img
                      src={selectedRoom.images[0]}
                      alt={selectedRoom.type}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  {selectedRoom.images.length > 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {selectedRoom.images.map((img, i) => (
                        <div
                          key={i}
                          className="w-16 h-12 rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-slate-100"
                        >
                          <img
                            src={img}
                            alt=""
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Booking Summary Box */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-slate-700">
                  <div>
                    <span className="text-slate-500 block">ประเภทการเข้าพัก:</span>
                    <span className="font-bold text-slate-900">{rentalType === 'daily' ? 'รายวัน' : 'รายเดือน'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">
                      {rentalType === 'daily' ? 'ระยะเวลาเข้าพัก:' : 'ระยะสัญญาเช่า:'}
                    </span>
                    {rentalType === 'daily' ? (
                      <span className="font-bold text-slate-900">{nightsCount} คืน</span>
                    ) : (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <button
                          type="button"
                          onClick={() => setMonthlyContractMonths(prev => Math.max(1, prev - 1))}
                          className="w-5 h-5 rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center justify-center text-[10px] cursor-pointer"
                          title="ลด 1 เดือน"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="font-bold text-indigo-700 font-mono bg-indigo-50 px-1.5 py-0.5 rounded text-[11px]">
                          {monthlyContractMonths} เดือน
                        </span>
                        <button
                          type="button"
                          onClick={() => setMonthlyContractMonths(prev => Math.min(120, prev + 1))}
                          className="w-5 h-5 rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center justify-center text-[10px] cursor-pointer"
                          title="เพิ่ม 1 เดือน"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-500 block">จำนวนผู้เข้าพัก:</span>
                    <span className="font-bold text-slate-900">{guestCount} ท่าน</span>
                  </div>
                </div>

                <div className="bg-white/90 p-2.5 rounded-xl border border-slate-200/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">ช่วงเวลาเข้าพัก / สัญญา:</span>
                  <span className="font-semibold text-slate-900">
                    {rentalType === 'daily'
                      ? `${formatDateThai(checkInDate)} - ${formatDateThai(checkOutDate)} (${nightsCount} คืน)`
                      : `${formatDateThai(checkInDate)} - ${formatDateThai(addMonthsToDate(checkInDate, monthlyContractMonths))} (${monthlyContractMonths} เดือน)`}
                  </span>
                </div>

                <div className="border-t border-slate-200 pt-3 space-y-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span>
                      ค่าห้อง ({rentalType === 'daily' ? `${nightsCount} คืน` : 'เดือนแรก'}):
                    </span>
                    <span className="font-mono font-semibold text-slate-900">
                      {formatCurrency(getRoomPricing(selectedRoom).roomTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>เงินประกันความเสียหาย (ได้รับคืนเมื่อเช็คเอาท์):</span>
                    <span className="font-mono text-slate-700">
                      {formatCurrency(getRoomPricing(selectedRoom).deposit)}
                    </span>
                  </div>
                  <div className="border-t border-slate-200 pt-2 flex justify-between items-baseline text-sm font-bold">
                    <span className="text-slate-900">ยอดชำระสุทธิ:</span>
                    <span className="text-xl font-extrabold text-indigo-600 font-mono">
                      {formatCurrency(getRoomPricing(selectedRoom).grandTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Guest Form */}
              <div className="space-y-4 text-xs">
                <h4 className="font-bold text-sm text-slate-900">ข้อมูลผู้จองห้องพัก</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-600 block mb-1">ชื่อ-นามสกุล *</label>
                    <input
                      type="text"
                      placeholder="เช่น คุณกฤษณะ สุขสวัสดิ์"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 block mb-1">เบอร์โทรศัพท์ติดต่อ *</label>
                    <input
                      type="tel"
                      placeholder="08X-XXX-XXXX"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-mono focus:bg-white focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-600 block mb-1">อีเมลสำหรับรับใบเสร็จและ Voucher (ถ้ามี)</label>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-600 block mb-1">ความต้องการพิเศษ / หมายเหตุ</label>
                  <textarea
                    rows={2}
                    placeholder="เช่น ขอเตียงเสริม, ขอเช็คอินช่วงบ่ายโมง"
                    value={specialRequest}
                    onChange={(e) => setSpecialRequest(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
                  ></textarea>
                </div>
              </div>

              {/* Payment Preview */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs space-y-1">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>ชำระเงินสะดวกผ่าน PromptPay QR Code</span>
                  </span>
                  <p className="text-slate-500">
                    หลังยืนยันการจอง ระบบจะออก Voucher ยืนยันการเข้าพักทันที
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleConfirmReservation}
                  disabled={!guestName || !guestPhone}
                  className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-indigo-100 transition-all cursor-pointer"
                >
                  ยืนยันการจอง & รับ Voucher
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Slip / Voucher Modal */}
      <AnimatePresence>
        {showConfirmationSlip && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-slate-900"
            >
              {/* Header */}
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-extrabold text-slate-900">การจองห้องพักสำเร็จแล้ว!</h3>
                <p className="text-xs text-slate-500">
                  รหัสการจอง: <span className="font-mono font-bold text-indigo-600">{showConfirmationSlip.bookingCode}</span>
                </p>
              </div>

              {/* Voucher Card */}
              <div className="bg-slate-50 text-slate-900 p-6 rounded-2xl shadow-xs space-y-4 border border-slate-200">
                <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                  <div>
                    <h4 className="font-bold text-base text-slate-900">{property.name}</h4>
                    <p className="text-xs text-slate-500">ห้องพักหมายเลข {showConfirmationSlip.roomNumber} ({showConfirmationSlip.roomType})</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                    ยืนยันแล้ว
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-500">ชื่อผู้เข้าพัก:</span>
                    <span className="font-bold text-slate-900">{showConfirmationSlip.guestName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">เบอร์โทรติดต่อ:</span>
                    <span className="font-mono text-slate-900">{showConfirmationSlip.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">วันที่เข้าพัก:</span>
                    <span className="font-semibold text-slate-900">
                      {formatDateThai(showConfirmationSlip.checkInDate)} - {formatDateThai(showConfirmationSlip.checkOutDate)}
                    </span>
                  </div>
                  <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-sm text-indigo-700">
                    <span>ยอดรวมชำระ:</span>
                    <span className="font-mono">{formatCurrency(showConfirmationSlip.totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>พิมพ์ใบยืนยันการจอง</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowConfirmationSlip(null)}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-100 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>เรียบร้อย</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
