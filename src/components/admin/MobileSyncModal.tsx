import React, { useState, useEffect } from 'react';
import { 
  Smartphone, QrCode, Copy, Check, ExternalLink, 
  Sparkles, ShieldCheck, RefreshCw, X, Radio, ArrowRight, 
  Share2, Globe, Link2, Send
} from 'lucide-react';
import QRCode from 'qrcode';
import { 
  getMobileSyncUrl, getPublicBaseUrl, isSupabaseConfigured, getSupabaseConfig, 
  syncAllToSupabase 
} from '../../lib/supabase';
import { PropertyProfile, UtilityRateConfig, Room, Tenant, Booking, UtilityBill } from '../../types';

interface MobileSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings?: () => void;
  property: PropertyProfile;
  utilityConfig: UtilityRateConfig;
  rooms: Room[];
  tenants: Tenant[];
  bookings: Booking[];
  bills: UtilityBill[];
}

export const MobileSyncModal: React.FC<MobileSyncModalProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
  property,
  utilityConfig,
  rooms,
  tenants,
  bookings,
  bills,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [syncUrl, setSyncUrl] = useState<string>('');
  const [publicUrl, setPublicUrl] = useState<string>('');
  const [copiedSync, setCopiedSync] = useState<boolean>(false);
  const [copiedPublic, setCopiedPublic] = useState<boolean>(false);
  const [isPushing, setIsPushing] = useState<boolean>(false);
  const [pushStatus, setPushStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  const isConfigured = isSupabaseConfigured();
  const config = getSupabaseConfig();

  useEffect(() => {
    if (!isOpen) return;
    
    const fullSyncUrl = getMobileSyncUrl();
    const cleanPublicUrl = getPublicBaseUrl();
    setSyncUrl(fullSyncUrl);
    setPublicUrl(cleanPublicUrl);

    // Generate high quality QR code with direct sync URL
    QRCode.toDataURL(fullSyncUrl, {
      width: 320,
      margin: 1.5,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((dataUrl) => {
        setQrDataUrl(dataUrl);
      })
      .catch((err) => {
        console.error('Failed to generate QR code:', err);
      });
  }, [isOpen, config.url, config.anonKey]);

  if (!isOpen) return null;

  const handleCopySyncLink = () => {
    if (!syncUrl) return;
    navigator.clipboard.writeText(syncUrl);
    setCopiedSync(true);
    setTimeout(() => setCopiedSync(false), 2500);
  };

  const handleCopyPublicLink = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    setCopiedPublic(true);
    setTimeout(() => setCopiedPublic(false), 2500);
  };

  const handleQuickUpload = async () => {
    setIsPushing(true);
    setPushStatus(null);
    try {
      const res = await syncAllToSupabase({
        property,
        utilityConfig,
        rooms,
        tenants,
        bookings,
        bills,
      });
      setPushStatus(res);
    } catch (err: any) {
      setPushStatus({ success: false, message: err.message || 'เกิดข้อผิดพลาดในการซิงค์' });
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <div id="mobile-sync-modal" className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                ลิงก์สำหรับเปิดใช้งานบนมือถือ
              </h3>
              <p className="text-xs text-slate-400">
                คัดลอกลิงก์ส่งเข้า LINE หรือแชทเพื่อเปิดใช้งานบนมือถือได้ทันที
              </p>
            </div>
          </div>
          <button
            id="btn-close-mobile-sync-modal"
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Supabase Status Banner */}
          {!isConfigured ? (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-amber-300 text-xs space-y-2.5">
              <div className="flex items-start gap-2.5">
                <span className="text-base">⚠️</span>
                <div>
                  <p className="font-semibold text-amber-200">ยังไม่ได้เชื่อมต่อ Supabase Database</p>
                  <p className="text-amber-300/80 mt-0.5 leading-relaxed">
                    เพื่อให้ข้อมูลบนมือถือและคอมพิวเตอร์อัปเดตตรงกันตลอดเวลา กรุณาเชื่อมต่อ Supabase URL และ Key ก่อน
                  </p>
                </div>
              </div>
              {onOpenSettings && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSettings();
                  }}
                  className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>ไปที่หน้าตั้งค่า Supabase</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <div>
                  <p className="text-xs font-bold text-emerald-300">ฐานข้อมูล Cloud พร้อมเชื่อมต่อกับมือถือ</p>
                  <p className="text-[11px] text-emerald-400/80">ข้อมูลจะซิงค์ตรงกันทันทีที่เปิดลิงก์</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleQuickUpload}
                disabled={isPushing}
                className="px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold rounded-lg flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
                title="ดันข้อมูลปัจจุบันขึ้น Cloud เพื่อให้มือถือเห็นทันที"
              >
                <RefreshCw className={`w-3 h-3 ${isPushing ? 'animate-spin' : ''}`} />
                <span>{isPushing ? 'กำลังบันทึก...' : 'อัปเดตข้อมูล Cloud'}</span>
              </button>
            </div>
          )}

          {pushStatus && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              pushStatus.success ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300' : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
            }`}>
              <Check className="w-4 h-4 shrink-0" />
              <span>{pushStatus.message}</span>
            </div>
          )}

          {/* Direct Sync Web Link Box (Primary Choice) */}
          <div className="bg-slate-800/80 border border-indigo-500/40 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                <Link2 className="w-4 h-4 text-indigo-400" />
                <span>ลิงก์เว็บตรงสำหรับมือถือ (เชื่อมต่อ Cloud ทันที)</span>
              </span>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-medium border border-indigo-500/30">
                แนะนำ
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="input-sync-url"
                type="text"
                readOnly
                value={syncUrl}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 font-mono select-all focus:outline-none focus:border-indigo-500"
              />
              <button
                id="btn-copy-sync-link"
                type="button"
                onClick={handleCopySyncLink}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shrink-0 shadow cursor-pointer"
              >
                {copiedSync ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>คัดลอกแล้ว!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>คัดลอกลิงก์</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              💡 คัดลอกลิงก์นี้ส่งเข้า <strong>LINE</strong> หรือแชทตนเอง แล้วแตะเปิดบนมือถือได้เลย ไม่ต้องกรอกอะไรเพิ่ม
            </p>
          </div>

          {/* QR Code & Clean Public Link Accordion */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* QR Code Box */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3.5 flex flex-col items-center justify-center text-center">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Mobile Sync QR Code"
                  className="w-32 h-32 object-contain rounded bg-white p-1 shadow"
                />
              ) : (
                <div className="w-32 h-32 bg-slate-800 rounded flex items-center justify-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
                </div>
              )}
              <p className="text-[11px] font-semibold text-slate-300 mt-2 flex items-center gap-1">
                <QrCode className="w-3.5 h-3.5 text-indigo-400" />
                <span>หรือสแกนด้วยกล้องมือถือ</span>
              </p>
            </div>

            {/* Clean URL / Test Button */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3.5 flex flex-col justify-between space-y-2.5">
              <div>
                <p className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  <span>ลิงก์หน้าเว็บหลัก (Public URL)</span>
                </p>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  สามารถเปิดใช้งานผ่านเบราว์เซอร์บนมือถือได้ทุกเครื่อง
                </p>
              </div>

              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={handleCopyPublicLink}
                  className="w-full py-1.5 px-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedPublic ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedPublic ? 'คัดลอก Public URL แล้ว' : 'คัดลอก Public URL'}</span>
                </button>

                <a
                  href={syncUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-1.5 px-2.5 bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/30 text-indigo-300 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>ทดลองเปิดในแท็บใหม่</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
