import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, AlertTriangle, Clock, ChevronDown, ChevronUp, 
  MessageCircle, ArrowRight, CheckCircle2, Send, Sparkles, Building
} from 'lucide-react';
import { UtilityBill, PropertyProfile } from '../../types';
import { formatCurrency, formatDateThai } from '../../utils/formatters';
import { getBillDueStatus, sendLineBillReminder, getStoredLineToken } from '../../lib/lineService';

interface DueBillsAlertBannerProps {
  bills: UtilityBill[];
  property: PropertyProfile;
  onOpenLineModal: (bill: UtilityBill) => void;
  onOpenInvoiceModal?: (bill: UtilityBill) => void;
}

export const DueBillsAlertBanner: React.FC<DueBillsAlertBannerProps> = ({
  bills,
  property,
  onOpenLineModal,
  onOpenInvoiceModal,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [batchSending, setBatchSending] = useState(false);
  const [batchSuccessCount, setBatchSuccessCount] = useState<number | null>(null);

  // Filter bills that are unpaid and due/overdue or due soon (within 3 days)
  const dueBills = bills.filter((b) => {
    if (b.paymentStatus === 'paid') return false;
    const status = getBillDueStatus(b, 3);
    return status.isDue || status.isDueSoon;
  });

  if (dueBills.length === 0) {
    return null; // No due bills, no intrusive banner
  }

  const overdueCount = dueBills.filter((b) => getBillDueStatus(b).isOverdue).length;
  const totalDueAmount = dueBills.reduce((sum, b) => sum + (b.grandTotal - (b.paidAmount || 0)), 0);

  const handleBatchBroadcast = async () => {
    setBatchSending(true);
    setBatchSuccessCount(null);

    let sent = 0;
    for (const b of dueBills) {
      try {
        const res = await sendLineBillReminder(b, property, {
          broadcast: true,
          token: getStoredLineToken()
        });
        if (res.success) sent++;
      } catch (err) {
        console.error('Batch broadcast error:', err);
      }
    }

    setBatchSending(false);
    setBatchSuccessCount(sent);
    setTimeout(() => setBatchSuccessCount(null), 4000);
  };

  return (
    <div className="bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/10 border border-amber-300/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
            <Bell className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                บิลที่ถึงกำหนด & เกินกำหนดชำระ ({dueBills.length} ห้อง)
              </h3>
              {overdueCount > 0 && (
                <span className="text-[10px] bg-rose-500 text-white px-2 py-0.5 rounded-full font-bold">
                  เกินกำหนด {overdueCount} ห้อง
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600">
              ยอดค้างชำระรวม <strong className="text-rose-600 font-mono">{formatCurrency(totalDueAmount)}</strong> • กรุณาส่งแจ้งเตือน LINE ให้ผู้เช่าทราบ
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={handleBatchBroadcast}
            disabled={batchSending}
            className="px-3 py-1.5 bg-[#06C755] hover:bg-[#05b34c] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            title="ส่งการ์ดแจ้งเตือนผ่านบอท LINE ถึงเพื่อนใน LINE Official Account"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>{batchSending ? 'กำลังส่งแจ้งเตือน...' : 'ส่งแจ้งเตือน LINE ทั้งหมด'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 hover:bg-slate-200/60 rounded-xl text-slate-600 transition-colors cursor-pointer"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {batchSuccessCount !== null && (
        <div className="p-2.5 bg-emerald-100 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>ส่งแจ้งเตือนผ่าน LINE เรียบร้อยแล้ว {batchSuccessCount} รายการ!</span>
        </div>
      )}

      {/* Expandable Room List */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2">
              {dueBills.map((bill) => {
                const status = getBillDueStatus(bill);
                return (
                  <div
                    key={bill.id}
                    className="bg-white/90 border border-slate-200 rounded-xl p-3 flex flex-col justify-between gap-2 shadow-xs hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-slate-900">ห้อง {bill.roomNumber}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                            status.isOverdue 
                              ? 'bg-rose-100 text-rose-700' 
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {status.label}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[150px]">
                          {bill.tenantName}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-mono font-bold text-slate-900">
                          {formatCurrency(bill.grandTotal)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          กำหนด: {formatDateThai(bill.dueDate)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => onOpenLineModal(bill)}
                        className="flex-1 py-1.5 bg-[#06C755] hover:bg-[#05b34c] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <MessageCircle className="w-3 h-3" />
                        <span>แจ้งเตือนใน LINE</span>
                      </button>

                      {onOpenInvoiceModal && (
                        <button
                          type="button"
                          onClick={() => onOpenInvoiceModal(bill)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                          title="เปิดดูใบแจ้งหนี้"
                        >
                          ดูบิล
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
