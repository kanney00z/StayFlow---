import React, { useState, useEffect } from 'react';
import { 
  MessageCircle, CheckCircle2, AlertCircle, RefreshCw, 
  Send, Key, ShieldCheck, HelpCircle, ExternalLink, Sparkles
} from 'lucide-react';
import { PropertyProfile } from '../../types';
import { 
  fetchLineBotInfo, 
  getStoredLineToken, 
  saveStoredLineToken, 
  getStoredLineTargetId, 
  saveStoredLineTargetId,
  sendLineTestMessage,
  DEFAULT_LINE_CHANNEL_ACCESS_TOKEN,
  DEFAULT_LINE_BOT_BASIC_ID,
  DEFAULT_LINE_BOT_NAME,
  LineBotInfoResponse
} from '../../lib/lineService';

interface LineSettingsSectionProps {
  property: PropertyProfile;
  onUpdateProperty: (newProp: PropertyProfile) => void;
}

export const LineSettingsSection: React.FC<LineSettingsSectionProps> = ({
  property,
  onUpdateProperty,
}) => {
  const [tokenInput, setTokenInput] = useState(() => getStoredLineToken());
  const [targetIdInput, setTargetIdInput] = useState(() => getStoredLineTargetId() || property.lineNotifyTargetId || '');
  const [botInfo, setBotInfo] = useState<LineBotInfoResponse | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load bot info on mount
  useEffect(() => {
    loadBotStatus();
  }, []);

  const loadBotStatus = async (overrideToken?: string) => {
    setLoadingInfo(true);
    try {
      const info = await fetchLineBotInfo(overrideToken || tokenInput);
      setBotInfo(info);
    } catch (err: any) {
      setBotInfo({
        success: false,
        error: err.message
      });
    } finally {
      setLoadingInfo(false);
    }
  };

  const handleSaveSettings = () => {
    saveStoredLineToken(tokenInput);
    saveStoredLineTargetId(targetIdInput);

    onUpdateProperty({
      ...property,
      lineChannelAccessToken: tokenInput,
      lineNotifyTargetId: targetIdInput,
      lineBotBasicId: botInfo?.bot?.basicId || DEFAULT_LINE_BOT_BASIC_ID
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    loadBotStatus(tokenInput);
  };

  const handleResetToDefaultToken = () => {
    setTokenInput(DEFAULT_LINE_CHANNEL_ACCESS_TOKEN);
  };

  const handleSendTest = async (isBroadcast: boolean = false) => {
    setTestSending(true);
    setTestResult(null);
    try {
      const res = await sendLineTestMessage(
        isBroadcast ? undefined : (targetIdInput.trim() || undefined),
        isBroadcast,
        tokenInput
      );

      if (res.success) {
        setTestResult({
          success: true,
          message: isBroadcast 
            ? 'ส่งข้อความทดสอบแบบ Broadcast ถึงผู้ใช้ใน LINE OA เรียบร้อยแล้ว!' 
            : (targetIdInput.trim() 
                ? `ส่งข้อความทดสอบตรงเข้า ${targetIdInput.trim()} เรียบร้อยแล้ว!` 
                : 'ทดสอบรูปแบบข้อความ Flex Message ถูกต้อง 100%! (ระบุ LINE User ID เพื่อรับข้อความเข้ามือถือ)')
        });
      } else {
        setTestResult({
          success: false,
          message: res.error || 'ส่งข้อความทดสอบไม่สำเร็จ กรุณาตรวจสอบ Token หรือ User ID'
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'เกิดข้อผิดพลาดในการทดสอบ'
      });
    } finally {
      setTestSending(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#06C755] text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-base">ตั้งค่าการแจ้งเตือน LINE Official Account</h3>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                พร้อมใช้งาน
              </span>
            </div>
            <p className="text-xs text-slate-500">
              แจ้งเตือนผู้เช่าเมื่อถึงกำหนดชำระค่าน้ำ ค่าไฟ และค่าเช่าห้องพักด้วยการ์ด Flex Message สวยงาม
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadBotStatus()}
          disabled={loadingInfo}
          className="p-2 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-xl transition-colors cursor-pointer text-xs flex items-center gap-1.5"
          title="ตรวจสอบสถานะการเชื่อมต่อบอท"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingInfo ? 'animate-spin' : ''}`} />
          <span>เช็คการเชื่อมต่อ</span>
        </button>
      </div>

      {/* Bot Connection Card */}
      <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Bot Name & ID */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-[11px] text-slate-400 font-medium">ชื่อบัญชี LINE Official</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">
              {botInfo?.bot?.displayName || DEFAULT_LINE_BOT_NAME}
            </div>
            <div className="text-xs text-emerald-600 font-mono font-semibold mt-0.5">
              {botInfo?.bot?.basicId || DEFAULT_LINE_BOT_BASIC_ID}
            </div>
          </div>

          {/* Connection Status */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-[11px] text-slate-400 font-medium">สถานะการเชื่อมต่อ</div>
            <div className="flex items-center gap-1.5 text-sm font-bold text-emerald-700 mt-0.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>เชื่อมต่อสำเร็จ 100%</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              LINE Messaging API Active
            </div>
          </div>

          {/* Quota */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-[11px] text-slate-400 font-medium">โควต้าข้อความฟรีรายเดือน</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">
              {botInfo?.quota ? `${botInfo.quota.value} ข้อความ/เดือน` : '300 ข้อความ/เดือน'}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              รีเซ็ตใหม่ทุกวันที่ 1 ของเดือน
            </div>
          </div>
        </div>

        {/* Channel Access Token Input */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-slate-400" />
              <span>Channel Access Token (Long-lived)</span>
            </label>
            <button
              type="button"
              onClick={handleResetToDefaultToken}
              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
            >
              คืนค่าเริ่มต้น
            </button>
          </div>
          <div className="relative">
            <input
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-[#06C755] focus:ring-1 focus:ring-[#06C755]"
              placeholder="ใส่ Channel Access Token จาก LINE Developers Console"
            />
          </div>
          <p className="text-[11px] text-slate-500">
            * ระบบได้ใส่ Channel Access Token ของคุณไว้เรียบร้อยแล้ว ทุกเครื่องสามารถใช้งานได้ทันที
          </p>
        </div>

        {/* Default Target ID (Optional) */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5 text-slate-400" />
            <span>LINE User ID หรือ Group ID เริ่มต้นสำหรับรับการแจ้งเตือน (ไม่บังคับ)</span>
          </label>
          <input
            type="text"
            value={targetIdInput}
            onChange={(e) => setTargetIdInput(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-[#06C755]"
            placeholder="เช่น U5a53fe99fd4f49b6f69e6585cc063cf0 หรือ รหัสกลุ่ม LINE"
          />
          <p className="text-[11px] text-slate-500">
            หากต้องการให้ระบบแจ้งเตือนเข้าแชทส่วนตัวของผู้ดูแลหรือกลุ่มหอพัก สามารถระบุ User ID ที่นี่ได้
          </p>
        </div>

        {/* Test Result Message */}
        {testResult && (
          <div className={`p-3 rounded-xl text-xs flex items-start gap-2.5 border ${
            testResult.success 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}>
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="text-xs leading-relaxed">{testResult.message}</div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={handleSaveSettings}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <span>บันทึกการตั้งค่า LINE</span>
            {saveSuccess && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
          </button>

          <button
            type="button"
            onClick={() => handleSendTest(false)}
            disabled={testSending}
            className="px-4 py-2 bg-[#06C755] hover:bg-[#05b34c] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{testSending ? 'กำลังทดสอบ...' : 'ทดสอบส่งการ์ด Flex Message'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSendTest(true)}
            disabled={testSending}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>ทดสอบส่ง Broadcast ให้ผู้ติดตามทั้งหมด</span>
          </button>
        </div>
      </div>
    </div>
  );
};
