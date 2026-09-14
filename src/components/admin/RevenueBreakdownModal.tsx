import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CreditCard, X, TrendingUp, CheckCircle2, AlertCircle, 
  RefreshCw, Edit3, Save, Building2, User, ArrowRight,
  HelpCircle, Receipt, DollarSign, Sparkles, Check
} from 'lucide-react';
import { Room, Tenant, Booking, UtilityBill } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface RevenueBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: Room[];
  tenants: Tenant[];
  bookings: Booking[];
  bills: UtilityBill[];
  totalProjectedRent: number;
  paidRentAmount: number;
  occupiedRoomsData: Array<{
    room: Room;
    tenantName: string;
    tenantPhone?: string;
    monthlyRent: number;
    rentalType: 'daily' | 'monthly';
    isPaidThisMonth: boolean;
    billId?: string;
  }>;
  onUpdateRoomMonthlyRate?: (roomId: string, newRate: number) => void;
  onRefreshData?: () => Promise<void> | void;
  onNavigateTab: (tab: 'dashboard' | 'rooms' | 'utilities' | 'bookings' | 'settings') => void;
}

export const RevenueBreakdownModal: React.FC<RevenueBreakdownModalProps> = ({
  isOpen,
  onClose,
  rooms,
  tenants,
  bookings,
  bills,
  totalProjectedRent,
  paidRentAmount,
  occupiedRoomsData,
  onUpdateRoomMonthlyRate,
  onRefreshData,
  onNavigateTab,
}) => {
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editRateInput, setEditRateInput] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [saveSuccessRoomId, setSaveSuccessRoomId] = useState<string | null>(null);
  const [refreshSuccess, setRefreshSuccess] = useState(false);

  if (!isOpen) return null;

  const handleStartEdit = (roomId: string, currentRate: number) => {
    setEditingRoomId(roomId);
    setEditRateInput(String(currentRate));
  };

  const handleSaveRate = (roomId: string) => {
    const num = parseFloat(editRateInput);
    if (!isNaN(num) && num >= 0 && onUpdateRoomMonthlyRate) {
      onUpdateRoomMonthlyRate(roomId, num);
      setSaveSuccessRoomId(roomId);
      setTimeout(() => setSaveSuccessRoomId(null), 2000);
    }
    setEditingRoomId(null);
  };

  const handleTriggerRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (onRefreshData) {
        await onRefreshData();
      }
      setRefreshSuccess(true);
      setTimeout(() => setRefreshSuccess(false), 2500);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden my-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  รายละเอียดรายได้ค่าเช่ารายเดือน
                </h3>
                <p className="text-xs text-slate-500">
                  ตรวจสอบที่มาของตัวเลข แก้ไขราคาค่าเช่า หรือซิงค์ข้อมูลให้เป็นปัจจุบัน
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {/* Top Stat Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200">
                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider block">
                  ค่าเช่ารวมตามสัญญา (คาดการณ์)
                </span>
                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-900 font-mono mt-1">
                  {formatCurrency(totalProjectedRent)}
                </div>
                <span className="text-[11px] text-emerald-700 mt-1 block">
                  จากห้องที่มีผู้เช่า {occupiedRoomsData.length} ห้อง
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-200">
                <span className="text-xs font-semibold text-sky-700 uppercase tracking-wider block">
                  ยอดที่ชำระบิลแล้วจริงในรอบนี้
                </span>
                <div className="text-2xl sm:text-3xl font-extrabold text-sky-900 font-mono mt-1">
                  {formatCurrency(paidRentAmount)}
                </div>
                <span className="text-[11px] text-sky-700 mt-1 block">
                  {totalProjectedRent > 0
                    ? `คิดเป็น ${Math.round((paidRentAmount / totalProjectedRent) * 100)}% ของค่าเช่าทั้งหมด`
                    : 'ยังไม่มีการเก็บเงิน'}
                </span>
              </div>
            </div>

            {/* Explanatory Help Card: "ถ้าเงินไม่อัปเดต" */}
            <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-4 text-xs text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-950">
                <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>คำแนะนำ: หากตัวเลขเงินค่าเช่าไม่อัปเดต เกิดจากสาเหตุใดได้บ้าง?</span>
              </div>
              <ul className="space-y-1.5 list-disc pl-5 text-amber-900/90 leading-relaxed">
                <li>
                  <strong>ตัวเลขนี้คำนวณจาก:</strong> ค่าเช่าของห้องที่มีผู้เช่าพักอยู่จริงในปัจจุบัน (ห้องที่สถานะมีผู้เช่า หรือมีสัญญาเช่าใช้งานอยู่)
                </li>
                <li>
                  <strong>ต้องการปรับเปลี่ยนตัวเลข?:</strong> สามารถกดปุ่ม <strong>[✏️ แก้ไขค่าเช่า]</strong> ในรายการแต่ละห้องด้านล่าง แล้วพิมพ์ราคาใหม่ได้ทันที ระบบจะอัปเดตยอดรวมให้ทันที
                </li>
                <li>
                  <strong>เพิ่งเพิ่มผู้เช่า / มีการเช็คอินใหม่:</strong> หากเพิ่มผู้เช่าแล้วตัวเลขยังไม่เปลี่ยน สามารถกดปุ่ม <strong>[🔄 ซิงค์และรีเฟรชข้อมูล]</strong> ด้านล่างเพื่ออัปเดตสถานะห้องอัตโนมัติ
                </li>
                <li>
                  <strong>ยอดเงินที่เก็บได้จริง:</strong> จะอัปเดตเมื่อมีการออกบิลในเมนู "จดมิเตอร์น้ำ-ไฟ" และกดบันทึกสถานะเป็น "ชำระแล้ว"
                </li>
              </ul>
            </div>

            {/* Table of Occupied Rooms */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span>รายการห้องที่มีผู้เช่าในปัจจุบัน ({occupiedRoomsData.length} ห้อง)</span>
                </h4>
                <button
                  type="button"
                  onClick={handleTriggerRefresh}
                  disabled={isRefreshing}
                  className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>{refreshSuccess ? 'ซิงค์เรียบร้อย!' : 'ซิงค์และคำนวณใหม่'}</span>
                </button>
              </div>

              {occupiedRoomsData.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                  <p className="text-sm font-medium text-slate-600">ยังไม่มีห้องที่มีผู้เช่าในระบบ</p>
                  <p className="text-xs text-slate-400 mt-1">
                    เมื่อคุณเช็คอินผู้เช่าหรือตั้งสถานะห้องเป็น "มีผู้เช่า" รายได้จะถูกนำมาคำนวณอัตโนมัติ
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                  {occupiedRoomsData.map((item) => {
                    const isEditing = editingRoomId === item.room.id;
                    const isSaved = saveSuccessRoomId === item.room.id;

                    return (
                      <div
                        key={item.room.id}
                        className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:bg-slate-50/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 font-mono font-bold text-slate-800 flex items-center justify-center text-sm shrink-0">
                            {item.room.number}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-900">ห้อง {item.room.number}</span>
                              <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                                {item.room.type} (ชั้น {item.room.floor})
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              <span>{item.tenantName}</span>
                              {item.tenantPhone && (
                                <span className="font-mono text-slate-400">({item.tenantPhone})</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right side: Rent Rate & Quick Edit */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 pl-13 sm:pl-0">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-500">฿</span>
                              <input
                                type="number"
                                value={editRateInput}
                                onChange={(e) => setEditRateInput(e.target.value)}
                                className="w-24 px-2 py-1 text-sm font-mono font-bold text-slate-900 bg-white border border-indigo-400 rounded-lg outline-none focus:ring-2 focus:ring-indigo-100"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveRate(item.room.id);
                                  if (e.key === 'Escape') setEditingRoomId(null);
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveRate(item.room.id)}
                                className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                                title="บันทึกราคาใหม่"
                              >
                                <Save className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingRoomId(null)}
                                className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-lg text-xs transition-colors cursor-pointer"
                                title="ยกเลิก"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <div className="text-sm sm:text-base font-bold font-mono text-slate-900">
                                  {formatCurrency(item.monthlyRent)}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  {item.isPaidThisMonth ? (
                                    <span className="text-emerald-600 font-semibold flex items-center justify-end gap-0.5">
                                      <CheckCircle2 className="w-3 h-3" /> ชำระบิลแล้ว
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">ยังไม่ชำระ / รอเก็บเงิน</span>
                                  )}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleStartEdit(item.room.id, item.monthlyRent)}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                                title="แก้ไขค่าเช่าของห้องนี้"
                              >
                                {isSaved ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    <span className="text-emerald-700">บันทึกแล้ว</span>
                                  </>
                                ) : (
                                  <>
                                    <Edit3 className="w-3.5 h-3.5" />
                                    <span>แก้ไขค่าเช่า</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateTab('rooms');
                }}
                className="text-xs font-semibold text-slate-700 hover:text-indigo-600 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>จัดการห้องพักทั้งหมด</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateTab('utilities');
                }}
                className="text-xs font-semibold text-slate-700 hover:text-indigo-600 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>จดมิเตอร์ & ดูใบแจ้งหนี้</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
