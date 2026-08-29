import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calculator, Droplets, Zap, Settings, RefreshCw, 
  FileText, CheckCircle2, AlertTriangle, ArrowRight,
  TrendingUp, Download, Check, Sparkles, Building, User,
  Plus, Edit3, ChevronRight, SlidersHorizontal, Eye, Trash2, RotateCcw,
  History, BarChart3, Search, Filter, Clock
} from 'lucide-react';
import { Room, UtilityRateConfig, UtilityBill, PropertyProfile } from '../../types';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { RoomBillHistoryModal } from './RoomBillHistoryModal';

interface UtilityCalculatorProps {
  rooms: Room[];
  utilityConfig: UtilityRateConfig;
  onUpdateUtilityConfig: (newConfig: UtilityRateConfig) => void;
  onUpdateRoomMeters: (roomId: string, newWater: number, newElec: number) => void;
  onGenerateBill: (bill: UtilityBill) => void;
  onDeleteBill?: (billId: string) => void;
  onOpenInvoiceModal: (bill: UtilityBill) => void;
  onUpdateBillStatus?: (billId: string, status: 'paid' | 'unpaid') => void;
  existingBills: UtilityBill[];
  property: PropertyProfile;
}

export const UtilityCalculator: React.FC<UtilityCalculatorProps> = ({
  rooms,
  utilityConfig,
  onUpdateUtilityConfig,
  onUpdateRoomMeters,
  onGenerateBill,
  onDeleteBill,
  onOpenInvoiceModal,
  onUpdateBillStatus,
  existingBills,
  property,
}) => {
  const [selectedMonth, setSelectedMonth] = useState('2026-08');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'matrix' | 'all_bills' | 'simulator'>('matrix');
  const [statusFilter, setStatusFilter] = useState<'all' | 'occupied'>('occupied');
  const [searchQuery, setSearchQuery] = useState('');
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string | null>(null);
  const [billToDelete, setBillToDelete] = useState<UtilityBill | null>(null);
  const [selectedRoomForHistory, setSelectedRoomForHistory] = useState<Room | null>(null);

  // All bills history tab state
  const [historyRoomFilter, setHistoryRoomFilter] = useState<string>('all');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [historyMonthFilter, setHistoryMonthFilter] = useState<string>('all');
  const [historySearchQuery, setHistorySearchQuery] = useState<string>('');

  // Meter edit states per room
  const [meterDrafts, setMeterDrafts] = useState<{
    [roomId: string]: {
      prevWater: number;
      currWater: number;
      prevElec: number;
      currElec: number;
      otherFee: number;
      otherNote: string;
      discount: number;
    };
  }>(() => {
    const initial: any = {};
    rooms.forEach((r) => {
      initial[r.id] = {
        prevWater: r.previousWaterMeter,
        currWater: r.currentWaterMeter,
        prevElec: r.previousElecMeter,
        currElec: r.currentElecMeter,
        otherFee: 0,
        otherNote: '',
        discount: 0,
      };
    });
    return initial;
  });

  // Rates draft for config modal
  const [tempRates, setTempRates] = useState<UtilityRateConfig>(utilityConfig);

  // Standalone simulator state
  const [simPrevWater, setSimPrevWater] = useState<number>(150);
  const [simCurrWater, setSimCurrWater] = useState<number>(168);
  const [simPrevElec, setSimPrevElec] = useState<number>(2400);
  const [simCurrElec, setSimCurrElec] = useState<number>(2640);
  const [simRentAmount, setSimRentAmount] = useState<number>(5000);
  const [simIncludeCommon, setSimIncludeCommon] = useState<boolean>(true);
  const [simIncludeInternet, setSimIncludeInternet] = useState<boolean>(true);

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      const hasTenant = r.status === 'occupied' && Boolean(r.currentTenant);
      if (statusFilter === 'occupied' && !hasTenant) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesNum = r.number.toLowerCase().includes(query);
        const matchesTenant = r.currentTenant?.name.toLowerCase().includes(query);
        return matchesNum || matchesTenant;
      }
      return true;
    });
  }, [rooms, statusFilter, searchQuery]);

  // Filtered bills for All Bills History tab
  const filteredAllBills = useMemo(() => {
    return existingBills.filter((b) => {
      if (historyRoomFilter !== 'all' && b.roomId !== historyRoomFilter && b.roomNumber !== historyRoomFilter) return false;
      if (historyStatusFilter !== 'all' && b.paymentStatus !== historyStatusFilter) return false;
      if (historyMonthFilter !== 'all' && b.monthYear !== historyMonthFilter) return false;
      if (historySearchQuery) {
        const q = historySearchQuery.toLowerCase();
        const matchesNum = b.roomNumber.toLowerCase().includes(q);
        const matchesTenant = b.tenantName.toLowerCase().includes(q);
        const matchesBill = b.billNumber.toLowerCase().includes(q);
        return matchesNum || matchesTenant || matchesBill;
      }
      return true;
    });
  }, [existingBills, historyRoomFilter, historyStatusFilter, historyMonthFilter, historySearchQuery]);

  // Summary stats for All Bills tab
  const allBillsStats = useMemo(() => {
    const totalCount = existingBills.length;
    const totalElecUnits = existingBills.reduce((s, b) => s + (b.elecUnits || 0), 0);
    const totalElecCost = existingBills.reduce((s, b) => s + (b.elecAmount || 0), 0);
    const totalWaterUnits = existingBills.reduce((s, b) => s + (b.waterUnits || 0), 0);
    const totalWaterCost = existingBills.reduce((s, b) => s + (b.waterAmount || 0), 0);
    const grandTotal = existingBills.reduce((s, b) => s + (b.grandTotal || 0), 0);
    const paidAmount = existingBills.filter(b => b.paymentStatus === 'paid').reduce((s, b) => s + (b.grandTotal || 0), 0);
    const unpaidAmount = existingBills.filter(b => b.paymentStatus === 'unpaid').reduce((s, b) => s + (b.grandTotal || 0), 0);

    return {
      totalCount,
      totalElecUnits,
      totalElecCost,
      totalWaterUnits,
      totalWaterCost,
      grandTotal,
      paidAmount,
      unpaidAmount,
    };
  }, [existingBills]);

  // Unique months available in existingBills
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    existingBills.forEach(b => { if (b.monthYear) set.add(b.monthYear); });
    return Array.from(set).sort().reverse();
  }, [existingBills]);

  // Handle meter input change
  const handleMeterChange = (
    roomId: string,
    field: 'currWater' | 'currElec' | 'prevWater' | 'prevElec' | 'otherFee' | 'discount',
    val: number
  ) => {
    setMeterDrafts((prev) => ({
      ...prev,
      [roomId]: {
        ...prev[roomId],
        [field]: isNaN(val) ? 0 : val,
      },
    }));
  };

  // Save meters to room state
  const handleSaveMeters = (roomId: string) => {
    const draft = meterDrafts[roomId];
    if (!draft) return;
    onUpdateRoomMeters(roomId, draft.currWater, draft.currElec);
    setSavedSuccessMsg(`บันทึกมิเตอร์ห้อง ${rooms.find(r => r.id === roomId)?.number} เรียบร้อยแล้ว`);
    setTimeout(() => setSavedSuccessMsg(null), 3000);
  };

  // Generate bill for a room (create or update/re-issue)
  const handleCreateBill = (room: Room) => {
    if (!room.currentTenant || room.status !== 'occupied') {
      setSavedSuccessMsg(`⚠️ ห้อง ${room.number} ไม่มีผู้เช่าพักอาศัย จึงไม่สามารถออกบิลได้`);
      setTimeout(() => setSavedSuccessMsg(null), 3500);
      return;
    }

    const draft = meterDrafts[room.id] || {
      prevWater: room.previousWaterMeter,
      currWater: room.currentWaterMeter,
      prevElec: room.previousElecMeter,
      currElec: room.currentElecMeter,
      otherFee: 0,
      otherNote: '',
      discount: 0,
    };

    const waterUnits = Math.max(0, draft.currWater - draft.prevWater);
    const elecUnits = Math.max(0, draft.currElec - draft.prevElec);
    const waterAmount = waterUnits * utilityConfig.waterRatePerUnit;
    const elecAmount = elecUnits * utilityConfig.elecRatePerUnit;
    const roomRent = room.monthlyRate;
    const commonFee = utilityConfig.commonFeeMonthly;
    const internetFee = utilityConfig.internetFeeMonthly;
    const trashFee = utilityConfig.trashFeeMonthly;
    const parkingFee = room.currentTenant ? utilityConfig.parkingFeeMonthly : 0;
    const otherFees = draft.otherFee || 0;
    const discount = draft.discount || 0;

    const subtotal = roomRent + waterAmount + elecAmount + commonFee + internetFee + trashFee + parkingFee + otherFees;
    const grandTotal = Math.max(0, subtotal - discount);

    const existingRoomBills = existingBills.filter(
      b => b.roomId === room.id || b.roomNumber === room.number
    );
    const sameMonthBills = existingBills.filter(
      b => (b.roomId === room.id || b.roomNumber === room.number) && b.monthYear === selectedMonth
    );

    const billNumberSuffix = sameMonthBills.length > 0 ? `-${sameMonthBills.length + 1}` : '';
    const billNumber = `INV-${selectedMonth.replace('-', '')}-${room.number}${billNumberSuffix}`;
    const todayStr = new Date().toISOString().split('T')[0];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 10);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    const newBill: UtilityBill = {
      id: `bill-${Date.now()}-${room.id}-${Math.floor(Math.random() * 1000)}`,
      billNumber,
      roomId: room.id,
      roomNumber: room.number,
      tenantName: room.currentTenant?.name || 'ผู้เช่าห้องพัก',
      tenantPhone: room.currentTenant?.phone || '',
      monthYear: selectedMonth,
      billingDate: todayStr,
      dueDate: dueDateStr,
      prevWaterMeter: draft.prevWater,
      currWaterMeter: draft.currWater,
      waterUnits,
      waterRate: utilityConfig.waterRatePerUnit,
      waterAmount,
      prevElecMeter: draft.prevElec,
      currElecMeter: draft.currElec,
      elecUnits,
      elecRate: utilityConfig.elecRatePerUnit,
      elecAmount,
      roomRentAmount: roomRent,
      commonFee,
      internetFee,
      parkingFee,
      trashFee,
      otherFees,
      otherFeesNote: draft.otherNote,
      discount,
      subtotal,
      grandTotal,
      paymentStatus: 'unpaid', // Newly recorded bills start as unpaid
      note: `ใบแจ้งหนี้ค่าเช่าและค่าน้ำค่าไฟ ประจำเดือน ${selectedMonth}`,
    };

    // Synchronize current meter readings into room state
    onUpdateRoomMeters(room.id, draft.currWater, draft.currElec);

    // Save as new bill in history
    onGenerateBill(newBill);

    const totalRoomBills = existingRoomBills.length + 1;
    setSavedSuccessMsg(`🎉 ออกบิลใหม่ห้อง ${room.number} ประจำงวด ${selectedMonth} สำเร็จ! (ห้องนี้มีบิลสะสมทั้งหมด ${totalRoomBills} บิล)`);
    setTimeout(() => setSavedSuccessMsg(null), 4000);

    onOpenInvoiceModal(newBill);
  };

  // Batch generate for all occupied rooms
  const handleBatchGenerate = () => {
    const occupied = rooms.filter(r => r.status === 'occupied' && Boolean(r.currentTenant));
    if (occupied.length === 0) {
      setSavedSuccessMsg('⚠️ ไม่พบห้องที่มีผู้เช่าพักอาศัยสำหรับออกใบแจ้งหนี้');
      setTimeout(() => setSavedSuccessMsg(null), 3500);
      return;
    }
    occupied.forEach(r => {
      const draft = meterDrafts[r.id] || {
        prevWater: r.previousWaterMeter,
        currWater: r.currentWaterMeter,
        prevElec: r.previousElecMeter,
        currElec: r.currentElecMeter,
      };
      const waterUnits = Math.max(0, draft.currWater - draft.prevWater);
      const elecUnits = Math.max(0, draft.currElec - draft.prevElec);
      const waterAmount = waterUnits * utilityConfig.waterRatePerUnit;
      const elecAmount = elecUnits * utilityConfig.elecRatePerUnit;
      const subtotal = r.monthlyRate + waterAmount + elecAmount + utilityConfig.commonFeeMonthly + utilityConfig.trashFeeMonthly;
      
      const billNumber = `INV-${selectedMonth.replace('-', '')}-${r.number}`;
      const existing = existingBills.find(b => b.roomId === r.id && b.monthYear === selectedMonth);

      const newBill: UtilityBill = {
        id: existing ? existing.id : `bill-${Date.now()}-${r.id}`,
        billNumber,
        roomId: r.id,
        roomNumber: r.number,
        tenantName: r.currentTenant?.name || 'ผู้เช่า',
        tenantPhone: r.currentTenant?.phone || '',
        monthYear: selectedMonth,
        billingDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
        prevWaterMeter: draft.prevWater,
        currWaterMeter: draft.currWater,
        waterUnits,
        waterRate: utilityConfig.waterRatePerUnit,
        waterAmount,
        prevElecMeter: draft.prevElec,
        currElecMeter: draft.currElec,
        elecUnits,
        elecRate: utilityConfig.elecRatePerUnit,
        elecAmount,
        roomRentAmount: r.monthlyRate,
        commonFee: utilityConfig.commonFeeMonthly,
        internetFee: 0,
        parkingFee: 0,
        trashFee: utilityConfig.trashFeeMonthly,
        otherFees: 0,
        discount: 0,
        subtotal,
        grandTotal: subtotal,
        paymentStatus: existing?.paymentStatus || 'unpaid',
      };

      onUpdateRoomMeters(r.id, draft.currWater, draft.currElec);
      onGenerateBill(newBill);
    });

    setSavedSuccessMsg(`ออก/อัปเดตใบแจ้งหนี้อัตโนมัติเรียบร้อยทั้งหมด ${occupied.length} ห้อง`);
    setTimeout(() => setSavedSuccessMsg(null), 3500);
  };

  // Simulator calculations
  const simWaterUnits = Math.max(0, simCurrWater - simPrevWater);
  const simWaterCost = simWaterUnits * utilityConfig.waterRatePerUnit;
  const simElecUnits = Math.max(0, simCurrElec - simPrevElec);
  const simElecCost = simElecUnits * utilityConfig.elecRatePerUnit;
  const simTotalUtilities = simWaterCost + simElecCost;
  const simCommonCost = simIncludeCommon ? utilityConfig.commonFeeMonthly : 0;
  const simInternetCost = simIncludeInternet ? utilityConfig.internetFeeMonthly : 0;
  const simGrandTotal = simRentAmount + simTotalUtilities + simCommonCost + simInternetCost;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {savedSuccessMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-emerald-400"
          >
            <CheckCircle2 className="w-5 h-5 text-white" />
            <span className="font-semibold text-sm">{savedSuccessMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner & Live Unit Rate Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl md:rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
                <Calculator className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  ระบบคำนวณค่าน้ำ-ค่าไฟ และจดมิเตอร์
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  คำนวณยอดเงินอัตโนมัติตามเลขมิเตอร์ ออกบิลใบแจ้งหนี้พร้อม PromptPay QR Code
                </p>
              </div>
            </div>
          </div>

          {/* Current Rates Badges & Edit Button */}
          <div className="flex flex-wrap items-center gap-2.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-sky-50 border border-sky-200 rounded-xl text-xs">
              <Droplets className="w-4 h-4 text-sky-600" />
              <span className="text-slate-500">ค่าน้ำ:</span>
              <span className="font-bold text-sky-700 font-mono">{utilityConfig.waterRatePerUnit} ฿/หน่วย</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-xs">
              <Zap className="w-4 h-4 text-amber-600" />
              <span className="text-slate-500">ค่าไฟ:</span>
              <span className="font-bold text-amber-700 font-mono">{utilityConfig.elecRatePerUnit} ฿/หน่วย</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs">
              <Building className="w-4 h-4 text-indigo-600" />
              <span className="text-slate-500">ส่วนกลาง:</span>
              <span className="font-bold text-indigo-700 font-mono">{utilityConfig.commonFeeMonthly} ฿/ด.</span>
            </div>

            <button
              type="button"
              onClick={() => {
                setTempRates(utilityConfig);
                setShowConfigModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>ตั้งราคาต่อหน่วย</span>
            </button>
          </div>
        </div>

        {/* Sub Navigation: Matrix vs All Bills vs Simulator */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setActiveTab('matrix')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'matrix'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>ตารางจดมิเตอร์รายห้อง (Meter Matrix)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('all_bills')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'all_bills'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>ประวัติการบันทึก & บิลทั้งหมด ({existingBills.length})</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/20 text-white font-bold">
              {existingBills.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('simulator')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'simulator'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>เครื่องคิดเลขค่าน้ำ-ไฟด่วน (Instant Sandbox)</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Room-by-Room Meter Matrix */}
      {activeTab === 'matrix' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl md:rounded-3xl p-4 shadow-sm flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Month Selector */}
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs">
                <span className="text-slate-500">รอบบิล:</span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent text-slate-900 font-bold outline-none cursor-pointer"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setStatusFilter('occupied')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    statusFilter === 'occupied'
                      ? 'bg-white text-indigo-600 font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  เฉพาะห้องที่มีคนพัก ({rooms.filter(r => r.status === 'occupied' && Boolean(r.currentTenant)).length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-white text-indigo-600 font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ทุกห้อง ({rooms.length})
                </button>
              </div>
            </div>

            {/* Batch Action */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBatchGenerate}
                className="w-full md:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-100 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>ออกใบแจ้งหนี้อัตโนมัติทุกห้อง (Batch Bill)</span>
              </button>
            </div>
          </div>

          {/* Meter Entry Matrix Table */}
          <div className="bg-white border border-slate-200 rounded-2xl md:rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4 font-semibold">ห้อง / ผู้เช่า</th>
                    <th className="py-3.5 px-3 font-semibold text-center bg-sky-50/50 text-sky-700">
                      <div className="flex items-center justify-center gap-1">
                        <Droplets className="w-3.5 h-3.5" />
                        <span>มิเตอร์น้ำเดิม</span>
                      </div>
                    </th>
                    <th className="py-3.5 px-3 font-semibold text-center bg-sky-50 text-sky-800">
                      <span>มิเตอร์น้ำใหม่</span>
                    </th>
                    <th className="py-3.5 px-3 font-semibold text-center text-sky-700">
                      <span>ใช้น้ำ (หน่วย/บาท)</span>
                    </th>
                    <th className="py-3.5 px-3 font-semibold text-center bg-amber-50/50 text-amber-700">
                      <div className="flex items-center justify-center gap-1">
                        <Zap className="w-3.5 h-3.5" />
                        <span>มิเตอร์ไฟเดิม</span>
                      </div>
                    </th>
                    <th className="py-3.5 px-3 font-semibold text-center bg-amber-50 text-amber-800">
                      <span>มิเตอร์ไฟใหม่</span>
                    </th>
                    <th className="py-3.5 px-3 font-semibold text-center text-amber-700">
                      <span>ใช้ไฟ (หน่วย/บาท)</span>
                    </th>
                    <th className="py-3.5 px-3 font-semibold text-right">ค่าเช่า + ส่วนกลาง</th>
                    <th className="py-3.5 px-4 font-semibold text-right text-emerald-700">ยอดรวมทั้งสิ้น</th>
                    <th className="py-3.5 px-4 font-semibold text-center whitespace-nowrap min-w-[280px]">จัดการ & ออกบิล</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRooms.map((room) => {
                    const draft = meterDrafts[room.id] || {
                      prevWater: room.previousWaterMeter,
                      currWater: room.currentWaterMeter,
                      prevElec: room.previousElecMeter,
                      currElec: room.currentElecMeter,
                      otherFee: 0,
                      otherNote: '',
                      discount: 0,
                    };

                    const waterUnits = Math.max(0, draft.currWater - draft.prevWater);
                    const waterCost = waterUnits * utilityConfig.waterRatePerUnit;
                    const isWaterNegative = draft.currWater < draft.prevWater;

                    const elecUnits = Math.max(0, draft.currElec - draft.prevElec);
                    const elecCost = elecUnits * utilityConfig.elecRatePerUnit;
                    const isElecNegative = draft.currElec < draft.prevElec;
                    const isHighElec = elecUnits > 300;

                    const isRoomOccupied = room.status === 'occupied' && Boolean(room.currentTenant);
                    const rentAmount = isRoomOccupied ? room.monthlyRate : 0;
                    const commonCost = isRoomOccupied ? (utilityConfig.commonFeeMonthly + utilityConfig.trashFeeMonthly) : 0;
                    const totalRoomBill = isRoomOccupied ? (rentAmount + commonCost + waterCost + elecCost) : (waterCost + elecCost);

                    // Existing bill status if already generated
                    const existingBill = existingBills.find(
                      b => b.roomId === room.id && b.monthYear === selectedMonth
                    );

                    // Check if meter reading in draft differs from what was saved in the existing bill
                    const isMeterModifiedFromBill = existingBill ? (
                      draft.currWater !== existingBill.currWaterMeter ||
                      draft.currElec !== existingBill.currElecMeter ||
                      draft.prevWater !== existingBill.prevWaterMeter ||
                      draft.prevElec !== existingBill.prevElecMeter
                    ) : false;

                    // Room bills count for electricity tracking
                    const roomBillsCount = existingBills.filter(
                      b => b.roomId === room.id || b.roomNumber === room.number
                    ).length;

                    return (
                      <tr 
                        key={room.id} 
                        className={`hover:bg-slate-50/70 transition-colors ${
                          room.status !== 'occupied' ? 'opacity-60 bg-slate-50/30' : ''
                        }`}
                      >
                        {/* Room & Tenant */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-start gap-2.5">
                            <span className="w-11 h-9 rounded-lg bg-slate-100 border border-slate-200 font-bold text-slate-800 flex items-center justify-center text-sm font-mono shrink-0">
                              {room.number}
                            </span>
                            <div>
                              <div className="font-semibold text-slate-900">
                                {room.currentTenant?.name || (
                                  <span className="text-slate-400 font-normal italic">ไม่มีผู้เช่า</span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-2">
                                <span>{room.type}</span>
                                <span>•</span>
                                <span>ชั้น {room.floor}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setSelectedRoomForHistory(room)}
                                className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 text-[10px] font-semibold transition-colors cursor-pointer"
                                title={`คลิกเพื่อดูประวัติการบันทึกค่าไฟ ${roomBillsCount} ครั้งของห้อง ${room.number}`}
                              >
                                <History className="w-2.5 h-2.5 text-amber-600" />
                                <span>ประวัติค่าไฟ ({roomBillsCount} ครั้ง)</span>
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Prev Water Meter */}
                        <td className="py-3 px-3 text-center bg-sky-50/30">
                          <input
                            type="number"
                            value={draft.prevWater}
                            onChange={(e) => handleMeterChange(room.id, 'prevWater', parseFloat(e.target.value))}
                            className="w-16 bg-white border border-sky-200 rounded-lg py-1 px-1.5 text-center text-sky-800 font-mono text-xs focus:ring-1 focus:ring-sky-400 outline-none"
                          />
                        </td>

                        {/* Current Water Meter (Editable) */}
                        <td className="py-3 px-3 text-center bg-sky-50/50">
                          <div className="flex flex-col items-center">
                            <input
                              type="number"
                              value={draft.currWater}
                              onChange={(e) => handleMeterChange(room.id, 'currWater', parseFloat(e.target.value))}
                              className={`w-20 bg-white border rounded-lg py-1.5 px-2 text-center text-slate-900 font-mono font-bold text-sm outline-none transition-all ${
                                isWaterNegative 
                                   ? 'border-rose-400 bg-rose-50 text-rose-700' 
                                  : 'border-sky-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
                              }`}
                              placeholder="ใส่เลข"
                            />
                            {isWaterNegative && (
                              <span className="text-[10px] text-rose-600 mt-0.5">มิเตอร์น้อยกว่าเดิม</span>
                            )}
                          </div>
                        </td>

                        {/* Water Calc Result */}
                        <td className="py-3 px-3 text-center">
                          <div className="font-mono font-bold text-sky-700">{waterUnits} หน่วย</div>
                          <div className="text-[11px] text-slate-500">{formatCurrency(waterCost)}</div>
                        </td>

                        {/* Prev Elec Meter */}
                        <td className="py-3 px-3 text-center bg-amber-50/30">
                          <input
                            type="number"
                            value={draft.prevElec}
                            onChange={(e) => handleMeterChange(room.id, 'prevElec', parseFloat(e.target.value))}
                            className="w-20 bg-white border border-amber-200 rounded-lg py-1 px-1.5 text-center text-amber-800 font-mono text-xs focus:ring-1 focus:ring-amber-400 outline-none"
                          />
                        </td>

                        {/* Current Elec Meter (Editable) */}
                        <td className="py-3 px-3 text-center bg-amber-50/50">
                          <div className="flex flex-col items-center">
                            <input
                              type="number"
                              value={draft.currElec}
                              onChange={(e) => handleMeterChange(room.id, 'currElec', parseFloat(e.target.value))}
                              className={`w-24 bg-white border rounded-lg py-1.5 px-2 text-center text-slate-900 font-mono font-bold text-sm outline-none transition-all ${
                                isElecNegative 
                                  ? 'border-rose-400 bg-rose-50 text-rose-700' 
                                  : 'border-amber-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-100'
                              }`}
                              placeholder="ใส่เลข"
                            />
                            {isHighElec && (
                              <span className="text-[10px] text-amber-700 flex items-center gap-0.5 mt-0.5">
                                <AlertTriangle className="w-2.5 h-2.5 text-amber-600" /> ใช้ไฟเยอะ
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Elec Calc Result */}
                        <td className="py-3 px-3 text-center">
                          <div className="font-mono font-bold text-amber-700">{elecUnits} หน่วย</div>
                          <div className="text-[11px] text-slate-500">{formatCurrency(elecCost)}</div>
                        </td>

                        {/* Rent + Common */}
                        <td className="py-3 px-3 text-right">
                          <div className="font-mono font-semibold text-slate-800">{formatCurrency(rentAmount)}</div>
                          <div className="text-[11px] text-slate-500">ส่วนกลาง +{commonCost}฿</div>
                        </td>

                        {/* Total Bill Amount */}
                        <td className="py-3 px-4 text-right">
                          <div className="font-mono font-bold text-slate-900 text-sm">
                            {formatCurrency(totalRoomBill)}
                          </div>
                          {existingBill && (
                            <div className="flex items-center justify-end gap-1 mt-0.5">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                existingBill.paymentStatus === 'paid'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                {existingBill.paymentStatus === 'paid' ? 'ชำระแล้ว' : 'ออกบิลแล้ว'}
                              </span>
                              {isMeterModifiedFromBill && (
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200" title="มิเตอร์เปลี่ยนจากบิลเดิม">
                                  มิเตอร์เปลี่ยน
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5 flex-nowrap">
                            <button
                              type="button"
                              onClick={() => setSelectedRoomForHistory(room)}
                              className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg transition-all cursor-pointer border border-amber-200/80 shrink-0"
                              title={`ดูประวัติค่าไฟและบิลของห้อง ${room.number} (ห้องนี้มีบิลทั้งหมด ${roomBillsCount} ครั้ง)`}
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                // Reset meter to previous values
                                handleMeterChange(room.id, 'currWater', room.previousWaterMeter);
                                handleMeterChange(room.id, 'currElec', room.previousElecMeter);
                              }}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded-lg transition-all cursor-pointer shrink-0"
                              title="ล้าง/รีเซ็ตมิเตอร์กลับเป็นค่าเดิม"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSaveMeters(room.id)}
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-all cursor-pointer border border-emerald-200/60 shrink-0"
                              title="บันทึกเลขมิเตอร์"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>

                            {existingBill ? (
                              <div className="flex items-center gap-1.5 shrink-0">
                                {isMeterModifiedFromBill ? (
                                  <button
                                    type="button"
                                    onClick={() => handleCreateBill(room)}
                                    className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-xs shadow-xs transition-all cursor-pointer whitespace-nowrap shrink-0"
                                    title="มิเตอร์มีการเปลี่ยนแปลง! กดเพื่อคำนวณและส่งบิลฉบับแก้ไขใหม่"
                                  >
                                    <Sparkles className="w-3.5 h-3.5 text-amber-100" />
                                    <span className="whitespace-nowrap">ออกบิลใหม่</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleCreateBill(room)}
                                    className="flex items-center gap-1 px-2 py-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0"
                                    title="กดเพื่อออกบิลใหม่หรือคำนวณซ้ำ"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                                    <span className="whitespace-nowrap">ออกบิลใหม่</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => onOpenInvoiceModal(existingBill)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0"
                                  title="ดูใบแจ้งหนี้"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span className="whitespace-nowrap">ดูบิล</span>
                                </button>
                                
                                {onDeleteBill && (
                                  <button
                                    type="button"
                                    onClick={() => setBillToDelete(existingBill)}
                                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-all cursor-pointer shrink-0"
                                    title="ลบบิล/ยกเลิกใบแจ้งหนี้นี้"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ) : isRoomOccupied ? (
                              <button
                                type="button"
                                onClick={() => handleCreateBill(room)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer whitespace-nowrap shrink-0"
                                title="ออกใบแจ้งหนี้ห้องนี้"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span className="whitespace-nowrap">ออกบิล</span>
                              </button>
                            ) : (
                              <span 
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-400 border border-slate-200 rounded-lg text-xs font-medium cursor-not-allowed select-none"
                                title="ห้องว่าง ไม่มีผู้เช่าพักอาศัย ไม่สามารถออกบิลได้"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                <span>ห้องว่าง</span>
                              </span>
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
        </div>
      )}

      {/* Tab 2: All Utility Records & Room Billing History */}
      {activeTab === 'all_bills' && (
        <div className="space-y-5">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-medium">บันทึกบิลทั้งหมด</span>
                <FileText className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-xl font-bold text-slate-900 font-mono">
                {allBillsStats.totalCount} <span className="text-xs font-normal text-slate-500 font-sans">ฉบับ</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                รวมทุกห้องในระบบ
              </div>
            </div>

            <div className="bg-white border border-amber-200/80 rounded-2xl p-4 shadow-xs bg-amber-50/20">
              <div className="flex items-center justify-between text-amber-800 mb-1">
                <span className="text-xs font-medium">การใช้ไฟฟ้ารวม</span>
                <Zap className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-xl font-bold text-amber-900 font-mono">
                {formatNumber(allBillsStats.totalElecUnits)} <span className="text-xs font-normal text-amber-700 font-sans">หน่วย</span>
              </div>
              <div className="text-[11px] text-amber-700 font-mono mt-1">
                รวม {formatCurrency(allBillsStats.totalElecCost)}
              </div>
            </div>

            <div className="bg-white border border-sky-200/80 rounded-2xl p-4 shadow-xs bg-sky-50/20">
              <div className="flex items-center justify-between text-sky-800 mb-1">
                <span className="text-xs font-medium">การใช้น้ำประปารวม</span>
                <Droplets className="w-4 h-4 text-sky-600" />
              </div>
              <div className="text-xl font-bold text-sky-900 font-mono">
                {formatNumber(allBillsStats.totalWaterUnits)} <span className="text-xs font-normal text-sky-700 font-sans">หน่วย</span>
              </div>
              <div className="text-[11px] text-sky-700 font-mono mt-1">
                รวม {formatCurrency(allBillsStats.totalWaterCost)}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-medium">ยอดเรียกเก็บรวม</span>
                <BarChart3 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xl font-bold text-slate-900 font-mono">
                {formatCurrency(allBillsStats.grandTotal)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                <span className="text-emerald-700 font-semibold">ชำระแล้ว {formatCurrency(allBillsStats.paidAmount)}</span>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl md:rounded-3xl p-4 shadow-xs flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Room Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
                <Building className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={historyRoomFilter}
                  onChange={(e) => setHistoryRoomFilter(e.target.value)}
                  className="bg-transparent text-slate-800 font-medium outline-none cursor-pointer"
                >
                  <option value="all">ทุกห้อง ({rooms.length} ห้อง)</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>
                      ห้อง {r.number} {r.currentTenant ? `(${r.currentTenant.name})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Month Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={historyMonthFilter}
                  onChange={(e) => setHistoryMonthFilter(e.target.value)}
                  className="bg-transparent text-slate-800 font-medium outline-none cursor-pointer"
                >
                  <option value="all">ทุกรอบเดือน</option>
                  {availableMonths.map(m => (
                    <option key={m} value={m}>รอบบิล {m}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setHistoryStatusFilter('all')}
                  className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    historyStatusFilter === 'all'
                      ? 'bg-white text-indigo-600 font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ทั้งหมด ({existingBills.length})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryStatusFilter('paid')}
                  className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    historyStatusFilter === 'paid'
                      ? 'bg-white text-emerald-700 font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ชำระแล้ว ({existingBills.filter(b => b.paymentStatus === 'paid').length})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryStatusFilter('unpaid')}
                  className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    historyStatusFilter === 'unpaid'
                      ? 'bg-white text-amber-700 font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  รอชำระ ({existingBills.filter(b => b.paymentStatus === 'unpaid').length})
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาห้อง, ผู้เช่า, เลขที่บิล..."
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                className="w-full md:w-60 bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 outline-none focus:bg-white focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Bills List Table */}
          <div className="bg-white border border-slate-200 rounded-2xl md:rounded-3xl overflow-hidden shadow-sm">
            {filteredAllBills.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-3">
                <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                  <FileText className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">ไม่พบรายการบันทึกบิลตามเงื่อนไข</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  ลองเปลี่ยนตัวกรอง หรือจดบันทึกมิเตอร์และออกบิลในแท็บ "ตารางจดมิเตอร์รายห้อง"
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4 font-semibold">ห้อง / ผู้เช่า</th>
                      <th className="py-3 px-3 font-semibold">รอบเดือน / เลขที่บิล</th>
                      <th className="py-3 px-3 font-semibold text-center bg-amber-50/40 text-amber-800">มิเตอร์ไฟฟ้า (kWh)</th>
                      <th className="py-3 px-3 font-semibold text-center bg-sky-50/40 text-sky-800">มิเตอร์น้ำ (m³)</th>
                      <th className="py-3 px-3 font-semibold text-right">ค่าเช่า + ส่วนกลาง</th>
                      <th className="py-3 px-4 font-semibold text-right">ยอดรวมสุทธิ</th>
                      <th className="py-3 px-3 font-semibold text-center">สถานะ</th>
                      <th className="py-3 px-4 font-semibold text-center">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredAllBills.map((bill) => {
                      const matchedRoom = rooms.find(r => r.id === bill.roomId || r.number === bill.roomNumber);
                      const isPaid = bill.paymentStatus === 'paid';
                      const roomBillsCount = existingBills.filter(
                        b => b.roomId === bill.roomId || b.roomNumber === bill.roomNumber
                      ).length;

                      return (
                        <tr key={bill.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* Room & Tenant */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <span className="w-10 h-8 rounded-lg bg-slate-100 border border-slate-200 font-bold text-slate-800 flex items-center justify-center text-xs font-mono">
                                {bill.roomNumber}
                              </span>
                              <div>
                                <div className="font-semibold text-slate-900">{bill.tenantName}</div>
                                {matchedRoom && (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedRoomForHistory(matchedRoom)}
                                    className="text-[10px] text-amber-700 hover:text-amber-900 underline flex items-center gap-0.5 mt-0.5 cursor-pointer"
                                    title="ดูประวัติบิลทั้งหมดของห้องนี้"
                                  >
                                    <History className="w-2.5 h-2.5" />
                                    <span>บันทึกแล้ว {roomBillsCount} ครั้ง</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Month & Bill Number */}
                          <td className="py-3 px-3">
                            <div className="font-mono font-bold text-slate-900">{bill.monthYear}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{bill.billNumber}</div>
                            <div className="text-[10px] text-slate-400">{bill.issueDate}</div>
                          </td>

                          {/* Electricity Meter */}
                          <td className="py-3 px-3 text-center bg-amber-50/20">
                            <div className="font-mono text-xs text-amber-900">
                              <span className="text-slate-400">{bill.previousElecMeter}</span>
                              <span className="mx-1 text-amber-600">➔</span>
                              <span className="font-bold">{bill.currentElecMeter}</span>
                            </div>
                            <div className="font-mono font-bold text-amber-700 text-[11px]">
                              {bill.elecUnits} หน่วย ({formatCurrency(bill.elecAmount)})
                            </div>
                          </td>

                          {/* Water Meter */}
                          <td className="py-3 px-3 text-center bg-sky-50/20">
                            <div className="font-mono text-xs text-sky-900">
                              <span className="text-slate-400">{bill.previousWaterMeter}</span>
                              <span className="mx-1 text-sky-600">➔</span>
                              <span className="font-bold">{bill.currentWaterMeter}</span>
                            </div>
                            <div className="font-mono font-bold text-sky-700 text-[11px]">
                              {bill.waterUnits} หน่วย ({formatCurrency(bill.waterAmount)})
                            </div>
                          </td>

                          {/* Rent + Common */}
                          <td className="py-3 px-3 text-right">
                            <div className="font-mono font-semibold text-slate-800">
                              {formatCurrency(bill.roomRate)}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              +ส่วนกลาง {formatCurrency(bill.commonFee + bill.trashFee)}
                            </div>
                          </td>

                          {/* Grand Total */}
                          <td className="py-3 px-4 text-right">
                            <div className="font-mono font-bold text-slate-900 text-sm">
                              {formatCurrency(bill.grandTotal)}
                            </div>
                          </td>

                          {/* Payment Status Toggle */}
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                if (onUpdateBillStatus) {
                                  onUpdateBillStatus(bill.id, isPaid ? 'unpaid' : 'paid');
                                }
                              }}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                isPaid
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                              }`}
                              title="คลิกเพื่อสลับสถานะการชำระเงิน"
                            >
                              {isPaid ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>ชำระแล้ว</span>
                                </>
                              ) : (
                                <>
                                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                                  <span>รอชำระ</span>
                                </>
                              )}
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => onOpenInvoiceModal(bill)}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                                title="ดูใบแจ้งหนี้ฉบับเต็ม"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>ดูบิล</span>
                              </button>

                              {matchedRoom && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedRoomForHistory(matchedRoom)}
                                  className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/80 rounded-lg transition-all cursor-pointer"
                                  title={`ดูประวัติค่าไฟของห้อง ${matchedRoom.number}`}
                                >
                                  <History className="w-3.5 h-3.5" />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => setBillToDelete(bill)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-all cursor-pointer"
                                title="ลบบันทึก/ใบแจ้งหนี้นี้"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Standalone Interactive Meter Sandbox Calculator */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Inputs Column */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl md:rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  <span>ทดลองคำนวณค่าน้ำค่าไฟด่วน (Live Calculator Playground)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  ปรับตัวเลขมิเตอร์น้ำและไฟเพื่อทดสอบสูตรคำนวณแบบสดๆ
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSimPrevWater(150);
                  setSimCurrWater(165);
                  setSimPrevElec(2500);
                  setSimCurrElec(2720);
                  setSimRentAmount(5000);
                }}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> รีเซ็ต
              </button>
            </div>

            {/* Water Meter Section */}
            <div className="bg-sky-50/60 border border-sky-100 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Droplets className="w-5 h-5 text-sky-600" />
                  <span className="font-bold text-sky-900 text-sm">การคำนวณค่าน้ำประปา</span>
                </div>
                <span className="text-xs font-mono font-bold text-sky-700 bg-sky-100 px-2.5 py-0.5 rounded-full border border-sky-200">
                  อัตรา {utilityConfig.waterRatePerUnit} ฿/หน่วย
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-600 block mb-1">เลขมิเตอร์น้ำเดิม (รอบก่อน)</label>
                  <input
                    type="number"
                    value={simPrevWater}
                    onChange={(e) => setSimPrevWater(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono text-sm focus:border-sky-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-600 block mb-1">เลขมิเตอร์น้ำใหม่ (รอบปัจจุบัน)</label>
                  <input
                    type="number"
                    value={simCurrWater}
                    onChange={(e) => setSimCurrWater(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-sky-400 rounded-xl p-2.5 text-sky-800 font-mono font-bold text-sm focus:border-sky-500 outline-none"
                  />
                </div>
              </div>

              {/* Water Result formula */}
              <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-500">
                  สูตร: ({simCurrWater} - {simPrevWater}) = <span className="font-bold text-sky-700">{simWaterUnits} หน่วย</span> × {utilityConfig.waterRatePerUnit} ฿
                </span>
                <span className="text-base font-bold text-sky-700 font-mono">{formatCurrency(simWaterCost)}</span>
              </div>
            </div>

            {/* Electricity Meter Section */}
            <div className="bg-amber-50/60 border border-amber-100 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-600" />
                  <span className="font-bold text-amber-900 text-sm">การคำนวณค่าไฟฟ้า</span>
                </div>
                <span className="text-xs font-mono font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
                  อัตรา {utilityConfig.elecRatePerUnit} ฿/หน่วย
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-600 block mb-1">เลขมิเตอร์ไฟเดิม (รอบก่อน)</label>
                  <input
                    type="number"
                    value={simPrevElec}
                    onChange={(e) => setSimPrevElec(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono text-sm focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-600 block mb-1">เลขมิเตอร์ไฟใหม่ (รอบปัจจุบัน)</label>
                  <input
                    type="number"
                    value={simCurrElec}
                    onChange={(e) => setSimCurrElec(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-amber-400 rounded-xl p-2.5 text-amber-800 font-mono font-bold text-sm focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              {/* Elec Result formula */}
              <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-500">
                  สูตร: ({simCurrElec} - {simPrevElec}) = <span className="font-bold text-amber-700">{simElecUnits} หน่วย</span> × {utilityConfig.elecRatePerUnit} ฿
                </span>
                <span className="text-base font-bold text-amber-700 font-mono">{formatCurrency(simElecCost)}</span>
              </div>
            </div>

            {/* Rent & Fixed Fees */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="text-xs text-slate-600 block mb-1">ค่าเช่าห้องต่อเดือน (บาท)</label>
                <input
                  type="number"
                  value={simRentAmount}
                  onChange={(e) => setSimRentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono text-sm outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="simCommon"
                  checked={simIncludeCommon}
                  onChange={(e) => setSimIncludeCommon(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 accent-indigo-600"
                />
                <label htmlFor="simCommon" className="text-xs text-slate-700 cursor-pointer">
                  รวมค่าส่วนกลาง ({utilityConfig.commonFeeMonthly}฿)
                </label>
              </div>

              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="simInternet"
                  checked={simIncludeInternet}
                  onChange={(e) => setSimIncludeInternet(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 accent-indigo-600"
                />
                <label htmlFor="simInternet" className="text-xs text-slate-700 cursor-pointer">
                  รวมค่าอินเทอร์เน็ต ({utilityConfig.internetFeeMonthly}฿)
                </label>
              </div>
            </div>
          </div>

          {/* Result Card Column: Sleek Indigo Highlight Box */}
          <div className="bg-indigo-900 rounded-3xl p-6 text-white shadow-xl shadow-indigo-200/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-indigo-800/80 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">สรุปผลการคำนวณ</span>
                <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 rounded-full text-[11px] font-semibold">
                  คำนวณเรียลไทม์
                </span>
              </div>

              <div className="space-y-3 mt-4 text-xs">
                <div className="flex justify-between py-1.5 border-b border-indigo-800/50">
                  <span className="text-indigo-200">ค่าเช่าห้องพัก:</span>
                  <span className="font-mono font-semibold text-white">{formatCurrency(simRentAmount)}</span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-indigo-800/50 text-cyan-200">
                  <div className="flex items-center gap-1.5">
                    <Droplets className="w-3.5 h-3.5 text-cyan-300" />
                    <span>ค่าน้ำ ({simWaterUnits} หน่วย @ {utilityConfig.waterRatePerUnit}฿):</span>
                  </div>
                  <span className="font-mono font-bold text-white">{formatCurrency(simWaterCost)}</span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-indigo-800/50 text-amber-200">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                    <span>ค่าไฟ ({simElecUnits} หน่วย @ {utilityConfig.elecRatePerUnit}฿):</span>
                  </div>
                  <span className="font-mono font-bold text-white">{formatCurrency(simElecCost)}</span>
                </div>

                {simIncludeCommon && (
                  <div className="flex justify-between py-1.5 border-b border-indigo-800/50">
                    <span className="text-indigo-200">ค่าส่วนกลาง:</span>
                    <span className="font-mono text-indigo-100">{formatCurrency(utilityConfig.commonFeeMonthly)}</span>
                  </div>
                )}

                {simIncludeInternet && (
                  <div className="flex justify-between py-1.5 border-b border-indigo-800/50">
                    <span className="text-indigo-200">ค่าอินเทอร์เน็ต:</span>
                    <span className="font-mono text-indigo-100">{formatCurrency(utilityConfig.internetFeeMonthly)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-indigo-800/80">
              <div className="bg-indigo-950/60 p-4 rounded-2xl border border-indigo-800/60 text-center">
                <span className="text-xs text-indigo-300 font-medium">ยอดชำระสุทธิทั้งหมด</span>
                <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono mt-1">
                  {formatCurrency(simGrandTotal)}
                </div>
                <div className="flex items-center justify-center gap-3 text-[11px] text-indigo-300 mt-2 font-mono">
                  <span>รวมค่าน้ำ+ไฟ: {formatCurrency(simTotalUtilities)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unit Rates Config Modal */}
      <AnimatePresence>
        {showConfigModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-5 text-slate-900"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-lg font-bold text-slate-900">ตั้งค่าราคาต่อหน่วย (Utility Rates)</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {/* Water Rate */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1 flex items-center gap-1.5">
                    <Droplets className="w-3.5 h-3.5 text-sky-600" />
                    <span>อัตราค่าน้ำประปา (บาท / หน่วย)</span>
                  </label>
                  <input
                    type="number"
                    value={tempRates.waterRatePerUnit}
                    onChange={(e) => setTempRates({ ...tempRates, waterRatePerUnit: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-mono text-base focus:bg-white focus:border-indigo-500 outline-none"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">เช่น 18 บาท/หน่วย หรือ 20 บาท/หน่วย ตามระเบียบหอพัก</p>
                </div>

                {/* Electricity Rate */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                    <span>อัตราค่าไฟฟ้า (บาท / หน่วย)</span>
                  </label>
                  <input
                    type="number"
                    value={tempRates.elecRatePerUnit}
                    onChange={(e) => setTempRates({ ...tempRates, elecRatePerUnit: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-mono text-base focus:bg-white focus:border-indigo-500 outline-none"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">เช่น 7, 8 หรือ 9 บาท/หน่วย</p>
                </div>

                {/* Common Fee & Others */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      ค่าบริการส่วนกลาง (บาท/เดือน)
                    </label>
                    <input
                      type="number"
                      value={tempRates.commonFeeMonthly}
                      onChange={(e) => setTempRates({ ...tempRates, commonFeeMonthly: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono text-sm outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      ค่าอินเทอร์เน็ต (บาท/เดือน)
                    </label>
                    <input
                      type="number"
                      value={tempRates.internetFeeMonthly}
                      onChange={(e) => setTempRates({ ...tempRates, internetFeeMonthly: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono text-sm outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      ค่าจอดรถยนต์ (บาท/เดือน)
                    </label>
                    <input
                      type="number"
                      value={tempRates.parkingFeeMonthly}
                      onChange={(e) => setTempRates({ ...tempRates, parkingFeeMonthly: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono text-sm outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      ค่าเก็บขยะ (บาท/เดือน)
                    </label>
                    <input
                      type="number"
                      value={tempRates.trashFeeMonthly}
                      onChange={(e) => setTempRates({ ...tempRates, trashFeeMonthly: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono text-sm outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateUtilityConfig(tempRates);
                    setShowConfigModal(false);
                    setSavedSuccessMsg('บันทึกอัตราค่าบริการใหม่เรียบร้อยแล้ว');
                    setTimeout(() => setSavedSuccessMsg(null), 3000);
                  }}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-100 cursor-pointer"
                >
                  บันทึกการตั้งค่า
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Bill Confirmation Modal */}
      <AnimatePresence>
        {billToDelete && (
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
                  ยืนยันการลบใบแจ้งหนี้?
                </h3>
                <p className="text-xs text-slate-500">
                  คุณกำลังจะลบใบแจ้งหนี้เลขที่ <strong className="font-mono text-slate-800">{billToDelete.billNumber}</strong> (ห้อง {billToDelete.roomNumber})
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-xs space-y-2 text-slate-600">
                <div className="flex justify-between">
                  <span>ผู้เช่า:</span>
                  <span className="font-bold text-slate-900">{billToDelete.tenantName}</span>
                </div>
                <div className="flex justify-between">
                  <span>ประจำเดือน:</span>
                  <span className="font-semibold text-slate-800">{billToDelete.monthYear}</span>
                </div>
                <div className="flex justify-between">
                  <span>ยอดรวมทั้งสิ้น:</span>
                  <span className="font-mono font-bold text-slate-900">{formatCurrency(billToDelete.grandTotal)}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setBillToDelete(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onDeleteBill) {
                      onDeleteBill(billToDelete.id);
                    }
                    setBillToDelete(null);
                    setSavedSuccessMsg(`ลบใบแจ้งหนี้ ${billToDelete.billNumber} เรียบร้อยแล้ว`);
                    setTimeout(() => setSavedSuccessMsg(null), 3000);
                  }}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-rose-100 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>ลบใบแจ้งหนี้</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Room Specific Bill & Electricity History Modal */}
      <AnimatePresence>
        {selectedRoomForHistory && (
          <RoomBillHistoryModal
            room={selectedRoomForHistory}
            bills={existingBills}
            property={property}
            onClose={() => setSelectedRoomForHistory(null)}
            onOpenInvoiceModal={(bill) => {
              onOpenInvoiceModal(bill);
            }}
            onUpdateBillStatus={onUpdateBillStatus}
            onDeleteBill={onDeleteBill}
            onGoToRecordMeter={() => {
              setSelectedRoomForHistory(null);
              setActiveTab('matrix');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
