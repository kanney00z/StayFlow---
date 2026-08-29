import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, ExternalLink, ZoomIn, Calendar, FileText, CheckCircle2, DollarSign } from 'lucide-react';
import { formatCurrency, formatDateThai } from '../../utils/formatters';

interface SlipViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  slipUrl: string;
  billNumber?: string;
  roomNumber?: string;
  tenantName?: string;
  paidAmount?: number;
  paidDate?: string;
  paidMethod?: string;
  slipReference?: string;
}

export const SlipViewerModal: React.FC<SlipViewerModalProps> = ({
  isOpen,
  onClose,
  slipUrl,
  billNumber,
  roomNumber,
  tenantName,
  paidAmount,
  paidDate,
  paidMethod,
  slipReference,
}) => {
  if (!isOpen || !slipUrl) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = slipUrl;
    link.download = `slip-${roomNumber || 'room'}-${billNumber || Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AnimatePresence>
      <div 
        id="slip-viewer-backdrop"
        className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative max-w-lg w-full bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden text-white flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                  <span>หลักฐานสลิปการโอนเงิน</span>
                  {roomNumber && (
                    <span className="px-2 py-0.5 rounded-md bg-indigo-500/30 text-indigo-300 font-mono text-xs">
                      ห้อง {roomNumber}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400">
                  {billNumber ? `เลขที่บิล ${billNumber}` : ''} {tenantName ? `• ผู้เช่า: ${tenantName}` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                id="btn-download-slip"
                onClick={handleDownload}
                className="p-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white transition-colors cursor-pointer"
                title="ดาวน์โหลดรูปสลิป"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                type="button"
                id="btn-close-slip-viewer"
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-700 hover:bg-rose-600 text-slate-200 hover:text-white transition-colors cursor-pointer"
                title="ปิด"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Slip Image Display */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center bg-slate-950/60 min-h-[300px]">
            <div className="relative group max-w-full rounded-2xl overflow-hidden border border-slate-700/80 shadow-lg bg-black">
              <img
                src={slipUrl}
                alt="สลิปการโอนเงิน"
                className="max-h-[58vh] w-auto object-contain mx-auto rounded-xl"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          {/* Payment Details Footer */}
          <div className="p-4 sm:p-5 bg-slate-800/80 border-t border-slate-700 space-y-2">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/60">
                <span className="text-slate-400 block text-[11px]">ยอดเงินที่ระบุในสลิป</span>
                <strong className="text-base font-bold text-emerald-400 font-mono">
                  {paidAmount !== undefined ? formatCurrency(paidAmount) : 'ระบุตามสลิป'}
                </strong>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/60">
                <span className="text-slate-400 block text-[11px]">ช่องทาง & วันที่ชำระ</span>
                <span className="font-semibold text-slate-200 block truncate">
                  {paidMethod || 'โอนเงินเข้าบัญชี'}
                </span>
                <span className="text-[10px] text-slate-400">
                  {paidDate ? paidDate : 'วันนี้'}
                </span>
              </div>
            </div>

            {slipReference && (
              <div className="text-[11px] text-slate-400 px-1 font-mono">
                Ref / เลขที่อ้างอิง: <span className="text-slate-300 font-semibold">{slipReference}</span>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
