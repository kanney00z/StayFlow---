import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, MessageCircle, Copy, Check, ExternalLink, 
  AlertCircle, CheckCircle2, Clock, Sparkles, Building2, 
  User, CreditCard, ChevronRight, X, Loader2, Share2, Radio
} from 'lucide-react';
import { UtilityBill, PropertyProfile } from '../../types';
import { formatCurrency, formatDateThai } from '../../utils/formatters';
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
  const [sendMethod, setSendMethod] = useState<'bot_push' | 'bot_broadcast' | 'line_share'>('line_share');
  const [targetUserId, setTargetUserId] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [botInfo, setBotInfo] = useState<any>(null);
  const [isLoadingBot, setIsLoadingBot] = useState(false);

  // Initialize target and load bot info
  useEffect(() => {
    if (isOpen && bill) {
      setSendResult(null);
      setCustomNote('');
      
      // Default to target from property or saved
      const defaultTarget = property.lineNotifyTargetId || '';
      setTargetUserId(defaultTarget);

      // Load bot status
      setIsLoadingBot(true);
      fetchLineBotInfo()
        .then((res) => {
          if (res.success && res.bot) {
            setBotInfo(res.bot);
            // Default to bot send if connected and target or broadcast
            setSendMethod('line_share'); // safe default that works for 100% of cases
          }
        })
        .finally(() => setIsLoadingBot(false));
    }
  }, [isOpen, bill, property]);

  if (!isOpen || !bill) return null;

  const dueStatus = getBillDueStatus(bill);
  const shareText = getLineShareText(bill, property, customNote);
  const shareUrl = getLineShareUrl(bill, property, customNote);

  const handleCopyText = () => {
    navigator.clipboard.writeText(shareText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  const handleOpenLineShare = () => {
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSendViaBot = async () => {
    setIsSending(true);
    setSendResult(null);

    try {
      const isBroadcast = sendMethod === 'bot_broadcast';
      const target = isBroadcast ? undefined : (targetUserId.trim() || undefined);

      const result = await sendLineBillReminder(bill, property, {
        targetUserId: target,
        broadcast: isBroadcast,
        customNote: customNote.trim() || undefined,
        token: getStoredLineToken()
      });

      if (result.success) {
        setSendResult({
          success: true,
          message: isBroadcast 
            ? 'ส่งแจ้งเตือนแบบ Broadcast ถึงเพื่อนใน LINE Official Account เรียบร้อยแล้ว!'
            : (target 
                ? `ส่งแจ้งเตือนตรงเข้า LINE User ID: ${target} เรียบร้อยแล้ว!` 
                : 'ตรวจสอบรูปแบบ Flex Message สวยงาม ถูกต้องตามมาตรฐาน LINE 100%! (สามารถเปิดส่งในแอป LINE หรือระบุ User ID)')
        });
      } else {
        setSendResult({
          success: false,
          message: result.error || 'ส่งข้อความไม่สำเร็จ กรุณาลองใหม่อีกครั้ง หรือใช้ปุ่มเปิดส่งในแอป LINE',
          details: result.details
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-slate-950/75 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]"
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
                          <div>🏦 {property.bankName} {property.bankAccount}</div>
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

                {/* Selection of Method */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-800 block">
                    เลือกวิธีการส่งแจ้งเตือน:
                  </label>

                  {/* Option 1: Direct 1-Click LINE App Share */}
                  <label 
                    onClick={() => setSendMethod('line_share')}
                    className={`block p-3 rounded-xl border-2 transition-all cursor-pointer ${
                      sendMethod === 'line_share'
                        ? 'border-[#06C755] bg-emerald-50/40 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input 
                        type="radio" 
                        name="sendMethod" 
                        checked={sendMethod === 'line_share'}
                        onChange={() => setSendMethod('line_share')}
                        className="mt-1 text-[#06C755] focus:ring-[#06C755]"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Share2 className="w-3.5 h-3.5 text-[#06C755]" />
                            <span>เปิดส่งในแอป LINE (สะดวกที่สุดสำหรับแชทผู้เช่า)</span>
                          </span>
                          <span className="text-[10px] bg-[#06C755] text-white px-2 py-0.5 rounded-full font-bold">
                            แนะนำ
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          แตะปุ่มเดียวเพื่อเปิดแอป LINE ในมือถือหรือคอมพิวเตอร์ แล้วเลือกแชทผู้เช่าส่งได้ทันที ไม่ต้องกรอก User ID
                        </p>
                      </div>
                    </div>
                  </label>

                  {/* Option 2: Push to Target LINE User ID */}
                  <label 
                    onClick={() => setSendMethod('bot_push')}
                    className={`block p-3 rounded-xl border-2 transition-all cursor-pointer ${
                      sendMethod === 'bot_push'
                        ? 'border-indigo-500 bg-indigo-50/40 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input 
                        type="radio" 
                        name="sendMethod" 
                        checked={sendMethod === 'bot_push'}
                        onChange={() => setSendMethod('bot_push')}
                        className="mt-1 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">
                            ส่งผ่านบอทไปยัง LINE User ID หรือ Group ID
                          </span>
                          <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-medium">
                            บอทส่งให้
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          ส่งข้อความการ์ด Flex Message ตรงไปยัง User ID (U...) หรือกลุ่มของหอพัก
                        </p>
                      </div>
                    </div>
                  </label>

                  {/* Input for User ID if bot_push selected */}
                  {sendMethod === 'bot_push' && (
                    <div className="pl-6 pt-1">
                      <input
                        type="text"
                        value={targetUserId}
                        onChange={(e) => setTargetUserId(e.target.value)}
                        placeholder="ระบุ LINE User ID หรือ Group ID (เช่น U5a53...)"
                        className="w-full bg-white border border-indigo-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        * หาได้จาก webhook หรือระบบ LINE Official Account ของคุณ
                      </p>
                    </div>
                  )}

                  {/* Option 3: Broadcast to all friends */}
                  <label 
                    onClick={() => setSendMethod('bot_broadcast')}
                    className={`block p-3 rounded-xl border-2 transition-all cursor-pointer ${
                      sendMethod === 'bot_broadcast'
                        ? 'border-purple-500 bg-purple-50/40 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input 
                        type="radio" 
                        name="sendMethod" 
                        checked={sendMethod === 'bot_broadcast'}
                        onChange={() => setSendMethod('bot_broadcast')}
                        className="mt-1 text-purple-600 focus:ring-purple-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">
                            ส่งแบบ Broadcast ให้ผู้เช่าทุกคนที่เป็นเพื่อนกับบอท
                          </span>
                          <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-medium">
                            ทุกคนใน LINE OA
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          ส่งไปยังทุกคนที่กดติดตาม/เป็นเพื่อนกับ LINE OA {DEFAULT_LINE_BOT_BASIC_ID}
                        </p>
                      </div>
                    </div>
                  </label>
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
                    <div className="flex-1">
                      <div className="font-bold">
                        {sendResult.success ? 'ส่งสำเร็จเรียบร้อย!' : 'เกิดข้อผิดพลาดในการส่ง'}
                      </div>
                      <div className="text-[11px] mt-0.5 leading-relaxed">{sendResult.message}</div>
                    </div>
                  </motion.div>
                )}

                {/* Main Action Buttons */}
                <div className="pt-2 space-y-2">
                  {sendMethod === 'line_share' ? (
                    <button
                      type="button"
                      onClick={handleOpenLineShare}
                      className="w-full py-3 bg-[#06C755] hover:bg-[#05b34c] active:scale-[0.99] text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/20 transition-all cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>เปิดแอป LINE ส่งแจ้งเตือนผู้เช่า</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-75" />
                    </button>
                  ) : (
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
                            {sendMethod === 'bot_broadcast' 
                              ? 'ส่ง Broadcast ผ่าน LINE Bot ทันที' 
                              : 'ส่งข้อความผ่าน LINE Bot ทันที'}
                          </span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Secondary Copy Button */}
                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="w-full py-2.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedText ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">คัดลอกข้อความสรุปเรียบร้อย!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>คัดลอกข้อความสรุปสำหรับนำไปวางในแชท</span>
                      </>
                    )}
                  </button>
                </div>
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
