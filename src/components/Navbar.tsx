import React from 'react';
import { 
  Building2, LayoutDashboard, DoorClosed, Calculator, 
  Users, Settings, BedDouble, ShieldCheck, 
  Radio, Database, CloudCheck, RefreshCw, Smartphone, QrCode
} from 'lucide-react';
import { PropertyProfile } from '../types';

interface NavbarProps {
  currentMode: 'admin' | 'client';
  onToggleMode: (mode: 'admin' | 'client') => void;
  adminTab: 'dashboard' | 'rooms' | 'utilities' | 'bookings' | 'settings';
  onSelectAdminTab: (tab: 'dashboard' | 'rooms' | 'utilities' | 'bookings' | 'settings') => void;
  property: PropertyProfile;
  pendingBillsCount: number;
  isRealtimeConnected?: boolean;
  isSupabaseConfigured?: boolean;
  onOpenMobileSync?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentMode,
  onToggleMode,
  adminTab,
  onSelectAdminTab,
  property,
  pendingBillsCount,
  isRealtimeConnected = false,
  isSupabaseConfigured = false,
  onOpenMobileSync,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Brand Name */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-950/40">
              <Building2 className="w-5 h-5 text-white" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {property.name}
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-md text-[10px] font-bold">
                  ResiAdmin
                </span>
                {/* Real-time Status Badge */}
                {isSupabaseConfigured ? (
                  <button
                    type="button"
                    onClick={() => onSelectAdminTab('settings')}
                    className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-400 rounded-full text-[10px] font-medium transition-colors cursor-pointer"
                    title="ระบบเชื่อมต่อฐานข้อมูล Supabase แบบ Real-Time ทุกเครื่องอัปเดตตรงกันทันที"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="hidden md:inline">Supabase Real-Time</span>
                    <span className="md:hidden">Live</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSelectAdminTab('settings')}
                    className="hidden sm:flex items-center gap-1 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 rounded-full text-[10px] transition-colors cursor-pointer"
                    title="กดที่นี่เพื่อเชื่อมต่อ Supabase Database สำหรับซิงค์ข้อมูลข้ามอุปกรณ์แบบ Real-Time"
                  >
                    <Database className="w-2.5 h-2.5 text-amber-400" />
                    <span>เชื่อมต่อ Cloud</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-1 hidden md:block">
                ระบบจัดการห้องพักรายวัน-รายเดือน & คิดค่าน้ำค่าไฟอัตโนมัติ
              </p>
            </div>
          </div>

          {/* Right Action & Mode Switcher Pill */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Mobile Sync Button */}
            {onOpenMobileSync && (
              <button
                id="btn-open-mobile-sync-nav"
                type="button"
                onClick={onOpenMobileSync}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs sm:text-xs font-bold shadow-md shadow-indigo-950/40 transition-all border border-indigo-400/30 cursor-pointer"
                title="สร้าง QR Code และลิงก์สำหรับเปิดในมือถือ ให้ข้อมูลตรงกับคอมพิวเตอร์ 100%"
              >
                <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-200" />
                <span className="hidden sm:inline">เปิดในมือถือ (ข้อมูลตรงกัน)</span>
                <span className="sm:hidden">ซิงค์มือถือ</span>
              </button>
            )}

            <div className="bg-slate-800/70 p-1 rounded-xl border border-slate-700/60 flex items-center">
              <button
                type="button"
                onClick={() => onToggleMode('admin')}
                className={`flex items-center gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  currentMode === 'admin'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span className="hidden sm:inline">ระบบหลังบ้าน</span>
                <span className="sm:hidden">แอดมิน</span>
                {pendingBillsCount > 0 && (
                  <span className="w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                    {pendingBillsCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => onToggleMode('client')}
                className={`flex items-center gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  currentMode === 'client'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BedDouble className="w-4 h-4" />
                <span className="hidden sm:inline">หน้าจองสำหรับลูกค้า</span>
                <span className="sm:hidden">หน้าจอง</span>
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Admin Navigation Bar (When in Admin Mode) */}
        {currentMode === 'admin' && (
          <div className="flex items-center gap-1.5 overflow-x-auto py-2.5 border-t border-slate-800 no-scrollbar">
            <button
              type="button"
              onClick={() => onSelectAdminTab('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                adminTab === 'dashboard'
                  ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>ภาพรวมแดชบอร์ด</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectAdminTab('rooms')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                adminTab === 'rooms'
                  ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <DoorClosed className="w-4 h-4" />
              <span>ผังห้องพัก & สถานะ</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectAdminTab('utilities')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap relative ${
                adminTab === 'utilities'
                  ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Calculator className="w-4 h-4 text-indigo-400" />
              <span>คิดค่าน้ำ-ค่าไฟ & จดมิเตอร์</span>
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
            </button>

            <button
              type="button"
              onClick={() => onSelectAdminTab('bookings')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                adminTab === 'bookings'
                  ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>ผู้เช่า & ประวัติการจอง</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectAdminTab('settings')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                adminTab === 'settings'
                  ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>ตั้งค่าระบบ & อัตราหน่วย</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
