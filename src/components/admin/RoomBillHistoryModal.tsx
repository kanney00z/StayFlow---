import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Zap, Droplets, FileText, CheckCircle2, Clock, 
  Trash2, Eye, TrendingUp, Calendar, User, 
  Building, AlertTriangle, ArrowRight, ShieldCheck,
  Search, Filter, Plus, Printer, BarChart3, ChevronRight, Hash,
  Sparkles, Check, Image as ImageIcon, CreditCard, DollarSign
} from 'lucide-react';
import { Room, UtilityBill, PropertyProfile } from '../../types';
import { formatCurrency, formatNumber, formatDateThai } from '../../utils/formatters';
import { SlipViewerModal } from './SlipViewerModal';

interface RoomBillHistoryModalProps {
  room: Room;
  bills: UtilityBill[];
  property: PropertyProfile;
  onClose: () => void;
  onOpenInvoiceModal: (bill: UtilityBill) => void;
  onUpdateBillStatus?: (billId: string, status: 'paid' | 'unpaid' | 'partial') => void;
  onDeleteBill?: (billId: string) => void;
  onGoToRecordMeter?: (room: Room) => void;
}

export const RoomBillHistoryModal: React.FC<RoomBillHistoryModalProps> = ({
  room,
  bills,
  property,
  onClose,
  onOpenInvoiceModal,
  onUpdateBillStatus,
  onDeleteBill,
  onGoToRecordMeter,
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'unpaid' | 'partial'>('all');
  const [searchMonth, setSearchMonth] = useState('');
  const [billToDelete, setBillToDelete] = useState<UtilityBill | null>(null);
  const [selectedSlipBill, setSelectedSlipBill] = useState<UtilityBill | null>(null);

  // Filter bills specifically for this room
  const roomBills = useMemo(() => {
    return bills
      .filter((b) => b.roomId === room.id || b.roomNumber === room.number)
      .sort((a, b) => {
        if (b.billingDate && a.billingDate && b.billingDate !== a.billingDate) {
          return b.billingDate.localeCompare(a.billingDate);
        }
        return b.monthYear.localeCompare(a.monthYear);
      });
  }, [bills, room]);

  const filteredBills = useMemo(() => {
    return roomBills.filter((b) => {
      if (filterStatus !== 'all' && b.paymentStatus !== filterStatus) return false;
      if (searchMonth && !b.monthYear.includes(searchMonth) && !b.billNumber.toLowerCase().includes(searchMonth.toLowerCase())) return false;
      return true;
    });
  }, [roomBills, filterStatus, searchMonth]);

  // Aggregate statistics for this room
  const stats = useMemo(() => {
    const totalCount = roomBills.length;
    const totalElecUnits = roomBills.reduce((sum, b) => sum + (b.elecUnits || 0), 0);
    const totalElecAmount = roomBills.reduce((sum, b) => sum + (b.elecAmount || 0), 0);
    const totalWaterUnits = roomBills.reduce((sum, b) => sum + (b.waterUnits || 0), 0);
    const totalWaterAmount = roomBills.reduce((sum, b) => sum + (b.waterAmount || 0), 0);
    const totalGrandBilled = roomBills.reduce((sum, b) => sum + (b.grandTotal || 0), 0);
    
    const paidBills = roomBills.filter((b) => b.paymentStatus === 'paid');
    const unpaidBills = roomBills.filter((b) => b.paymentStatus === 'unpaid' || b.paymentStatus === 'overdue');
    const partialBills = roomBills.filter((b) => b.paymentStatus === 'partial');
    const slipCount = roomBills.filter((b) => !!b.slipImage).length;

    const totalPaidAmount = roomBills.reduce((sum, b) => {
      if (b.paidAmount !== undefined) return sum + b.paidAmount;
      if (b.paymentStatus === 'paid') return sum + b.grandTotal;
      return sum;
    }, 0);

    const totalUnpaidAmount = Math.max(0, totalGrandBilled - totalPaidAmount);
    
    const avgElecUnits = totalCount > 0 ? Math.round(totalElecUnits / totalCount) : 0;
    const avgWaterUnits = totalCount > 0 ? Math.round(totalWaterUnits / totalCount) : 0;

    return {
      totalCount,
      totalElecUnits,
      totalElecAmount,
      totalWaterUnits,
      totalWaterAmount,
      totalGrandBilled,
      paidBillsCount: paidBills.length,
      unpaidBillsCount: unpaidBills.length,
      partialBillsCount: partialBills.length,
      slipCount,
      totalPaidAmount,
      totalUnpaidAmount,
      avgElecUnits,
      avgWaterUnits,
    };
  }, [roomBills]);

  // Max elec units for relative bar chart visualization
  const maxElecInHistory = useMemo(() => {
    if (roomBills.length === 0) return 100;
    return Math.max(...roomBills.map(b => b.elecUnits || 0), 100);
  }, [roomBills]);

  return (
    <>
      <div 
        id="room-bill-history-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/75 backdrop-blur-xs overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          className="w-full max-w-5xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]"
        >
          {/* Modal Header */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 flex items-start justify-between relative shrink-0">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-xl bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 font-mono font-bold text-sm">
                  ห้อง {room.number}
                </span>
                <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700">
                  {room.type} • ชั้น {room.floor} • {room.building}
                </span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>บิลสะสม {stats.totalCount} บิล</span>
                </span>
                {stats.slipCount > 0 && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                    <span>มีสลิปแนบ {stats.slipCount} ฉบับ</span>
                  </span>
                )}
                {stats.unpaidBillsCount > 0 ? (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-rose-500/30 text-rose-200 border border-rose-500/40 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-rose-300 animate-spin" style={{ animationDuration: '3s' }} />
                    <span>ยังไม่จ่าย {stats.unpaidBillsCount} บิล</span>
                  </span>
                ) : stats.totalCount > 0 ? (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                    <span>ชำระครบทุกบิลแล้ว</span>
                  </span>
                ) : null}
              </div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2 pt-1">
                <span>ประวัติบิลและบันทึกการชำระเงิน ห้อง {room.number}</span>
              </h2>
              <div className="text-xs text-slate-300 flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                <span>ผู้เช่า:</span>
                <span className="font-semibold text-white">
                  {room.currentTenant ? room.currentTenant.name : 'ไม่มีผู้เช่า (ห้องว่าง)'}
                </span>
                {room.currentTenant?.phone && (
                  <span className="text-slate-400">({room.currentTenant.phone})</span>
                )}
              </div>
            </div>

            <button
              type="button"
              id="btn-close-room-history-modal"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
            {/* Unpaid / Pending Bills Alert Banner */}
            {stats.unpaidBillsCount > 0 && (
              <div className="bg-rose-50 border-2 border-rose-300/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 mt-0.5 border border-rose-200">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-rose-900 text-sm">
                        ⚠️ มีบิลที่ยังไม่ชำระ / รอตรวจสลิป {stats.unpaidBillsCount} รายการ
                      </h4>
                      <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        รอชำระ
                      </span>
                    </div>
                    <p className="text-xs text-rose-700 mt-0.5">
                      รวมยอดค้างชำระ: <strong className="font-mono font-bold text-sm text-rose-950">{formatCurrency(stats.totalUnpaidAmount)}</strong> (สามารถแนบสลิปและจดบันทึกยอดเงินที่ผู้เช่าโอนได้ในแต่ละบิล)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
                  <button
                    type="button"
                    onClick={() => setFilterStatus('unpaid')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      filterStatus === 'unpaid'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-white text-rose-700 border border-rose-300 hover:bg-rose-100'
                    }`}
                  >
                    ⚡ แสดงเฉพาะบิลที่ยังไม่จ่าย ({stats.unpaidBillsCount})
                  </button>
                </div>
              </div>
            )}

            {/* Key Summary Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* 1. Electricity Record Count */}
              <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3.5 space-y-1">
                <div className="flex items-center justify-between text-amber-700">
                  <span className="text-xs font-semibold">บิลสะสมทั้งหมด</span>
                  <Zap className="w-4 h-4" />
                </div>
                <div className="text-xl sm:text-2xl font-bold text-amber-950 font-mono">
                  {stats.totalCount} <span className="text-xs font-normal text-amber-700 font-sans">บิล</span>
                </div>
                <div className="text-[11px] text-amber-800">
                  เฉลี่ย {stats.avgElecUnits} หน่วยไฟ/บิล
                </div>
              </div>

              {/* 2. Total Grand Billed */}
              <div className="bg-indigo-50/60 border border-indigo-200/70 rounded-2xl p-3.5 space-y-1">
                <div className="flex items-center justify-between text-indigo-700">
                  <span className="text-xs font-semibold">ยอดเรียกเก็บรวม</span>
                  <FileText className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-lg sm:text-xl font-bold text-indigo-950 font-mono">
                  {formatCurrency(stats.totalGrandBilled)}
                </div>
                <div className="text-[11px] text-indigo-700">
                  ค่าเช่า + ค่าน้ำไฟ + ส่วนกลาง
                </div>
              </div>

              {/* 3. Total Received (Paid Amount) */}
              <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-3.5 space-y-1">
                <div className="flex items-center justify-between text-emerald-700">
                  <span className="text-xs font-semibold">รับชำระแล้วจริง</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-lg sm:text-xl font-bold text-emerald-950 font-mono">
                  {formatCurrency(stats.totalPaidAmount)}
                </div>
                <div className="text-[11px] text-emerald-800 font-medium">
                  จ่ายครบ {stats.paidBillsCount} {stats.partialBillsCount > 0 ? `(แบ่งจ่าย ${stats.partialBillsCount})` : ''}
                </div>
              </div>

              {/* 4. Total Remaining Unpaid Balance */}
              <div className="bg-rose-50/80 border border-rose-200/80 rounded-2xl p-3.5 space-y-1">
                <div className="flex items-center justify-between text-rose-700">
                  <span className="text-xs font-semibold">ยอดคงค้างชำระ</span>
                  <Clock className="w-4 h-4 text-rose-600" />
                </div>
                <div className="text-lg sm:text-xl font-bold text-rose-950 font-mono">
                  {formatCurrency(stats.totalUnpaidAmount)}
                </div>
                <div className="text-[11px] text-rose-800">
                  {stats.unpaidBillsCount > 0 ? `ค้างชำระ ${stats.unpaidBillsCount} บิล` : 'ไม่มีค้างชำระ'}
                </div>
              </div>
            </div>

            {/* Current Live Meter Information & Quick Record Action */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="font-semibold text-slate-700">มิเตอร์ปัจจุบันในระบบ:</span>
                
                <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-amber-200 text-amber-900 shadow-2xs">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>ไฟล่าสุด:</span>
                  <strong className="font-mono font-bold text-sm">{room.currentElecMeter}</strong>
                  <span className="text-slate-400 font-normal">(เดิม: {room.previousElecMeter})</span>
                </div>

                <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-sky-200 text-sky-900 shadow-2xs">
                  <Droplets className="w-3.5 h-3.5 text-sky-500" />
                  <span>น้ำล่าสุด:</span>
                  <strong className="font-mono font-bold text-sm">{room.currentWaterMeter}</strong>
                  <span className="text-slate-400 font-normal">(เดิม: {room.previousWaterMeter})</span>
                </div>
              </div>

              {onGoToRecordMeter && (
                <button
                  type="button"
                  id="btn-add-meter-from-history"
                  onClick={() => {
                    onClose();
                    onGoToRecordMeter(room);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>จดมิเตอร์ & ออกบิลใหม่อีกใบ</span>
                </button>
              )}
            </div>

            {/* Electricity Usage Trend Bars */}
            {roomBills.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <BarChart3 className="w-4 h-4 text-amber-500" />
                    <span>กราฟเปรียบเทียบการใช้ไฟฟ้าแต่ละรอบ (Electricity Trend)</span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    (หน่วยที่ใช้จริงในแต่ละบิล)
                  </span>
                </div>

                <div className="space-y-2 pt-1">
                  {roomBills.map((b) => {
                    const percent = Math.min(100, Math.max(8, (b.elecUnits / maxElecInHistory) * 100));
                    const isHigh = b.elecUnits > 300;
                    const isUnpaid = b.paymentStatus === 'unpaid';
                    return (
                      <div key={b.id} className="flex items-center gap-3 text-xs">
                        <span className="w-32 font-mono font-semibold text-slate-700 shrink-0 flex items-center gap-1.5">
                          <span>{b.monthYear}</span>
                          {isUnpaid ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-700">
                              ยังไม่จ่าย
                            </span>
                          ) : b.paymentStatus === 'partial' ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700">
                              จ่ายบางส่วน
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-700">
                              จ่ายแล้ว
                            </span>
                          )}
                        </span>
                        <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden flex items-center p-0.5">
                          <div
                            style={{ width: `${percent}%` }}
                            className={`h-full rounded-full transition-all duration-500 flex items-center justify-end px-2 text-[10px] font-bold font-mono text-white ${
                              isUnpaid 
                                ? 'bg-gradient-to-r from-rose-500 to-amber-500' 
                                : isHigh ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-amber-400 to-amber-600'
                            }`}
                          >
                            {b.elecUnits} หน่วย {isUnpaid ? '(ยังไม่จ่าย)' : ''}
                          </div>
                        </div>
                        <span className="w-24 text-right font-mono font-semibold text-slate-800 shrink-0">
                          {formatCurrency(b.elecAmount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Filter & Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">
                  รายการบิลทั้งหมดของห้อง {room.number} ({filteredBills.length} รายการ)
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Status Filter */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs">
                  <button
                    type="button"
                    onClick={() => setFilterStatus('all')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                      filterStatus === 'all'
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ทั้งหมด ({roomBills.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterStatus('unpaid')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                      filterStatus === 'unpaid'
                        ? 'bg-rose-600 text-white shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-rose-700'
                    }`}
                  >
                    🔴 ยังไม่จ่าย ({stats.unpaidBillsCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterStatus('paid')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                      filterStatus === 'paid'
                        ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-emerald-700'
                    }`}
                  >
                    🟢 จ่ายครบแล้ว ({stats.paidBillsCount})
                  </button>
                </div>

                {/* Month Search Filter */}
                <input
                  type="text"
                  placeholder="ค้นหารอบเดือน เช่น 2026-08"
                  value={searchMonth}
                  onChange={(e) => setSearchMonth(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-indigo-500 w-40"
                />
              </div>
            </div>

            {/* Bills List / Table */}
            {filteredBills.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-200/80 text-slate-500 flex items-center justify-center mx-auto">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">ยังไม่มีรายการบิลที่ตรงกับเงื่อนไข</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {roomBills.length === 0 
                      ? `ห้อง ${room.number} ยังไม่เคยมีการบันทึกค่าน้ำค่าไฟหรือออกใบแจ้งหนี้`
                      : 'ลองปรับเงื่อนไขตัวกรองการค้นหา'}
                  </p>
                </div>
                {onGoToRecordMeter && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onGoToRecordMeter(room);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                  >
                    ออกใบแจ้งหนี้ให้ห้องนี้เลย
                  </button>
                )}
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-3.5 px-3.5 whitespace-nowrap min-w-[140px]">รอบเดือน / เลขที่บิล</th>
                        <th className="py-3.5 px-2.5 text-center bg-amber-50/80 text-amber-900 whitespace-nowrap min-w-[130px]">
                          <div className="flex items-center justify-center gap-1">
                            <Zap className="w-3.5 h-3.5 text-amber-500" />
                            <span>ไฟ (เดิม ➔ ใหม่)</span>
                          </div>
                        </th>
                        <th className="py-3.5 px-2.5 text-center bg-sky-50/80 text-sky-900 whitespace-nowrap min-w-[130px]">
                          <div className="flex items-center justify-center gap-1">
                            <Droplets className="w-3.5 h-3.5 text-sky-500" />
                            <span>น้ำ (เดิม ➔ ใหม่)</span>
                          </div>
                        </th>
                        <th className="py-3.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap min-w-[100px]">ยอดเรียกเก็บ</th>
                        <th className="py-3.5 px-3 text-right font-bold text-emerald-800 whitespace-nowrap min-w-[120px]">
                          <div className="flex items-center justify-end gap-1">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                            <span>ยอดที่จ่ายแล้ว</span>
                          </div>
                        </th>
                        <th className="py-3.5 px-3 text-center whitespace-nowrap min-w-[100px]">หลักฐานสลิป</th>
                        <th className="py-3.5 px-3 text-center whitespace-nowrap min-w-[110px]">สถานะชำระเงิน</th>
                        <th className="py-3.5 px-3.5 text-center whitespace-nowrap min-w-[130px]">การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredBills.map((bill) => {
                        const isPaid = bill.paymentStatus === 'paid';
                        const isPartial = bill.paymentStatus === 'partial';
                        const paidAmount = bill.paidAmount ?? (isPaid ? bill.grandTotal : 0);
                        const balance = Math.max(0, bill.grandTotal - paidAmount);

                        return (
                          <tr 
                            key={bill.id} 
                            className={`transition-colors ${
                              !isPaid && !isPartial 
                                ? 'bg-rose-50/30 hover:bg-rose-50/60' 
                                : isPartial 
                                  ? 'bg-amber-50/30 hover:bg-amber-50/60'
                                  : 'hover:bg-slate-50/80'
                            }`}
                          >
                            {/* Month & Bill Number */}
                            <td className="py-3.5 px-3.5 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 font-mono text-sm">
                                  {bill.monthYear}
                                </span>
                                {!isPaid && !isPartial && (
                                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                                    ยังไม่จ่าย
                                  </span>
                                )}
                                {isPartial && (
                                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                                    จ่ายบางส่วน
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                {bill.billNumber}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {bill.billingDate ? `ออกเมื่อ ${bill.billingDate}` : ''}
                              </div>
                            </td>

                            {/* Electricity Meters */}
                            <td className="py-3.5 px-2.5 text-center bg-amber-50/20 whitespace-nowrap">
                              <div className="font-mono text-xs text-slate-700 inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-200/60">
                                <span>{bill.prevElecMeter}</span>
                                <span className="text-amber-500 font-bold">➔</span>
                                <span className="font-bold text-amber-900">{bill.currElecMeter}</span>
                              </div>
                              <div className="text-[10px] text-amber-700 font-mono mt-0.5">
                                {bill.elecUnits} หน่วย ({formatCurrency(bill.elecAmount)})
                              </div>
                            </td>

                            {/* Water Meters */}
                            <td className="py-3.5 px-2.5 text-center bg-sky-50/20 whitespace-nowrap">
                              <div className="font-mono text-xs text-slate-700 inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-lg bg-sky-50 border border-sky-200/60">
                                <span>{bill.prevWaterMeter}</span>
                                <span className="text-sky-500 font-bold">➔</span>
                                <span className="font-bold text-sky-900">{bill.currWaterMeter}</span>
                              </div>
                              <div className="text-[10px] text-sky-700 font-mono mt-0.5">
                                {bill.waterUnits} หน่วย ({formatCurrency(bill.waterAmount)})
                              </div>
                            </td>

                            {/* Grand Total */}
                            <td className="py-3.5 px-3 text-right whitespace-nowrap">
                              <div className="font-mono font-bold text-slate-900 text-sm">
                                {formatCurrency(bill.grandTotal)}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                เช่า {formatCurrency(bill.roomRentAmount)}
                              </div>
                            </td>

                            {/* Paid Amount */}
                            <td className="py-3.5 px-3 text-right whitespace-nowrap">
                              <div className="font-mono font-bold text-emerald-700 text-sm">
                                {formatCurrency(paidAmount)}
                              </div>
                              {balance > 0 ? (
                                <div className="text-[10px] text-rose-600 font-medium">
                                  ค้าง {formatCurrency(balance)}
                                </div>
                              ) : (
                                <div className="text-[10px] text-emerald-600 font-medium">
                                  ✓ ชำระครบ
                                </div>
                              )}
                            </td>

                            {/* Slip Attached Status / Thumbnail */}
                            <td className="py-3.5 px-3 text-center whitespace-nowrap">
                              {bill.slipImage ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedSlipBill(bill)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-bold transition-colors cursor-pointer group shadow-2xs"
                                  title="คลิกเพื่อดูรูปสลิป"
                                >
                                  <ImageIcon className="w-3.5 h-3.5 text-indigo-600 group-hover:scale-110 transition-transform" />
                                  <span>ดูสลิป</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => onOpenInvoiceModal(bill)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer border border-dashed border-slate-200"
                                  title="แนบสลิปโอนเงิน"
                                >
                                  <span>+ แนบสลิป</span>
                                </button>
                              )}
                            </td>

                            {/* Status & Quick Toggle */}
                            <td className="py-3.5 px-3 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => {
                                  if (onUpdateBillStatus) {
                                    onUpdateBillStatus(bill.id, isPaid ? 'unpaid' : 'paid');
                                  }
                                }}
                                className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs whitespace-nowrap ${
                                  isPaid
                                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                                    : isPartial
                                      ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300'
                                      : 'bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-300'
                                }`}
                                title="คลิกเพื่อสลับสถานะการชำระเงิน"
                              >
                                {isPaid ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>ชำระแล้ว</span>
                                  </>
                                ) : isPartial ? (
                                  <>
                                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                                    <span>จ่ายบางส่วน</span>
                                  </>
                                ) : (
                                  <>
                                    <Clock className="w-3.5 h-3.5 text-rose-600" />
                                    <span>ยังไม่จ่าย</span>
                                  </>
                                )}
                              </button>
                            </td>

                            {/* Action Buttons */}
                            <td className="py-3.5 px-3.5 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5 flex-nowrap">
                                <button
                                  type="button"
                                  onClick={() => onOpenInvoiceModal(bill)}
                                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                                  title="เปิดดูใบแจ้งหนี้ / แนบสลิป / จดเงิน"
                                >
                                  <CreditCard className="w-3.5 h-3.5" />
                                  <span className="whitespace-nowrap">ดูบิล & สลิป</span>
                                </button>

                                {onDeleteBill && (
                                  <button
                                    type="button"
                                    onClick={() => setBillToDelete(bill)}
                                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer shrink-0 border border-rose-200"
                                    title="ลบบันทึก/บิลนี้"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="bg-slate-50 border-t border-slate-200 p-4 px-6 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <span>แสดงบิลทั้งหมดของห้อง {room.number}:</span>
              <strong className="text-slate-800">{roomBills.length} ฉบับ</strong>
              <span>(ชำระแล้ว {stats.paidBillsCount} / รอชำระ {stats.unpaidBillsCount} / มีสลิป {stats.slipCount})</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </motion.div>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {billToDelete && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-5 shadow-xl space-y-3"
              >
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="text-center space-y-1">
                  <h4 className="font-bold text-slate-900 text-sm">ลบบิลรอบ {billToDelete.monthYear}?</h4>
                  <p className="text-xs text-slate-500">
                    ใบแจ้งหนี้ {billToDelete.billNumber} ยอด {formatCurrency(billToDelete.grandTotal)}
                  </p>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setBillToDelete(null)}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onDeleteBill && billToDelete) {
                        onDeleteBill(billToDelete.id);
                      }
                      setBillToDelete(null);
                    }}
                    className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    ลบเลย
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Direct Slip Viewer from Room Bill History */}
      {selectedSlipBill && selectedSlipBill.slipImage && (
        <SlipViewerModal
          isOpen={!!selectedSlipBill}
          onClose={() => setSelectedSlipBill(null)}
          slipUrl={selectedSlipBill.slipImage}
          billNumber={selectedSlipBill.billNumber}
          roomNumber={selectedSlipBill.roomNumber}
          tenantName={selectedSlipBill.tenantName}
          paidAmount={selectedSlipBill.paidAmount ?? (selectedSlipBill.paymentStatus === 'paid' ? selectedSlipBill.grandTotal : 0)}
          paidDate={selectedSlipBill.paidDate}
          paidMethod={selectedSlipBill.paidMethod}
          slipReference={selectedSlipBill.slipReference}
        />
      )}
    </>
  );
};
