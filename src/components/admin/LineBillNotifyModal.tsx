import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, MessageCircle, Copy, Check, ExternalLink, 
  AlertCircle, AlertTriangle, CheckCircle2, Clock, Sparkles, Building2, 
  User, CreditCard, ChevronRight, X, Loader2, Share2, Radio, Info, FileText
} from 'lucide-react';
import { UtilityBill, PropertyProfile } from '../../types';
import { formatCurrency, formatDateThai } from '../../utils/formatters';
import { BankLogo } from '../ui/BankLogo';
import { 
  sendLineBillReminder, 
  getLineShareText, 
  getLineShareUrl,
  fetchLineBotInfo,
  getStoredLineToken,
  DEFAULT_LINE_BOT_BASIC_ID,
  DEFAULT_LINE_BOT_NAME,
  getBillDueStatus
} from '../../lib/lineService';

interface LineBillNotifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: UtilityBill | null;
  property: PropertyProfile;
}

export const LineBillNotifyModal: React.FC<LineBillNotifyModalProps> = ({
  isOpen,
  onClose,
  bill,
  property,
}) => {
  const [customNote, setCustomNote] = useState('');
  const [activeTab, setActiveTab] = useState<'share' | 'bot'>('share');
  const [targetUserId, setTargetUserId] = useState(() => {
    return localStorage.getItem('last_line_user_id') || 'Uf8abfa5a3d0c7e8ef445167e555f3cb7';
  });
  const [isBroadcast, setIsBroadcast] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
    isLineIdError?: boolean;
  } | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [botInfo, setBotInfo] = useState<any>(null);
  const [isLoadingBot, setIsLoadingBot] = useState(false);

  // Initialize target and load bot info
  useEffect(() => {
    if (isOpen && bill) {
      setSendResult(null);
      setCustomNote('');
      
      // Default to target from property or saved in storage
      const savedTarget = localStorage.getItem(`line_uid_${bill.roomNumber}`) || 
                          localStorage.getItem('last_line_user_id') || 
                          property.lineNotifyTargetId || 
                          'Uf8abfa5a3d0c7e8ef445167e555f3cb7';
      setTargetUserId(savedTarget);

      // Load bot status
      setIsLoadingBot(true);
      fetchLineBotInfo()
        .then((res) => {
          if (res.success && res.bot) {
            setBotInfo(res.bot);
          }
        })
        .finally(() => setIsLoadingBot(false));
    }
  }, [isOpen, bill?.id, bill?.roomNumber, property.lineNotifyTargetId]);

  if (!isOpen || !bill) return null;

  const dueStatus = getBillDueStatus(bill);
  const shareText = getLineShareText(bill, property, customNote);
  const shareUrl = getLineShareUrl(bill, property, customNote);

  const handleCopyText = () => {
    try {
      navigator.clipboard.writeText(shareText);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 3000);
    } catch {
      // Fallback copy using textarea
      const el = document.createElement('textarea');
      el.value = shareText;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 3000);
    }
  };

  const handleOpenLineShare = () => {
    handleCopyText();
    // Use window.open with fallback
    try {
      const win = window.open(shareUrl, '_blank', 'noopener,noreferrer');
      if (!win) {
        window.location.href = shareUrl;
      }
    } catch {
      window.location.href = shareUrl;
    }
  };

  const handleSendViaBot = async () => {
    setIsSending(true);
    setSendResult(null);

    try {
      const target = isBroadcast ? undefined : (targetUserId.trim() || undefined);

      // Detect if user entered a standard LINE ID (like @kanney88 or kanney88)
      if (!isBroadcast && target) {
        const isNotApiId = target.startsWith('@') || 
          (target.length < 30 && !target.startsWith('U') && !target.startsWith('C') && !target.startsWith('R'));
        
        if (isNotApiId) {
          setSendResult({
            success: false,
            message: `ไม่สามารถส่งผ่านบอทได้ เนื่องจาก "${target}" เป็น LINE ID (ไอดีค้นหาเพื่อน) ไม่ใช่ LINE User ID ของบอท\n\n💡 บอท LINE ต้องการ User ID ที่ขึ้นต้นด้วย U... (รหัส 33 หลัก) หรือ Group ID\n\n👉 วิธีที่สะดวกที่สุด: สลับไปที่แท็บ "เปิดแอป LINE / คัดลอกข้อความ" ด้านบน แล้วกดส่งหาคุณ ${target.replace(/^@/, '')} ได้ทันทีโดยไม่ต้องใช้ User ID ครับ`,
            isLineIdError: true
          });
          setIsSending(false);
          return;
        }
      }

      const result = await sendLineBillReminder(bill, property, {
        targetUserId: target,
        broadcast: isBroadcast,
        customNote: customNote.trim() || undefined,
        token: getStoredLineToken()
      });

      if (result.success) {
        if (target) {
          localStorage.setItem('last_line_user_id', target);
          localStorage.setItem(`line_uid_${bill.roomNumber}`, target);
        }
        setSendResult({
          success: true,
          message: isBroadcast 
            ? 'ส่งแจ้งเตือนแบบ Broadcast ถึงเพื่อนทุกคนใน LINE Official Account เรียบร้อยแล้ว!'
            : (target 
                ? `ส่งแจ้งเตือนการ์ด Flex Message ตรงเข้า LINE ผู้รับ (${target}) สำเร็จเรียบร้อยแล้ว!` 
                : 'ตรวจสอบและส่งผ่าน LINE Bot สำเร็จเรียบร้อย!')
        });
      } else {
        const rawErr = String(result.details?.message || result.error || '');
        let userFriendlyMsg = result.error || 'ส่งข้อความไม่สำเร็จ กรุณาลองใหม่อีกครั้ง หรือใช้ปุ่มเปิดส่งในแอป LINE';
        const isNotUserId = target && (target.startsWith('@') || target.length < 30);

        if (isNotUserId && (rawErr.toLowerCase().includes("'to'") || rawErr.includes('The property, \'to\''))) {
          userFriendlyMsg = `ไอดีผู้รับ "${target || ''}" เป็น LINE ID ค้นหาเพื่อนทั่วไป ไม่ใช่ LINE User ID ของบอท\n\n👉 แนะนำ: ให้สลับไปแท็บ "เปิดแอป LINE / คัดลอกข้อความ" ด้านบน แล้วกดส่งหาผู้เช่าได้ทันทีโดยไม่ต้องใช้ User ID ครับ`;
        }

        setSendResult({
          success: false,
          message: userFriendlyMsg,
          details: result.details,
          isLineIdError: Boolean(isNotUserId)
        });
      }
    } catch (err: any) {
      setSendResult({
        success: false,
        message: err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ LINE API'
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[90vh]"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-5 sm:px-6 py-4 text-white flex items-center justify-between border-b border-slate-700/60 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#06C755] flex items-center justify-center shadow-lg shadow-emerald-950/40 shrink-0">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base sm:text-lg text-white">แจ้งเตือนกำหนดชำระผ่าน LINE</h3>
                  <span className="text-[10px] bg-[#06C755]/20 text-[#06C755] px-2 py-0.5 rounded-full font-bold border border-[#06C755]/30">
                    LINE Official Bot
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  ห้อง {bill.roomNumber} • ผู้เช่า: {bill.tenantName} • กำหนดชำระ: {formatDateThai(bill.dueDate)}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-700/60 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
            {/* Status Alert Banner */}
            {dueStatus.isDue && (
              <div className={`p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs font-medium border ${
                dueStatus.isOverdue 
                  ? 'bg-rose-50 border-rose-200 text-rose-800' 
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                <div className="flex items-center gap-2.5">
                  <Clock className={`w-4 h-4 shrink-0 ${dueStatus.isOverdue ? 'text-rose-600' : 'text-amber-600'}`} />
                  <span>
                    สถานะบิล: <strong>{dueStatus.label}</strong> (กำหนดชำระ {formatDateThai(bill.dueDate)})
                  </span>
                </div>
                <span className="text-xs font-bold font-mono">
                  ยอด {formatCurrency(bill.grandTotal)}
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Live LINE Flex Card Preview */}
              <div className="lg:col-span-6 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#06C755]" />
                    <span>ตัวอย่างการ์ด LINE Flex Message (แสดงในแชท LINE)</span>
                  </label>
                  <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                    รูปแบบพรีเมียม
                  </span>
                </div>

                {/* The Mock LINE Bubble Container */}
                <div className="bg-[#7494C0]/20 p-3.5 sm:p-4 rounded-2xl border border-slate-300/80 shadow-inner">
                  <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 text-slate-900 max-w-sm mx-auto">
                    {/* Card Header */}
                    <div className="bg-slate-900 p-4 text-white">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-300 truncate">
                          🏢 {property.name || 'StayFlow หอพัก/อพาร์ตเมนต์'}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                          dueStatus.isOverdue ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'
                        }`}>
                          {dueStatus.isOverdue ? '⚠️ เกินกำหนดชำระ' : '🔔 ถึงกำหนดชำระ'}
                        </span>
                      </div>
                      <h4 className="text-lg font-bold text-white mt-1">
                        ใบแจ้งหนี้ห้อง {bill.roomNumber}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        รอบเดือน {bill.monthYear} • เลขที่ {bill.billNumber}
                      </p>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 space-y-3">
                      {/* Big Amount Card */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                        <div className="text-[11px] text-slate-500">ยอดรวมที่ต้องชำระทั้งสิ้น</div>
                        <div className="text-2xl font-black text-slate-900 font-mono my-0.5">
                          {formatCurrency(bill.grandTotal)}
                        </div>
                        <div className="text-xs font-bold text-rose-600 flex items-center justify-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>กำหนดชำระภายใน: {formatDateThai(bill.dueDate)}</span>
                        </div>
                      </div>

                      {/* Tenant Row */}
                      <div className="text-xs space-y-1 py-1 border-b border-slate-100">
                        <div className="flex justify-between text-slate-600">
                          <span>👤 ผู้เช่า:</span>
                          <strong className="text-slate-900">{bill.tenantName}</strong>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>📞 เบอร์ติดต่อ:</span>
                          <span className="text-slate-800">{bill.tenantPhone || '-'}</span>
                        </div>
                      </div>

                      {/* Item Breakdown */}
                      <div className="text-[11px] space-y-1 text-slate-600">
                        <div className="flex justify-between">
                          <span>1. ค่าเช่าห้องพัก</span>
                          <span className="font-semibold text-slate-900">{formatCurrency(bill.roomRentAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>2. ค่าน้ำ ({bill.waterUnits} หน่วย)</span>
                          <span className="font-semibold text-slate-900">{formatCurrency(bill.waterAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>3. ค่าไฟ ({bill.elecUnits} หน่วย)</span>
                          <span className="font-semibold text-slate-900">{formatCurrency(bill.elecAmount)}</span>
                        </div>
                        {bill.commonFee > 0 && (
                          <div className="flex justify-between">
                            <span>4. ค่าส่วนกลาง</span>
                            <span className="font-semibold text-slate-900">{formatCurrency(bill.commonFee)}</span>
                          </div>
                        )}
                        {bill.otherFees > 0 && (
                          <div className="flex justify-between">
                            <span>5. {bill.otherFeesNote || 'อื่นๆ'}</span>
                            <span className="font-semibold text-slate-900">{formatCurrency(bill.otherFees)}</span>
                          </div>
                        )}
                      </div>

                      {/* Payment Method */}
                      <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-lg p-2.5 text-[11px] text-emerald-900">
                        <div className="font-bold text-emerald-800 flex items-center gap-1 mb-1">
                          <CreditCard className="w-3 h-3 text-emerald-600" />
                          <span>ช่องทางชำระเงิน</span>
                        </div>
                        {property.promptPayId && (
                          <div className="font-mono">📲 พร้อมเพย์: {property.promptPayId}</div>
                        )}
                        {property.bankAccount && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <BankLogo bank={property.bankName} size="xs" />
                            <span>{property.bankName} {property.bankAccount}</span>
                          </div>
                        )}
                      </div>

                      {/* Custom Note Preview */}
                      {customNote && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-[11px] text-amber-800">
                          💬 {customNote}
                        </div>
                      )}
                    </div>

                    {/* Card Footer Buttons (Simulated LINE Buttons) */}
                    <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-1.5">
                      <button 
                        type="button"
                        onClick={handleOpenLineShare}
                        className="w-full py-2 bg-[#06C755] hover:bg-[#05b34c] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>💬 ส่งสลิปแจ้งโอน / ติดต่อหอพัก</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Send Options & Actions */}
              <div className="lg:col-span-6 space-y-4">
                {/* Bot Status Card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-bold text-slate-800">LINE Bot: {DEFAULT_LINE_BOT_NAME}</span>
                    </div>
                    <span className="text-[11px] text-indigo-600 font-mono font-bold bg-indigo-50 px-2 py-0.5 rounded">
                      {DEFAULT_LINE_BOT_BASIC_ID}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    เชื่อมต่อ Channel Access Token พร้อมใช้งาน สามารถส่งการ์ดแจ้งเตือนแบบอัตโนมัติ หรือส่งเข้าแอป LINE ของผู้เช่าได้ทันที
                  </p>
                </div>

                {/* Additional Note Input */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    ข้อความเตือนเพิ่มเติม (ถ้ามี)
                  </label>
                  <input
                    type="text"
                    value={customNote}
                    onChange={(e) => setCustomNote(e.target.value)}
                    placeholder="เช่น รบกวนชำระเงินก่อน 18:00 น. หรือ แจ้งเปลี่ยนเลขมิเตอร์ใหม่"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Selection of Method Tabs */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('share');
                        setSendResult(null);
                      }}
                      className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        activeTab === 'share'
                          ? 'bg-white text-emerald-700 shadow-sm border border-emerald-200'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <MessageCircle className="w-4 h-4 text-[#06C755]" />
                      <span>เปิดแอป LINE / คัดลอก</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold hidden sm:inline">
                        ง่ายสุด
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('bot');
                        setSendResult(null);
                      }}
                      className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        activeTab === 'bot'
                          ? 'bg-white text-indigo-700 shadow-sm border border-indigo-200'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Send className="w-4 h-4 text-indigo-600" />
                      <span>ส่งผ่าน LINE Bot (Flex Card)</span>
                    </button>
                  </div>

                  {/* TAB 1: LINE App Share & Copy */}
                  {activeTab === 'share' && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-3"
                    >
                      <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 space-y-1">
                        <div className="font-bold flex items-center gap-1.5 text-emerald-950">
                          <CheckCircle2 className="w-4 h-4 text-[#06C755]" />
                          <span>วิธีที่สะดวกที่สุด (ไม่ต้องใช้ LINE User ID)</span>
                        </div>
                        <p className="text-[11px] text-emerald-800 leading-relaxed">
                          คุณสามารถกด <strong>"คัดลอกข้อความบิล"</strong> แล้วนำไปวาง (Ctrl+V) ในห้องแชท LINE ของผู้เช่าได้ทันที หรือกดปุ่ม <strong>"เปิดแอป LINE"</strong> เพื่อเลือกผู้เช่าส่งได้เลย
                        </p>
                      </div>

                      {/* Prominent Action Buttons */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={handleCopyText}
                          className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-950/20 transition-all cursor-pointer"
                        >
                          {copiedText ? (
                            <>
                              <Check className="w-4 h-4 text-white" />
                              <span>คัดลอกข้อความแล้ว!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              <span>1. คัดลอกข้อความบิลทันที</span>
                            </>
                          )}
                        </button>

                        <a
                          href={shareUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={handleCopyText}
                          className="py-3 px-4 bg-[#06C755] hover:bg-[#05b34c] active:scale-[0.99] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-950/20 transition-all cursor-pointer text-center"
                        >
                          <Share2 className="w-4 h-4" />
                          <span>2. เปิดแอป LINE ส่งผู้เช่า</span>
                          <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                        </a>
                      </div>

                      {/* Formatted Bill Message Box */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-slate-500" />
                            <span>ข้อความสรุปใบแจ้งหนี้ที่จะส่ง:</span>
                          </label>
                          <button
                            type="button"
                            onClick={handleCopyText}
                            className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 bg-emerald-100/70 hover:bg-emerald-100 px-2 py-1 rounded cursor-pointer transition-colors"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{copiedText ? 'คัดลอกแล้ว!' : 'คัดลอกทั้งหมด'}</span>
                          </button>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-lg p-2.5 text-[11px] font-sans text-slate-800 leading-relaxed max-h-44 overflow-y-auto whitespace-pre-wrap select-all">
                          {shareText}
                        </div>
                      </div>

                      {/* Helpful Links */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <a
                          href="https://chat.line.biz/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 font-medium"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>เปิดห้องแชท LINE OA (chat.line.biz)</span>
                        </a>
                        <span>นำข้อความไปวางส่งในแชทได้ทันที</span>
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 2: LINE Bot Automated Sending */}
                  {activeTab === 'bot' && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-3"
                    >
                      {/* Sub-choice: Push vs Broadcast */}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setIsBroadcast(false)}
                          className={`flex-1 p-2.5 rounded-xl border text-left text-xs cursor-pointer transition-all ${
                            !isBroadcast
                              ? 'border-indigo-500 bg-indigo-50/60 font-bold text-indigo-900'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <div>ส่งตรงหาผู้เช่าห้องนี้ (Push)</div>
                          <div className="text-[10px] text-slate-500 font-normal">ส่งเฉพาะห้อง {bill.roomNumber}</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsBroadcast(true)}
                          className={`flex-1 p-2.5 rounded-xl border text-left text-xs cursor-pointer transition-all ${
                            isBroadcast
                              ? 'border-indigo-500 bg-indigo-50/60 font-bold text-indigo-900'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <div>Broadcast เพื่อนทุกคน</div>
                          <div className="text-[10px] text-slate-500 font-normal">ส่งหาทุกคนใน LINE OA</div>
                        </button>
                      </div>

                      {/* User ID Field if not broadcast */}
                      {!isBroadcast && (
                        <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-800">
                              LINE User ID ของผู้เช่า:
                            </label>
                            {targetUserId && targetUserId !== 'Uf8abfa5a3d0c7e8ef445167e555f3cb7' && (
                              <button
                                type="button"
                                onClick={() => setTargetUserId('Uf8abfa5a3d0c7e8ef445167e555f3cb7')}
                                className="text-[10px] text-indigo-600 hover:underline font-semibold"
                              >
                                ใช้รหัส Uf8abfa5...
                              </button>
                            )}
                          </div>
                          <input
                            type="text"
                            value={targetUserId}
                            onChange={(e) => setTargetUserId(e.target.value)}
                            placeholder="ระบุ LINE User ID (ขึ้นต้นด้วย U... 33 หลัก)"
                            className={`w-full bg-white border rounded-lg px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none ${
                              targetUserId.trim().startsWith('@') || (targetUserId.trim().length > 0 && targetUserId.trim().length < 30 && !targetUserId.trim().startsWith('U') && !targetUserId.trim().startsWith('C'))
                                ? 'border-amber-400 bg-amber-50/30 focus:border-amber-500'
                                : 'border-indigo-200 focus:border-indigo-500'
                            }`}
                          />

                          {/* Friendly hint when user types personal LINE ID */}
                          {(targetUserId.trim().startsWith('@') || (targetUserId.trim().length > 0 && targetUserId.trim().length < 30 && !targetUserId.trim().startsWith('U') && !targetUserId.trim().startsWith('C') && !targetUserId.trim().startsWith('R'))) && (
                            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs space-y-1.5">
                              <div className="font-bold flex items-center gap-1 text-amber-950">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                <span>"{targetUserId.trim()}" คือ LINE ID ค้นหาเพื่อนทั่วไป</span>
                              </div>
                              <p className="text-[11px] text-amber-800 leading-relaxed">
                                บอท LINE จะรับเฉพาะ <strong>User ID 33 หลัก (ขึ้นต้นด้วย U...)</strong> เท่านั้น
                              </p>
                              <button
                                type="button"
                                onClick={() => setActiveTab('share')}
                                className="text-[11px] bg-[#06C755] hover:bg-[#05b34c] text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-all"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                                <span>สลับไปใช้แท็บ "เปิดแอป LINE / คัดลอก" ส่งได้ทันที</span>
                              </button>
                            </div>
                          )}

                          <p className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Info className="w-3 h-3 text-indigo-500" />
                            <span>บอทจะส่งการ์ด Flex Message สวยงามตรงเข้าแชทผู้เช่าทันที</span>
                          </p>
                        </div>
                      )}

                      {/* Main Send Button for Bot */}
                      <button
                        type="button"
                        onClick={handleSendViaBot}
                        disabled={isSending}
                        className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-75 active:scale-[0.99] text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/20 transition-all cursor-pointer"
                      >
                        {isSending ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>กำลังส่งข้อความผ่าน LINE Bot...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            <span>
                              {isBroadcast 
                                ? 'ส่ง Broadcast ถึงเพื่อนทุกคนใน LINE OA' 
                                : 'ส่งการ์ดแจ้งหนี้ผ่าน LINE Bot ทันที'}
                            </span>
                          </>
                        )}
                      </button>
                    </motion.div>
                  )}
                </div>

                {/* Send Result Banner */}
                {sendResult && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 border ${
                      sendResult.success 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                        : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}
                  >
                    {sendResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 space-y-1.5">
                      <div className="font-bold">
                        {sendResult.success ? 'ส่งสำเร็จเรียบร้อย!' : 'เกิดข้อผิดพลาดในการส่ง'}
                      </div>
                      <div className="text-[11px] leading-relaxed whitespace-pre-line">{sendResult.message}</div>

                      {sendResult.isLineIdError && (
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('share');
                              handleCopyText();
                            }}
                            className="px-3.5 py-2 bg-[#06C755] hover:bg-[#05b34c] text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>สลับไปคัดลอกข้อความส่งให้ผู้เช่าเลยทันที</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="bg-slate-50 px-5 sm:px-6 py-3.5 border-t border-slate-200 flex items-center justify-between shrink-0 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span>รองรับทั้งการแจ้งเตือนเดี่ยว และระบบอัตโนมัติ</span>
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
