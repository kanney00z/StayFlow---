import React, { useState, useEffect } from 'react';
import { 
  Smartphone, QrCode, Copy, Check, ExternalLink, 
  Sparkles, ShieldCheck, RefreshCw, X, Radio, ArrowRight, Share2
} from 'lucide-react';
import QRCode from 'qrcode';
import { 
  getMobileSyncUrl, isSupabaseConfigured, getSupabaseConfig, 
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
  const [copied, setCopied] = useState<boolean>(false);
  const [isPushing, setIsPushing] = useState<boolean>(false);
  const [pushStatus, setPushStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  const isConfigured = isSupabaseConfigured();
  const config = getSupabaseConfig();

  useEffect(() => {
    if (!isOpen) return;
    
    const url = getMobileSyncUrl();
    setSyncUrl(url);

    // Generate high quality QR code
    QRCode.toDataURL(url, {
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

  const handleCopyLink = () => {
    if (!syncUrl) return;
    navigator.clipboard.writeText(syncUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
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
                เปิดใช้งานในมือถือ (ข้อมูลตรงกันทันที)
              </h3>
              <p className="text-xs text-slate-400">
                สแกนหรือแชร์ลิงก์นี้เพื่อใช้งานบนมือถือโดยไม่ต้องตั้งค่าใหม่
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
          {!isConfigured ? (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-amber-300 text-xs space-y-2.5">
              <div className="flex items-start gap-2.5">
                <span className="text-base">⚠️</span>
                <div>
                  <p className="font-semibold text-amber-200">ยังไม่ได้เชื่อมต่อ Supabase Database</p>
                  <p className="text-amber-300/80 mt-0.5 leading-relaxed">
                    เพื่อให้ข้อมูลบนมือถือและคอมพิวเตอร์อัปเดตตรงกันแบบ Real-Time ตลอดเวลา กรุณาเชื่อมต่อ Supabase URL และ Key ก่อน
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
                  <p className="text-xs font-bold text-emerald-300">ระบบเชื่อมต่อ Cloud พร้อมใช้งานแล้ว</p>
                  <p className="text-[11px] text-emerald-400/80">ฐานข้อมูลพร้อมซิงค์ข้อมูลตรงกับมือถือทุกเครื่อง</p>
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

          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center p-5 bg-white rounded-2xl shadow-inner border border-slate-700">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Mobile Sync QR Code"
                className="w-52 h-52 object-contain rounded-lg"
              />
            ) : (
              <div className="w-52 h-52 bg-slate-100 flex items-center justify-center text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
              </div>
            )}
            <p className="text-[12px] font-semibold text-slate-800 mt-2 flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-indigo-600" />
              <span>ใช้กล้องมือถือสแกนเพื่อเปิดเว็บ</span>
            </p>
          </div>

          {/* Step by step guide */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 space-y-2 text-xs text-slate-300">
            <p className="font-bold text-white text-xs flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>วิธีใช้งานบนมือถือโดยไม่ต้องทำอะไรเพิ่ม:</span>
            </p>
            <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-300 pl-1 leading-relaxed">
              <li>ใช้กล้องมือถือสแกน <b>QR Code</b> ด้านบน หรือกดคัดลอกลิงก์ส่งเข้า LINE</li>
              <li>เมื่อแตะเปิดลิงก์ในมือถือ ระบบจะเชื่อมต่อกับฐานข้อมูล Cloud ของคุณทันที</li>
              <li>ข้อมูลห้องพัก ผู้เช่า ค่าน้ำค่าไฟ และการจองจะตรงกับบนคอมพิวเตอร์ 100%</li>
            </ol>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <button
              id="btn-copy-mobile-sync-link"
              type="button"
              onClick={handleCopyLink}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/50 transition-all cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>คัดลอกลิงก์เรียบร้อยแล้ว! (นำไปวางใน LINE หรือแชทได้เลย)</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>คัดลอกลิงก์สำหรับเปิดในมือถือ (พร้อมระบบซิงค์อัตโนมัติ)</span>
                </>
              )}
            </button>

            <a
              href={syncUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium rounded-xl text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>ทดลองเปิดในแท็บใหม่</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
