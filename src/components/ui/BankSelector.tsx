import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check, Building2, Edit2 } from 'lucide-react';
import { THAI_BANKS, ThaiBank, getBankByCodeOrName } from '../../utils/thaiBanks';
import { BankLogo } from './BankLogo';

interface BankSelectorProps {
  value: string;
  onChange: (bankName: string, bankCode?: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export const BankSelector: React.FC<BankSelectorProps> = ({
  value,
  onChange,
  label = 'ชื่อธนาคาร',
  placeholder = 'เลือกธนาคาร...',
  className = '',
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customBankName, setCustomBankName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Match current value to a known bank
  const currentBank = getBankByCodeOrName(value);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter banks by search
  const filteredBanks = THAI_BANKS.filter((bank) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      bank.officialName.toLowerCase().includes(q) ||
      bank.shortNameTh.toLowerCase().includes(q) ||
      bank.shortNameEn.toLowerCase().includes(q) ||
      bank.code.toLowerCase().includes(q)
    );
  });

  const handleSelectBank = (bank: ThaiBank) => {
    if (bank.id === 'other') {
      setIsCustomMode(true);
      setCustomBankName(value && !currentBank ? value : '');
      onChange(value || 'ธนาคารอื่นๆ', 'OTHER');
    } else {
      setIsCustomMode(false);
      onChange(bank.officialName, bank.code);
    }
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleCustomNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomBankName(val);
    onChange(val, 'OTHER');
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="text-slate-700 font-semibold block mb-1 text-sm">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Main trigger button */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full bg-slate-50 border rounded-xl p-2.5 flex items-center justify-between text-left transition-all cursor-pointer focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
            isOpen ? 'border-indigo-500 bg-white ring-2 ring-indigo-500/20' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            {value ? (
              <>
                <BankLogo bank={currentBank || value} size="sm" />
                <div className="truncate">
                  <span className="font-semibold text-slate-900 text-sm block truncate">
                    {value}
                  </span>
                  {currentBank && (
                    <span className="text-[11px] text-slate-500 font-mono">
                      {currentBank.code} • {currentBank.shortNameEn}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-slate-400">
                <Building2 className="w-5 h-5 text-slate-300" />
                <span className="text-sm">{placeholder}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
            {currentBank && (
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: currentBank.color }}
                title={`สีประจำธนาคาร: ${currentBank.shortNameTh}`}
              />
            )}
            <ChevronDown
              className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </div>
        </button>

        {/* Custom name input field if user chose 'other' */}
        {isCustomMode && (
          <div className="mt-2 flex items-center gap-2">
            <input
              type="text"
              placeholder="ระบุชื่อธนาคารของคุณ..."
              value={customBankName}
              onChange={handleCustomNameChange}
              className="flex-1 bg-white border border-slate-300 rounded-xl p-2 text-xs text-slate-900 focus:border-indigo-500 outline-none"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold shrink-0 cursor-pointer"
            >
              เลือกธนาคารหลัก
            </button>
          </div>
        )}
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-80 flex flex-col">
          {/* Search bar */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/70 sticky top-0 z-10">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาชื่อธนาคาร หรือตัวย่อ (เช่น KBANK, SCB, กรุงไทย)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                autoFocus
              />
            </div>
          </div>

          {/* Banks list */}
          <div className="overflow-y-auto divide-y divide-slate-100 py-1">
            {filteredBanks.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                ไม่พบธนาคารที่ค้นหา
              </div>
            ) : (
              filteredBanks.map((bank) => {
                const isSelected =
                  currentBank?.code === bank.code ||
                  value === bank.officialName ||
                  value === bank.shortNameTh;

                return (
                  <button
                    key={bank.id}
                    type="button"
                    onClick={() => handleSelectBank(bank)}
                    className={`w-full px-3 py-2.5 flex items-center justify-between text-left transition-colors cursor-pointer hover:bg-indigo-50/50 ${
                      isSelected ? 'bg-indigo-50/80 font-semibold' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <BankLogo bank={bank} size="sm" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-900 text-xs font-semibold truncate">
                            {bank.officialName}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono block">
                          {bank.code} • {bank.shortNameEn}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-black/10"
                        style={{ backgroundColor: bank.color }}
                      />
                      {isSelected && (
                        <Check className="w-4 h-4 text-indigo-600" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
