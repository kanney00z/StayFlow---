import React, { useState, useEffect } from 'react';
import { 
  Database, Cloud, RefreshCw, CheckCircle2, AlertCircle, 
  Copy, ExternalLink, Code2, Shield, Radio, ArrowUpRight,
  Check, Play, ArrowDownToLine, UploadCloud, Smartphone, QrCode, Sparkles
} from 'lucide-react';
import QRCode from 'qrcode';
import { 
  getSupabaseConfig, saveSupabaseConfig, testSupabaseConnection, 
  isSupabaseConfigured, SUPABASE_SQL_SCHEMA, syncAllToSupabase,
  fetchAllFromSupabase, getSupabase, getMobileSyncUrl
} from '../../lib/supabase';
import { PropertyProfile, UtilityRateConfig, Room, Tenant, Booking, UtilityBill } from '../../types';

interface SupabaseSettingsSectionProps {
  property: PropertyProfile;
  utilityConfig: UtilityRateConfig;
  rooms: Room[];
  tenants: Tenant[];
  bookings: Booking[];
  bills: UtilityBill[];
  onDataSyncedFromCloud?: (data: {
    property?: PropertyProfile;
    utilityConfig?: UtilityRateConfig;
    rooms?: Room[];
    tenants?: Tenant[];
    bookings?: Booking[];
    bills?: UtilityBill[];
  }) => void;
  isRealtimeConnected?: boolean;
}

export const SupabaseSettingsSection: React.FC<SupabaseSettingsSectionProps> = ({
  property,
  utilityConfig,
  rooms,
  tenants,
  bookings,
  bills,
  onDataSyncedFromCloud,
  isRealtimeConnected = false,
}) => {
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedMobileLink, setCopiedMobileLink] = useState(false);
  const [showSqlCode, setShowSqlCode] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [mobileSyncUrl, setMobileSyncUrl] = useState<string>('');

  useEffect(() => {
    const config = getSupabaseConfig();
    setSupabaseUrl(config.url);
    setSupabaseKey(config.anonKey);
    setIsConnected(isSupabaseConfigured());

    const url = getMobileSyncUrl();
    setMobileSyncUrl(url);

    if (config.url && config.anonKey) {
      QRCode.toDataURL(url, {
        width: 240,
        margin: 1.5,
        color: { dark: '#0f172a', light: '#ffffff' }
      }).then(setQrCodeUrl).catch(console.error);
    }
  }, []);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testSupabaseConnection(supabaseUrl, supabaseKey);
      setTestResult(res);
      if (res.success) {
        setIsConnected(true);
        const url = getMobileSyncUrl();
        setMobileSyncUrl(url);
        QRCode.toDataURL(url, {
          width: 240,
          margin: 1.5,
          color: { dark: '#0f172a', light: '#ffffff' }
        }).then(setQrCodeUrl).catch(console.error);
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveAndConnect = async () => {
    saveSupabaseConfig(supabaseUrl, supabaseKey);
    setIsConnected(isSupabaseConfigured());
    await handleTestConnection();
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleCopyMobileLink = () => {
    const url = getMobileSyncUrl();
    navigator.clipboard.writeText(url);
    setCopiedMobileLink(true);
    setTimeout(() => setCopiedMobileLink(false), 2500);
  };

  const handlePushAllToCloud = async () => {
    setIsSyncing(true);
    setTestResult(null);
    try {
      const res = await syncAllToSupabase({
        property,
        utilityConfig,
        rooms,
        tenants,
        bookings,
        bills,
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, message: `เกิดข้อผิดพลาด: ${err.message}` });
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullFromCloud = async () => {
    setIsPulling(true);
    setTestResult(null);
    try {
      const data = await fetchAllFromSupabase();
      if (data && onDataSyncedFromCloud) {
        onDataSyncedFromCloud(data);
        setTestResult({
          success: true,
          message: 'ดึงข้อมูลล่าสุดจาก Supabase Cloud สำเร็จเรียบร้อย!',
        });
      } else {
        setTestResult({
          success: false,
          message: 'ไม่พบข้อมูลในตาราง Supabase (กรุณารันคำสั่ง SQL สร้างตาราง หรือกดอัปโหลดข้อมูล)',
        });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: `เกิดข้อผิดพลาด: ${err.message}` });
    } finally {
      setIsPulling(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl md:rounded-3xl p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                เชื่อมต่อฐานข้อมูล Supabase & Real-Time Sync
              </h3>
              {isConnected ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Real-Time เชื่อมต่อแล้ว
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                  ยังไม่ได้เชื่อมต่อ Cloud (ใช้งาน LocalStorage)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              เชื่อมโยงกับ <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-semibold hover:underline inline-flex items-center gap-0.5">supabase.com <ArrowUpRight className="w-3 h-3 inline" /></a> เพื่อบันทึกข้อมูลลง Cloud Database และแสดงผล Real-Time พร้อมกันทุกเครื่อง
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopySql}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
        >
          {copiedSql ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
          <span>{copiedSql ? 'คัดลอก SQL แล้ว!' : 'คัดลอก SQL สร้างตาราง'}</span>
        </button>
      </div>

      {/* Mobile Live Sync Highlight Card */}
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-2xl p-5 text-white shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-indigo-500 text-white font-bold rounded-md text-[10px] uppercase tracking-wider">
                แนะนำ
              </span>
              <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-indigo-400" />
                <span>เปิดใช้งานในมือถือ — ข้อมูลตรงกับเครื่องนี้ทันที</span>
              </h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
              สแกน QR Code หรือกดคัดลอกลิงก์ส่งเข้า LINE / แชท เพื่อเปิดใช้งานในมือถือ ระบบจะดึงข้อมูลห้องพัก ผู้เช่า ค่าน้ำค่าไฟ และการจองจาก Cloud มาแสดงผลทันทีโดย<strong>ไม่ต้องพิมพ์ Key หรือตั้งค่าใดๆ อีก</strong>
            </p>
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleCopyMobileLink}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                {copiedMobileLink ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedMobileLink ? 'คัดลอกลิงก์สำหรับมือถือแล้ว!' : 'คัดลอกลิงก์สำหรับเปิดในมือถือ'}</span>
              </button>

              <a
                href={mobileSyncUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-medium transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>ทดสอบเปิดลิงก์</span>
              </a>
            </div>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center justify-center bg-white p-3 rounded-xl border border-slate-700 shrink-0 self-center md:self-auto">
            {qrCodeUrl ? (
              <img src={qrCodeUrl} alt="Mobile Direct Sync QR" className="w-28 h-28 object-contain rounded" />
            ) : (
              <div className="w-28 h-28 flex items-center justify-center text-slate-400">
                <QrCode className="w-10 h-10 animate-pulse text-indigo-500" />
              </div>
            )}
            <span className="text-[10px] font-bold text-slate-700 mt-1 flex items-center gap-1">
              <QrCode className="w-3 h-3 text-indigo-600" />
              <span>สแกนด้วยมือถือ</span>
            </span>
          </div>
        </div>
      </div>

      {/* Connection Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div>
          <label className="text-slate-700 font-bold block mb-1">
            Supabase Project URL
          </label>
          <input
            type="url"
            placeholder="https://your-project-ref.supabase.co"
            value={supabaseUrl}
            onChange={(e) => setSupabaseUrl(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-mono text-xs focus:bg-white focus:border-indigo-500 outline-none transition-all"
          />
          <span className="text-[10px] text-slate-400 mt-1 block">
            หาได้จาก Supabase ➔ Project Settings ➔ API ➔ Project URL
          </span>
        </div>

        <div>
          <label className="text-slate-700 font-bold block mb-1">
            Supabase Anon Public API Key
          </label>
          <input
            type="password"
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            value={supabaseKey}
            onChange={(e) => setSupabaseKey(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-mono text-xs focus:bg-white focus:border-indigo-500 outline-none transition-all"
          />
          <span className="text-[10px] text-slate-400 mt-1 block">
            หาได้จาก Supabase ➔ Project Settings ➔ API ➔ Project API Keys (anon public)
          </span>
        </div>
      </div>

      {/* Buttons & Status Alerts */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleSaveAndConnect}
            disabled={isTesting}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            <span>บันทึกและทดสอบเชื่อมต่อ</span>
          </button>

          <button
            type="button"
            onClick={handlePushAllToCloud}
            disabled={isSyncing || !supabaseUrl}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            title="นำข้อมูลห้องพัก บิล ผู้เช่า และมิเตอร์ทั้งหมดในเครื่องนี้อัปโหลดขึ้น Supabase Cloud"
          >
            {isSyncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
            <span>อัปโหลดข้อมูลทั้งหมดขึ้น Cloud</span>
          </button>

          <button
            type="button"
            onClick={handlePullFromCloud}
            disabled={isPulling || !supabaseUrl}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            title="ดึงข้อมูลห้องพักและบิลล่าสุดจาก Supabase Cloud มาแสดงบนเครื่องนี้"
          >
            {isPulling ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowDownToLine className="w-3.5 h-3.5" />}
            <span>ดึงข้อมูลจาก Cloud</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSqlCode(!showSqlCode)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <Code2 className="w-3.5 h-3.5 text-slate-600" />
            <span>{showSqlCode ? 'ซ่อนคำสั่ง SQL' : 'ดูคำสั่ง SQL Schema'}</span>
          </button>
        </div>

        {/* Test Result Alert */}
        {testResult && (
          <div className={`p-4 rounded-2xl text-xs flex items-start gap-3 border ${
            testResult.success 
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}>
            {testResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-0.5">
              <span className="font-bold block">
                {testResult.success ? 'สำเร็จ' : 'ข้อความแจ้งเตือน'}
              </span>
              <p className="leading-relaxed">{testResult.message}</p>
            </div>
          </div>
        )}
      </div>

      {/* SQL Viewer Collapsible */}
      {showSqlCode && (
        <div className="bg-slate-900 text-slate-200 p-4 rounded-2xl text-xs font-mono space-y-2 border border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-slate-400 font-sans font-bold flex items-center gap-1.5">
              <Code2 className="w-4 h-4 text-indigo-400" />
              คำสั่ง SQL สำหรับรันใน Supabase SQL Editor
            </span>
            <button
              type="button"
              onClick={handleCopySql}
              className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-sans font-semibold cursor-pointer"
            >
              {copiedSql ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              <span>{copiedSql ? 'คัดลอกแล้ว' : 'คัดลอก SQL'}</span>
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto pr-2 text-[11px] leading-relaxed text-slate-300">
            <pre className="whitespace-pre-wrap">{SUPABASE_SQL_SCHEMA}</pre>
          </div>
        </div>
      )}

      {/* Quick Setup Guide */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-3">
        <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-indigo-600" />
          <span>ขั้นตอนการตั้งค่า Supabase แบบง่าย (2 นาที) เพื่อใช้งาน Real-Time ทุกเครื่อง:</span>
        </h4>
        <ol className="list-decimal list-inside space-y-1.5 text-slate-600 pl-1 leading-relaxed">
          <li>
            ไปที่ <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-semibold hover:underline">supabase.com</a> ล็อกอิน แล้วกด <strong>New Project</strong>
          </li>
          <li>
            ไปที่เมนู <strong>SQL Editor</strong> ด้านซ้าย แล้วกดปุ่ม <strong>"คัดลอก SQL สร้างตาราง"</strong> ด้านบนนี้ไปวาง แล้วกด <strong>Run</strong>
          </li>
          <li>
            ไปที่เมนู <strong>Project Settings ➔ API</strong> คัดลอก <strong>Project URL</strong> และ <strong>anon public Key</strong> มาวางใน 2 ช่องด้านบน
          </li>
          <li>
            กดปุ่ม <strong>"บันทึกและทดสอบเชื่อมต่อ"</strong> และกด <strong>"อัปโหลดข้อมูลทั้งหมดขึ้น Cloud"</strong>
          </li>
          <li>
            <strong>เรียบร้อย!</strong> หลังจากนี้เมื่อเปิดเว็บจากเครื่องคอมพิวเตอร์ มือถือ หรือส่งต่อให้เจ้าหน้าที่ใช้งาน ทุกคนจะเห็นข้อมูลและสถานะห้อง/มิเตอร์/บิลอัปเดตแบบ <strong>Real-Time ทันที</strong>
          </li>
        </ol>
      </div>
    </div>
  );
};
