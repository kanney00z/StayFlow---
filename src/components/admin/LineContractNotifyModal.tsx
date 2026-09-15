import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, MessageCircle, Copy, Check, ExternalLink, 
  AlertCircle, AlertTriangle, CheckCircle2, Clock, Sparkles, Building2, 
  User, CreditCard, ChevronRight, X, Loader2, Share2, Info, FileText, Scale
} from 'lucide-react';
import { LeaseContract, PropertyProfile } from '../../types';
import { formatCurrency, formatDateThai } from '../../utils/formatters';
import { 
  sendLineContractNotice, 
  generateLineContractShareText, 
  getLineContractShareUrl,
  fetchLineBotInfo,
  DEFAULT_LINE_BOT_BASIC_ID,
  DEFAULT_LINE_BOT_NAME
} from '../../lib/lineService';

interface LineContractNotifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: LeaseContract | null;
  property: PropertyProfile;
}

export const LineContractNotifyModal: React.FC<LineContractNotifyModalProps> = ({
  isOpen,
  onClose,
  contract,
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

  useEffect(() => {
    if (isOpen && contract) {
      setSendResult(null);
      setCustomNote('');
      
      const savedTarget = localStorage.getItem(`line_uid_${contract.roomNumber}`) || 
                          localStorage.getItem('last_line_user_id') || 
                          property.lineNotifyTargetId || 
                          'Uf8abfa5a3d0c7e8ef445167e555f3cb7';
      setTargetUserId(savedTarget);

      setIsLoadingBot(true);
      fetchLineBotInfo()
        .then((res) => {
          if (res.success && res.bot) {
            setBotInfo(res.bot);
          }
        })
        .finally(() => setIsLoadingBot(false));
    }
  }, [isOpen, contract?.id, contract?.roomNumber, property.lineNotifyTargetId]);

  if (!isOpen || !contract) return null;

  const shareText = generateLineContractShareText(contract, property, customNote);
  const shareUrl = getLineContractShareUrl(contract, property, customNote);

  const handleCopyText = () => {
    try {
      navigator.clipboard.writeText(shareText);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 3000);
    } catch {
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
    const newWindow = window.open(shareUrl, '_blank', 'noopener,noreferrer');
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      window.location.href = shareUrl;
    }
  };

  const handleSendViaBot = async () => {
    if (!isBroadcast && !targetUserId.trim()) {
      setSendResult({
        success: false,
        message: 'กรุณาระบุ LINE User ID ของผู้รับ (เช่น Uf8abfa5a3d0c7e8ef445167e555f3cb7) หรือเลือกส่งแบบ Broadcast'
      });
      return;
    }

    const trimmedTarget = targetUserId.trim();
    if (!isBroadcast && trimmedTarget.startsWith('@')) {
      setSendResult({
        success: false,
        isLineIdError: true,
        message: `"${trimmedTarget}" เป็น LINE ID (ค้นหาเพื่อน) ซึ่งบอทไม่สามารถส่งตรงได้ กรุณาใช้แท็บ "เปิดแอป LINE / คัดลอก" แทน หรือระบุเป็น LINE User ID 33 หลัก (U...)`
      });
      return;
    }

    setIsSending(true);
    setSendResult(null);

    try {
      const res = await sendLineContractNotice(contract, property, {
        targetUserId: isBroadcast ? undefined : trimmedTarget,
        broadcast: isBroadcast,
        customNote: customNote.trim() || undefined
      });

      if (res.success) {
        if (!isBroadcast && trimmedTarget) {
          localStorage.setItem('last_line_user_id', trimmedTarget);
          localStorage.setItem(`line_uid_${contract.roomNumber}`, trimmedTarget);
        }

        setSendResult({
          success: true,
          message: isBroadcast
            ? 'ส่งการ์ดสัญญาเช่าแบบ Broadcast ถึงผู้ติดตามทุกคนใน LINE OA สำเร็จเรียบร้อย!'
            : `ส่งการ์ดสัญญาเช่าห้อง ${contract.roomNumber} เข้า LINE ของผู้รับสำเร็จเรียบร้อยแล้ว!`
        });
      } else {
        const isIdIssue = res.error?.includes('LINE ID') || res.error?.includes('ผู้ใช้นี้ยังไม่ได้เป็นเพื่อน') || res.error?.includes('400');
        setSendResult({
          success: false,
          isLineIdError: isIdIssue,
          message: res.error || 'ไม่สามารถส่งข้อความได้ กรุณาตรวจสอบการเชื่อมต่อ',
          details: res.details
        });
      }
    } catch (err: any) {
      setSendResult({
        success: false,
        message: err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์'
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AnimatePresence>
      <div 
        id="line-contract-modal-backdrop"
        className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-black/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-5 sm:px-6 py-4 text-white flex items-center justify-between shrink-0 border-b border-indigo-900/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#06C755] flex items-center justify-center text-white shadow-lg shadow-[#06C755]/20 shrink-0">
                <MessageCircle className="w-5 h-5 fill-current" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-white">ส่งสัญญาเช่าเข้า LINE</h3>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-400/30">
                    LINE Official
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  ห้อง {contract.roomNumber} • ผู้เช่า: <span className="font-semibold text-white">{contract.lesseeName}</span> • เลขที่: {contract.contractNumber}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
            {/* Quick Summary Banner */}
            <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">
                    สัญญาเช่าห้อง {contract.roomNumber} ({contract.durationMonths} เดือน)
                  </div>
                  <div className="text-slate-600 text-[11px]">
                    เริ่ม {formatDateThai(contract.startDate)} • ชำระทุกวันที่ {contract.paymentDueDay} ของเดือน
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-500">ค่าเช่ารายเดือน</div>
                <div className="text-sm font-bold text-indigo-900">{formatCurrency(contract.monthlyRent)}</div>
                <div className="text-[10px] text-slate-500">ประกัน {formatCurrency(contract.depositAmount)}</div>
              </div>
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
                      <span>วิธีที่สะดวกที่สุดสำหรับส่งให้ผู้เช่า (ไม่ต้องใช้ LINE User ID)</span>
                    </div>
                    <p className="text-[11px] text-emerald-800 leading-relaxed">
                      กดปุ่ม <strong>"คัดลอกข้อความสรุปสัญญา"</strong> แล้วนำไปวาง (Ctrl+V) ในห้องแชท LINE ของผู้เช่าได้ทันที หรือกดปุ่ม <strong>"เปิดแอป LINE"</strong> เพื่อเลือกส่งหาผู้เช่าได้เลย
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
                          <span>คัดลอกข้อความสัญญาแล้ว!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>1. คัดลอกข้อความสรุปสัญญาทันที</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenLineShare}
                      className="py-3 px-4 bg-[#06C755] hover:bg-[#05b34c] active:scale-[0.99] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-950/20 transition-all cursor-pointer text-center"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>2. เปิดแอป LINE ส่งผู้เช่า</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                    </button>
                  </div>

                  {/* Formatted Contract Message Box */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        <span>ข้อความสรุปสัญญาเช่าที่จะส่ง:</span>
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
                    <div className="bg-white border border-slate-200 rounded-lg p-2.5 text-[11px] font-sans text-slate-800 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap select-all">
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
                      <div className="text-[10px] text-slate-500 font-normal">ส่งเฉพาะห้อง {contract.roomNumber}</div>
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
                        <span>บอทจะส่งการ์ด Flex Message สัญญาเช่าสีน้ำเงินเข้ม สรุปเงื่อนไขและค่าเช่าตรงเข้าแชท</span>
                      </p>
                    </div>
                  )}

                  {/* Optional Custom Note */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">ข้อความเพิ่มเติม (แนบไปกับการ์ด):</label>
                    <input
                      type="text"
                      value={customNote}
                      onChange={(e) => setCustomNote(e.target.value)}
                      placeholder="เช่น กรุณาอ่านระเบียบและเก็บข้อความนี้ไว้เป็นหลักฐาน"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

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
                            : 'ส่งการ์ดสัญญาเช่าผ่าน LINE Bot ทันที'}
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
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                  sendResult.success
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : 'bg-rose-50 border-rose-300 text-rose-950'
                }`}
              >
                <div className="flex items-start gap-2">
                  {sendResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 space-y-1">
                    <p className="font-bold">{sendResult.message}</p>
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
                </div>
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>LINE OA: <strong className="text-slate-800">{botInfo?.displayName || DEFAULT_LINE_BOT_NAME}</strong> ({DEFAULT_LINE_BOT_BASIC_ID})</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
